/** Shared worker contract. Plain ES modules; reference machine accesses window.ClawBridge.
 * catalog.js exports PRIZES (20 objects {id,name,dot,tricky,weight,emoji}) and buildPrize(id, tools).
 * tools: {V,Hi,Bl,El,Cp,Bx,Co,Ey}; buildPrize returns primitive descriptors used by reference makePlush.
 * state.js exports createStore(storage), generateQuestion(profileId,rng,previous).
 * store API: snapshot(), select(id), profile(), answer(question, value), beginTurn(),
 * awardPrize(turnId, prizeId, thumbnail, awardId), finishTurn(turnId), recoverTurns(), place(instanceId,page,slot),
 * unplace(instanceId), setSettings(patch), subscribe(fn). All transactions persist before notifying.
 * answer returns {correct,awarded}; once resolved, same question cannot pay again.
 * beginTurn returns turnId; awardPrize stores each physical win immediately (and marks turn committed).
 * Pass a stable physical prize event ID as awardId so retries dedupe while same-design copies remain distinct.
 * recovery refunds only pending turns with no already persisted award; prevents reward-plus-refund.
 * profile: {id,money,initialized,collection:[{instanceId,prizeId,wonAt,thumbnail}],placements,completedPlays,pendingTurn,settledTurnIds}.
 * settledTurnIds makes finish/refund idempotent across retries and reloads.
 * room/ATM/shell owner is lead. Machine bridge uses:
 * window.ClawBridge={profile(), beginTurn(), awardPrize(id,thumb,eventId), finishTurn(), settings(), saveSettings(patch),
 * navigateATM(), reportError(error), onMachineReady(api), onTurnState(state)}.
 * machine api: {setProfile(),setVisible(bool),isBusy(),drop(),thumbnail(kind),sound(kind),resize()}.
 */
export const SAVE_KEY='claw-game-v1';
export const PROFILE_IDS=['vinny','chase'];
export const TURN_SECONDS=20;
export const SHELF_SLOTS=12;
// Prize journey extension. A persisted award reaches the shelf automatically.
// store.autoShelf() fills unused slots for both profiles without moving existing toys.
// Machine calls onPrizeReturned(item) only after awardPrize succeeds, then retains
// a visual copy in the retrieval bay. api.collectReturned(instanceId) removes that
// copy only; it never awards, charges, or deletes saved progress.
// api.createPrizeModel(prizeId) returns a standalone THREE.Group with owned
// geometries and shared materials. Viewer disposes geometries, never materials.
// prize-viewer.js exports createPrizeViewer({canvas,makeModel}), returning
// {open(prizeId),close(),reset(),dispose()}. It renders only while open, supports
// pointer drag and pinch/wheel zoom, and works without touching machine physics.
export const ROOM_PAGE_SIZE=6;
