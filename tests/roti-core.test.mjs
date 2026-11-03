import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LABELS, labelFor, isValidNote, normalizeCode, isValidCode, generateCode, CODE_ALPHABET, generateCommentId,
  isValidCommentId, validateTitle, normalizeTitle, validateComment, normalizeComment, COMMENT_MAX, TITLE_MAX,
  notesOf, average, formatAverage, nearestNote, distribution, commentsOf, connectedCount, plural,
  parseMine, addMine, removeMine, MINE_MAX,
} from '../site/js/roti-core.js';

test('cinq libellés, de « J\'ai perdu mon temps » à « Génial… »', () => {
  assert.equal(LABELS.length, 5);
  assert.equal(labelFor(1), "J'ai perdu mon temps");
  assert.equal(labelFor(2), "Peu utile, j'en retire peu de chose");
  assert.equal(labelFor(3), 'Correct, ça valait le temps passé');
  assert.equal(labelFor(4), "Utile, j'en retire de la valeur");
  assert.equal(labelFor(5), "Génial, j'ai adoré et j'en retire beaucoup de valeur");
  assert.equal(labelFor(0), '');
  assert.equal(labelFor(6), '');
});

test('une note est un entier de 1 à 5', () => {
  for (const n of [1, 2, 3, 4, 5]) assert.ok(isValidNote(n));
  for (const n of [0, 6, 2.5, '3', null, undefined, NaN]) assert.ok(!isValidNote(n), String(n));
});

test('code de salle : 4 lettres sans I, L ni O, saisie tolérante', () => {
  assert.equal(CODE_ALPHABET.length, 23);
  for (const letter of 'ILO') assert.ok(!CODE_ALPHABET.includes(letter));
  assert.equal(normalizeCode(' ab cd '), 'ABCD');
  assert.ok(isValidCode('ABCD'));
  assert.ok(!isValidCode('AB'));
  assert.ok(!isValidCode('ABCI'));
  assert.ok(!isValidCode('abcd'));
  let seq = 0;
  const code = generateCode(() => ((seq += 0.21) % 1));
  assert.ok(isValidCode(code), code);
  assert.ok(isValidCode(generateCode()));
});

test('identifiant de commentaire : 20 caractères aléatoires', () => {
  const id = generateCommentId();
  assert.ok(isValidCommentId(id), id);
  assert.notEqual(generateCommentId(), id);
  assert.ok(!isValidCommentId('-Nabc'));
  assert.ok(!isValidCommentId(null));
});

test('titre facultatif de 80 caractères au plus', () => {
  assert.equal(validateTitle(''), null);
  assert.equal(validateTitle('x'.repeat(TITLE_MAX)), null);
  assert.match(validateTitle('x'.repeat(TITLE_MAX + 1)), /80 caractères/);
  assert.equal(normalizeTitle('  Sprint   Review  '), 'Sprint Review');
});

test('commentaire de 1 à 500 caractères', () => {
  assert.equal(validateComment('Merci'), null);
  assert.match(validateComment('   '), /Écrivez/);
  assert.equal(validateComment('x'.repeat(COMMENT_MAX)), null);
  assert.match(validateComment('x'.repeat(COMMENT_MAX + 1)), /500 caractères/);
  assert.equal(normalizeComment('  a\r\nb  '), 'a\nb');
});

test('moyenne arrondie à une décimale et écrite à la française', () => {
  assert.equal(average([5, 4, 4, 2]), 3.8);
  assert.equal(formatAverage(average([5, 4, 4, 2])), '3,8');
  assert.equal(average([5, 4, 4]), 4.3);
  assert.equal(formatAverage(4.3), '4,3');
  assert.equal(formatAverage(5), '5,0');
  assert.equal(average([]), null);
  assert.equal(formatAverage(null), '–');
});

test('libellé le plus proche de la moyenne', () => {
  assert.equal(nearestNote(4.3), 4);
  assert.equal(labelFor(nearestNote(4.3)), "Utile, j'en retire de la valeur");
  assert.equal(nearestNote(3.5), 4);
  assert.equal(nearestNote(1.2), 1);
  assert.equal(nearestNote(null), null);
});

test('répartition de 5 à 1, notes absentes comprises', () => {
  assert.deepEqual(distribution([5, 4, 4]), [
    { note: 5, count: 1, percent: 33 },
    { note: 4, count: 2, percent: 67 },
    { note: 3, count: 0, percent: 0 },
    { note: 2, count: 0, percent: 0 },
    { note: 1, count: 0, percent: 0 },
  ]);
  assert.deepEqual(distribution([]).map((r) => r.count), [0, 0, 0, 0, 0]);
});

test('notes valides seulement', () => {
  assert.deepEqual(notesOf({ a: 5, b: 9, c: '3', d: 2 }).sort(), [2, 5]);
  assert.deepEqual(notesOf(null), []);
});

test('commentaires triés par identifiant aléatoire, sans les vides', () => {
  assert.deepEqual(commentsOf({ zz: 'deux', aa: 'un', mm: '  ', nn: 3 }), ['un', 'deux']);
  assert.deepEqual(commentsOf(null), []);
});

test('participants connectés : au moins un onglet ouvert', () => {
  assert.equal(connectedCount({ a: { connections: { x: true, y: true } }, b: { connections: {} }, c: {} }), 1);
  assert.equal(connectedCount(null), 0);
});

test('pluriels', () => {
  assert.equal(plural(0, 'vote'), '0 vote');
  assert.equal(plural(1, 'vote'), '1 vote');
  assert.equal(plural(2, 'vote'), '2 votes');
  assert.equal(plural(2, 'participant connecté', 'participants connectés'), '2 participants connectés');
});

test('Mes ROTI : liste mémorisée, triée, sans doublon, limitée', () => {
  assert.deepEqual(parseMine('pas du json'), []);
  assert.deepEqual(parseMine('{"a":1}'), []);
  let list = parseMine(JSON.stringify([{ code: 'ABCD', createdAt: 1 }, { code: 'bad', createdAt: 2 }, { code: 'EFGH', createdAt: 3 }]));
  assert.deepEqual(list.map((e) => e.code), ['EFGH', 'ABCD']);
  list = addMine(list, 'ABCD', 5);
  assert.deepEqual(list, [{ code: 'ABCD', createdAt: 5 }, { code: 'EFGH', createdAt: 3 }]);
  assert.deepEqual(removeMine(list, 'ABCD').map((e) => e.code), ['EFGH']);
  let many = [];
  for (let i = 0; i < MINE_MAX + 10; i += 1) many = addMine(many, generateCode(), i);
  assert.ok(many.length <= MINE_MAX);
});
