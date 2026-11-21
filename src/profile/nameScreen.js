/*
 * The "login": the player writes their name at the top of the sheet.
 */

import { validateName } from './name.js';
import { newId, initialAvatar } from './profile.js';
import { renderAvatar } from './avatar.js';
import { PROFILE_STRINGS } from './strings.js';

/**
 * @param container element the form is built into
 * @param onSubmit  (name, id) => void, called with a validated name
 */
export function createNameScreen(container, { onSubmit }) {
  let lang = 'fa';
  let pendingId = newId();   // known before submit, so the preview's ink matches the final avatar
  let errorCode = null;

  const form = document.createElement('form');
  form.className = 'name-form';
  form.noValidate = true;
  form.autocomplete = 'off';
  form.innerHTML = `
    <div class="name-line">
      <label class="name-label" for="guest-name"></label>
      <span class="name-avatar"></span>
      <input class="name-input" id="guest-name" name="name" type="text" dir="auto"
             autocomplete="nickname" autocapitalize="words" spellcheck="false"
             enterkeyhint="go" aria-describedby="guest-name-error guest-name-hint">
    </div>
    <p class="name-error" id="guest-name-error" aria-live="polite"></p>
    <p class="name-hint" id="guest-name-hint"></p>
    <button type="submit" class="stamp name-start"></button>
  `;
  container.append(form);

  const $ = sel => form.querySelector(sel);
  const label = $('.name-label');
  const avatarSlot = $('.name-avatar');
  const input = $('.name-input');
  const error = $('.name-error');
  const hint = $('.name-hint');
  const start = $('.name-start');

  function renderPreview() {
    const name = input.value;
    avatarSlot.replaceChildren(renderAvatar({ id: pendingId, name, avatar: initialAvatar(name, pendingId) }, { size: 'lg' }));
  }

  function renderError() {
    error.textContent = errorCode ? PROFILE_STRINGS[lang].errors[errorCode] : '';
    input.setAttribute('aria-invalid', String(Boolean(errorCode)));
    form.classList.toggle('has-error', Boolean(errorCode));
  }

  function setLang(next) {
    lang = next;
    const s = PROFILE_STRINGS[lang];
    label.textContent = s.nameLabel;
    input.placeholder = s.namePlaceholder;
    hint.textContent = s.nameHint;
    start.textContent = s.start;
    renderError();
  }

  // Submit button and Enter both land here.
  form.addEventListener('submit', e => {
    e.preventDefault();
    const result = validateName(input.value);
    if (!result.ok) {
      errorCode = result.error;
      renderError();
      input.focus();
      return;
    }
    onSubmit(result.name, pendingId);
  });

  input.addEventListener('input', () => {
    if (errorCode) { errorCode = null; renderError(); }
    renderPreview();
  });

  return {
    setLang,
    show(currentLang) {
      pendingId = newId();
      errorCode = null;
      input.value = '';
      setLang(currentLang);
      renderPreview();
      container.hidden = false;
      input.focus({ preventScroll: true });
    },
    hide() { container.hidden = true; },
  };
}
