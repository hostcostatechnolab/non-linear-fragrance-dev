function fwInitOne(root) {
  const svg = root.querySelector('[data-wheel]');
  const dataEl = root.querySelector('script[data-notes]');
  if (!svg || !dataEl) return;

  let notesRaw;
  try {
    notesRaw = JSON.parse(dataEl.textContent);
  } catch (e) {
    return;
  }
  if (!Array.isArray(notesRaw) || !notesRaw.length) return;
  notesRaw = notesRaw.map(n => ({ ...n, weights: n.weights || {} }));

  const NS = 'http://www.w3.org/2000/svg';
  const CX = 200;
  const CY = 200;
  const R = 190;

  const NOTES = notesRaw.map(n => ({
    key: n.key,
    label: n.label,
    img: n.img,
    url: n.url,
    gid: n.gid,
    handle: n.handle,
    group: n.group,
    groupLabel: n.groupLabel,
  }));
  const STAGE_KEYS = ['0h', '1h', '2h', '6h', '12h'];
  const KEYFRAMES = STAGE_KEYS.map(sk => ({
    weights: Object.fromEntries(notesRaw.map(n => [n.key, n.weights[sk] || 0])),
  }));

  const defs = document.createElementNS(NS, 'defs');
  svg.appendChild(defs);

  const wedges = NOTES.map(note => {
    const clipShape = document.createElementNS(NS, 'path');
    const clipPath = document.createElementNS(NS, 'clipPath');
    clipPath.setAttribute('id', `fw-clip-${note.key}-${Math.random().toString(36).slice(2)}`);
    clipPath.appendChild(clipShape);
    defs.appendChild(clipPath);
    return { note, clipShape, clipId: clipPath.getAttribute('id') };
  });

  wedges.forEach(w => {
    const image = document.createElementNS(NS, 'image');
    if (w.note.img) {
      image.setAttribute('href', w.note.img);
      image.setAttributeNS('http://www.w3.org/1999/xlink', 'href', w.note.img);
    }
    image.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    image.setAttribute('clip-path', `url(#${w.clipId})`);
    image.setAttribute('class', 'fw-wedge-image');
    svg.appendChild(image);
    w.image = image;
  });

  wedges.forEach(w => {
    const outline = document.createElementNS(NS, 'path');
    outline.setAttribute('class', 'fw-wedge-outline');
    svg.appendChild(outline);
    w.outline = outline;
  });

  const rim = document.createElementNS(NS, 'circle');
  rim.setAttribute('class', 'fw-wheel-rim');
  rim.setAttribute('cx', CX);
  rim.setAttribute('cy', CY);
  rim.setAttribute('r', R);
  svg.appendChild(rim);
  const overlay = root.querySelector('.fw-click-overlay');
  const overlayImg = root.querySelector('.fw-click-image');
  const loader = root.querySelector('[data-loader]');
  const trackUrl = root.dataset.trackUrl || '';
  const blockId = root.dataset.blockId || '';

  function showLoader() {
    if (loader) loader.classList.add('active');
  }

  function hideLoader() {
    if (loader) loader.classList.remove('active');
  }

  function trackClick(w) {
    if (!trackUrl || !w.note.gid) return;
    try {
      const payload = JSON.stringify({
        gid: w.note.gid,
        handle: w.note.handle,
        label: w.note.label,
        group: w.note.group,
        groupLabel: w.note.groupLabel,
        blockId,
      });
      if (navigator.sendBeacon) {
        navigator.sendBeacon(trackUrl, new Blob([payload], { type: 'application/json' }));
        setTimeout(hideLoader, 1500);
      } else {
        fetch(trackUrl, {
          method: 'POST',
          keepalive: true,
          headers: { 'Content-Type': 'application/json' },
          body: payload,
        }).then(() => setTimeout(hideLoader, 1500)).catch(() => setTimeout(hideLoader, 1500));
      }
    } catch (e) {
      // Tracking must never block the click-through navigation.
      setTimeout(hideLoader, 1500);
    }
  }

  function animateImage(w){
      showLoader();
      trackClick(w);

      const rect = w.image.getBoundingClientRect();
      const isMobile = window.innerWidth <= 767;

      // Prefetch destination so navigation feels instant, not a blank load
      if (w.note.url) {
          const prefetchLink = document.createElement('link');
          prefetchLink.rel = 'prefetch';
          prefetchLink.href = w.note.url;
          document.head.appendChild(prefetchLink);
      }

      overlay.classList.add("active");

      overlayImg.src = w.note.img;

      if (isMobile) {
          // ---- MOBILE: transform-only scale-up in place, no jerk ----

          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;

          overlayImg.style.transition = "none";
          overlayImg.style.top = (centerY - rect.height / 2) + "px";
          overlayImg.style.left = (centerX - rect.width / 2) + "px";
          overlayImg.style.width = rect.width + "px";
          overlayImg.style.height = rect.height + "px";
          overlayImg.style.borderRadius = "50%";
          overlayImg.style.opacity = "1";
          overlayImg.style.willChange = "transform, opacity";
          overlayImg.style.transformOrigin = "center center";
          overlayImg.style.transform = "scale(1)";

          // force repaint so start-state locks in before transition
          overlayImg.offsetWidth;

          const DURATION = 1400;
          const FADE_DURATION = 450;
          const FADE_DELAY = Math.max(DURATION - FADE_DURATION, 0);

          // scale from the clicked wedge size up to 650px, purely via transform
          const targetScale = (650 / rect.width) * 1.6;

          requestAnimationFrame(()=>{
              overlayImg.style.transition =
              `transform ${DURATION}ms cubic-bezier(.25,.1,.25,1),
              opacity ${FADE_DURATION}ms ease-out ${FADE_DELAY}ms`;

              overlayImg.style.transform = `scale(${targetScale})`;
              overlayImg.style.opacity = "0";
          });

          let navigated = false;
          function goToUrl(evt){
              if (evt && evt.propertyName && evt.propertyName !== "opacity") return;
              if (navigated) return;
              navigated = true;
              overlayImg.removeEventListener("transitionend", goToUrl);
              window.location.href = w.note.url;
          }
          overlayImg.addEventListener("transitionend", goToUrl);
          setTimeout(goToUrl, FADE_DELAY + FADE_DURATION + 100);

          return;
      }

      // ---- DESKTOP: existing left-move animation, unchanged ----

      overlayImg.style.transition = "none";

      overlayImg.style.top = rect.top + "px";
      overlayImg.style.left = (window.innerWidth * 0.30) + "px";

      overlayImg.style.width = rect.width + "px";
      overlayImg.style.height = rect.height + "px";

      overlayImg.style.borderRadius = "50%";
      overlayImg.style.opacity = "1";

      overlayImg.style.willChange = "top, left, width, height, opacity";

      overlayImg.style.transform = "translateY(0) scale(1)";

      overlayImg.offsetWidth;

      const DURATION = 1800;
      const FADE_DURATION = 500;
      const FADE_DELAY = Math.max(DURATION - FADE_DURATION, 0);

      requestAnimationFrame(()=>{

          overlayImg.style.transition =
          `top ${DURATION}ms cubic-bezier(.25,.1,.25,1),
          left ${DURATION}ms cubic-bezier(.25,.1,.25,1),
          width ${DURATION}ms cubic-bezier(.25,.1,.25,1),
          height ${DURATION}ms cubic-bezier(.25,.1,.25,1),
          transform ${DURATION}ms cubic-bezier(.25,.1,.25,1),
          opacity ${FADE_DURATION}ms ease-out ${FADE_DELAY}ms`;

          overlayImg.style.left = "-8vw";

          overlayImg.style.top = "50%";

          overlayImg.style.width = "650px";
          overlayImg.style.height = "650px";

          overlayImg.style.transform =
          "translateY(-50%) scale(1.8)";

          overlayImg.style.borderRadius = "50%";

          overlayImg.style.opacity = "0";

      });

      let navigated = false;
      function goToUrl(evt){
          if (evt && evt.propertyName && evt.propertyName !== "opacity") return;
          if (navigated) return;
          navigated = true;
          overlayImg.removeEventListener("transitionend", goToUrl);
          window.location.href = w.note.url;
      }

      overlayImg.addEventListener("transitionend", goToUrl);
      setTimeout(goToUrl, FADE_DELAY + FADE_DURATION + 100);

  }

  wedges.forEach(w => {
    const label = document.createElementNS(NS, 'text');
    label.setAttribute('class', 'fw-wedge-label');
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('dominant-baseline', 'middle');
    label.textContent = w.note.label || '';
    svg.appendChild(label);
    w.label = label;

    w.image.addEventListener('pointerenter', () => label.classList.add('is-visible'));
    w.image.addEventListener('pointerleave', () => label.classList.remove('is-visible'));
    w.image.addEventListener("click",()=>{

        animateImage(w);

    });
  });

  // --- Weighted Voronoi (power diagram) tessellation of the circle -------
  const seedRadius = R * 0.55;
  const seeds = NOTES.map((note, i) => {
    const angle = -90 + i * (360 / NOTES.length);
    const rad = (angle * Math.PI) / 180;
    return { x: CX + seedRadius * Math.cos(rad), y: CY + seedRadius * Math.sin(rad) };
  });

  const CIRCLE_SIDES = 72;
  const BOUNDARY = Array.from({ length: CIRCLE_SIDES }, (_, i) => {
    const a = (i / CIRCLE_SIDES) * 2 * Math.PI;
    return { x: CX + R * Math.cos(a), y: CY + R * Math.sin(a) };
  });

  function clipHalfPlane(poly, B, n) {
    const side = p => (p.x - B.x) * n.x + (p.y - B.y) * n.y;
    const result = [];
    for (let i = 0; i < poly.length; i++) {
      const curr = poly[i];
      const prev = poly[(i - 1 + poly.length) % poly.length];
      const currSide = side(curr);
      const prevSide = side(prev);
      const currIn = currSide <= 0;
      const prevIn = prevSide <= 0;
      if (currIn !== prevIn) {
        const t = prevSide / (prevSide - currSide);
        result.push({ x: prev.x + t * (curr.x - prev.x), y: prev.y + t * (curr.y - prev.y) });
      }
      if (currIn) result.push(curr);
    }
    return result;
  }

  function powerCell(i, powers) {
    let poly = BOUNDARY;
    const si = seeds[i];
    for (let j = 0; j < seeds.length; j++) {
      if (j === i || poly.length === 0) continue;
      const sj = seeds[j];
      const dx = sj.x - si.x;
      const dy = sj.y - si.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      const nx = dx / len;
      const ny = dy / len;
      const shift = (powers[i] - powers[j]) / (2 * len);
      const B = { x: si.x + dx / 2 + shift * nx, y: si.y + dy / 2 + shift * ny };
      poly = clipHalfPlane(poly, B, { x: nx, y: ny });
    }
    return poly;
  }

  function polygonArea(poly) {
    if (poly.length < 3) return 0;
    let a = 0;
    for (let i = 0; i < poly.length; i++) {
      const p1 = poly[i];
      const p2 = poly[(i + 1) % poly.length];
      a += p1.x * p2.y - p2.x * p1.y;
    }
    return Math.abs(a) / 2;
  }

  const powers = new Array(NOTES.length).fill(0);
  const FIT_ITERATIONS = 18;
  const LEARNING_RATE = seedRadius * seedRadius * 0.6;

  function computeCells(weights) {
    const total = NOTES.reduce((sum, n) => sum + (weights[n.key] || 0), 0) || 1;
    const targetFrac = NOTES.map(n => (weights[n.key] || 0) / total);
    let cells = [];
    for (let iter = 0; iter < FIT_ITERATIONS; iter++) {
      cells = NOTES.map((_, i) => powerCell(i, powers));
      const areas = cells.map(polygonArea);
      const totalArea = areas.reduce((a, b) => a + b, 0) || 1;
      for (let i = 0; i < NOTES.length; i++) {
        const err = targetFrac[i] - areas[i] / totalArea;
        powers[i] += LEARNING_RATE * err;
      }
    }
    return cells;
  }

  function updateWheel(weights) {
    const cells = computeCells(weights);
    wedges.forEach((w, i) => {
      const poly = cells[i];
      if (poly.length < 3) {
        w.clipShape.setAttribute('d', '');
        w.outline.setAttribute('d', '');
        w.image.setAttribute('width', 0);
        w.image.setAttribute('height', 0);
        w.label.classList.remove('is-visible');
        return;
      }
      const d = `M${poly.map(p => `${p.x},${p.y}`).join('L')}Z`;
      w.clipShape.setAttribute('d', d);
      w.outline.setAttribute('d', d);

      const xs = poly.map(p => p.x);
      const ys = poly.map(p => p.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      const size = Math.max(maxX - minX, maxY - minY, 1) * 1.08;
      w.image.setAttribute('x', (minX + maxX) / 2 - size / 2);
      w.image.setAttribute('y', (minY + maxY) / 2 - size / 2);
      w.image.setAttribute('width', size);
      w.image.setAttribute('height', size);

      const centroidX = poly.reduce((s, p) => s + p.x, 0) / poly.length;
      const centroidY = poly.reduce((s, p) => s + p.y, 0) / poly.length;
      w.label.setAttribute('x', centroidX);
      w.label.setAttribute('y', centroidY);
    });
  }

  function weightsAtProgress(progress) {
    const segCount = KEYFRAMES.length - 1;
    const segProgress = progress * segCount;
    let idx = Math.floor(segProgress);
    if (idx >= segCount) idx = segCount - 1;
    if (idx < 0) idx = 0;
    const localT = segProgress - idx;
    const a = KEYFRAMES[idx].weights;
    const b = KEYFRAMES[idx + 1].weights;
    const result = {};
    NOTES.forEach(n => {
      result[n.key] = a[n.key] + (b[n.key] - a[n.key]) * localT;
    });
    return result;
  }

  const sliderFill = root.querySelector('[data-slider-fill]');
  const sliderThumb = root.querySelector('[data-slider-thumb]');
  const sliderTrack = root.querySelector('[data-slider-track]');
  const ticks = Array.from(root.querySelectorAll('.fw-tick'));
  const playBtn = root.querySelector('[data-play]');

  let currentProgress = 0;
  let playing = false;
  let rafId = null;

  function render(progress) {
    currentProgress = Math.min(1, Math.max(0, progress));
    updateWheel(weightsAtProgress(currentProgress));
    const pct = currentProgress * 100;
    sliderFill.style.width = pct + '%';
    sliderThumb.style.left = pct + '%';
    ticks.forEach(tick => {
      const tp = parseFloat(tick.dataset.progress);
      tick.classList.toggle('is-active', currentProgress >= tp - 0.001);
    });
  }

  const DURATION = 9000;

  function stopPlaying() {
    playing = false;
    playBtn.classList.remove('is-playing');
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }

  function play() {
    if (playing) return;
    if (currentProgress >= 1) currentProgress = 0;
    playing = true;
    playBtn.classList.add('is-playing');
    const startProgress = currentProgress;
    let startTime = null;

    function step(ts) {
      if (startTime === null) startTime = ts;
      const elapsed = ts - startTime;
      const progress = startProgress + elapsed / DURATION;
      if (progress >= 1) {
        render(1);
        stopPlaying();
        return;
      }
      render(progress);
      rafId = requestAnimationFrame(step);
    }
    rafId = requestAnimationFrame(step);
  }

  playBtn.addEventListener('click', () => {
    if (playing) stopPlaying();
    else play();
  });

  function progressFromEvent(evt) {
    const rect = sliderTrack.getBoundingClientRect();
    const x = evt.clientX - rect.left;
    return Math.min(1, Math.max(0, x / rect.width));
  }

  let dragging = false;
  sliderTrack.addEventListener('pointerdown', evt => {
    dragging = true;
    stopPlaying();
    render(progressFromEvent(evt));
  });
  window.addEventListener('pointermove', evt => {
    if (dragging) render(progressFromEvent(evt));
  });
  window.addEventListener('pointerup', () => {
    dragging = false;
  });

  root._fwCleanup = () => {
    stopPlaying();
  };

  render(0);
}

function fwInitAll() {
  document.querySelectorAll('[data-fragrance-wheel]').forEach(root => {
    if (root.dataset.fwInitialized) return;
    root.dataset.fwInitialized = 'true';
    fwInitOne(root);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', fwInitAll);
} else {
  fwInitAll();
}

document.addEventListener('shopify:section:load', event => {
  const root = event.target.querySelector('[data-fragrance-wheel]');
  if (!root) return;
  delete root.dataset.fwInitialized;
  fwInitOne(root);
  root.dataset.fwInitialized = 'true';
});

document.addEventListener('shopify:section:unload', event => {
  const root = event.target.querySelector('[data-fragrance-wheel]');
  if (root && root._fwCleanup) root._fwCleanup();
});
