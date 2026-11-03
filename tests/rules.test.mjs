// Cohérence entre les règles de sécurité Firebase et la logique du ROTI.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { CODE_ALPHABET, COMMENT_MAX, TITLE_MAX, ROOM_TTL_MS, COMMENT_ID_LENGTH } from '../site/js/roti-core.js';
import { ROOT } from '../site/js/roti-store.js';

const text = await readFile(new URL('../database.rules.json', import.meta.url), 'utf8');
const rules = JSON.parse(text).rules;
const branch = rules[ROOT];
const room = branch.rooms.$code;

test('fichier JSON formaté comme dans les dépôts frères', () => {
  assert.equal(text, `${JSON.stringify(JSON.parse(text), null, 2)}\n`);
});

test('la branche roti existe à côté des outils frères, tout le reste est fermé', () => {
  assert.equal(ROOT, 'roti');
  for (const name of ['room', 'skillMatrix', 'wheelOfChance', 'movingMotivators', 'rolesGame', 'eventsGame', 'incrementGame', 'roti']) {
    assert.ok(rules[name], name);
  }
  assert.equal(rules['.read'], false);
  assert.equal(rules['.write'], false);
});

test('la branche roti ne fait référence qu\'à elle-même', () => {
  const json = JSON.stringify(branch);
  for (const other of ['skillMatrix', 'wheelOfChance', 'movingMotivators', 'rolesGame', 'eventsGame', 'incrementGame', "'room/"]) {
    assert.ok(!json.includes(other), other);
  }
});

test('le code de salle des règles correspond à l\'alphabet de l\'outil', () => {
  const rule = branch.expiry.$code['.validate'].match(/\[([A-Z-]+)\]\{4\}/)[1];
  const allowed = rule.replace(/([A-Z])-([A-Z])/g, (_, a, b) => {
    let out = '';
    for (let c = a.charCodeAt(0); c <= b.charCodeAt(0); c += 1) out += String.fromCharCode(c);
    return out;
  });
  assert.equal(allowed, CODE_ALPHABET);
});

test('notes de 1 à 5, commentaires de 1 à 500 caractères, titres de 80 au plus', () => {
  const note = room.votes.$uid['.validate'];
  for (const n of [1, 2, 3, 4, 5]) assert.ok(note.includes(`newData.val() === ${n}`), String(n));
  assert.ok(!note.includes('=== 0') && !note.includes('=== 6'));
  assert.match(room.comments.$cid['.validate'], new RegExp(`length <= ${COMMENT_MAX}`));
  assert.match(room.comments.$cid['.validate'], new RegExp(`\\{${COMMENT_ID_LENGTH}\\}`));
  assert.match(room.meta.title['.validate'], new RegExp(`length <= ${TITLE_MAX}`));
});

test('purge au-delà de 30 jours seulement (hors animateur)', () => {
  assert.equal(ROOM_TTL_MS, 2592000000);
  assert.match(room['.write'], /now - 2592000000/);
  assert.match(branch.expiry.$code['.write'], /now - 2592000000/);
});

test('notes et commentaires : lus par l\'animateur, ou par tous après la révélation', () => {
  for (const node of [room.votes, room.comments]) {
    assert.match(node['.read'], /meta\/hostUid'\)\.val\(\) === auth\.uid/);
    assert.match(node['.read'], /meta\/status'\)\.val\(\) === 'revealed'/);
  }
  assert.equal(room['.read'], undefined, 'pas de lecture globale de la salle');
  assert.equal(room.mine['.read'], undefined);
  assert.equal(room.mine.$uid['.read'], 'auth != null && auth.uid === $uid');
});

test('écritures de participant seulement tant que les votes sont ouverts', () => {
  assert.match(room.votes.$uid['.write'], /meta\/status'\)\.val\(\) === 'open'/);
  assert.match(room.comments.$cid['.write'], /meta\/status'\)\.val\(\) === 'open'/);
});

test('aucune autre donnée acceptée', () => {
  assert.deepEqual(branch.$other, { '.validate': false });
  assert.deepEqual(room.$other, { '.validate': false });
  assert.deepEqual(room.meta.$other, { '.validate': false });
  assert.deepEqual(room.participants.$uid.$other, { '.validate': false });
});
