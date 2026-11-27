// Pointer input stays independent from the machine's keyboard state.
export function bindMovementControls({joystick, buttons = [], onChange, onInteract = () => {}}) {
  buttons = [...buttons];
  const doc = joystick?.ownerDocument || buttons[0]?.ownerDocument || globalThis.document;
  const win = doc?.defaultView || globalThis.window;
  const bindings = [], held = new Map();
  const knob = joystick?.querySelector('[data-joystick-knob]');
  let active = null, stickX = 0, stickY = 0, disposed = false;
  const listen = (target, type, fn) => {
    if (!target) return;
    target.addEventListener(type, fn);
    bindings.push(() => target.removeEventListener(type, fn));
  };
  const prevent = e => { if (e.cancelable !== false) e.preventDefault(); };
  const capture = (target, id) => { try { target.setPointerCapture(id); } catch { /* Detached controls can lose capture. */ } };
  const release = (target, id) => { try { target.releasePointerCapture(id); } catch { /* Capture may already be gone. */ } };
  const emit = () => {
    let x = stickX, y = stickY;
    const directions = new Set([...held.values()].map(v => v.direction));
    x += Number(directions.has('right')) - Number(directions.has('left'));
    y += Number(directions.has('down')) - Number(directions.has('up'));
    const length = Math.max(1, Math.hypot(x, y));
    onChange(x / length, y / length);
  };
  const paint = (x = 0, y = 0) => {
    joystick?.style.setProperty('--joystick-x', `${x}px`);
    joystick?.style.setProperty('--joystick-y', `${y}px`);
    if (knob) knob.style.transform = `translate(${x}px, ${y}px)`;
  };
  const move = e => {
    const rect = joystick.getBoundingClientRect();
    const radius = Math.max(1, Math.min(rect.width, rect.height) / 2);
    let x = (e.clientX - rect.left - rect.width / 2) / radius;
    let y = (e.clientY - rect.top - rect.height / 2) / radius;
    const distance = Math.hypot(x, y), bounded = Math.min(1, distance);
    if (distance) { x /= distance; y /= distance; }
    paint(x * bounded * radius * .65, y * bounded * radius * .65);
    const strength = Math.max(0, (bounded - .12) / .88);
    stickX = x * strength; stickY = y * strength;
    emit();
  };
  listen(joystick, 'pointerdown', e => {
    if (disposed || active !== null || (e.button !== undefined && e.button !== 0)) return;
    prevent(e); onInteract(); active = e.pointerId; capture(joystick, active); move(e);
  });
  listen(joystick, 'pointermove', e => {
    if (e.pointerId !== active) return;
    prevent(e); move(e);
  });
  const endStick = e => {
    if (e.pointerId !== active) return;
    const id = active; active = null; stickX = stickY = 0; paint(); emit(); release(joystick, id);
  };
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) listen(joystick, type, endStick);
  for (const button of buttons) {
    const direction = button.dataset.k;
    if (!['up', 'down', 'left', 'right'].includes(direction)) continue;
    listen(button, 'pointerdown', e => {
      if (disposed || held.has(e.pointerId) || (e.button !== undefined && e.button !== 0)) return;
      prevent(e); onInteract(); held.set(e.pointerId, {button, direction}); button.classList?.add('on'); capture(button, e.pointerId); emit();
    });
    const end = e => {
      if (held.get(e.pointerId)?.button !== button) return;
      held.delete(e.pointerId);
      if (![...held.values()].some(value => value.button === button)) button.classList?.remove('on');
      emit(); release(button, e.pointerId);
    };
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) listen(button, type, end);
  }
  function reset() {
    const previous = active, pointers = [...held];
    active = null; held.clear(); stickX = stickY = 0; paint(); emit();
    if (previous !== null) release(joystick, previous);
    for (const [id, {button}] of pointers) { button.classList?.remove('on'); release(button, id); }
  }
  listen(win, 'blur', reset);
  listen(doc, 'visibilitychange', () => { if (doc.hidden) reset(); });
  return {reset, dispose() { if (disposed) return; reset(); disposed = true; for (const remove of bindings) remove(); }};
}
