/*
 * Esm-o-Famil (اسم فامیل) — the word game on a notebook page.
 * Each round is one row on the sheet: the letter is picked by the
 * letters running past for two seconds, the row is filled in blue ballpoint, then graded
 * in red pen. Plain vanilla JS, no dependencies.
 */
'use strict';

/* =====================================================================
   1. Configuration — edit these to change the game
   ===================================================================== */

/** Categories in display order (the sheet's columns). Add, remove or reorder here. */
const CATEGORIES = [
  { id: 'name',    en: 'Name',      fa: 'اسم' },
  { id: 'family',  en: 'Last name', fa: 'فامیل' },
  { id: 'city',    en: 'City',      fa: 'شهر' },
  { id: 'country', en: 'Country',   fa: 'کشور' },
  { id: 'food',    en: 'Food',      fa: 'غذا' },
  { id: 'fruit',   en: 'Fruit',     fa: 'میوه' },
  { id: 'animal',  en: 'Animal',    fa: 'حیوان' },
  { id: 'object',  en: 'Object',    fa: 'اشیا' },
  { id: 'color',   en: 'Color',     fa: 'رنگ' },
  { id: 'flower',  en: 'Flower',    fa: 'گل' },
];

const POINTS_PER_VALID = 10;
const DEFAULT_TIMER_SECONDS = 60;
const TIMER_MIN_SECONDS = 10;
const TIMER_MAX_SECONDS = 600;
const TIMER_WARNING_SECONDS = 10; // timer switches to red pen at or below this

/* Letter ritual timing */
const PICK_DURATION_MS = 2000;                   // letters run, then land on one after 2 s
const FLICKER_MS = 70;                           // letters running past
const FLICKER_MS_REDUCED = 220;                  // slower when reduced motion is preferred
const LANDING_STEPS_MS = [80, 110, 150, 200, 270]; // slowing down at the end of those 2 s

const ALPHABETS = {
  en: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
  fa: 'ا ب پ ت ث ج چ ح خ د ذ ر ز ژ س ش ص ض ط ظ ع غ ف ق ک گ ل م ن و ه ی'.split(' '),
};

/** UI text per language. Functions take the value they interpolate. */
const STRINGS = {
  en: {
    title: 'Esm-o-Famil',
    language: 'Language',
    sheet: 'Score sheet',
    round: n => `Round ${n}`,
    letterHead: 'Letter',
    scoreHead: 'Score',
    total: 'Total',
    newRound: 'New round',
    submit: 'Submit',
    graded: 'Graded',
    timer: 'timer',
    seconds: 'sec',
    timerLength: 'Timer length in seconds',
    timeLeft: 'time left',
    hintPicking: 'Picking a letter…',
    hintPlaying: 'Fill in the row, then submit.',
    hintGraded: 'Graded. Start a new round.',
    hintTimeUp: 'Time’s up! The row was graded.',
    answerLabel: (cat, round) => `${cat}, ${round}`,
    valid: 'valid',
    invalid: l => `does not start with ${l}`,
    empty: 'empty',
    announceLetter: l => `Letter ${l}. Go!`,
    announceGraded: (score, total) => `Graded: ${score} points this round, ${total} in total.`,
    announceTimeUp: 'Time’s up.',
  },
  fa: {
    title: 'اسم فامیل',
    language: 'زبان',
    sheet: 'برگهٔ بازی',
    round: n => `دور ${n}`,
    letterHead: 'حرف',
    scoreHead: 'امتیاز',
    total: 'جمع',
    newRound: 'دست بعدی',
    submit: 'ارسال',
    graded: 'تصحیح شد',
    timer: 'زمان‌سنج',
    seconds: 'ثانیه',
    timerLength: 'مدت زمان‌سنج به ثانیه',
    timeLeft: 'زمان باقی‌مانده',
    hintPicking: 'در حال انتخاب حرف…',
    hintPlaying: 'ردیف را پر کنید و بفرستید.',
    hintGraded: 'تصحیح شد. دور بعد را شروع کنید.',
    hintTimeUp: 'وقت تمام شد! ردیف تصحیح شد.',
    answerLabel: (cat, round) => `${cat}، ${round}`,
    valid: 'درست',
    invalid: l => `با «${l}» شروع نمی‌شود`,
    empty: 'خالی',
    announceLetter: l => `حرف ${l}. شروع!`,
    announceGraded: (score, total) => `تصحیح شد: ${score} امتیاز در این دور، ${total} در مجموع.`,
    announceTimeUp: 'وقت تمام شد.',
  },
};

/* =====================================================================
   2. State
   ===================================================================== */

const state = {
  lang: 'fa',         // Farsi is the default language
  phase: 'picking',   // 'picking' (letters running) | 'playing' (row editable) | 'graded'
  letter: '',         // this round's letter, once landed
  shown: '',          // letter currently in the box while running
  pickId: 0,          // bumps each round, so a restarted round cancels the old one's landing
  pickTimeoutId: null,
  timedOut: false,
  history: [],        // graded rows: { letter, cells: [{ text, status, rot, d }], score: { value, rot, d } }
  currentRow: null,   // <tr> being filled in
  inputs: [],
  flickerId: null,
  timerId: null,
  timerEndsAt: 0,
};

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

/* =====================================================================
   3. DOM references
   ===================================================================== */

const $ = id => document.getElementById(id);

const el = {
  brand: $('brand'),
  langGroup: $('lang-group'),
  langButtons: document.querySelectorAll('.lang-toggle button'),
  letterBox: $('letter-box'),
  letterBoxPath: $('letter-box-path'),
  letter: $('letter'),
  roundLabel: $('round-label'),
  hint: $('hint'),
  newRound: $('new-round'),
  timer: $('timer'),
  timerPie: $('timer-pie'),
  timerOutline: $('timer-outline'),
  timerLabel: $('timer-label'),
  timerValue: $('timer-value'),
  timerEnabled: $('timer-enabled'),
  timerEnabledLabel: $('timer-enabled-label'),
  timerSeconds: $('timer-seconds'),
  secondsLabel: $('seconds-label'),
  form: $('sheet-form'),
  scroll: $('sheet-scroll'),
  headRow: $('head-row'),
  rows: $('rows'),
  totalLabel: $('total-label'),
  totalSpacer: $('total-spacer'),
  totalValue: $('total-value'),
  submit: $('submit-btn'),
  gradedStamp: $('graded-stamp'),
  announcer: $('announcer'),
};

/* =====================================================================
   4. Helpers: text, letters, judging
   ===================================================================== */

const t = () => STRINGS[state.lang];

/** Format a number with the current language's digits (۱۲۳ in Farsi). */
function fmt(n, options) {
  return n.toLocaleString(state.lang === 'fa' ? 'fa-IR' : 'en-US', options);
}

/** m:ss, localized digits. */
function fmtTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${fmt(m)}:${fmt(s, { minimumIntegerDigits: 2 })}`;
}

/** Characters that can sit invisibly before a word: whitespace, zero-width
 *  space/non-joiner/joiner, LRM/RLM, bidi embeddings/isolates, BOM, and the
 *  Arabic tatweel (kashida). */
const LEADING_JUNK = /^[\s​-‏‪-‮⁦-⁩﻿ـ]+/;

/** Arabic-keyboard letters that Persian treats as the same letter. */
const PERSIAN_VARIANTS = {
  'ي': 'ی', // Arabic yeh
  'ى': 'ی', // alef maksura
  'ك': 'ک', // Arabic kaf
  'ة': 'ه', // teh marbuta
  'ە': 'ه', // ae (what ۀ leaves after NFD)
  'ٱ': 'ا', // alef wasla
};

/**
 * Normalize text so its first character can be compared to the round letter.
 * NFD splits base letters from their marks (آ → ا + ◌ٓ, é → e + ◌́) so that
 * removing marks maps آ/أ/إ to ا, ؤ to و, ئ to ی, and É to e.
 */
function normalize(text, lang) {
  let s = text.normalize('NFD');
  if (lang === 'fa') {
    s = s.replace(/[ً-ٰٟ]/g, '');              // harakat & hamza/madda marks
    s = s.replace(/[يىكةەٱ]/g, ch => PERSIAN_VARIANTS[ch]);
  } else {
    s = s.replace(/[̀-ͯ]/g, '').toLowerCase();      // accents, case
  }
  return s.replace(LEADING_JUNK, '');
}

/** Judge one answer: 'valid' | 'invalid' | 'empty'. Starting letter only — no dictionary. */
function judge(answer) {
  const s = normalize(answer, state.lang);
  if (s === '') return 'empty';
  const first = Array.from(s)[0];
  return first === normalize(state.letter, state.lang) ? 'valid' : 'invalid';
}

/** Random letter from the current alphabet, never `avoid`. */
function randomLetter(avoid) {
  const letters = ALPHABETS[state.lang];
  let letter;
  do {
    letter = letters[Math.floor(Math.random() * letters.length)];
  } while (letter === avoid && letters.length > 1);
  return letter;
}

/** Clamp the timer input to the allowed range and return it. */
function timerDuration() {
  const raw = parseInt(el.timerSeconds.value, 10);
  const secs = Number.isFinite(raw)
    ? Math.min(TIMER_MAX_SECONDS, Math.max(TIMER_MIN_SECONDS, raw))
    : DEFAULT_TIMER_SECONDS;
  el.timerSeconds.value = secs;
  return secs;
}

function announce(text) {
  el.announcer.textContent = '';
  requestAnimationFrame(() => { el.announcer.textContent = text; });
}

/** Restart a CSS animation class on an element. */
function replayClass(node, cls) {
  node.classList.remove(cls);
  void node.offsetWidth;
  node.classList.add(cls);
}

/* =====================================================================
   5. Hand-drawn strokes (SVG path data with a little human wobble)
   ===================================================================== */

const SVG_NS = 'http://www.w3.org/2000/svg';
const rand = (min, max) => min + Math.random() * (max - min);
const jitter = k => rand(-k, k);
const pt = (x, y, k) => `${(x + jitter(k)).toFixed(1)} ${(y + jitter(k)).toFixed(1)}`;

/** Gently bowed stroke to (x2, y2). */
function bow(x1, y1, x2, y2, k) {
  return `Q${pt((x1 + x2) / 2, (y1 + y2) / 2, k)} ${pt(x2, y2, k * 0.5)}`;
}

/** Four separately ruled sides, corners overshooting like a quick pen box. */
function roughBoxPath(w, h, k = 1.6) {
  const m = 5;
  const o = () => rand(0.5, 3);
  return [
    `M${pt(m - o(), m, k)} ${bow(m, m, w - m + o(), m, k)}`,
    `M${pt(w - m, m - o(), k)} ${bow(w - m, m, w - m, h - m + o(), k)}`,
    `M${pt(w - m + o(), h - m, k)} ${bow(w - m, h - m, m - o(), h - m, k)}`,
    `M${pt(m, h - m + o(), k)} ${bow(m, h - m, m, m - o(), k)}`,
  ].join(' ');
}

/** A quick pen circle: wobbly radius, spirals out a touch, overshoots its start. */
function roughEllipsePath(cx, cy, rx, ry, wobbleAmt = 0.05) {
  const start = rand(0, Math.PI * 2);
  const sweep = Math.PI * 2 + rand(0.3, 0.6);
  const phase = rand(0, Math.PI * 2);
  const n = 32;
  let d = '';
  for (let i = 0; i <= n; i++) {
    const a = start + (sweep * i) / n;
    const r = 1 + wobbleAmt * Math.sin(a * 2 + phase) + (i / n) * 0.07 - 0.035;
    d += `${i ? ' L' : 'M'}${(cx + Math.cos(a) * rx * r).toFixed(1)} ${(cy + Math.sin(a) * ry * r).toFixed(1)}`;
  }
  return d;
}

const checkPath = () => `M${pt(1.5, 9, 0.6)} L${pt(6, 14, 0.5)} ${bow(6, 14, 15.5, 1.5, 0.8)}`;
const dashPath = () => `M${pt(2, 9, 0.5)} ${bow(2, 9, 14, 8.5, 0.6)}`;
const slashPath = () => `M${pt(3, 21, 1)} ${bow(3, 21, 97, 3, 2)}`;
const circlePath = () => roughEllipsePath(30, 17, 27, 14, 0.05);

/** Build a red-pen mark. `stretch` marks fill their box (slash, circle). */
function penMark(kind, d, rot, stretch) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  const viewBox = { check: '0 0 16 16', dash: '0 0 16 16', slash: '0 0 100 24', circle: '0 0 60 34' }[kind];
  svg.setAttribute('viewBox', viewBox);
  svg.setAttribute('class', `mark mark-${kind}`);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  if (stretch) svg.setAttribute('preserveAspectRatio', 'none');
  svg.style.setProperty('--rot', `${rot.toFixed(1)}deg`);

  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', d);
  path.setAttribute('pathLength', '1');          // lets CSS "draw" the stroke 0 → 1
  if (stretch) path.setAttribute('vector-effect', 'non-scaling-stroke');
  svg.append(path);
  return svg;
}

/* =====================================================================
   6. Rendering the sheet
   ===================================================================== */

function makeEl(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Column headers: Letter | categories… | Score */
function renderHead() {
  const s = t();
  const head = (cls, text) => {
    const th = makeEl('th', cls, text);
    th.scope = 'col';
    return th;
  };
  el.headRow.replaceChildren(
    head('col-letter', s.letterHead),
    ...CATEGORIES.map(cat => head('', cat[state.lang])),
    head('col-score', s.scoreHead),
  );
  el.totalSpacer.colSpan = CATEGORIES.length;
}

/** The round's margin cell: small round number + the letter. */
function makeMarginCell(roundNumber, letter) {
  const th = makeEl('th', 'col-letter');
  th.scope = 'row';
  const letterSpan = makeEl('span', 'row-letter', letter);
  th.append(makeEl('span', 'row-num', fmt(roundNumber)), letterSpan);
  return { th, letterSpan };
}

/** The row being written: the only one with inputs. */
function makeCurrentRow() {
  const s = t();
  const roundNumber = state.history.length + 1;
  const tr = makeEl('tr', 'row current');
  const { th, letterSpan } = makeMarginCell(roundNumber, '');
  tr.append(th);
  state.currentLetterEl = letterSpan;

  state.inputs = CATEGORIES.map((cat, i) => {
    const td = makeEl('td');
    const input = document.createElement('input');
    input.type = 'text';
    input.name = cat.id;
    input.dir = 'auto';                        // mixed Persian/Latin text renders correctly
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.disabled = true;                     // unlocked when the letter lands
    input.setAttribute('autocapitalize', 'off');
    input.setAttribute('enterkeyhint', i === CATEGORIES.length - 1 ? 'done' : 'next');
    input.setAttribute('aria-label', s.answerLabel(cat[state.lang], s.round(fmt(roundNumber))));
    td.append(input);
    tr.append(td);
    return input;
  });

  tr.append(makeEl('td', 'col-score'));
  return tr;
}

/** A graded row: faded-ink answers with red-pen marks and a circled score. */
function makePastRow(entry, index, fresh) {
  const s = t();
  const tr = makeEl('tr', `row past${fresh ? ' is-fresh' : ''}`);
  tr.append(makeMarginCell(index + 1, entry.letter).th);

  entry.cells.forEach((cell, i) => {
    const td = makeEl('td');
    td.style.setProperty('--i', i);            // staggers the pen strokes on a fresh row

    if (cell.status !== 'empty') {
      const answer = makeEl('span', 'answer');
      answer.append(makeEl('bdi', '', cell.text));  // isolate mixed-direction answers
      td.append(answer);
      td.title = cell.text;
    }
    const kind = { valid: 'check', invalid: 'slash', empty: 'dash' }[cell.status];
    td.append(penMark(kind, cell.d, cell.rot, kind === 'slash'));

    const status = { valid: s.valid, invalid: s.invalid(entry.letter), empty: s.empty }[cell.status];
    td.append(makeEl('span', 'sr-only', `, ${status}`));
    tr.append(td);
  });

  const scoreTd = makeEl('td', 'col-score');
  scoreTd.style.setProperty('--i', CATEGORIES.length);
  const circled = makeEl('span', 'circled');
  circled.style.setProperty('--rot', `${entry.score.rot.toFixed(1)}deg`);
  circled.append(makeEl('span', 'num', fmt(entry.score.value)), penMark('circle', entry.score.d, 0, true));
  scoreTd.append(circled);
  tr.append(scoreTd);
  return tr;
}

/** Rebuild all graded rows (e.g. after a language switch). */
function renderRows() {
  el.rows.replaceChildren(...state.history.map((entry, i) => makePastRow(entry, i, false)));
  if (state.currentRow) el.rows.append(state.currentRow);
}

function renderTotal() {
  const total = state.history.reduce((sum, entry) => sum + entry.score.value, 0);
  el.totalValue.textContent = fmt(total);
  return total;
}

/** Show the letter in the margin box and on the current row. */
function showLetter(letter) {
  state.shown = letter;
  el.letter.textContent = letter;
  if (state.currentLetterEl) state.currentLetterEl.textContent = letter;
}

/** Buttons, hint and round label for the current phase. */
function renderControls() {
  const s = t();
  const { phase } = state;
  el.newRound.hidden = phase === 'picking';
  el.newRound.classList.toggle('is-next', phase === 'graded');
  el.submit.disabled = phase !== 'playing';
  state.inputs.forEach(input => { input.disabled = phase !== 'playing'; });

  const roundNumber = phase === 'graded' ? state.history.length : state.history.length + 1;
  el.roundLabel.textContent = s.round(fmt(roundNumber));

  const hint = { picking: s.hintPicking, playing: s.hintPlaying, graded: state.timedOut ? s.hintTimeUp : s.hintGraded }[phase];
  el.hint.textContent = hint;
}

/** All language-dependent chrome and page direction. */
function renderLanguage() {
  const s = t();
  const root = document.documentElement;
  root.lang = state.lang;
  root.dir = state.lang === 'fa' ? 'rtl' : 'ltr';
  document.title = s.title;

  el.brand.textContent = s.title;
  el.langGroup.setAttribute('aria-label', s.language);
  el.langButtons.forEach(btn => {
    btn.setAttribute('aria-pressed', String(btn.dataset.lang === state.lang));
  });
  el.newRound.textContent = s.newRound;
  el.submit.textContent = s.submit;
  el.gradedStamp.textContent = s.graded;
  el.timerLabel.textContent = s.timeLeft;
  el.timerEnabledLabel.textContent = s.timer;
  el.secondsLabel.textContent = s.seconds;
  el.timerSeconds.setAttribute('aria-label', s.timerLength);
  el.totalLabel.textContent = s.total;
  el.scroll.setAttribute('aria-label', s.sheet);
}

/* =====================================================================
   7. Timer: a hand-sketched pie that depletes
   ===================================================================== */

const PIE_CIRCUMFERENCE = 2 * Math.PI * 8.5;

function stopTimer() {
  clearInterval(state.timerId);
  state.timerId = null;
}

function renderTimer(remaining, duration) {
  el.timerValue.textContent = fmtTime(remaining);
  const filled = (remaining / duration) * PIE_CIRCUMFERENCE;
  el.timerPie.style.strokeDasharray = `${filled.toFixed(2)} ${PIE_CIRCUMFERENCE.toFixed(2)}`;
  el.timer.classList.toggle('is-low', state.timerId !== null && remaining <= TIMER_WARNING_SECONDS);
}

/** Full pie showing the configured length (between rounds, or timer off). */
function resetTimerDisplay() {
  el.timer.classList.toggle('is-off', !el.timerEnabled.checked);
  el.timerSeconds.disabled = !el.timerEnabled.checked;
  const duration = timerDuration();
  renderTimer(duration, duration);
}

/** (Re)start the countdown for the current row, if enabled. */
function startTimer() {
  stopTimer();
  resetTimerDisplay();
  if (!el.timerEnabled.checked || state.phase !== 'playing') return;

  const duration = timerDuration();
  // Track an end time instead of counting ticks, so the clock never drifts
  state.timerEndsAt = Date.now() + duration * 1000;
  state.timerId = setInterval(() => {
    const remaining = Math.max(0, Math.ceil((state.timerEndsAt - Date.now()) / 1000));
    renderTimer(remaining, duration);
    if (remaining === 0) submitRound(true);
  }, 250);
  renderTimer(duration, duration);
}

/* =====================================================================
   8. Game flow: pick → play → grade
   ===================================================================== */

/** Start a round: a fresh row, letters running past, landing on one after PICK_DURATION_MS. */
function startPicking() {
  stopTimer();
  clearInterval(state.flickerId);
  clearTimeout(state.pickTimeoutId);
  const pick = ++state.pickId;
  state.phase = 'picking';
  state.timedOut = false;

  // Discard an unsubmitted row; start a new one
  if (state.currentRow) state.currentRow.remove();
  state.currentRow = makeCurrentRow();
  el.rows.append(state.currentRow);

  el.letterBoxPath.setAttribute('d', roughBoxPath(68, 68));
  el.letterBox.classList.remove('is-landed');
  el.letterBox.classList.add('is-running');
  renderControls();
  resetTimerDisplay();

  const tick = () => showLetter(randomLetter(state.shown));
  tick();
  state.flickerId = setInterval(tick, reducedMotion.matches ? FLICKER_MS_REDUCED : FLICKER_MS);

  // Run at full speed, then spend the last beats slowing down, landing at exactly 2 s
  const slowdown = reducedMotion.matches ? [] : LANDING_STEPS_MS;
  const slowdownMs = slowdown.reduce((sum, ms) => sum + ms, 0);
  state.pickTimeoutId = setTimeout(() => slowDownAndLand(pick, [...slowdown]), PICK_DURATION_MS - slowdownMs);
}

/** Slow down over a few beats and land on a letter (never last round's). */
function slowDownAndLand(pick, steps) {
  clearInterval(state.flickerId);
  const final = randomLetter(state.letter);
  const step = () => {
    if (pick !== state.pickId) return; // a new round or language switch replaced this one
    if (steps.length) {
      showLetter(randomLetter(state.shown));
      state.pickTimeoutId = setTimeout(step, steps.shift());
    } else {
      land(final);
    }
  };
  step();
}

/** The letter is written in ink; the row unlocks and the clock starts. */
function land(letter) {
  state.letter = letter;
  state.phase = 'playing';
  showLetter(letter);
  el.letterBox.classList.remove('is-running');
  replayClass(el.letterBox, 'is-landed');

  renderControls();
  announce(t().announceLetter(letter));
  state.inputs[0].focus();
  startTimer();
}

/** Grade the current row in red pen. `timedOut` is true when the timer ran out. */
function submitRound(timedOut = false) {
  if (state.phase !== 'playing') return; // never grade a row twice
  stopTimer();

  const cells = state.inputs.map(input => {
    const status = judge(input.value);
    const d = { valid: checkPath, invalid: slashPath, empty: dashPath }[status]();
    return { text: input.value.trim(), status, rot: rand(-3, 4), d };
  });
  const value = cells.filter(c => c.status === 'valid').length * POINTS_PER_VALID;
  const entry = { letter: state.letter, cells, score: { value, rot: rand(-3, 4), d: circlePath() } };
  state.history.push(entry);

  // The written row becomes a graded (faded) row
  const row = makePastRow(entry, state.history.length - 1, true);
  state.currentRow.replaceWith(row);
  state.currentRow = null;
  state.currentLetterEl = null;
  state.inputs = [];

  state.phase = 'graded';
  state.timedOut = timedOut;
  const total = renderTotal();
  renderControls();
  stampRow(row);

  const s = t();
  announce(`${timedOut ? `${s.announceTimeUp} ` : ''}${s.announceGraded(fmt(value), fmt(total))}`);
  el.newRound.focus();
}

/** Thump the "Graded" rubber stamp onto a row. */
function stampRow(row) {
  const formTop = el.form.getBoundingClientRect().top;
  const rowBox = row.getBoundingClientRect();
  el.gradedStamp.style.setProperty('--stamp-top', `${rowBox.top - formTop + rowBox.height / 2}px`);
  replayClass(el.gradedStamp, 'is-stamping');
}

/** Switch language: headers re-labelled, graded rows kept, a new round starts. */
function setLanguage(lang) {
  if (lang === state.lang || !STRINGS[lang]) return;
  state.lang = lang;
  state.letter = '';
  state.shown = '';
  renderLanguage();
  renderHead();
  if (state.currentRow) { state.currentRow.remove(); state.currentRow = null; }
  renderRows();
  renderTotal();
  startPicking();
}

/* =====================================================================
   9. Events
   ===================================================================== */

el.langButtons.forEach(btn => {
  btn.addEventListener('click', () => setLanguage(btn.dataset.lang));
});

el.newRound.addEventListener('click', () => startPicking());

el.form.addEventListener('submit', e => {
  e.preventDefault();
  submitRound(false);
});

// Enter moves to the next answer; on the last one it submits.
el.rows.addEventListener('keydown', e => {
  if (e.key !== 'Enter' || e.isComposing || !state.inputs.includes(e.target)) return;
  e.preventDefault();
  const next = state.inputs[state.inputs.indexOf(e.target) + 1];
  if (next) next.focus();
  else submitRound(false);
});

// Turning the timer on/off or changing its length restarts the clock for this row.
el.timerEnabled.addEventListener('change', startTimer);
el.timerSeconds.addEventListener('change', startTimer);

/* =====================================================================
   10. Init
   ===================================================================== */

function init() {
  el.timerSeconds.min = TIMER_MIN_SECONDS;
  el.timerSeconds.max = TIMER_MAX_SECONDS;
  el.timerSeconds.value = DEFAULT_TIMER_SECONDS;
  el.timerOutline.setAttribute('d', roughEllipsePath(22, 22, 19, 19, 0.04));

  renderLanguage();
  renderHead();
  renderRows();
  renderTotal();
  startPicking(); // letters start running; no focus grab on page load
}

init();
