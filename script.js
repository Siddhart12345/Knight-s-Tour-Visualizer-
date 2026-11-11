'use strict';

const KNIGHT_MOVES = [
  [-2, -1], [-2, 1],
  [-1, -2], [-1, 2],
  [1, -2], [1, 2],
  [2, -1], [2, 1],
];

const NODE_LIMIT = 2_000_000;
const SQUARE_SIZE_BASE = 62;

const SPEED_MS = [750, 550, 400, 260, 160, 95, 55, 28, 12, 4];

const KNIGHT_SVG = `<svg class="knight-svg" viewBox="0 0 45 45" aria-hidden="true">
  <path fill-rule="evenodd" clip-rule="evenodd" fill="currentColor" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round" d="
    M 22,10 C 32.5,11 38.5,18 38,39 L 15,39 C 15,30 25,32.5 23,18
    C 24.38,20.91 18.45,25.37 16,27 C 13,29 13.18,31.34 11,31 C 9.958,30.06 12.41,27.96 11,28 C 10,28 11.19,29.23 10,30 C 9,30 5.997,31 6,26 C 6,24 12,14 12,14 C 12,14 13.89,12.1 14,10.5 C 13.27,9.506 13.5,8.5 13.5,7.5 C 14.5,6.5 16.5,10 16.5,10 L 18.5,10 C 18.5,10 19.28,8.008 21,7 C 22,7 22,10 22,10 Z
    M 9.5 25.5 A 0.7 0.7 0 1 0 8.1 25.5 A 0.7 0.7 0 1 0 9.5 25.5 Z
    M 16.2 15.5 A 0.8 1.8 30 1 0 14.8 14.7 A 0.8 1.8 30 1 0 16.2 15.5 Z
  " />
</svg>`;

let N = 8;
let startR = -1, startC = -1;
let visited = [];
let pathOrder = [];
let currentR = -1, currentC = -1;

let solver = null;
let animHandle = null;
let isRunning = false;
let isPaused = false;
let isFinished = false;

let statsMovesCount = 0;
let statsBacktracks = 0;
let statsNodes = 0;
let statsStartTime = 0;
let statsTimerHandle = null;

const boardGrid = document.getElementById('board-grid');
const boardWrap = document.getElementById('board-wrap');
const pathSvg = document.getElementById('path-svg');
const colLabelsTop = document.getElementById('col-labels-top');
const colLabelsBot = document.getElementById('col-labels-bottom');
const rowLabelsLeft = document.getElementById('row-labels-left');
const rowLabelsRight = document.getElementById('row-labels-right');
const boardHint = document.getElementById('board-hint');
const moveLog = document.getElementById('move-log');

const boardSizeSel = document.getElementById('board-size');
const algoSel = document.getElementById('algo-select');
const tiebreakSel = document.getElementById('tiebreak-select');
const tiebreakRow = document.getElementById('tiebreak-row');
const showDegreesCb = document.getElementById('show-degrees');
const showPathCb = document.getElementById('show-path');
const speedSlider = document.getElementById('speed-slider');
const speedLabel = document.getElementById('speed-label');

const btnRun = document.getElementById('btn-run');
const btnPause = document.getElementById('btn-pause');
const btnStep = document.getElementById('btn-step');
const btnReset = document.getElementById('btn-reset');
const btnCompare = document.getElementById('btn-compare');
const themeToggle = document.getElementById('theme-toggle');
const themeText = document.getElementById('theme-text');

const statMoves = document.getElementById('stat-moves');
const statBT = document.getElementById('stat-backtracks');
const statNodes = document.getElementById('stat-nodes');
const statTime = document.getElementById('stat-time');
const statStatus = document.getElementById('stat-status');
const tourTypeDisplay = document.getElementById('tour-type-display');

const compSection = document.getElementById('comparison-section');
const compTbody = document.getElementById('comp-tbody');
const compNote = document.getElementById('comp-note');
const segButtons = document.querySelectorAll('.seg-btn');

function colLetter(c) {
  return String.fromCharCode(97 + c);
}

function toCoord(r, c) {
  return colLetter(c) + (N - r);
}

function getValidMoves(r, c, vis, n) {
  const moves = [];
  for (const [dr, dc] of KNIGHT_MOVES) {
    const nr = r + dr, nc = c + dc;
    if (nr >= 0 && nr < n && nc >= 0 && nc < n && vis[nr][nc] === 0) {
      moves.push([nr, nc]);
    }
  }
  return moves;
}

function countOnwardMoves(r, c, vis, n) {
  return getValidMoves(r, c, vis, n).length;
}

function warnsdorffSort(moves, vis, n, tiebreak) {
  const centre = (n - 1) / 2;

  const annotated = moves.map(([r, c]) => {
    const deg = countOnwardMoves(r, c, vis, n);
    const dist = Math.sqrt((r - centre) ** 2 + (c - centre) ** 2);
    return { r, c, deg, dist };
  });

  annotated.sort((a, b) => {
    if (a.deg !== b.deg) return a.deg - b.deg;
    if (tiebreak === 'pohl') return a.dist - b.dist;
    if (tiebreak === 'random') return Math.random() - 0.5;
    return 0;
  });

  return annotated.map(({ r, c }) => [r, c]);
}

function makeMatrix(n) {
  return Array.from({ length: n }, () => new Array(n).fill(0));
}

function isKnightMove(r1, c1, r2, c2) {
  const dr = Math.abs(r1 - r2), dc = Math.abs(c1 - c2);
  return (dr === 2 && dc === 1) || (dr === 1 && dc === 2);
}

function* warnsdorffSolver(sr, sc, n, tiebreak) {
  const vis = makeMatrix(n);
  vis[sr][sc] = 1;
  yield { type: 'visit', r: sr, c: sc, moveNum: 1 };

  let r = sr, c = sc;
  for (let move = 2; move <= n * n; move++) {
    const candidates = getValidMoves(r, c, vis, n);
    if (candidates.length === 0) {
      yield { type: 'failed', reason: `No onward moves from ${toCoord(r, c)} at move ${move}.` };
      return;
    }
    const sorted = warnsdorffSort(candidates, vis, n, tiebreak);
    const [nr, nc] = sorted[0];
    vis[nr][nc] = move;
    r = nr; c = nc;
    yield { type: 'visit', r, c, moveNum: move };
  }
  yield { type: 'solved' };
}

function* backtrackSolver(sr, sc, n) {
  const vis = makeMatrix(n);
  const stack = [];

  vis[sr][sc] = 1;
  yield { type: 'visit', r: sr, c: sc, moveNum: 1 };

  stack.push({ r: sr, c: sc, moveIndex: 0, candidates: getValidMoves(sr, sc, vis, n) });

  const target = n * n;

  while (stack.length > 0) {
    const frame = stack[stack.length - 1];
    const { r, c, candidates } = frame;

    if (stack.length === target) {
      yield { type: 'solved' };
      return;
    }

    let moved = false;
    while (frame.moveIndex < candidates.length) {
      const [nr, nc] = candidates[frame.moveIndex++];
      if (vis[nr][nc] === 0) {
        const moveNum = stack.length + 1;
        vis[nr][nc] = moveNum;
        yield { type: 'visit', r: nr, c: nc, moveNum };
        stack.push({ r: nr, c: nc, moveIndex: 0, candidates: getValidMoves(nr, nc, vis, n) });
        moved = true;
        break;
      }
    }

    if (!moved) {
      stack.pop();
      vis[r][c] = 0;
      yield { type: 'backtrack', r, c };
    }
  }

  yield { type: 'failed', reason: 'No complete tour found (backtracking search exhausted).' };
}

function* hybridSolver(sr, sc, n, tiebreak) {
  const vis = makeMatrix(n);

  const sortedStart = warnsdorffSort(getValidMoves(sr, sc, vis, n), vis, n, tiebreak);
  vis[sr][sc] = 1;
  yield { type: 'visit', r: sr, c: sc, moveNum: 1 };

  const stack = [{ r: sr, c: sc, moveIndex: 0, candidates: sortedStart }];
  const target = n * n;

  while (stack.length > 0) {
    const frame = stack[stack.length - 1];
    const { r, c } = frame;

    if (stack.length === target) {
      yield { type: 'solved' };
      return;
    }

    let moved = false;
    while (frame.moveIndex < frame.candidates.length) {
      const [nr, nc] = frame.candidates[frame.moveIndex++];
      if (vis[nr][nc] === 0) {
        const moveNum = stack.length + 1;
        vis[nr][nc] = moveNum;
        const nextCandidates = warnsdorffSort(getValidMoves(nr, nc, vis, n), vis, n, tiebreak);
        yield { type: 'visit', r: nr, c: nc, moveNum };
        stack.push({ r: nr, c: nc, moveIndex: 0, candidates: nextCandidates });
        moved = true;
        break;
      }
    }

    if (!moved) {
      stack.pop();
      vis[r][c] = 0;
      yield { type: 'backtrack', r, c };
    }
  }

  yield { type: 'failed', reason: 'No complete tour found.' };
}

function solveWarnsdorffSync(sr, sc, n, tiebreak) {
  const vis = makeMatrix(n);
  const t0 = performance.now();
  vis[sr][sc] = 1;
  let r = sr, c = sc;
  let moves = 1;

  for (let step = 2; step <= n * n; step++) {
    const candidates = getValidMoves(r, c, vis, n);
    if (candidates.length === 0) {
      return { solved: false, moves, backtracks: 0, nodes: moves, time: (performance.now() - t0) / 1000, limitReached: false };
    }
    const sorted = warnsdorffSort(candidates, vis, n, tiebreak);
    [r, c] = sorted[0];
    vis[r][c] = step;
    moves++;
  }
  return { solved: true, moves, backtracks: 0, nodes: moves, time: (performance.now() - t0) / 1000, limitReached: false };
}

function solveBacktrackSync(sr, sc, n, nodeLimit) {
  const vis = makeMatrix(n);
  const t0 = performance.now();
  let backtracks = 0, nodes = 1;
  const target = n * n;

  vis[sr][sc] = 1;
  const stack = [{ r: sr, c: sc, mi: 0, cands: getValidMoves(sr, sc, vis, n) }];

  while (stack.length > 0) {
    if (nodes >= nodeLimit) {
      return { solved: false, moves: stack.length, backtracks, nodes, time: (performance.now() - t0) / 1000, limitReached: true };
    }

    const frame = stack[stack.length - 1];

    if (stack.length === target) {
      return { solved: true, moves: stack.length, backtracks, nodes, time: (performance.now() - t0) / 1000, limitReached: false };
    }

    let moved = false;
    while (frame.mi < frame.cands.length) {
      const [nr, nc] = frame.cands[frame.mi++];
      if (vis[nr][nc] === 0) {
        nodes++;
        vis[nr][nc] = stack.length + 1;
        stack.push({ r: nr, c: nc, mi: 0, cands: getValidMoves(nr, nc, vis, n) });
        moved = true;
        break;
      }
    }

    if (!moved) {
      const { r, c } = stack.pop();
      vis[r][c] = 0;
      backtracks++;
    }
  }

  return { solved: false, moves: 0, backtracks, nodes, time: (performance.now() - t0) / 1000, limitReached: false };
}

function squareSize() {
  let maxW;
  if (window.innerWidth <= 640) {
    maxW = Math.min(window.innerWidth - 72, 330);
  } else if (window.innerWidth <= 900) {
    maxW = Math.min(window.innerWidth - 88, 440);
  } else {
    maxW = Math.min(window.innerWidth * 0.48, 540);
  }
  return Math.max(22, Math.min(SQUARE_SIZE_BASE, Math.floor(maxW / N)));
}

function renderLabels() {
  const sz = squareSize();
  const colLetters = 'abcdefghijkl'.slice(0, N);
  const isMobile = window.innerWidth <= 640;
  const labelW = isMobile ? 18 : 24;

  [colLabelsTop, colLabelsBot].forEach(el => {
    el.innerHTML = '';
    el.style.marginLeft = `${labelW}px`;
    for (let c = 0; c < N; c++) {
      const lbl = document.createElement('div');
      lbl.className = 'col-label';
      lbl.style.width = sz + 'px';
      lbl.textContent = colLetters[c];
      el.appendChild(lbl);
    }
  });

  [rowLabelsLeft, rowLabelsRight].forEach(el => {
    el.innerHTML = '';
    for (let r = 0; r < N; r++) {
      const lbl = document.createElement('div');
      lbl.className = 'row-label';
      lbl.style.height = sz + 'px';
      lbl.style.width = `${labelW}px`;
      lbl.textContent = N - r;
      el.appendChild(lbl);
    }
  });
}

function renderBoard() {
  const sz = squareSize();
  boardGrid.innerHTML = '';
  boardGrid.style.gridTemplateColumns = `repeat(${N}, ${sz}px)`;
  boardGrid.style.gridTemplateRows = `repeat(${N}, ${sz}px)`;
  boardGrid.style.width = sz * N + 'px';
  boardGrid.style.height = sz * N + 'px';

  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const sq = document.createElement('div');
      sq.className = 'square ' + ((r + c) % 2 === 0 ? 'light' : 'dark');
      sq.id = `sq-${r}-${c}`;
      sq.setAttribute('data-r', r);
      sq.setAttribute('data-c', c);
      sq.setAttribute('data-coord', toCoord(r, c));
      sq.setAttribute('role', 'gridcell');
      sq.setAttribute('aria-label', toCoord(r, c));
      sq.addEventListener('click', onSquareClick);
      boardGrid.appendChild(sq);
    }
  }

  renderLabels();
  updateAllSquares();
}

function updateAllSquares() {
  const showDeg = showDegreesCb.checked && !isFinished;

  let reachableDegrees = {};
  let chosenR = -1, chosenC = -1;
  if (showDeg && currentR >= 0 && isRunning) {
    const candidates = getValidMoves(currentR, currentC, visited, N);
    for (const [nr, nc] of candidates) {
      reachableDegrees[`${nr}-${nc}`] = countOnwardMoves(nr, nc, visited, N);
    }
    if (candidates.length > 0) {
      const sorted = warnsdorffSort(candidates, visited, N, tiebreakSel.value);
      [chosenR, chosenC] = sorted[0];
    }
  }

  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const sq = document.getElementById(`sq-${r}-${c}`);
      if (!sq) continue;
      sq.innerHTML = '';

      const isStart = r === startR && c === startC;
      const isCurrent = r === currentR && c === currentC;
      const moveNum = visited[r][c];

      let cls = 'square ' + ((r + c) % 2 === 0 ? 'light' : 'dark');
      if (isStart && moveNum > 0) cls += ' start';
      if (moveNum > 0 && !isCurrent) cls += ' visited';
      if (isCurrent) cls += ' current';
      sq.className = cls;

      if (moveNum > 0) {
        const badge = document.createElement('span');
        badge.className = 'move-num';
        badge.textContent = moveNum;
        sq.appendChild(badge);
      }

      if (isCurrent) {
        const icon = document.createElement('div');
        icon.className = 'knight-icon';
        icon.innerHTML = KNIGHT_SVG;
        sq.appendChild(icon);
      }

      const key = `${r}-${c}`;
      if (showDeg && key in reachableDegrees && moveNum === 0) {
        const hint = document.createElement('span');
        hint.className = 'degree-hint' + (r === chosenR && c === chosenC ? ' chosen' : '');
        hint.textContent = reachableDegrees[key];
        sq.appendChild(hint);
      }
    }
  }

  pathSvg.style.display = showPathCb.checked ? '' : 'none';
}

function updateSquare(r, c, extraClass) {
  const sq = document.getElementById(`sq-${r}-${c}`);
  if (!sq) return;
  sq.innerHTML = '';

  const isStart = r === startR && c === startC;
  const isCurrent = r === currentR && c === currentC;
  const moveNum = visited[r][c];

  let cls = 'square ' + ((r + c) % 2 === 0 ? 'light' : 'dark');
  if (isStart && moveNum > 0) cls += ' start';
  if (moveNum > 0 && !isCurrent) cls += ' visited';
  if (isCurrent) cls += ' current';
  if (extraClass) cls += ' ' + extraClass;
  sq.className = cls;

  if (moveNum > 0) {
    const badge = document.createElement('span');
    badge.className = 'move-num';
    badge.textContent = moveNum;
    sq.appendChild(badge);
  }

  if (isCurrent) {
    const icon = document.createElement('div');
    icon.className = 'knight-icon';
    icon.innerHTML = KNIGHT_SVG;
    sq.appendChild(icon);
  }
}

function renderPath() {
  pathSvg.innerHTML = '';
  if (!showPathCb.checked || pathOrder.length < 2) return;

  const sz = squareSize();
  const half = sz / 2;

  const pathLineColor = getComputedStyle(document.documentElement).getPropertyValue('--path-line').trim() || '#2F5D50';
  const pathActiveColor = getComputedStyle(document.documentElement).getPropertyValue('--path-active').trim() || '#1A3930';

  const pts = pathOrder.map(({ r, c }) => `${c * sz + half},${r * sz + half}`).join(' ');
  const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
  poly.setAttribute('points', pts);
  poly.setAttribute('fill', 'none');
  poly.setAttribute('stroke', pathLineColor);
  poly.setAttribute('stroke-width', '2');
  poly.setAttribute('stroke-linecap', 'round');
  poly.setAttribute('stroke-linejoin', 'round');
  pathSvg.appendChild(poly);

  for (let i = 0; i < pathOrder.length; i++) {
    const pt = pathOrder[i];
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', pt.c * sz + half);
    circle.setAttribute('cy', pt.r * sz + half);
    circle.setAttribute('r', '2.5');
    circle.setAttribute('fill', i === pathOrder.length - 1 ? pathActiveColor : pathLineColor);
    pathSvg.appendChild(circle);
  }

  if (pathOrder.length >= 2) {
    const last = pathOrder[pathOrder.length - 1];
    const prev = pathOrder[pathOrder.length - 2];
    const x1 = prev.c * sz + half, y1 = prev.r * sz + half;
    const x2 = last.c * sz + half, y2 = last.r * sz + half;

    const activeLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    activeLine.setAttribute('x1', x1);
    activeLine.setAttribute('y1', y1);
    activeLine.setAttribute('x2', x2);
    activeLine.setAttribute('y2', y2);
    activeLine.setAttribute('stroke', pathActiveColor);
    activeLine.setAttribute('stroke-width', '2.5');
    activeLine.setAttribute('stroke-linecap', 'round');
    pathSvg.appendChild(activeLine);

    const ang = Math.atan2(y2 - y1, x2 - x1);
    const alen = sz * 0.24;
    const ax1 = x2 - alen * Math.cos(ang - 0.42);
    const ay1 = y2 - alen * Math.sin(ang - 0.42);
    const ax2 = x2 - alen * Math.cos(ang + 0.42);
    const ay2 = y2 - alen * Math.sin(ang + 0.42);

    const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    arrow.setAttribute('points', `${ax1},${ay1} ${x2},${y2} ${ax2},${ay2}`);
    arrow.setAttribute('fill', 'none');
    arrow.setAttribute('stroke', pathActiveColor);
    arrow.setAttribute('stroke-width', '2.5');
    arrow.setAttribute('stroke-linecap', 'round');
    arrow.setAttribute('stroke-linejoin', 'round');
    pathSvg.appendChild(arrow);
  }
}

function appendMoveLog(moveNum, fromR, fromC, toR, toC) {
  if (moveNum === 1) {
    moveLog.innerHTML = '';
  }

  const prevLatest = moveLog.querySelector('.log-entry.latest');
  if (prevLatest) prevLatest.classList.remove('latest');

  const entry = document.createElement('span');
  entry.className = 'log-entry latest';

  const coord = toCoord(toR, toC);
  let notation;
  if (fromR < 0) {
    notation = coord;
  } else {
    notation = `N${toCoord(fromR, fromC)}-${coord}`;
  }

  entry.innerHTML = `<span class="log-num">${moveNum}.</span> ${notation}`;
  moveLog.appendChild(entry);
  moveLog.scrollLeft = moveLog.scrollWidth;
}

function appendBacktrackLog(r, c) {
  const prevLatest = moveLog.querySelector('.log-entry.latest');
  if (prevLatest) prevLatest.classList.remove('latest');

  const entry = document.createElement('span');
  entry.className = 'log-entry backtrack';
  entry.textContent = `undo ${toCoord(r, c)}`;
  moveLog.appendChild(entry);
  moveLog.scrollLeft = moveLog.scrollWidth;
}

function resetMoveLog() {
  moveLog.innerHTML = '<span class="move-log-empty">Waiting for start</span>';
}

function getDelay() {
  const s = parseInt(speedSlider.value, 10);
  return SPEED_MS[Math.max(0, Math.min(9, s - 1))];
}

function animTick(singleStep = false) {
  if (!solver) return;
  if (isPaused && !singleStep) return;

  const result = solver.next();
  if (result.done) {
    finishRun(false, 'Generator finished unexpectedly');
    return;
  }

  const action = result.value;

  switch (action.type) {
    case 'visit': {
      const prevR = currentR, prevC = currentC;

      visited[action.r][action.c] = action.moveNum;
      currentR = action.r;
      currentC = action.c;
      pathOrder.push({ r: action.r, c: action.c });

      statsMovesCount = action.moveNum;
      statsNodes++;

      if (prevR >= 0) updateSquare(prevR, prevC, '');
      updateSquare(action.r, action.c, '');
      appendMoveLog(action.moveNum, prevR, prevC, action.r, action.c);

      if (showDegreesCb.checked) updateAllSquares();
      renderPath();
      updateStats();
      break;
    }
    case 'backtrack': {
      const oldR = currentR, oldC = currentC;
      visited[action.r][action.c] = 0;
      pathOrder.pop();
      statsBacktracks++;
      statsNodes++;

      appendBacktrackLog(action.r, action.c);

      if (pathOrder.length > 0) {
        currentR = pathOrder[pathOrder.length - 1].r;
        currentC = pathOrder[pathOrder.length - 1].c;
      } else {
        currentR = -1;
        currentC = -1;
      }

      if (oldR >= 0) updateSquare(oldR, oldC, '');
      if (currentR >= 0) updateSquare(currentR, currentC, '');

      const sq = document.getElementById(`sq-${action.r}-${action.c}`);
      if (sq) {
        sq.classList.remove('visited', 'current', 'start');
        sq.classList.add('backtrack');
        setTimeout(() => {
          updateSquare(action.r, action.c, '');
          if (currentR >= 0) updateSquare(currentR, currentC, '');
        }, Math.min(getDelay(), 350));
      }

      renderPath();
      updateStats();
      break;
    }
    case 'solved': {
      finishRun(true, '');
      return;
    }
    case 'failed': {
      let reason = action.reason || 'No complete tour found.';
      if (algoSel.value === 'warnsdorff' && tiebreakSel.value === 'first') {
        reason += ' Switching to Pohl\'s secondary rule or Random often resolves this.';
      }
      finishRun(false, reason);
      return;
    }
  }

  if (!singleStep) {
    animHandle = setTimeout(animTick, getDelay());
  }
}

function finishRun(success, reason) {
  isRunning = false;
  isFinished = true;
  solver = null;

  clearInterval(statsTimerHandle);
  setButtonStates();

  if (success) {
    setStatus('solved', 'Solved');
    const isClose = isKnightMove(startR, startC, currentR, currentC);
    const tourLabel = isClose ? 'closed tour' : 'open tour';
    tourTypeDisplay.textContent = `Tour complete: ${N * N} squares visited (${tourLabel}).`;
    tourTypeDisplay.classList.add('visible');
    toast(`Tour complete (${tourLabel})`, 'success');
  } else {
    setStatus('failed', 'No solution');
    tourTypeDisplay.textContent = reason || 'Tour halted without complete traversal.';
    tourTypeDisplay.classList.add('visible');
    if (reason) toast(reason, 'error');
  }

  updateAllSquares();
  renderPath();
}

function updateStats() {
  statMoves.textContent = statsMovesCount;
  statBT.textContent = statsBacktracks;
  statNodes.textContent = statsNodes.toLocaleString();
}

function startTimer() {
  statsStartTime = performance.now();
  clearInterval(statsTimerHandle);
  statsTimerHandle = setInterval(() => {
    const elapsed = (performance.now() - statsStartTime) / 1000;
    statTime.textContent = elapsed.toFixed(2) + 's';
  }, 90);
}

function setStatus(type, text) {
  statStatus.innerHTML = `
    <span class="status-dot ${type}"></span>
    <span class="status-text">${text}</span>
  `;
}

function resetStats() {
  statsMovesCount = 0;
  statsBacktracks = 0;
  statsNodes = 0;
  updateStats();
}

function setButtonStates() {
  const hasStart = startR >= 0;
  btnRun.disabled = !hasStart || isRunning || isFinished;
  btnPause.disabled = !isRunning;
  btnStep.disabled = !(hasStart && !isFinished);

  if (isPaused) {
    btnStep.disabled = false;
  }

  const pauseText = isPaused ? 'Resume' : 'Pause';
  btnPause.innerHTML = `
    <svg class="btn-icon" viewBox="0 0 24 24">
      ${isPaused
      ? '<polygon points="6 3 20 12 6 21 6 3" fill="currentColor"/>'
      : '<rect x="6" y="4" width="4" height="16" fill="currentColor"/><rect x="14" y="4" width="4" height="16" fill="currentColor"/>'
    }
    </svg>
    ${pauseText}
  `;
}

function onSquareClick(e) {
  if (isRunning && !isPaused) return;

  if (isFinished) {
    doReset();
  }

  const sq = e.currentTarget;
  const r = parseInt(sq.dataset.r, 10);
  const c = parseInt(sq.dataset.c, 10);

  startR = r;
  startC = c;

  boardHint.classList.add('faded');
  updateAllSquares();

  const el = document.getElementById(`sq-${r}-${c}`);
  if (el) {
    el.classList.add('start');
    const icon = document.createElement('div');
    icon.className = 'knight-icon';
    icon.innerHTML = KNIGHT_SVG;
    el.appendChild(icon);
  }

  btnRun.disabled = false;
  btnStep.disabled = false;

  resetMoveLog();
  appendMoveLog(1, -1, -1, r, c);
  toast(`Start: ${toCoord(r, c)}`, 'info');
}

btnRun.addEventListener('click', runTour);

function runTour() {
  if (startR < 0) {
    toast('Click a square on the board to select start', 'error');
    return;
  }
  if (isRunning) return;

  resetStats();
  visited = makeMatrix(N);
  pathOrder = [];
  currentR = -1;
  currentC = -1;
  isRunning = true;
  isPaused = false;
  isFinished = false;

  tourTypeDisplay.textContent = '';
  tourTypeDisplay.classList.remove('visible');
  boardHint.classList.add('faded');
  renderBoard();

  const algo = algoSel.value;
  const tb = tiebreakSel.value;
  if (algo === 'warnsdorff') solver = warnsdorffSolver(startR, startC, N, tb);
  else if (algo === 'backtrack') solver = backtrackSolver(startR, startC, N);
  else solver = hybridSolver(startR, startC, N, tb);

  setStatus('running', 'Running');
  setButtonStates();
  startTimer();
  animHandle = setTimeout(animTick, 30);
}

btnPause.addEventListener('click', togglePause);

function togglePause() {
  if (!isRunning && !isPaused) return;
  isPaused = !isPaused;
  if (isPaused) {
    clearTimeout(animHandle);
    setStatus('paused', 'Paused');
  } else {
    setStatus('running', 'Running');
    animHandle = setTimeout(animTick, getDelay());
  }
  setButtonStates();
}

btnStep.addEventListener('click', stepTour);

function stepTour() {
  if (!solver) {
    if (startR < 0) {
      toast('Select a starting square first', 'error');
      return;
    }
    resetStats();
    visited = makeMatrix(N);
    pathOrder = [];
    currentR = -1;
    currentC = -1;
    isRunning = true;
    isPaused = true;
    isFinished = false;

    tourTypeDisplay.textContent = '';
    tourTypeDisplay.classList.remove('visible');
    boardHint.classList.add('faded');
    renderBoard();

    const algo = algoSel.value, tb = tiebreakSel.value;
    if (algo === 'warnsdorff') solver = warnsdorffSolver(startR, startC, N, tb);
    else if (algo === 'backtrack') solver = backtrackSolver(startR, startC, N);
    else solver = hybridSolver(startR, startC, N, tb);

    startTimer();
    setButtonStates();
  }

  if (!isPaused) {
    isPaused = true;
    clearTimeout(animHandle);
    setStatus('paused', 'Paused');
  }

  animTick(true);
  setButtonStates();
}

btnReset.addEventListener('click', doReset);

function doReset() {
  clearTimeout(animHandle);
  clearInterval(statsTimerHandle);

  isRunning = false;
  isPaused = false;
  isFinished = false;
  solver = null;
  startR = -1;
  startC = -1;
  visited = makeMatrix(N);
  pathOrder = [];
  currentR = -1;
  currentC = -1;

  resetStats();
  resetMoveLog();
  statTime.textContent = '0.00s';
  setStatus('idle', 'Idle');

  tourTypeDisplay.textContent = '';
  tourTypeDisplay.classList.remove('visible');
  boardHint.classList.remove('faded');
  compSection.classList.remove('active');

  renderBoard();
  renderPath();
  setButtonStates();
  btnRun.disabled = true;
}

boardSizeSel.addEventListener('change', () => {
  N = parseInt(boardSizeSel.value, 10);
  doReset();
  toast(`Board size: ${N} × ${N}`, 'info');
});

algoSel.addEventListener('change', () => {
  tiebreakRow.style.display = (algoSel.value === 'backtrack') ? 'none' : '';
  if (isRunning || isFinished) doReset();
});

segButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    segButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    algoSel.value = btn.dataset.value;
    algoSel.dispatchEvent(new Event('change'));
  });
});

speedSlider.addEventListener('input', () => {
  speedLabel.textContent = speedSlider.value;
});

showDegreesCb.addEventListener('change', updateAllSquares);
showPathCb.addEventListener('change', renderPath);

themeToggle.addEventListener('click', () => {
  const html = document.documentElement;
  const isDark = html.getAttribute('data-theme') === 'dark';
  const newTheme = isDark ? 'light' : 'dark';
  html.setAttribute('data-theme', newTheme);
  themeText.textContent = isDark ? 'Dark' : 'Light';
  renderPath();
});

window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

  if (e.code === 'Space') {
    e.preventDefault();
    if (!isRunning && !isFinished) {
      runTour();
    } else {
      togglePause();
    }
  } else if (e.key === 's' || e.key === 'S') {
    e.preventDefault();
    stepTour();
  } else if (e.key === 'r' || e.key === 'R') {
    e.preventDefault();
    doReset();
  }
});

btnCompare.addEventListener('click', runComparison);

function runComparison() {
  if (startR < 0) {
    toast('Select a start square on the board first', 'error');
    return;
  }
  if (isRunning) {
    toast('Pause or reset the current tour before comparing', 'error');
    return;
  }

  compSection.classList.add('active');
  compTbody.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:14px;color:var(--ink-muted);font-style:italic;">Running comparison…</td></tr>';
  compNote.textContent = '';
  btnCompare.disabled = true;

  const tb = tiebreakSel.value;
  const sr = startR, sc = startC, n = N;

  const wRes = solveWarnsdorffSync(sr, sc, n, tb);

  setTimeout(() => {
    const bRes = solveBacktrackSync(sr, sc, n, NODE_LIMIT);
    displayComparison(wRes, bRes);
    btnCompare.disabled = false;
  }, 25);
}

function displayComparison(w, b) {
  const bLimited = b.limitReached;

  const rows = [
    {
      metric: 'Solved',
      wVal: w.solved ? 'Yes' : 'No',
      bVal: b.solved ? 'Yes' : (bLimited ? 'Cap reached' : 'No'),
      wBetter: w.solved && !b.solved,
      bBetter: b.solved && !w.solved,
      wPct: w.solved ? 100 : 0,
      bPct: b.solved ? 100 : (bLimited ? 40 : 0)
    },
    {
      metric: 'Moves Made',
      wVal: w.moves.toLocaleString(),
      bVal: b.moves.toLocaleString(),
      wBetter: w.moves >= b.moves,
      bBetter: b.moves > w.moves,
      wPct: Math.min(100, Math.round((w.moves / (N * N)) * 100)),
      bPct: Math.min(100, Math.round((b.moves / (N * N)) * 100))
    },
    {
      metric: 'Backtracks',
      wVal: w.backtracks.toLocaleString(),
      bVal: b.backtracks.toLocaleString(),
      wBetter: w.backtracks <= b.backtracks,
      bBetter: b.backtracks < w.backtracks,
      wPct: 0,
      bPct: Math.min(100, Math.max(5, Math.round((b.backtracks / Math.max(b.nodes, 1)) * 100)))
    },
    {
      metric: 'Nodes Explored',
      wVal: w.nodes.toLocaleString(),
      bVal: b.nodes.toLocaleString(),
      wBetter: w.nodes <= b.nodes,
      bBetter: b.nodes < w.nodes,
      wPct: Math.min(100, Math.max(3, Math.round((w.nodes / Math.max(w.nodes, b.nodes)) * 100))),
      bPct: Math.min(100, Math.max(3, Math.round((b.nodes / Math.max(w.nodes, b.nodes)) * 100)))
    },
    {
      metric: 'Time Elapsed',
      wVal: w.time.toFixed(3) + ' s',
      bVal: b.time.toFixed(3) + ' s',
      wBetter: w.time <= b.time,
      bBetter: b.time < w.time,
      wPct: Math.min(100, Math.max(3, Math.round((w.time / Math.max(w.time, b.time, 0.001)) * 100))),
      bPct: Math.min(100, Math.max(3, Math.round((b.time / Math.max(w.time, b.time, 0.001)) * 100)))
    }
  ];

  compTbody.innerHTML = rows.map(r => `
    <tr>
      <td><strong>${r.metric}</strong></td>
      <td>
        <div class="comp-cell-wrap">
          <div class="comp-val-text ${r.wBetter ? 'better' : ''}">
            <span>${r.wVal}</span>
          </div>
          <div class="comp-bar-bg">
            <div class="comp-bar-fill" style="width: ${r.wPct}%;"></div>
          </div>
        </div>
      </td>
      <td>
        <div class="comp-cell-wrap">
          <div class="comp-val-text ${r.bBetter ? 'better' : ''}">
            <span>${r.bVal}</span>
          </div>
          <div class="comp-bar-bg">
            <div class="comp-bar-fill" style="width: ${r.bPct}%;"></div>
          </div>
        </div>
      </td>
    </tr>
  `).join('');

  if (bLimited) {
    compNote.textContent = `Backtracking halted at the ${NODE_LIMIT.toLocaleString()} node boundary to maintain browser responsiveness. Plain depth-first search requires exponential time on large boards.`;
  } else if (!b.solved) {
    compNote.textContent = 'Backtracking exhausted all reachable branches without finding a tour from this square.';
  } else {
    compNote.textContent = 'Both methods completed traversal. Note the contrast in total nodes explored.';
  }
}

function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 2900);
}

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    renderBoard();
    renderPath();
  }, 120);
});

(function init() {
  N = parseInt(boardSizeSel.value, 10);
  visited = makeMatrix(N);
  renderBoard();
  setButtonStates();
  btnRun.disabled = true;

  algoSel.dispatchEvent(new Event('change'));
  speedLabel.textContent = speedSlider.value;

  console.log('Knight\'s Tour Visualizer ready. Board:', N, '×', N);
})();
