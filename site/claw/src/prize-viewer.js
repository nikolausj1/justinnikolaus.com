// The machine supplies a visual copy: geometries belong to this viewer,
// while materials and textures remain shared with the running machine.
export function createPrizeViewer({canvas, makeModel}) {
  const THREE = globalThis.THREE;
  if (!THREE || !canvas || typeof makeModel !== 'function') {
    throw new Error('The 3D prize viewer is unavailable.');
  }
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({canvas, antialias: true, alpha: true});
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(2, globalThis.devicePixelRatio || 1));
  } catch (error) {
    renderer?.dispose();
    throw new Error('The 3D prize viewer could not start.', {cause: error});
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, .05, 100);
  const pivot = new THREE.Group();
  scene.add(pivot);
  scene.add(new THREE.HemisphereLight(0xfff3ff, 0x59657b, 1.05));
  for (const [color, intensity, position] of [
    [0xfff3e5, 1.1, [3, 4, 5]],
    [0xbbeeff, .65, [-4, 1, 3]],
    [0xffb8e3, .85, [2, 3, -4]],
  ]) {
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.set(...position);
    scene.add(light);
  }

  const originalTouchAction = canvas.style.touchAction;
  const originalTabIndex = canvas.getAttribute('tabindex');
  canvas.style.touchAction = 'none';
  if (originalTabIndex === null) canvas.tabIndex = 0;
  const pointers = new Map();
  const captures = new Set();
  const axisX = new THREE.Vector3(1, 0, 0);
  const axisY = new THREE.Vector3(0, 1, 0);
  const axisZ = new THREE.Vector3(0, 0, 1);
  const rotation = new THREE.Quaternion();
  let model = null, normalization = null, isOpen = false, disposed = false;
  let frame = null, gesture = null, zoom = 1, width = 1, height = 1;
  const minZoom = .7, maxZoom = 2.4;

  function cancelFrame() {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
  }
  // Static models need frames only after an interaction or layout change.
  function invalidate() {
    if (!isOpen || disposed || document.hidden || frame !== null) return;
    frame = requestAnimationFrame(() => {
      frame = null;
      if (isOpen && !disposed && !document.hidden) renderer.render(scene, camera);
    });
  }
  function updateCamera() {
    const vertical = THREE.MathUtils.degToRad(camera.fov);
    const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * camera.aspect);
    // Radius is normalized to one, so every orientation fits at reset zoom.
    camera.position.set(0, 0, 1.16 / Math.sin(Math.min(vertical, horizontal) / 2));
    camera.zoom = zoom;
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }
  function resize() {
    if (!isOpen || disposed) return;
    const bounds = canvas.getBoundingClientRect();
    width = Math.max(1, Math.round(bounds.width || canvas.clientWidth || 1));
    height = Math.max(1, Math.round(bounds.height || canvas.clientHeight || 1));
    renderer.setPixelRatio(Math.min(2, globalThis.devicePixelRatio || 1));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    updateCamera();
    invalidate();
  }
  function disposeGeometry(object) {
    const geometries = new Set();
    object?.traverse?.(child => { if (child.geometry) geometries.add(child.geometry); });
    for (const geometry of geometries) geometry.dispose();
  }
  function releasePointer(id) {
    captures.delete(id);
    try {
      if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
    } catch { /* Capture may already be released by the browser. */ }
  }
  function clearPointers() {
    pointers.clear();
    gesture = null;
    for (const id of [...captures]) releasePointer(id);
  }
  function sampleGesture() {
    const points = [...pointers.values()];
    if (points.length < 2) return null;
    const [a, b] = points;
    return {
      x: (a.x + b.x) / 2, y: (a.y + b.y) / 2,
      distance: Math.hypot(b.x - a.x, b.y - a.y),
      angle: Math.atan2(b.y - a.y, b.x - a.x),
    };
  }
  function rotate(axis, angle) {
    rotation.setFromAxisAngle(axis, angle);
    pivot.quaternion.premultiply(rotation).normalize();
  }
  function drag(dx, dy) {
    const scale = Math.PI * 2 / Math.max(200, Math.min(width, height));
    rotate(axisY, dx * scale);
    rotate(axisX, dy * scale);
  }
  function setZoom(value) {
    zoom = Math.max(minZoom, Math.min(maxZoom, value));
    camera.zoom = zoom;
    camera.updateProjectionMatrix();
  }
  function onPointerDown(event) {
    if (!isOpen || document.hidden || (event.pointerType === 'mouse' && event.button !== 0)) return;
    event.preventDefault();
    canvas.focus({preventScroll: true});
    pointers.set(event.pointerId, {x: event.clientX, y: event.clientY});
    try { canvas.setPointerCapture(event.pointerId); captures.add(event.pointerId); } catch {}
    gesture = sampleGesture();
  }
  function onPointerMove(event) {
    const previous = pointers.get(event.pointerId);
    if (!isOpen || !previous) return;
    event.preventDefault();
    pointers.set(event.pointerId, {x: event.clientX, y: event.clientY});
    if (pointers.size === 1) {
      drag(event.clientX - previous.x, event.clientY - previous.y);
    } else {
      const next = sampleGesture();
      if (gesture && next) {
        drag(next.x - gesture.x, next.y - gesture.y);
        if (gesture.distance > 8 && next.distance > 8) setZoom(zoom * next.distance / gesture.distance);
        rotate(axisZ, next.angle - gesture.angle);
      }
      gesture = next;
    }
    invalidate();
  }
  function onPointerEnd(event) {
    pointers.delete(event.pointerId);
    releasePointer(event.pointerId);
    gesture = sampleGesture();
  }
  function onWheel(event) {
    if (!isOpen) return;
    event.preventDefault();
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? height : 1);
    setZoom(zoom * Math.exp(-Math.max(-200, Math.min(200, delta)) * .002));
    invalidate();
  }
  function onKeyDown(event) {
    if (!isOpen || document.activeElement !== canvas) return;
    switch (event.key) {
      case 'ArrowLeft': rotate(axisY, -.14); break;
      case 'ArrowRight': rotate(axisY, .14); break;
      case 'ArrowUp': rotate(axisX, -.14); break;
      case 'ArrowDown': rotate(axisX, .14); break;
      case '+': case '=': setZoom(zoom * 1.12); break;
      case '-': case '_': setZoom(zoom / 1.12); break;
      case '0': case 'Home': reset(); break;
      default: return;
    }
    event.preventDefault();
    invalidate();
  }
  function onVisibility() {
    if (document.hidden) { cancelFrame(); clearPointers(); }
    else resize();
  }
  const listeners = [
    ['pointerdown', onPointerDown], ['pointermove', onPointerMove],
    ['pointerup', onPointerEnd], ['pointercancel', onPointerEnd],
    ['lostpointercapture', onPointerEnd], ['wheel', onWheel], ['keydown', onKeyDown],
    ['blur', clearPointers],
  ];
  for (const [type, handler] of listeners) canvas.addEventListener(type, handler, {passive: false});
  document.addEventListener('visibilitychange', onVisibility);
  globalThis.addEventListener('resize', resize);
  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
  observer?.observe(canvas);

  function reset() {
    if (disposed) return;
    clearPointers();
    pivot.rotation.set(.08, -.25, 0);
    setZoom(1);
    invalidate();
  }
  function close() {
    isOpen = false;
    cancelFrame();
    clearPointers();
    if (normalization) pivot.remove(normalization);
    disposeGeometry(model);
    model = null;
    normalization = null;
    // Discard renderer references to removed meshes without touching materials.
    renderer.renderLists?.dispose();
  }
  function open(prizeId) {
    if (disposed) throw new Error('The 3D prize viewer has been disposed.');
    close();
    try {
      model = makeModel(prizeId);
      if (!model?.isObject3D) throw new Error('The prize model is unavailable.');
      model.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const radius = size.length() / 2;
      if (box.isEmpty() || !Number.isFinite(radius) || radius <= 0) throw new Error('The prize model has no visible shape.');
      normalization = new THREE.Group();
      normalization.scale.setScalar(1 / radius);
      normalization.position.copy(center).multiplyScalar(-1 / radius);
      normalization.add(model);
      pivot.add(normalization);
      isOpen = true;
      reset();
      resize();
    } catch (error) {
      close();
      throw error;
    }
  }
  function dispose() {
    if (disposed) return;
    close();
    disposed = true;
    observer?.disconnect();
    for (const [type, handler] of listeners) canvas.removeEventListener(type, handler);
    document.removeEventListener('visibilitychange', onVisibility);
    globalThis.removeEventListener('resize', resize);
    renderer.dispose();
    renderer.forceContextLoss?.();
    canvas.style.touchAction = originalTouchAction;
    if (originalTabIndex === null) canvas.removeAttribute('tabindex');
    else canvas.setAttribute('tabindex', originalTabIndex);
  }
  return {open, close, reset, dispose};
}
