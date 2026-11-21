import { describe, it, expect } from 'vitest';
import { validateName, normalizeName, NAME_MAX } from '../src/profile/name.js';
import { getInitial } from '../src/profile/initial.js';
import { colorForId, INK_COLORS } from '../src/profile/color.js';
import { createProfile, renameProfile, sanitizeProfile, newId } from '../src/profile/profile.js';
import { parseStore, createStore, STORAGE_KEY } from '../src/profile/storage.js';

const ZWNJ = '‌';

/* ------------------------------------------------------------------ */
describe('validateName', () => {
  it('accepts English names', () => {
    expect(validateName('Sara')).toEqual({ ok: true, name: 'Sara' });
    expect(validateName('Ali 2')).toEqual({ ok: true, name: 'Ali 2' });
  });

  it('accepts Persian names, including ZWNJ and Persian digits', () => {
    expect(validateName('سارا').ok).toBe(true);
    expect(validateName('آرش').ok).toBe(true);
    expect(validateName(`علی${ZWNJ}رضا`)).toEqual({ ok: true, name: `علی${ZWNJ}رضا` });
    expect(validateName('مریم ۲').ok).toBe(true);
    expect(validateName('پژمان گیلک چ').ok).toBe(true);
  });

  it('accepts mixed Persian and English', () => {
    expect(validateName('Sara سارا')).toEqual({ ok: true, name: 'Sara سارا' });
  });

  it('trims and collapses spaces', () => {
    expect(validateName('   Sara    Jan  ')).toEqual({ ok: true, name: 'Sara Jan' });
    expect(validateName('Sara\t Jan').name).toBe('Sara Jan');
  });

  it('cleans ZWNJ at the ends, doubled, or next to a space', () => {
    expect(normalizeName(`${ZWNJ}سارا${ZWNJ}`)).toBe('سارا');
    expect(normalizeName(`علی${ZWNJ}${ZWNJ}رضا`)).toBe(`علی${ZWNJ}رضا`);
    expect(normalizeName(`علی ${ZWNJ} رضا`)).toBe('علی رضا');
  });

  it('maps Arabic-keyboard letters to Persian', () => {
    expect(validateName('علي').name).toBe('علی');
    expect(validateName('كيان').name).toBe('کیان');
  });

  it('rejects empty and only-spaces names', () => {
    expect(validateName('')).toMatchObject({ ok: false, error: 'empty' });
    expect(validateName('     ')).toMatchObject({ ok: false, error: 'empty' });
    expect(validateName(` ${ZWNJ} `)).toMatchObject({ ok: false, error: 'empty' });
    expect(validateName(undefined)).toMatchObject({ ok: false, error: 'empty' });
  });

  it('rejects too short and too long', () => {
    expect(validateName('S')).toMatchObject({ ok: false, error: 'tooShort' });
    expect(validateName(' س ')).toMatchObject({ ok: false, error: 'tooShort' });
    expect(validateName('a'.repeat(NAME_MAX)).ok).toBe(true);
    expect(validateName('a'.repeat(NAME_MAX + 1))).toMatchObject({ ok: false, error: 'tooLong' });
    expect(validateName('ب'.repeat(NAME_MAX + 1))).toMatchObject({ ok: false, error: 'tooLong' });
  });

  it('counts length after collapsing spaces', () => {
    expect(validateName(`ab${' '.repeat(30)}cd`)).toEqual({ ok: true, name: 'ab cd' });
  });

  it('rejects symbols and emoji', () => {
    expect(validateName('Sara!')).toMatchObject({ ok: false, error: 'badChars' });
    expect(validateName('<b>hi</b>')).toMatchObject({ ok: false, error: 'badChars' });
    expect(validateName('Sara 😀')).toMatchObject({ ok: false, error: 'badChars' });
  });

  it('requires at least one letter', () => {
    expect(validateName('123')).toMatchObject({ ok: false, error: 'noLetter' });
    expect(validateName('۱۲۳')).toMatchObject({ ok: false, error: 'noLetter' });
  });
});

/* ------------------------------------------------------------------ */
describe('getInitial', () => {
  it('takes the first Persian letter', () => {
    expect(getInitial('سارا')).toBe('س');
    expect(getInitial('بهرام')).toBe('ب');
  });

  it('keeps آ as آ (one character)', () => {
    expect(getInitial('آرش')).toBe('آ');
    expect(getInitial('آرش')).toHaveLength(1);
    expect(getInitial('آرش')).toBe('آ'); // alef + madda typed separately
  });

  it('uppercases English', () => {
    expect(getInitial('sara')).toBe('S');
    expect(getInitial('émile')).toBe('É');
  });

  it('skips leading spaces, ZWNJ, digits, tatweel and emoji', () => {
    expect(getInitial('   sara')).toBe('S');
    expect(getInitial(`${ZWNJ}${ZWNJ}مریم`)).toBe('م');
    expect(getInitial('42 ali')).toBe('A');
    expect(getInitial('۲ مریم')).toBe('م');
    expect(getInitial('😀🎉 nima')).toBe('N');
    expect(getInitial('ـــسارا')).toBe('س');
  });

  it('returns a standalone letter, not a joined presentation form', () => {
    expect(getInitial('ﺳﺎﺮ')).toBe('س'); // initial-form seen
    expect(getInitial('ﻻ')).toBe('ل');              // lam-alef ligature
  });

  it('maps Arabic yeh/kaf to Persian', () => {
    expect(getInitial('يوسف')).toBe('ی');
    expect(getInitial('كاوه')).toBe('ک');
  });

  it('falls back to ? with no letters', () => {
    expect(getInitial('123')).toBe('?');
    expect(getInitial('')).toBe('?');
    expect(getInitial(null)).toBe('?');
  });
});

/* ------------------------------------------------------------------ */
describe('colorForId', () => {
  it('is stable for the same id', () => {
    const id = 'b7c1e2a4-0000-4000-8000-000000000001';
    expect(colorForId(id)).toBe(colorForId(id));
    expect(colorForId(id)).toBe(colorForId(String(id)));
  });

  it('always picks from the ink palette', () => {
    for (let i = 0; i < 200; i++) expect(INK_COLORS).toContain(colorForId(newId()));
  });

  it('spreads ids across several colors', () => {
    const seen = new Set(Array.from({ length: 200 }, (_, i) => colorForId(`player-${i}`)));
    expect(seen.size).toBeGreaterThan(3);
  });

  it('does not depend on the name', () => {
    const id = newId();
    const a = createProfile('Sara', { id });
    const b = renameProfile(a, 'Nima');
    expect(b.avatar.color).toBe(a.avatar.color);
  });
});

/* ------------------------------------------------------------------ */
describe('profiles', () => {
  it('creates { id, name, avatar, createdAt } with a UUID id', () => {
    const p = createProfile('  sara ', { now: new Date('2026-01-01T00:00:00Z') });
    expect(p.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(p.id).not.toBe(p.name);
    expect(p).toMatchObject({ name: 'sara', createdAt: '2026-01-01T00:00:00.000Z' });
    expect(p.avatar).toEqual({ type: 'initial', value: 'S', color: colorForId(p.id) });
  });

  it('rename keeps id and createdAt, updates the initial', () => {
    const p = createProfile('Sara');
    const r = renameProfile(p, 'آرش');
    expect(r.id).toBe(p.id);
    expect(r.createdAt).toBe(p.createdAt);
    expect(r.avatar.value).toBe('آ');
  });

  it('refuses invalid names', () => {
    expect(() => createProfile(' ')).toThrow();
    expect(() => renameProfile(createProfile('Sara'), 'x')).toThrow();
  });
});

/* ------------------------------------------------------------------ */
describe('loading saved data', () => {
  const good = { id: 'abc-123', name: 'Sara', avatar: { type: 'initial', value: 'S', color: '#1f3a93' }, createdAt: '2026-01-01T00:00:00.000Z' };

  it('loads a valid v1 store', () => {
    const s = parseStore(JSON.stringify({ version: 1, profile: good, settings: { lang: 'fa' } }));
    expect(s.profile).toMatchObject({ id: 'abc-123', name: 'Sara' });
    expect(s.settings).toEqual({ lang: 'fa' });
  });

  it('survives corrupted JSON and odd values', () => {
    for (const raw of [null, '', '{', 'null', '42', '"text"', '[]', 'undefined', '{"version":1,"profile":"Sara"}']) {
      expect(() => parseStore(raw)).not.toThrow();
      expect(parseStore(raw).profile).toBeNull();
    }
  });

  it('drops a profile with a bad id or name', () => {
    const load = profile => parseStore(JSON.stringify({ version: 1, profile })).profile;
    expect(load({ ...good, id: 42 })).toBeNull();
    expect(load({ ...good, id: '' })).toBeNull();
    expect(load({ ...good, name: '' })).toBeNull();
    expect(load({ ...good, name: '<script>' })).toBeNull();
    expect(load({ ...good, name: 'x'.repeat(500) })).toBeNull();
  });

  it('repairs a missing or broken avatar and createdAt', () => {
    const p = parseStore(JSON.stringify({ version: 1, profile: { id: 'abc-123', name: 'nima', avatar: 'N', createdAt: 'yesterday' } })).profile;
    expect(p.avatar).toEqual({ type: 'initial', value: 'N', color: colorForId('abc-123') });
    expect(Number.isNaN(Date.parse(p.createdAt))).toBe(false);
  });

  it('recomputes a stale initial from the name', () => {
    const p = parseStore(JSON.stringify({ version: 1, profile: { ...good, avatar: { type: 'initial', value: 'Z', color: '#000' } } })).profile;
    expect(p.avatar.value).toBe('S');
    expect(p.avatar.color).toBe(colorForId('abc-123'));
  });

  it('keeps an unknown future avatar type', () => {
    const avatar = { type: 'image', url: 'https://example.com/a.png' };
    expect(parseStore(JSON.stringify({ version: 1, profile: { ...good, avatar } })).profile.avatar).toEqual(avatar);
  });

  it('migrates an unversioned bare profile', () => {
    expect(parseStore(JSON.stringify(good)).profile).toMatchObject({ id: 'abc-123', name: 'Sara' });
  });

  it('ignores an unknown version and a bad language', () => {
    expect(parseStore(JSON.stringify({ version: 99, profile: good })).profile).toBeNull();
    expect(parseStore(JSON.stringify({ version: 1, profile: good, settings: { lang: 'de' } })).settings).toEqual({});
  });
});

/* ------------------------------------------------------------------ */
describe('createStore', () => {
  const fakeStorage = () => {
    const data = new Map();
    return {
      data,
      getItem: k => (data.has(k) ? data.get(k) : null),
      setItem: (k, v) => data.set(k, String(v)),
      removeItem: k => data.delete(k),
    };
  };

  it('saves profile and settings in one entry and reads them back', () => {
    const storage = fakeStorage();
    const store = createStore(() => storage);
    const p = createProfile('Sara');
    store.saveProfile(p);
    store.saveSettings({ lang: 'en' });
    expect(JSON.parse(storage.data.get(STORAGE_KEY))).toEqual({ version: 1, profile: p, settings: { lang: 'en' } });
    expect(createStore(() => storage).load().profile).toEqual(p);
  });

  it('clearing the profile keeps the language', () => {
    const storage = fakeStorage();
    const store = createStore(() => storage);
    store.saveProfile(createProfile('Sara'));
    store.saveSettings({ lang: 'fa' });
    store.clearProfile();
    expect(store.load()).toEqual({ version: 1, profile: null, settings: { lang: 'fa' } });
  });

  it('falls back to memory when storage throws (private mode)', () => {
    const store = createStore(() => { throw new Error('SecurityError'); });
    expect(store.load().profile).toBeNull();
    const p = createProfile('Sara');
    store.saveProfile(p);
    expect(store.load().profile).toEqual(p);
    expect(store.persistent).toBe(false);
  });

  it('falls back to memory when setItem fails (quota)', () => {
    const storage = { ...fakeStorage(), setItem: () => { throw new Error('QuotaExceededError'); } };
    const store = createStore(() => storage);
    const p = createProfile('Nima');
    store.saveProfile(p);
    expect(store.load().profile).toEqual(p);
  });

  it('loads corrupted storage without crashing', () => {
    const storage = fakeStorage();
    storage.setItem(STORAGE_KEY, '{"version":1,"profile":{"id":');
    expect(createStore(() => storage).load().profile).toBeNull();
  });
});
