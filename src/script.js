/*
 * Esm-o-Famil (اسم فامیل) — single-page word game.
 * Plain vanilla JS, no dependencies or build step.
 */
'use strict';

/* =====================================================================
   1. Configuration — edit these to change the game
   ===================================================================== */

/** Categories in display order. Add, remove or reorder entries here. */
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
const TIMER_WARNING_SECONDS = 10; // timer turns amber at or below this

const ALPHABETS = {
  en: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
  fa: 'ا ب پ ت ث ج چ ح خ د ذ ر ز ژ س ش ص ض ط ظ ع غ ف ق ک گ ل م ن و ه ی'.split(' '),
};

/** UI text per language. Functions take the value they interpolate. */
const STRINGS = {
  en: {
    title: 'Esm-o-Famil',
    language: 'Language',
    round: n => `Round ${n}`,
    letterLabel: 'Letter:',
    instruction: 'write a word for each category',
    placeholder: l => `Starts with “${l}”…`,
    submit: 'Submit',
    newRound: 'New round',
    timer: 'Timer',
    seconds: 'seconds',
    timerLength: 'Timer length in seconds',
    timeLeft: 'Time left',
    total: 'Total',
    results: 'Results',
    timeUp: 'Time’s up! Your answers were submitted automatically.',
    valid: 'Valid',
    invalid: 'Invalid',
    empty: 'Empty',
    noAnswer: 'No answer',
    wrongLetter: l => `Doesn’t start with “${l}”`,
    roundScore: 'Round score',
    runningTotal: 'Running total',
  },
  fa: {
    title: 'اسم فامیل',
    language: 'زبان',
    round: n => `دور ${n}`,
    letterLabel: 'حرف:',
    instruction: 'برای هر دسته یک کلمه بنویسید',
    placeholder: l => `با «${l}» شروع کنید…`,
    submit: 'ارسال',
    newRound: 'دور جدید',
    timer: 'زمان‌سنج',
    seconds: 'ثانیه',
    timerLength: 'مدت زمان‌سنج به ثانیه',
    timeLeft: 'زمان باقی‌مانده',
    total: 'امتیاز کل',
    results: 'نتیجه',
    timeUp: 'وقت تمام شد! پاسخ‌ها خودکار ارسال شدند.',
    valid: 'درست',
    invalid: 'نادرست',
    empty: 'خالی',
    noAnswer: 'بدون پاسخ',
    wrongLetter: l => `با «${l}» شروع نمی‌شود`,
    roundScore: 'امتیاز این دور',
    runningTotal: 'امتیاز کل',
  },
};

const BADGE_ICONS = { valid: '✓', invalid: '✗', empty: '–' };

/* =====================================================================
   2. State
   ===================================================================== */

const state = {
  lang: 'en',
  letter: '',
  round: 0,          // rounds started
  total: 0,          // running total across submitted rounds
  submitted: false,  // true once the current round has been scored
  timerEndsAt: 0,
  timerId: null,
};

/* =====================================================================
   3. DOM references
   ===================================================================== */

const $ = id => document.getElementById(id);

const el = {
  brand: $('brand'),
  langGroup: $('lang-group'),
  langButtons: document.querySelectorAll('.lang-toggle button'),
  letterTile: $('letter-tile'),
  roundLabel: $('round-label'),
  promptLetterLabel: $('prompt-letter-label'),
  promptLetter: $('prompt-letter'),
  promptInstruction: $('prompt-instruction'),
  timer: $('timer'),
  timerLabel: $('timer-label'),
  timerValue: $('timer-value'),
  timerFill: $('timer-fill'),
  newRound: $('new-round'),
  timerEnabled: $('timer-enabled'),
  timerEnabledLabel: $('timer-enabled-label'),
  timerSeconds: $('timer-seconds'),
  secondsLabel: $('seconds-label'),
  totalLabel: $('total-label'),
  totalValue: $('total-value'),
  form: $('answers-form'),
  fields: $('fields'),
  submit: $('submit-btn'),
  results: $('results'),
  resultsTitle: $('results-title'),
  resultsNotice: $('results-notice'),
  resultsList: $('results-list'),
  roundScoreLabel: $('round-score-label'),
  roundScore: $('round-score'),
  runningTotalLabel: $('running-total-label'),
  runningTotal: $('running-total'),
};

/** Map of category id -> { input, label } filled by buildFields(). */
const fieldEls = {};

/* =====================================================================
   4. Helpers
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

/** Random letter from the current alphabet, never the same as the previous one. */
function pickLetter(previous) {
  const letters = ALPHABETS[state.lang];
  let letter;
  do {
    letter = letters[Math.floor(Math.random() * letters.length)];
  } while (letter === previous && letters.length > 1);
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

/* =====================================================================
   5. Rendering
   ===================================================================== */

/** Create one labelled input per category (once, at startup). */
function buildFields() {
  const frag = document.createDocumentFragment();
  CATEGORIES.forEach((cat, i) => {
    const wrap = document.createElement('div');
    wrap.className = 'field';

    const label = document.createElement('label');
    label.htmlFor = `field-${cat.id}`;

    const input = document.createElement('input');
    input.type = 'text';
    input.id = `field-${cat.id}`;
    input.name = cat.id;
    input.dir = 'auto';               // mixed Persian/Latin text renders correctly
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.setAttribute('autocapitalize', 'off');
    input.setAttribute('enterkeyhint', i === CATEGORIES.length - 1 ? 'done' : 'next');

    wrap.append(label, input);
    frag.append(wrap);
    fieldEls[cat.id] = { input, label };
  });
  el.fields.append(frag);
}

/** Apply all language-dependent text and page direction. */
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

  el.promptLetterLabel.textContent = s.letterLabel;
  el.promptInstruction.textContent = s.instruction;
  el.timerLabel.textContent = s.timeLeft;
  el.newRound.textContent = s.newRound;
  el.timerEnabledLabel.textContent = s.timer;
  el.secondsLabel.textContent = s.seconds;
  el.timerSeconds.setAttribute('aria-label', s.timerLength);
  el.totalLabel.textContent = s.total;
  el.submit.textContent = s.submit;
  el.resultsTitle.textContent = s.results;
  el.roundScoreLabel.textContent = s.roundScore;
  el.runningTotalLabel.textContent = s.runningTotal;

  CATEGORIES.forEach(cat => {
    fieldEls[cat.id].label.textContent = cat[state.lang];
  });

  renderTotal();
}

/** Letter tile, prompt sentence, round number and placeholders. */
function renderPrompt() {
  const s = t();
  el.letterTile.textContent = state.letter;
  el.promptLetter.textContent = state.letter;
  el.roundLabel.textContent = s.round(fmt(state.round));
  CATEGORIES.forEach(cat => {
    fieldEls[cat.id].input.placeholder = s.placeholder(state.letter);
  });

  // Restart the pop animation
  el.letterTile.classList.remove('pop');
  void el.letterTile.offsetWidth;
  el.letterTile.classList.add('pop');
}

function renderTotal() {
  el.totalValue.textContent = fmt(state.total);
}

/** Lock/unlock the form. */
function setLocked(locked) {
  CATEGORIES.forEach(cat => { fieldEls[cat.id].input.disabled = locked; });
  el.submit.disabled = locked;
  el.newRound.classList.toggle('is-next', locked);
}

/** Build the results list for a scored round. */
function renderResults(rows, roundScore, timedOut) {
  const s = t();
  el.resultsList.replaceChildren();

  rows.forEach(({ cat, answer, status, points }) => {
    const li = document.createElement('li');
    li.className = 'result-row';

    const name = document.createElement('span');
    name.className = 'result-cat';
    name.textContent = cat[state.lang];

    const ans = document.createElement('span');
    ans.className = 'result-answer';
    if (status === 'empty') {
      ans.classList.add('is-none');
      ans.textContent = s.noAnswer;
    } else {
      const bdi = document.createElement('bdi'); // isolate mixed-direction answers
      bdi.textContent = answer.trim();
      ans.append(bdi);
      if (status === 'invalid') {
        const reason = document.createElement('span');
        reason.className = 'result-reason';
        reason.textContent = s.wrongLetter(state.letter);
        ans.append(reason);
      }
    }

    const badge = document.createElement('span');
    badge.className = `badge ${status}`;
    const icon = document.createElement('span');
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = BADGE_ICONS[status];
    badge.append(icon, ' ', s[status]);

    const pts = document.createElement('span');
    pts.className = 'result-points';
    const ptsText = document.createElement('bdi');
    ptsText.dir = 'ltr'; // keep "+۱۰" from flipping to "۱۰+" in RTL
    ptsText.textContent = points ? `+${fmt(points)}` : fmt(0);
    pts.append(ptsText);

    li.append(name, ans, badge, pts);
    el.resultsList.append(li);
  });

  el.resultsNotice.hidden = !timedOut;
  el.resultsNotice.textContent = timedOut ? s.timeUp : '';
  el.roundScore.textContent = fmt(roundScore);
  el.runningTotal.textContent = fmt(state.total);
  el.results.hidden = false;
}

/* =====================================================================
   6. Timer
   ===================================================================== */

function stopTimer() {
  clearInterval(state.timerId);
  state.timerId = null;
}

function renderTimer(remaining, duration) {
  el.timerValue.textContent = fmtTime(remaining);
  el.timerFill.style.setProperty('--progress', String(remaining / duration));
  el.timer.classList.toggle('is-low', remaining <= TIMER_WARNING_SECONDS);
}

/** (Re)start the countdown for the current round, if enabled. */
function startTimer() {
  stopTimer();
  el.timer.hidden = !el.timerEnabled.checked;
  if (!el.timerEnabled.checked || state.submitted) return;

  const duration = timerDuration();
  // Track an end time instead of counting ticks, so the clock never drifts
  state.timerEndsAt = Date.now() + duration * 1000;
  renderTimer(duration, duration);

  state.timerId = setInterval(() => {
    const remaining = Math.max(0, Math.ceil((state.timerEndsAt - Date.now()) / 1000));
    renderTimer(remaining, duration);
    if (remaining === 0) submitRound(true);
  }, 250);
}

/* =====================================================================
   7. Game flow
   ===================================================================== */

/** Start a fresh round with a new letter. */
function startRound({ focus = true } = {}) {
  state.round += 1;
  state.letter = pickLetter(state.letter);
  state.submitted = false;

  CATEGORIES.forEach(cat => {
    const { input } = fieldEls[cat.id];
    input.value = '';
    input.classList.remove('is-valid', 'is-invalid', 'is-empty');
    input.removeAttribute('aria-invalid');
  });
  setLocked(false);
  el.results.hidden = true;

  renderPrompt();
  startTimer();

  if (focus) fieldEls[CATEGORIES[0].id].input.focus();
}

/** Score the current round. `timedOut` is true when the timer triggered it. */
function submitRound(timedOut = false) {
  if (state.submitted) return; // never score a round twice
  state.submitted = true;
  stopTimer();

  let roundScore = 0;
  const rows = CATEGORIES.map(cat => {
    const { input } = fieldEls[cat.id];
    const answer = input.value;
    const status = judge(answer);
    const points = status === 'valid' ? POINTS_PER_VALID : 0;
    roundScore += points;

    input.classList.add(`is-${status}`);
    if (status === 'invalid') input.setAttribute('aria-invalid', 'true');
    return { cat, answer, status, points };
  });

  state.total += roundScore;
  setLocked(true);
  renderTotal();
  renderResults(rows, roundScore, timedOut);

  // Move focus to the results so keyboard & screen-reader users land on them
  el.results.focus();
}

/** Switch language; always starts a new round with that alphabet. */
function setLanguage(lang) {
  if (lang === state.lang || !STRINGS[lang]) return;
  state.lang = lang;
  state.letter = ''; // previous letter is from the other alphabet
  renderLanguage();
  startRound();
}

/* =====================================================================
   8. Events
   ===================================================================== */

el.langButtons.forEach(btn => {
  btn.addEventListener('click', () => setLanguage(btn.dataset.lang));
});

el.newRound.addEventListener('click', () => startRound());

el.form.addEventListener('submit', e => {
  e.preventDefault();
  submitRound(false);
});

// Enter moves to the next field; on the last field it submits.
el.fields.addEventListener('keydown', e => {
  if (e.key !== 'Enter' || e.isComposing || !(e.target instanceof HTMLInputElement)) return;
  e.preventDefault();
  const inputs = CATEGORIES.map(cat => fieldEls[cat.id].input);
  const next = inputs[inputs.indexOf(e.target) + 1];
  if (next) next.focus();
  else submitRound(false);
});

// Turning the timer on/off or changing its length restarts the clock for this round.
el.timerEnabled.addEventListener('change', () => {
  el.timerSeconds.disabled = !el.timerEnabled.checked;
  startTimer();
});
el.timerSeconds.addEventListener('change', startTimer);

/* =====================================================================
   9. Init
   ===================================================================== */

function init() {
  el.timerSeconds.min = TIMER_MIN_SECONDS;
  el.timerSeconds.max = TIMER_MAX_SECONDS;
  el.timerSeconds.value = DEFAULT_TIMER_SECONDS;
  el.timerSeconds.disabled = !el.timerEnabled.checked;

  // Start in Farsi if the browser prefers it
  state.lang = (navigator.language || '').toLowerCase().startsWith('fa') ? 'fa' : 'en';

  buildFields();
  renderLanguage();
  startRound({ focus: false }); // don't pop the mobile keyboard on page load
}

init();
