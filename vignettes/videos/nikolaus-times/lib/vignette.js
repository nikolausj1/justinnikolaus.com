/* Shared camera and timing for the homepage vignettes. See vignette.css for the stage pieces.
 *
 * Vignette.init({
 *   D,                         total length in seconds (the root data-duration)
 *   outAt, outDur, inDur,      the mark handoff out and the fade back in (defaults 0.9, 0.75, 0.9)
 *   canvas: { w, h },          stage size (default 1800 x 1200)
 *   shots: [{
 *     id,                      the .shot element id; it holds .cam-outer > .cam-inner > .device > .screen
 *     frame,                   "iphone" | "browser" | "none"
 *     src: { w, h },           footage pixel size
 *     fit: { h } or { w },     how big the screen is on the canvas, in canvas px
 *     start, len,              when the footage plays on the timeline (the video's data-start and data-duration)
 *     from,                    when this shot becomes the visible one (default: start for the first shot, else its own start)
 *     keys: [{ t, s, p: { x, y } }],   camera keys in footage seconds: scale and the source point held at canvas center
 *     zmax,                    the scale that counts as fully tight (drives the flatten), default: the largest key scale
 *     tilt: { y, x },          resting rotation in degrees (default -14, 4 for iphone; -8, 3 for browser; 0 for none)
 *     flat: { y, x },          how much of the tilt returns to flat when tight (default 11, 3 / 6, 2 / 0)
 *   }],
 * })
 *
 * Every visual state is a pure function of timeline time inside one driver tween, so any seek order
 * renders the same frame. Chained tweens on a proxy do not survive the snapshot tool's seeks.
 */
window.Vignette = (function () {
  const inOut = gsap.parseEase("power2.inOut");
  const pIn = gsap.parseEase("power2.in");
  const pOut = gsap.parseEase("power2.out");
  const sine = gsap.parseEase("sine.inOut");
  const seg = (t, at, dur, ease) => ease(Math.min(1, Math.max(0, (t - at) / dur)));

  const DEFAULTS = {
    iphone: { bezel: 11, bezelTop: 11, tilt: { y: -14, x: 4 }, flat: { y: 11, x: 3 } },
    browser: { bezel: 1, bezelTop: 44, tilt: { y: -8, x: 3 }, flat: { y: 6, x: 2 } },
    none: { bezel: 0, bezelTop: 0, tilt: { y: 0, x: 0 }, flat: { y: 0, x: 0 } },
  };

  function prepareShot(shot, canvas) {
    const d = DEFAULTS[shot.frame] || DEFAULTS.none;
    const el = document.getElementById(shot.id);
    el.classList.add("frame-" + shot.frame);
    const device = el.querySelector(".device");
    const f = shot.fit.h ? shot.fit.h / shot.src.h : shot.fit.w / shot.src.w;
    const screenW = shot.src.w * f, screenH = shot.src.h * f;
    const bezel = d.bezel;
    const bezelTop = d.bezelTop;
    device.style.setProperty("--dev-left", (canvas.w / 2 - screenW / 2 - bezel) + "px");
    device.style.setProperty("--dev-top", (canvas.h / 2 - screenH / 2 - bezelTop) + "px");
    device.style.setProperty("--dev-w", (screenW + 2 * bezel) + "px");
    device.style.setProperty("--dev-h", (screenH + bezel + bezelTop) + "px");
    const keys = shot.keys.slice();
    const zmax = shot.zmax || Math.max.apply(null, keys.map((k) => k.s));
    return {
      el, device,
      camOuter: el.querySelector(".cam-outer"),
      camInner: el.querySelector(".cam-inner"),
      first: el.querySelector(".first"),
      f, keys, zmax,
      center: { x: shot.src.w / 2, y: shot.src.h / 2 },
      tilt: shot.tilt || d.tilt,
      flat: shot.flat || d.flat,
      start: shot.start, len: shot.len,
      from: shot.from != null ? shot.from : shot.start,
    };
  }

  function camAt(keys, ft) {
    if (ft <= keys[0].t) return keys[0];
    for (let i = 1; i < keys.length; i++) {
      const a = keys[i - 1], b = keys[i];
      if (ft <= b.t) {
        const u = inOut((ft - a.t) / (b.t - a.t));
        return { s: a.s + (b.s - a.s) * u, p: { x: a.p.x + (b.p.x - a.p.x) * u, y: a.p.y + (b.p.y - a.p.y) * u } };
      }
    }
    return keys[keys.length - 1];
  }

  function init(cfg) {
    const canvas = cfg.canvas || { w: 1800, h: 1200 };
    const D = cfg.D;
    const OUT_AT = cfg.outAt != null ? cfg.outAt : 0.9;
    const OUT_DUR = cfg.outDur != null ? cfg.outDur : 0.75;
    const IN_DUR = cfg.inDur != null ? cfg.inDur : 0.9;
    const IN_AT = D - IN_DUR;
    const shots = cfg.shots.map((s) => prepareShot(s, canvas));
    shots[0].from = Math.min(shots[0].from, 0);
    const glow = document.getElementById("glow");
    const stage = document.getElementById("stage");
    const mark = document.getElementById("mark");
    const icon = document.getElementById("icon");

    function activeIndex(t) {
      let i = 0;
      for (let k = 1; k < shots.length; k++) if (t >= shots[k].from) i = k;
      return i;
    }

    function render(t) {
      const ai = activeIndex(t);
      const phase = (t / D) * Math.PI * 2;
      const dx = Math.sin(phase) * 5, dy = Math.sin(phase * 1.3) * 3;
      // The stage settles from a touch larger as the mark hands over, so the cut reads as a move, not a dissolve.
      const stageIn = 1.04 - 0.04 * seg(t, OUT_AT, OUT_DUR + 0.3, pOut);
      shots.forEach((sh, i) => {
        sh.el.style.opacity = i === ai ? "1" : "0";
        if (i !== ai) return;
        const c = camAt(sh.keys, t - sh.start);
        const k = Math.min(1, Math.max(0, (c.s - 1) / (sh.zmax - 1)));
        const tx = -(c.p.x - sh.center.x) * sh.f, ty = -(c.p.y - sh.center.y) * sh.f;
        sh.camOuter.style.transform = `scale(${c.s * stageIn}) translate(${dx}px, ${dy}px)`;
        sh.camInner.style.transform = `translate(${tx}px, ${ty}px)`;
        const ry = sh.tilt.y - Math.sign(sh.tilt.y) * sh.flat.y * k;
        const rx = sh.tilt.x - Math.sign(sh.tilt.x) * sh.flat.x * k;
        sh.device.style.transform = (sh.tilt.y || sh.tilt.x) ? `rotateY(${ry}deg) rotateX(${rx}deg)` : "none";
        // The video is hidden before its start, so the first frame covers the lead-in.
        if (sh.first) sh.first.style.opacity = t < sh.start ? "1" : "0";
      });
      if (glow) glow.style.transform = `scale(${1 + 0.06 * Math.sin((t / D) * Math.PI)})`;

      const out = seg(t, OUT_AT, OUT_DUR, inOut);
      const back = seg(t, IN_AT, IN_DUR, inOut);
      mark.style.opacity = String(1 - out + back);
      stage.style.opacity = String(seg(t, OUT_AT + 0.1, OUT_DUR, inOut) - back);
      let iconScale;
      if (t < OUT_AT) iconScale = 0.97 + 0.03 * sine(t / OUT_AT);
      else if (t < IN_AT) iconScale = 1.0 + 0.16 * seg(t, OUT_AT, OUT_DUR, pIn);
      else iconScale = 1.16 - 0.19 * seg(t, IN_AT, IN_DUR, pOut);
      icon.style.transform = `scale(${iconScale})`;
      if (cfg.extra) cfg.extra(t);
    }

    const tl = gsap.timeline({ paused: true });
    const driver = { t: 0 };
    tl.to(driver, { t: D, duration: D, ease: "none", onUpdate: () => render(driver.t) }, 0);
    render(0);
    window.__timelines["main"] = tl;
    tl.seek(0);
    return { tl, render };
  }

  return { init };
})();
