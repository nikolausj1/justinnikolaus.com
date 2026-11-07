'use strict';

const projectTabs = [...document.querySelectorAll('.index-tab')];
function selectProject(tab, moveFocus = false) {
  projectTabs.forEach(item => {
    const selected = item === tab;
    item.setAttribute('aria-selected', String(selected));
    item.tabIndex = selected ? 0 : -1;
    document.getElementById(item.getAttribute('aria-controls')).hidden = !selected;
  });
  if (moveFocus) tab.focus();
}
projectTabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectProject(tab));
  tab.addEventListener('focus', () => selectProject(tab));
  tab.addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = (index + 1) % projectTabs.length;
    if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next = (index + projectTabs.length - 1) % projectTabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = projectTabs.length - 1;
    if (next !== undefined) {
      event.preventDefault();
      selectProject(projectTabs[next], true);
    }
  });
});

const rail = document.querySelector('.shelf-rail');
if (rail) {
  const items = [...rail.querySelectorAll('.shelf-item')];
  const selectors = [...document.querySelectorAll('.shelf-selector')];
  const previous = document.querySelector('[data-step="-1"]');
  const next = document.querySelector('[data-step="1"]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let active = 0;
  let frame = 0;
  function updateControls(index) {
    active = index;
    selectors.forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
    previous.disabled = index === 0;
    next.disabled = index === items.length - 1;
  }
  function itemOffset(item) {
    return item.getBoundingClientRect().left - rail.getBoundingClientRect().left + rail.scrollLeft;
  }
  function showItem(index) {
    const clamped = Math.max(0, Math.min(items.length - 1, index));
    updateControls(clamped);
    rail.scrollTo({left: itemOffset(items[clamped]), behavior: reducedMotion.matches ? 'instant' : 'smooth'});
  }
  function syncPosition() {
    const nearest = items.reduce((best, item, i) => Math.abs(itemOffset(item) - rail.scrollLeft) < Math.abs(itemOffset(items[best]) - rail.scrollLeft) ? i : best, 0);
    updateControls(nearest);
  }
  selectors.forEach((button, i) => button.addEventListener('click', () => showItem(i)));
  previous.addEventListener('click', () => showItem(active - 1));
  next.addEventListener('click', () => showItem(active + 1));
  rail.addEventListener('scroll', () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(syncPosition);
  }, {passive: true});
  rail.addEventListener('keydown', event => {
    if (event.target !== rail) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      showItem(active + (event.key === 'ArrowRight' ? 1 : -1));
    }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      showItem(event.key === 'Home' ? 0 : items.length - 1);
    }
  });
  window.addEventListener('resize', syncPosition);
  updateControls(0);
}

// Gallery previews play once, then hold the result. The whole image is a link.
document.querySelectorAll('[data-project-preview]').forEach(video => {
  if (!('IntersectionObserver' in window)) return;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const connection = navigator.connection;
  const media = video.closest('.project-preview');
  let visible = false;
  let finished = false;
  let failed = false;
  video.muted = true;

  function shouldPlay() {
    return visible && !document.hidden && !finished && !failed &&
      !reducedMotion.matches && !connection?.saveData;
  }
  function syncPlayback() {
    if (reducedMotion.matches || connection?.saveData) media.classList.remove('preview-started');
    if (shouldPlay()) {
      video.play().catch(() => {
        // Autoplay can be blocked. The poster remains a usable project link.
        if (!video.paused) return;
        media.classList.remove('preview-started');
      });
    } else {
      video.pause();
    }
  }
  video.addEventListener('playing', () => {
    if (shouldPlay()) media.classList.add('preview-started');
    else video.pause();
  });
  video.addEventListener('ended', () => { finished = true; });
  video.addEventListener('error', () => {
    failed = true;
    media.classList.remove('preview-started');
  });
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting && entries[0].intersectionRatio >= 0.5;
    syncPlayback();
  }, {threshold: [0, 0.5]}).observe(media);
  document.addEventListener('visibilitychange', syncPlayback);
  reducedMotion.addEventListener('change', syncPlayback);
  connection?.addEventListener?.('change', syncPlayback);
});
