'use strict';
// Results carousel: LIBERO training curves, LIBERO tables, then RoboTwin 2.0 tables.
const resultSlides = document.querySelectorAll('[data-result-slide]');
let resultIndex = 0;
function showResult(index) {
  resultIndex = (index + resultSlides.length) % resultSlides.length;
  resultSlides.forEach((slide, i) => { slide.hidden = i !== resultIndex; });
  document.querySelectorAll('[data-result]').forEach(dot => {
    dot.setAttribute('aria-pressed', String(Number(dot.dataset.result) === resultIndex));
  });
}
if (resultSlides.length) {
  document.querySelector('#previous-result').addEventListener('click', () => showResult(resultIndex - 1));
  document.querySelector('#next-result').addEventListener('click', () => showResult(resultIndex + 1));
  document.querySelectorAll('[data-result]').forEach(dot => {
    dot.addEventListener('click', () => showResult(Number(dot.dataset.result)));
  });
}
document.querySelector('#copy-citation')?.addEventListener('click', async () => {
  const citation = document.querySelector('#citation');
  const status = document.querySelector('#copy-status');
  try {
    await navigator.clipboard.writeText(citation.textContent);
    status.textContent = 'Citation copied.';
  } catch {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(citation);
    selection.removeAllRanges();
    selection.addRange(range);
    status.textContent = 'Citation selected. Press Ctrl+C or ⌘C to copy.';
  }
});

// Real-world demonstrations, in the requested presentation order.
const robotVideos = [
  {name: 'sample1', file: 'sample1.mp4'},
  {name: 'sample2', file: 'sample2.mp4'},
  {name: 'sample3', file: 'sample3.mp4'},
  {name: 'sample4', file: 'sample4.mp4'}
];
const robotVideo = document.querySelector('#robot-video');
let robotVideoIndex = 0;
// Hold the last decoded frame over the player while its next source loads.
const videoCover = document.createElement('canvas');
videoCover.className = 'video-transition-cover';
videoCover.hidden = true;
videoCover.setAttribute('aria-hidden', 'true');
robotVideo.after(videoCover);
let pendingVideoFrame = null;
let videoTransition = 0;
robotVideo.addEventListener('loadedmetadata', () => {
  // Keep the player height stable while switching sources.
  if (!robotVideo.style.aspectRatio) {
    robotVideo.style.aspectRatio = `${robotVideo.videoWidth} / ${robotVideo.videoHeight}`;
  }
});
function changeRobotVideo(direction) {
  const transition = ++videoTransition;
  if (pendingVideoFrame !== null) {
    robotVideo.cancelVideoFrameCallback(pendingVideoFrame);
    pendingVideoFrame = null;
  }
  if (videoCover.hidden && robotVideo.readyState >= 2) {
    videoCover.width = robotVideo.videoWidth;
    videoCover.height = robotVideo.videoHeight;
    videoCover.getContext('2d').drawImage(robotVideo, 0, 0);
    videoCover.hidden = false;
  }
  robotVideo.pause();
  robotVideoIndex = (robotVideoIndex + direction + robotVideos.length) % robotVideos.length;
  const selected = robotVideos[robotVideoIndex];
  const source = `static/videos/${selected.file}`;
  robotVideo.querySelector('source').src = source;
  robotVideo.querySelector('a').href = source;
  robotVideo.setAttribute('aria-label', `Real-world robot demonstration ${robotVideoIndex + 1} of ${robotVideos.length}`);
  document.querySelectorAll('[data-video]').forEach(dot => {
    dot.setAttribute('aria-pressed', String(Number(dot.dataset.video) === robotVideoIndex));
  });
  const uncover = () => {
    if (transition !== videoTransition) return;
    videoCover.hidden = true;
    pendingVideoFrame = null;
  };
  robotVideo.load();
  if ('requestVideoFrameCallback' in robotVideo) {
    pendingVideoFrame = robotVideo.requestVideoFrameCallback(uncover);
  } else {
    robotVideo.addEventListener('loadeddata', () => {
      requestAnimationFrame(() => requestAnimationFrame(uncover));
    }, {once: true});
  }
  // Keep native playback available if the browser blocks automatic playback.
  robotVideo.play().catch(() => {
    if (robotVideo.readyState >= 2) uncover();
    else robotVideo.addEventListener('loadeddata', uncover, {once: true});
  });
}
document.querySelector('#previous-video').addEventListener('click', () => changeRobotVideo(-1));
document.querySelector('#next-video').addEventListener('click', () => changeRobotVideo(1));

document.querySelectorAll('[data-video]').forEach(dot => {
  dot.addEventListener('click', () => {
    const target = Number(dot.dataset.video);
    if (target !== robotVideoIndex) changeRobotVideo(target - robotVideoIndex);
  });
});

// Training-time bars grow from zero, with their values counting up, once the chart scrolls into view.
const timeChart = document.querySelector('.time-chart');
if (timeChart) {
  const bars = timeChart.querySelectorAll('.time-bar');
  const values = timeChart.querySelectorAll('.time-value[data-value]');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const drawTimeChart = progress => {
    const eased = 1 - Math.pow(1 - progress, 3);
    bars.forEach(bar => { bar.style.transform = `scaleX(${eased})`; });
    values.forEach(value => { value.textContent = `${(Number(value.dataset.value) * eased).toFixed(2)} h`; });
  };
  if (!reduceMotion && 'IntersectionObserver' in window) {
    drawTimeChart(0);
    new IntersectionObserver((entries, observer) => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      observer.disconnect();
      const start = performance.now();
      const tick = now => {
        const progress = Math.min((now - start) / 1400, 1);
        drawTimeChart(progress);
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, {threshold: 0.5}).observe(timeChart);
  }
}

// LIBERO training curves (Figure 4 of the paper), redrawn as SVG.
// Values were read from the vector data of training_performance_v2.pdf; the 10k points match Table 1.
const perfPanels = [
  {title: '(a) FastOPD at different sampling steps', yMin: 45, yMax: 85, yTicks: [50, 60, 70, 80],
    reference: {label: 'Init', value: 71.6},
    series: [
      {name: '1 step', color: '#c4a6fa', values: [48.7, 69.8, 63.2, 71.7, 78.1, 73.4, 74.4, 75.7, 75.8, 77.3]},
      {name: '2 steps', color: '#9f6ef3', values: [48.4, 68.8, 61.1, 71.5, 79.7, 76.5, 78.5, 79.3, 80.8, 81.8]},
      {name: '4 steps', color: '#7c3aed', values: [48.4, 66.9, 55.7, 70.5, 78.8, 74.4, 79.2, 79.5, 79.2, 80.3]},
      {name: '10 steps', color: '#4c1d95', values: [48.2, 64.4, 55.7, 69.2, 77.0, 73.5, 77.3, 77.7, 78.3, 79.0]}
    ]},
  {title: '(b) Comparison with baselines at 1 step', yMin: 0, yMax: 90, yTicks: [0, 20, 40, 60, 80],
    series: [
      {name: 'FastOPD (Ours)', color: '#7c3aed', marker: 'circle', ours: true, values: [48.8, 69.8, 63.2, 71.7, 78.0, 73.4, 74.4, 75.7, 75.8, 77.3]},
      {name: 'DMD', color: '#2b7bd0', marker: 'square', values: [71.6, 71.9, 74.0, 73.2, 74.8, 72.4, 72.7, 74.2, 73.4, 73.1]},
      {name: 'CTM', color: '#c2780a', marker: 'triangle', values: [41.2, 52.4, 58.1, 54.5, 63.3, 68.3, 70.2, 71.1, 71.6, 69.2]},
      {name: 'iMF', color: '#1f9e6e', marker: 'diamond', values: [47.4, 3.5, 33.5, 57.7, 45.5, 30.9, 70.9, 61.7, 67.6, 63.9]}
    ]}
];
const perfContainer = document.querySelector('#perf-charts');
if (perfContainer) {
  const W = 440, H = 290, M = {top: 14, right: 16, bottom: 44, left: 46};
  const steps = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const xOf = i => M.left + (i / (steps.length - 1)) * (W - M.left - M.right);
  const markerPath = (shape, x, y) => {
    const r = 4.2;
    if (shape === 'square') return `<rect x="${x - r + .6}" y="${y - r + .6}" width="${2 * r - 1.2}" height="${2 * r - 1.2}" rx="1"/>`;
    if (shape === 'triangle') return `<path d="M${x} ${y - r - .6}L${x + r + .4} ${y + r - .4}H${x - r - .4}Z"/>`;
    if (shape === 'diamond') return `<path d="M${x} ${y - r - .5}L${x + r + .5} ${y}L${x} ${y + r + .5}L${x - r - .5} ${y}Z"/>`;
    return `<circle cx="${x}" cy="${y}" r="${r}"/>`;
  };
  perfContainer.innerHTML = perfPanels.map((panel, p) => {
    const yOf = v => M.top + (1 - (v - panel.yMin) / (panel.yMax - panel.yMin)) * (H - M.top - M.bottom);
    const grid = panel.yTicks.map(t => `<line class="perf-grid" x1="${M.left}" x2="${W - M.right}" y1="${yOf(t)}" y2="${yOf(t)}"/><text class="perf-tick" x="${M.left - 8}" y="${yOf(t) + 4}" text-anchor="end">${t}</text>`).join('');
    const xTicks = steps.map((s, i) => `<text class="perf-tick" x="${xOf(i)}" y="${H - M.bottom + 18}" text-anchor="middle">${s}k</text>`).join('');
    const reference = panel.reference ? `<line class="perf-ref" x1="${M.left}" x2="${W - M.right}" y1="${yOf(panel.reference.value)}" y2="${yOf(panel.reference.value)}"/><text class="perf-ref-label" x="${W - M.right}" y="${yOf(panel.reference.value) - 6}" text-anchor="end">${panel.reference.label} ${panel.reference.value}</text>` : '';
    // Draw in reverse so the first-listed series (FastOPD) sits on top.
    const lines = [...panel.series].reverse().map(series => {
      const d = series.values.map((v, i) => `${i ? 'L' : 'M'}${xOf(i).toFixed(1)} ${yOf(v).toFixed(1)}`).join('');
      const marks = series.values.map((v, i) => markerPath(series.marker || 'circle', xOf(i), yOf(v))).join('');
      return `<g class="perf-series${series.ours ? ' ours' : ''}" style="--c:${series.color}"><path class="perf-line" d="${d}" pathLength="1"/><g class="perf-marks">${marks}</g></g>`;
    }).join('');
    const legend = panel.series.map(series => `<li${series.ours ? ' class="ours"' : ''}><svg viewBox="0 0 22 10" aria-hidden="true"><line x1="0" x2="22" y1="5" y2="5" stroke="${series.color}" stroke-width="2"/><g fill="${series.color}" stroke="#fff" stroke-width="1.2">${markerPath(series.marker || 'circle', 11, 5).replace(/4\.2/g, '3.4')}</g></svg>${series.name}</li>`).join('')
      + (panel.reference ? `<li><svg viewBox="0 0 22 10" aria-hidden="true"><line x1="0" x2="22" y1="5" y2="5" stroke="#8a8a8a" stroke-width="1.5" stroke-dasharray="2 3"/></svg>${panel.reference.label} (SmolVLA)</li>` : '');
    return `<div class="perf-panel" data-panel="${p}">
      <h4>${panel.title}</h4>
      <ul class="perf-legend">${legend}</ul>
      <div class="perf-plot">
        <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${panel.title}: success rate versus training step">
          ${grid}${xTicks}
          <text class="perf-axis" x="${(M.left + W - M.right) / 2}" y="${H - 6}" text-anchor="middle">Training step</text>
          <text class="perf-axis" transform="translate(12 ${(M.top + H - M.bottom) / 2}) rotate(-90)" text-anchor="middle">Success rate (%)</text>
          <line class="perf-axis-line" x1="${M.left}" x2="${W - M.right}" y1="${H - M.bottom}" y2="${H - M.bottom}"/>
          ${reference}
          <line class="perf-crosshair" y1="${M.top}" y2="${H - M.bottom}" x1="0" x2="0" hidden/>
          ${lines}
          <rect class="perf-hit" x="${M.left}" y="${M.top}" width="${W - M.left - M.right}" height="${H - M.top - M.bottom}"/>
        </svg>
        <div class="perf-tooltip" hidden></div>
      </div>
    </div>`;
  }).join('');

  // Hover: snap a crosshair to the nearest training step and list every series' value there.
  perfContainer.querySelectorAll('.perf-panel').forEach(el => {
    const panel = perfPanels[Number(el.dataset.panel)];
    const svg = el.querySelector('svg');
    const hit = el.querySelector('.perf-hit');
    const crosshair = el.querySelector('.perf-crosshair');
    const tooltip = el.querySelector('.perf-tooltip');
    const show = event => {
      const box = svg.getBoundingClientRect();
      const x = (event.clientX - box.left) / box.width * W;
      const i = Math.max(0, Math.min(steps.length - 1, Math.round((x - M.left) / (W - M.left - M.right) * (steps.length - 1))));
      crosshair.setAttribute('x1', xOf(i)); crosshair.setAttribute('x2', xOf(i)); crosshair.hidden = false;
      el.querySelectorAll('.perf-marks').forEach(g => g.querySelectorAll('*').forEach((m, k) => m.classList.toggle('active', k === i)));
      tooltip.innerHTML = `<strong>${steps[i]}k steps</strong>` + panel.series.map(series =>
        `<span${series.ours ? ' class="ours"' : ''}><i style="background:${series.color}"></i>${series.name}<b>${series.values[i].toFixed(1)}%</b></span>`).join('');
      tooltip.hidden = false;
      const left = xOf(i) / W * box.width;
      tooltip.style.left = `${left}px`;
      tooltip.classList.toggle('flip', left > box.width * 0.6);
    };
    const hide = () => {
      crosshair.hidden = true; tooltip.hidden = true;
      el.querySelectorAll('.perf-marks .active').forEach(m => m.classList.remove('active'));
    };
    hit.addEventListener('pointermove', show);
    hit.addEventListener('pointerdown', show);
    hit.addEventListener('pointerleave', hide);
  });

  // Draw the lines in once the chart scrolls into view.
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
    perfContainer.classList.add('perf-pending');
    new IntersectionObserver((entries, observer) => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      observer.disconnect();
      requestAnimationFrame(() => perfContainer.classList.replace('perf-pending', 'perf-drawn'));
    }, {threshold: 0.35}).observe(perfContainer);
  }
}

// Real-world bars grow from the baseline, with their values counting up, once they scroll into view.
const realChart = document.querySelector('.real-chart');
if (realChart && !window.matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
  const cols = realChart.querySelectorAll('.rbar-col');
  const labels = realChart.querySelectorAll('.rbar-value');
  const draw = progress => {
    const eased = 1 - Math.pow(1 - progress, 3);
    cols.forEach(col => { col.style.transform = `scaleY(${eased})`; });
    labels.forEach(label => {
      const unit = label.textContent.endsWith('%') ? '%' : ' s';
      label.textContent = `${(Number(label.dataset.value) * eased).toFixed(Number(label.dataset.digits))}${unit}`;
    });
  };
  draw(0);
  new IntersectionObserver((entries, observer) => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    observer.disconnect();
    const start = performance.now();
    const tick = now => {
      const progress = Math.min((now - start) / 1400, 1);
      draw(progress);
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, {threshold: 0.4}).observe(realChart);
}

// Hero reel: click the video or the button to play/pause; drag or use arrow keys on the bar to seek.
const reelVideo = document.getElementById('reel-video');
if (reelVideo) {
  const play = document.getElementById('reel-play'), ico = document.getElementById('reel-ico');
  const seek = document.getElementById('reel-seek'), fill = document.getElementById('reel-fill');
  const time = document.getElementById('reel-time');
  const PAUSE = '<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>';
  const PLAY = '<path d="M8 5.5v13a1 1 0 0 0 1.52.85l10.4-6.5a1 1 0 0 0 0-1.7L9.52 4.65A1 1 0 0 0 8 5.5z"/>';
  const fmt = t => { t = Math.max(0, t | 0); return `${t / 60 | 0}:${String(t % 60).padStart(2, '0')}`; };
  const sync = () => {
    const on = !reelVideo.paused;
    ico.innerHTML = on ? PAUSE : PLAY;
    play.setAttribute('aria-label', on ? 'Pause' : 'Play');
  };
  const toggle = () => { if (reelVideo.paused) reelVideo.play().catch(() => {}); else reelVideo.pause(); };
  const seekTo = t => { if (reelVideo.duration) reelVideo.currentTime = Math.min(reelVideo.duration, Math.max(0, t)); };
  const seekToPointer = e => {
    const r = seek.getBoundingClientRect();
    seekTo(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * reelVideo.duration);
  };
  reelVideo.addEventListener('click', toggle);
  play.addEventListener('click', toggle);
  reelVideo.addEventListener('play', sync);
  reelVideo.addEventListener('pause', sync);
  reelVideo.addEventListener('timeupdate', () => {
    if (!reelVideo.duration) return;
    const pct = 100 * reelVideo.currentTime / reelVideo.duration;
    fill.style.width = `${pct}%`;
    seek.setAttribute('aria-valuenow', Math.round(pct));
    time.textContent = `${fmt(reelVideo.currentTime)} / ${fmt(reelVideo.duration)}`;
  });
  let dragging = false;
  seek.addEventListener('pointerdown', e => { dragging = true; seek.setPointerCapture(e.pointerId); seekToPointer(e); });
  seek.addEventListener('pointermove', e => { if (dragging) seekToPointer(e); });
  seek.addEventListener('pointerup', () => { dragging = false; });
  seek.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') seekTo(reelVideo.currentTime + 5);
    else if (e.key === 'ArrowLeft') seekTo(reelVideo.currentTime - 5);
    else if (e.key === ' ' || e.key === 'Enter') toggle();
    else return;
    e.preventDefault();
  });
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) reelVideo.pause();
  sync();
}

// Section nav: highlight the section currently under the nav bar and keep its link in view.
const sectionNav = document.querySelector('.section-nav');
if (sectionNav) {
  const links = [...sectionNav.querySelectorAll('a')];
  const targets = links.map(a => document.querySelector(a.getAttribute('href')));
  let current = null;
  const update = () => {
    // a section counts as current once its top passes a quarter of the way down the viewport
    const line = sectionNav.offsetHeight + window.innerHeight * 0.25;
    let idx = -1;
    targets.forEach((el, i) => { if (el && el.getBoundingClientRect().top <= line) idx = i; });
    // at the very bottom, the last (short) section can never reach the line
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) idx = links.length - 1;
    const next = links[idx] || null;  // nothing is highlighted above the first section
    if (next === current) return;
    current?.classList.remove('active');
    current?.removeAttribute('aria-current');
    current = next;
    if (!current) return;
    current.classList.add('active');
    current.setAttribute('aria-current', 'true');
    const r = current.getBoundingClientRect(), n = sectionNav.getBoundingClientRect();
    if (r.left < n.left || r.right > n.right) sectionNav.scrollBy({left: r.left - n.left - (n.width - r.width) / 2, behavior: 'smooth'});
  };
  let queued = false;
  window.addEventListener('scroll', () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; update(); });
  }, {passive: true});
  window.addEventListener('resize', update);
  update();
}
