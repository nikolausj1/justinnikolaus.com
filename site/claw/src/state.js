import { PRIZES } from './catalog.js';
import { PROFILE_IDS, SAVE_KEY, SHELF_SLOTS } from './contracts.js';

const SCHEMA_VERSION = 1;
const CATALOG_IDS = new Set(PRIZES.map((prize) => prize.id));
const SETTINGS_DEFAULTS = Object.freeze({
  musicMuted: false,
  effectsMuted: false,
  cameraPreset: 'Iso',
  perspective: false,
  axesMode: 'Screen',
  vol: { music: 0.5, sfx: 0.8 },
  stick: 'screen',
  proj: 'ortho',
});
let generatedId = 0;

export class StoreError extends Error {
  constructor(code, message, options = {}) {
    super(message, options);
    this.name = 'StoreError';
    this.code = code;
  }
}

const conflictError = () => new StoreError(
  'SAVE_CONFLICT',
  'Saved progress changed in another tab. Reload this page to load the latest progress before continuing.',
);

const clone = (value) => structuredClone(value);
const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isNonNegativeInteger = (value) => Number.isSafeInteger(value) && value >= 0;
const makeId = () => globalThis.crypto?.randomUUID?.() ?? `turn-${Date.now()}-${++generatedId}`;

function emptyProfile(id) {
  return {
    id,
    money: 1,
    initialized: true,
    collection: [],
    placements: [],
    completedPlays: 0,
    pendingTurn: null,
    settledTurnIds: [],
  };
}

function firstFreeSpot(profile) {
  const used = new Set(profile.placements.map((placement) => `${placement.page}:${placement.slot}`));
  for (let index = 0; ; index += 1) {
    const page = Math.floor(index / SHELF_SLOTS);
    const slot = index % SHELF_SLOTS;
    if (!used.has(`${page}:${slot}`)) return { page, slot };
  }
}

function placeInFirstFreeSpot(profile, instanceId) {
  const spot = firstFreeSpot(profile);
  profile.placements.push({ instanceId, ...spot });
  return spot;
}

function fillUnplaced(profile) {
  const placed = new Set(profile.placements.map((placement) => placement.instanceId));
  let changed = false;
  for (const item of profile.collection) {
    if (placed.has(item.instanceId)) continue;
    placeInFirstFreeSpot(profile, item.instanceId);
    placed.add(item.instanceId);
    changed = true;
  }
  return changed;
}

function freshSave() {
  return {
    schemaVersion: SCHEMA_VERSION,
    profiles: Object.fromEntries(PROFILE_IDS.map((id) => [id, emptyProfile(id)])),
    deviceSettings: { ...SETTINGS_DEFAULTS },
    activeProfileId: PROFILE_IDS[0],
  };
}

function validationError(message) {
  return new StoreError('SAVE_INVALID', `Saved progress is invalid: ${message}`);
}

function validateSave(value) {
  if (!isRecord(value)) throw validationError('expected a save object.');
  if (value.schemaVersion !== SCHEMA_VERSION) {
    throw new StoreError('SAVE_INCOMPATIBLE', `Saved progress uses unsupported version ${String(value.schemaVersion)}.`);
  }
  if (!isRecord(value.profiles)) throw validationError('profiles are missing.');
  for (const id of PROFILE_IDS) {
    const profile = value.profiles[id];
    if (!isRecord(profile) || profile.id !== id) throw validationError(`profile ${id} is missing.`);
    if (!isNonNegativeInteger(profile.money)) throw validationError(`${id} money must be a nonnegative integer.`);
    if (profile.initialized !== true) throw validationError(`${id} initialization marker is invalid.`);
    if (!Array.isArray(profile.collection)) throw validationError(`${id} collection must be a list.`);
    if (!Array.isArray(profile.placements)) throw validationError(`${id} placements must be a list.`);
    if (!isNonNegativeInteger(profile.completedPlays)) throw validationError(`${id} completed play count is invalid.`);
    if (!Array.isArray(profile.settledTurnIds) || profile.settledTurnIds.some((turnId) => typeof turnId !== 'string' || !turnId) || new Set(profile.settledTurnIds).size !== profile.settledTurnIds.length) throw validationError(`${id} settled turns must be unique nonempty IDs.`);
    const instanceIds = new Set();
    for (const item of profile.collection) {
      if (!isRecord(item) || typeof item.instanceId !== 'string' || !item.instanceId) throw validationError(`${id} has a malformed prize instance.`);
      if (!CATALOG_IDS.has(item.prizeId)) throw validationError(`${id} contains unknown prize ${String(item.prizeId)}.`);
      if (instanceIds.has(item.instanceId)) throw validationError(`${id} contains duplicate instance ${item.instanceId}.`);
      instanceIds.add(item.instanceId);
      if (typeof item.wonAt !== 'string' || !Number.isFinite(Date.parse(item.wonAt))) throw validationError(`${id} has a malformed prize date.`);
      if (item.thumbnail !== undefined && typeof item.thumbnail !== 'string') throw validationError(`${id} has a malformed prize thumbnail.`);
    }
    const placedInstances = new Set();
    const spots = new Set();
    for (const placement of profile.placements) {
      if (!isRecord(placement) || !instanceIds.has(placement.instanceId)) throw validationError(`${id} has a placement for a missing prize.`);
      if (!isNonNegativeInteger(placement.page) || !isNonNegativeInteger(placement.slot) || placement.slot >= SHELF_SLOTS) throw validationError(`${id} has an out-of-range shelf position.`);
      const spot = `${placement.page}:${placement.slot}`;
      if (placedInstances.has(placement.instanceId) || spots.has(spot)) throw validationError(`${id} has duplicate shelf placements.`);
      placedInstances.add(placement.instanceId);
      spots.add(spot);
    }
    if (profile.pendingTurn !== null) {
      const turn = profile.pendingTurn;
      if (!isRecord(turn) || typeof turn.turnId !== 'string' || !turn.turnId || turn.amount !== 1 || typeof turn.committed !== 'boolean' || !Array.isArray(turn.awards)) throw validationError(`${id} pending turn is malformed.`);
      if (new Set(turn.awards).size !== turn.awards.length) throw validationError(`${id} pending award markers must be unique.`);
      for (const awardId of turn.awards) if (typeof awardId !== 'string' || !awardId) throw validationError(`${id} pending award marker is malformed.`);
    }
  }
  for (const id of Object.keys(value.profiles)) if (!PROFILE_IDS.includes(id)) throw validationError(`unexpected profile ${id}.`);
  if (!isRecord(value.deviceSettings)) throw validationError('device settings are missing.');
  try { validateSettings(value.deviceSettings); } catch (error) { throw validationError(error.message); }
  if (!PROFILE_IDS.includes(value.activeProfileId)) throw validationError('active profile is invalid.');
  return value;
}

function validateSettings(patch, current = {}) {
  if (!isRecord(patch)) throw new StoreError('SETTINGS_INVALID', 'Settings must be an object.');
  const next = { ...SETTINGS_DEFAULTS, ...current, vol: { ...SETTINGS_DEFAULTS.vol, ...(current.vol ?? {}) } };
  for (const [key, value] of Object.entries(patch)) {
    if (!(key in SETTINGS_DEFAULTS)) throw new StoreError('SETTINGS_INVALID', `Unknown setting: ${key}.`);
    if ((key === 'musicMuted' || key === 'effectsMuted' || key === 'perspective') && typeof value !== 'boolean') throw new StoreError('SETTINGS_INVALID', `${key} must be true or false.`);
    if (key === 'cameraPreset' && !['Front', 'Side', 'Iso', 'Top'].includes(value)) throw new StoreError('SETTINGS_INVALID', 'cameraPreset must be Front, Side, Iso, or Top.');
    if (key === 'axesMode' && !['Screen', 'Machine'].includes(value)) throw new StoreError('SETTINGS_INVALID', 'axesMode must be Screen or Machine.');
    if (key === 'stick' && !['screen', 'machine'].includes(value)) throw new StoreError('SETTINGS_INVALID', 'stick must be screen or machine.');
    if (key === 'proj' && !['ortho', 'persp'].includes(value)) throw new StoreError('SETTINGS_INVALID', 'proj must be ortho or persp.');
    if (key === 'vol') {
      if (!isRecord(value)) throw new StoreError('SETTINGS_INVALID', 'vol must be an object with music and sfx levels.');
      for (const [volumeKey, volume] of Object.entries(value)) {
        if (!['music', 'sfx'].includes(volumeKey) || typeof volume !== 'number' || !Number.isFinite(volume) || volume < 0 || volume > 1) throw new StoreError('SETTINGS_INVALID', 'vol music and sfx levels must be numbers from 0 to 1.');
      }
      next.vol = { ...next.vol, ...value };
    } else next[key] = value;
  }
  return next;
}

export function generateQuestion(profileId, rng = Math.random, previous = null) {
  if (!PROFILE_IDS.includes(profileId)) throw new StoreError('PROFILE_INVALID', `Unknown profile: ${profileId}.`);
  if (typeof rng !== 'function') throw new StoreError('RNG_INVALID', 'Question random source must be a function.');
  const drawInt = (min, max) => min + Math.min(max - min, Math.floor(Math.max(0, Math.min(0.999999999999, rng())) * (max - min + 1)));
  const create = () => {
    if (profileId === 'vinny') {
      const operation = rng() < 0.5 ? '+' : '-';
      const a = drawInt(3, 11);
      const rawB = drawInt(3, 11);
      const b = operation === '-' ? Math.min(a, rawB) : rawB;
      const left = operation === '-' ? Math.max(a, rawB) : a;
      return { operation, a: left, b, correctAnswer: operation === '+' ? left + b : left - b, resolved: false };
    }
    const operation = rng() < 0.2 ? '÷' : '×';
    const a = drawInt(3, 11);
    const b = drawInt(3, 11);
    return operation === '×'
      ? { operation, a, b, correctAnswer: a * b, resolved: false }
      : { operation, a: a * b, b, correctAnswer: a, resolved: false };
  };
  let question = create();
  if (previous && question.operation === previous.operation && question.a === previous.a && question.b === previous.b) {
    for (let attempt = 0; attempt < 8 && question.operation === previous.operation && question.a === previous.a && question.b === previous.b; attempt += 1) question = create();
    if (question.operation === previous.operation && question.a === previous.a && question.b === previous.b) {
      if (profileId === 'vinny' && question.operation === '-') {
        if (question.b > 3) question.b -= 1;
        else question.a = question.a < 11 ? question.a + 1 : 10;
        if (question.a < question.b) question.a = question.b;
      } else if (question.operation === '÷') {
        const quotient = question.a / question.b;
        const nextQuotient = quotient < 11 ? quotient + 1 : 10;
        question.a = nextQuotient * question.b;
      } else question.a = question.a === 11 ? 10 : question.a + 1;
      question.correctAnswer = question.operation === '+' ? question.a + question.b : question.operation === '-' ? question.a - question.b : question.operation === '×' ? question.a * question.b : question.a / question.b;
    }
  }
  return question;
}

export function createStore(storage = globalThis.localStorage) {
  if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') throw new StoreError('STORAGE_UNAVAILABLE', 'Local progress storage is unavailable.');
  let expectedRaw;
  try { expectedRaw = storage.getItem(SAVE_KEY); }
  catch (cause) { throw new StoreError('SAVE_READ_FAILED', 'Could not read saved progress. Existing progress has been left untouched.', { cause }); }
  let state;
  if (expectedRaw === null) {
    state = freshSave();
    const serialized = JSON.stringify(state);
    try {
      if (storage.getItem(SAVE_KEY) !== null) throw conflictError();
      storage.setItem(SAVE_KEY, serialized);
      expectedRaw = serialized;
    }
    catch (cause) {
      if (cause instanceof StoreError) throw cause;
      throw new StoreError('SAVE_WRITE_FAILED', 'Could not initialize saved progress. Check device storage and retry.', { cause });
    }
  } else {
    try { state = validateSave(JSON.parse(expectedRaw)); }
    catch (cause) {
      if (cause instanceof StoreError) throw cause;
      throw new StoreError('SAVE_CORRUPT', 'Saved progress could not be read. The original data has been preserved.', { cause });
    }
    state = clone(state);
  }

  let selectedId = state.activeProfileId;
  const listeners = new Set();
  const emit = () => {
    const view = snapshot();
    for (const fn of listeners) {
      try { fn(view); } catch { /* Subscriber failures must not turn a committed save into an apparent failure. */ }
    }
  };
  const snapshot = () => clone({ ...state, activeProfileId: selectedId });
  const commit = (mutator) => {
    const previous = state;
    const draft = clone(state);
    mutator(draft);
    validateSave(draft);
    let latestRaw;
    try { latestRaw = storage.getItem(SAVE_KEY); }
    catch (cause) { throw new StoreError('SAVE_READ_FAILED', 'Could not check the latest saved progress. No changes were applied.', { cause }); }
    if (latestRaw !== expectedRaw) throw conflictError();
    const serialized = JSON.stringify(draft);
    try { storage.setItem(SAVE_KEY, serialized); }
    catch (cause) { state = previous; throw new StoreError('SAVE_WRITE_FAILED', 'Progress could not be saved. No in-memory change was applied; retry after storage is available.', { cause }); }
    state = draft;
    expectedRaw = serialized;
    selectedId = draft.activeProfileId;
    emit();
  };
  const profile = () => clone(state.profiles[selectedId]);

  const store = {
    snapshot,
    select(id) {
      if (!PROFILE_IDS.includes(id)) throw new StoreError('PROFILE_INVALID', `Unknown profile: ${id}.`);
      if (id === selectedId) return profile();
      commit((draft) => { draft.activeProfileId = id; });
      return profile();
    },
    profile,
    answer(question, value) {
      if (!question || !Number.isSafeInteger(question.correctAnswer) || typeof question.resolved !== 'boolean') throw new StoreError('QUESTION_INVALID', 'Question state is invalid.');
      const correct = Number.isInteger(value) && value === question.correctAnswer;
      if (question.resolved) return { correct, awarded: false };
      question.resolved = true;
      if (correct) {
        try { commit((draft) => { draft.profiles[selectedId].money += 1; }); }
        catch (error) { question.resolved = false; throw error; }
      }
      return { correct, awarded: correct };
    },
    beginTurn() {
      const p = state.profiles[selectedId];
      if (p.pendingTurn) throw new StoreError('TURN_ACTIVE', 'A turn is already in progress for this profile.');
      if (p.money < 1) throw new StoreError('INSUFFICIENT_FUNDS', 'Visit the MATH ATM to earn a play.');
      const turnId = makeId();
      commit((draft) => {
        const target = draft.profiles[selectedId];
        target.money -= 1;
        target.pendingTurn = { turnId, amount: 1, committed: false, awards: [] };
      });
      return turnId;
    },
    awardPrize(turnId, prizeId, thumbnail, awardId = makeId()) {
      if (!CATALOG_IDS.has(prizeId)) throw new StoreError('PRIZE_INVALID', `Unknown prize: ${prizeId}.`);
      if (typeof thumbnail !== 'string' || typeof awardId !== 'string' || !awardId) throw new StoreError('AWARD_INVALID', 'Prize thumbnail and award ID are required.');
      const p = state.profiles[selectedId];
      if (p.settledTurnIds.includes(turnId)) return null;
      if (!p.pendingTurn || p.pendingTurn.turnId !== turnId) throw new StoreError('TURN_INVALID', 'Prize award does not match the active turn.');
      if (p.pendingTurn.awards.includes(awardId)) return p.collection.find((item) => item.awardId === awardId) ?? null;
      const item = { instanceId: awardId, awardId, prizeId, wonAt: new Date().toISOString(), thumbnail };
      commit((draft) => {
        const target = draft.profiles[selectedId];
        target.collection.push(item);
        placeInFirstFreeSpot(target, item.instanceId);
        target.pendingTurn.committed = true;
        target.pendingTurn.awards.push(awardId);
      });
      return clone(item);
    },
    finishTurn(turnId) {
      const p = state.profiles[selectedId];
      if (p.settledTurnIds.includes(turnId)) return false;
      if (!p.pendingTurn || p.pendingTurn.turnId !== turnId) throw new StoreError('TURN_INVALID', 'Cannot finish a turn that is not active.');
      commit((draft) => {
        const target = draft.profiles[selectedId];
        target.completedPlays += 1;
        target.pendingTurn = null;
        target.settledTurnIds.push(turnId);
      });
      return true;
    },
    recoverTurns() {
      const recovered = [];
      for (const id of PROFILE_IDS) {
        const pending = state.profiles[id].pendingTurn;
        if (pending) recovered.push({ profileId: id, turnId: pending.turnId, refunded: pending.awards.length === 0 && !pending.committed });
      }
      if (!recovered.length) return recovered;
      commit((draft) => {
        for (const item of recovered) {
          const target = draft.profiles[item.profileId];
          if (item.refunded) target.money += 1;
          else target.completedPlays += 1;
          target.pendingTurn = null;
          target.settledTurnIds.push(item.turnId);
        }
      });
      return recovered;
    },
    autoShelf() {
      const hasUnplaced = PROFILE_IDS.some((id) => {
        const target = state.profiles[id];
        const placed = new Set(target.placements.map((placement) => placement.instanceId));
        return target.collection.some((item) => !placed.has(item.instanceId));
      });
      if (!hasUnplaced) return false;
      commit((draft) => { for (const id of PROFILE_IDS) fillUnplaced(draft.profiles[id]); });
      return true;
    },
    place(instanceId, page, slot) {
      if (!isNonNegativeInteger(page) || !isNonNegativeInteger(slot) || slot >= SHELF_SLOTS) throw new StoreError('PLACEMENT_INVALID', `Shelf slot must be between 0 and ${SHELF_SLOTS - 1}, on a nonnegative page.`);
      const p = state.profiles[selectedId];
      if (!p.collection.some((item) => item.instanceId === instanceId)) throw new StoreError('PRIZE_NOT_OWNED', 'That prize is not in this profile’s collection.');
      commit((draft) => {
        const target = draft.profiles[selectedId];
        const current = target.placements.find((entry) => entry.instanceId === instanceId);
        const occupant = target.placements.find((entry) => entry.page === page && entry.slot === slot);
        if (current) {
          if (occupant && occupant.instanceId !== instanceId) { occupant.page = current.page; occupant.slot = current.slot; }
          else target.placements = target.placements.filter((entry) => entry.instanceId !== instanceId);
          if (occupant && occupant.instanceId !== instanceId) {
            current.page = page;
            current.slot = slot;
          } else target.placements.push({ instanceId, page, slot });
        } else {
          if (occupant) target.placements = target.placements.filter((entry) => entry.instanceId !== occupant.instanceId);
          target.placements.push({ instanceId, page, slot });
        }
      });
      return clone(state.profiles[selectedId].placements);
    },
    unplace(instanceId) {
      commit((draft) => { draft.profiles[selectedId].placements = draft.profiles[selectedId].placements.filter((entry) => entry.instanceId !== instanceId); });
      return clone(state.profiles[selectedId].placements);
    },
    setSettings(patch) {
      const settings = validateSettings(patch, state.deviceSettings);
      commit((draft) => { draft.deviceSettings = settings; });
      return clone(state.deviceSettings);
    },
    subscribe(fn) {
      if (typeof fn !== 'function') throw new StoreError('SUBSCRIBER_INVALID', 'Subscriber must be a function.');
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
  // Migrate older collections into shelf spots immediately after loading.
  // autoShelf itself is a no-op when all prizes already have placements.
  store.autoShelf();
  return store;
}
