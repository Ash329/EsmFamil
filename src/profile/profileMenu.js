/*
 * "Name: (S) Sara" at the top of the sheet. Clicking it opens a small
 * paper slip: change name, choose picture (coming soon), leave.
 */

import { validateName } from './name.js';
import { renderAvatar } from './avatar.js';
import { PROFILE_STRINGS } from './strings.js';

/**
 * @param container element the player line is built into
 * @param onRename  name => void (name already validated)
 * @param onLeave   () => void (already confirmed)
 */
export function createProfileMenu(container, { onRename, onLeave }) {
  let profile = null;
  let lang = 'fa';
  let view = 'main';     // 'main' | 'rename' | 'leave'
  let renameError = null;

  const field = document.createElement('span');
  field.className = 'player-field';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'player-button';
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-controls', 'profile-menu');
  const avatarSlot = document.createElement('span');
  avatarSlot.className = 'player-avatar';
  const nameEl = document.createElement('span');
  nameEl.className = 'player-name';
  nameEl.dir = 'auto';
  button.append(avatarSlot, nameEl);

  const panel = document.createElement('div');
  panel.className = 'profile-menu';
  panel.id = 'profile-menu';
  panel.hidden = true;

  const wrap = document.createElement('div');
  wrap.className = 'player';
  wrap.append(field, button, panel);
  container.append(wrap);

  const isOpen = () => !panel.hidden;

  function renderButton() {
    const s = PROFILE_STRINGS[lang];
    field.textContent = s.nameField;
    nameEl.textContent = profile?.name ?? '';
    avatarSlot.replaceChildren(profile ? renderAvatar(profile, { size: 'md' }) : '');
    button.setAttribute('aria-label', `${profile?.name ?? ''}: ${s.menu}`);
  }

  const make = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const item = (text, onClick, extra = '') => {
    const b = make('button', `menu-item ${extra}`.trim(), text);
    b.type = 'button';
    if (onClick) b.addEventListener('click', onClick);
    return b;
  };

  function renderPanel() {
    const s = PROFILE_STRINGS[lang];
    panel.replaceChildren();
    panel.setAttribute('aria-label', s.menu);

    if (view === 'main') {
      const head = make('div', 'menu-head');
      const name = make('span', 'menu-name', profile.name);
      name.dir = 'auto';
      head.append(renderAvatar(profile, { size: 'lg' }), name);

      const picture = item(s.choosePicture, null, 'is-soon');
      picture.disabled = true;
      picture.append(' ', make('span', 'menu-soon', `— ${s.comingSoon}`));

      panel.append(
        head,
        item(s.changeName, () => setView('rename')),
        picture,
        item(s.leave, () => setView('leave'), 'is-leave'),
      );
    } else if (view === 'rename') {
      const form = make('form', 'menu-rename');
      form.noValidate = true;
      const input = make('input', 'menu-input');
      Object.assign(input, { type: 'text', value: profile.name, dir: 'auto', autocomplete: 'off', spellcheck: false });
      input.setAttribute('aria-label', s.changeName);
      input.setAttribute('aria-describedby', 'rename-error');
      input.setAttribute('aria-invalid', String(Boolean(renameError)));
      const error = make('p', 'menu-error', renameError ? s.errors[renameError] : '');
      error.id = 'rename-error';
      error.setAttribute('aria-live', 'polite');
      const actions = make('div', 'menu-actions');
      const save = make('button', 'menu-item is-primary', s.save);
      save.type = 'submit';
      actions.append(save, item(s.cancel, () => setView('main')));
      form.append(input, error, actions);

      input.addEventListener('input', () => {
        if (!renameError) return;
        renameError = null;
        error.textContent = '';
        input.setAttribute('aria-invalid', 'false');
      });
      form.addEventListener('submit', e => {
        e.preventDefault();
        const result = validateName(input.value);
        if (!result.ok) {
          renameError = result.error;
          error.textContent = s.errors[result.error];
          input.setAttribute('aria-invalid', 'true');
          input.focus();
          return;
        }
        close();
        if (result.name !== profile.name) onRename(result.name);
      });
      panel.append(form);
    } else {
      const question = make('p', 'menu-question', s.leaveQuestion);
      const actions = make('div', 'menu-actions');
      actions.append(
        item(s.leaveYes, () => { close(false); onLeave(); }, 'is-leave is-primary'),
        item(s.cancel, () => setView('main')),
      );
      panel.setAttribute('role', 'alertdialog');
      panel.append(question, actions);
      return;
    }
    panel.removeAttribute('role');
  }

  function setView(next) {
    view = next;
    renameError = null;
    renderPanel();
    const target = {
      rename: () => panel.querySelector('input'),
      leave: () => panel.querySelector('.menu-actions button:last-child'), // Cancel: the safe default
      main: () => panel.querySelector('button:not(:disabled)'),
    }[view]();
    target?.focus();
    if (view === 'rename') target?.select();
  }

  function open() {
    if (!profile) return;
    panel.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    setView('main');
  }

  function close(returnFocus = true) {
    if (!isOpen()) return;
    panel.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    view = 'main';
    if (returnFocus) button.focus();
  }

  button.addEventListener('click', () => (isOpen() ? close() : open()));

  panel.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    e.stopPropagation();
    if (view === 'main') close();
    else setView('main');
  });

  // Click or focus anywhere else closes it.
  document.addEventListener('pointerdown', e => {
    if (isOpen() && !wrap.contains(e.target)) close(false);
  });
  wrap.addEventListener('focusout', e => {
    if (isOpen() && e.relatedTarget && !wrap.contains(e.relatedTarget)) close(false);
  });

  return {
    /** Draw for this profile and language; an open menu is redrawn in place. */
    render(nextProfile, nextLang) {
      profile = nextProfile;
      lang = nextLang;
      renderButton();
      if (isOpen()) {
        if (profile) renderPanel();
        else close(false);
      }
    },
    close,
    show() { container.hidden = false; },
    hide() { close(false); container.hidden = true; },
  };
}
