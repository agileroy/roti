// Parcours complets sur un serveur en mémoire soumis aux vraies règles (database.rules.json),
// évaluées par le simulateur de tests/rules-sim.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createMemoryServer } from '../site/js/memory-db.js';
import { createRotiStore, ROOT } from '../site/js/roti-store.js';
import { notesOf, commentsOf, average, ROOM_TTL_MS } from '../site/js/roti-core.js';
import { createRulesChecker } from './rules-sim.mjs';

const rulesJson = JSON.parse(await readFile(new URL('../database.rules.json', import.meta.url), 'utf8'));
const checker = createRulesChecker(rulesJson);

function setup() {
  let clock = 1_800_000_000_000;
  const server = createMemoryServer({ now: () => clock, rules: checker });
  const make = (uid) => {
    const db = server.client(uid);
    return { db, store: createRotiStore(db) };
  };
  return { server, make, tick: (ms) => { clock += ms; }, now: () => clock };
}

const flush = () => new Promise((resolve) => setImmediate(resolve));
const room = (code) => `${ROOT}/rooms/${code}`;

async function rejects(promise) {
  await assert.rejects(promise, /PERMISSION_DENIED/);
}

test('création : code réservé, en-tête de la salle, l\'animateur est le créateur', async () => {
  const { server, make, now } = setup();
  const host = make('host');
  const { code, createdAt } = await host.store.createRoom('  Sprint   Review ');
  assert.match(code, /^[A-HJKMNP-Z]{4}$/);
  assert.equal(createdAt, now());
  assert.deepEqual(server.read(`${room(code)}/meta`), { hostUid: 'host', createdAt, title: 'Sprint Review', status: 'open' });
  assert.deepEqual(server.read(`${ROOT}/expiry/${code}`), { createdAt, hostUid: 'host' });
  await assert.rejects(host.store.createRoom('x'.repeat(81)), /80 caractères/);
});

test('un participant ne peut ni prendre la salle ni la révéler', async () => {
  const { make } = setup();
  const host = make('host');
  const { code } = await host.store.createRoom('');
  const alice = make('alice');
  assert.equal(await alice.store.reveal(code), false);
  await rejects(alice.db.set(`${room(code)}/meta/title`, 'Piraté'));
  await rejects(alice.db.set(`${room(code)}/meta/hostUid`, 'alice'));
  assert.equal(await alice.store.deleteRoom(code), false);
});

test('vote : une note par participant, modifiable, cachée aux autres avant la révélation', async () => {
  const { server, make } = setup();
  const host = make('host');
  const { code } = await host.store.createRoom('Atelier');
  const alice = make('alice');
  const bob = make('bob');
  assert.ok(await alice.store.vote(code, 4));
  assert.ok(await alice.store.vote(code, 2));
  assert.ok(await bob.store.vote(code, 5));
  assert.deepEqual(server.read(`${room(code)}/votes`), { alice: 2, bob: 5 });

  // Note invalide ou note d'un autre : refusées.
  assert.equal(await alice.store.vote(code, 6), false);
  await rejects(alice.db.set(`${room(code)}/votes/alice`, 6));
  await rejects(alice.db.set(`${room(code)}/votes/alice`, 2.5));
  await rejects(alice.db.set(`${room(code)}/votes/bob`, 1));

  // Lecture : chacun sa note, l'animateur toutes, les autres participants aucune.
  assert.equal(await alice.db.get(`${room(code)}/votes/alice`), 2);
  await rejects(alice.db.get(`${room(code)}/votes`));
  await rejects(alice.db.get(`${room(code)}/votes/bob`));
  await rejects(alice.db.get(room(code)));
  assert.deepEqual(await host.db.get(`${room(code)}/votes`), { alice: 2, bob: 5 });
});

test('commentaire : un seul par participant, modifiable, retirable, invisible des autres avant la révélation', async () => {
  const { server, make } = setup();
  const host = make('host');
  const { code } = await host.store.createRoom('');
  const alice = make('alice');
  assert.equal(await alice.store.saveComment(code, 'Trop long'), null);
  const cid = server.read(`${room(code)}/mine/alice`);
  assert.match(cid, /^[a-z0-9]{20}$/);
  assert.equal(await alice.store.saveComment(code, 'Trop long, mais utile'), null);
  assert.deepEqual(server.read(`${room(code)}/comments`), { [cid]: 'Trop long, mais utile' });
  assert.match(await alice.store.saveComment(code, '   '), /Écrivez/);
  assert.match(await alice.store.saveComment(code, 'x'.repeat(501)), /500/);

  // Un deuxième identifiant pour le même participant est refusé par la base.
  await rejects(alice.db.update(room(code), {
    'mine/alice': 'b'.repeat(20), ['claimed/' + 'b'.repeat(20)]: true, ['comments/' + 'b'.repeat(20)]: 'spam',
  }));

  const bob = make('bob');
  await rejects(bob.db.get(`${room(code)}/comments`));
  await rejects(bob.db.get(`${room(code)}/comments/${cid}`));
  await rejects(bob.db.set(`${room(code)}/comments/${cid}`, 'Effacé par Bob'));
  assert.equal(await alice.db.get(`${room(code)}/comments/${cid}`), 'Trop long, mais utile');

  assert.ok(await alice.store.removeComment(code));
  assert.equal(server.read(`${room(code)}/comments`), null);
  assert.equal(await alice.store.saveComment(code, 'Finalement, merci'), null);
  assert.deepEqual(server.read(`${room(code)}/comments`), { [cid]: 'Finalement, merci' });
});

test('anonymat : l\'animateur lit notes et commentaires, jamais le lien entre les deux', async () => {
  const { server, make } = setup();
  const host = make('host');
  const { code } = await host.store.createRoom('');
  const alice = make('alice');
  const bob = make('bob');
  await alice.store.vote(code, 2);
  await alice.store.saveComment(code, 'Pas pour moi');
  await bob.store.vote(code, 5);
  await bob.store.saveComment(code, 'Top');
  await host.store.reveal(code);

  // Ce que l'animateur lit : notes par identifiant anonyme, commentaires par identifiant aléatoire.
  const seen = await new Promise((resolve) => host.store.watchHost(code, resolve));
  assert.deepEqual(Object.keys(seen).sort(), ['comments', 'participants', 'votes']);
  const commentKeys = Object.keys(seen.comments);
  for (const key of commentKeys) assert.ok(!['alice', 'bob'].includes(key));
  assert.equal(JSON.stringify(seen.comments).includes('alice'), false);

  // Le store de l'animateur n'a jamais lu `mine` ni `claimed`.
  const hostReads = server.reads.filter((r) => r.uid === 'host').map((r) => r.path);
  assert.ok(hostReads.every((p) => !p.includes('/mine') && !p.includes('/claimed')), hostReads.join(', '));

  // Lectures directes du lien : refusées par la base.
  await rejects(host.db.get(`${room(code)}/mine`));
  await rejects(host.db.get(`${room(code)}/mine/alice`));
  await rejects(host.db.get(`${room(code)}/claimed`));
  await rejects(host.db.get(room(code)));
  await rejects(bob.db.get(`${room(code)}/mine/alice`));
});

test('révélation : tout le monde voit les résultats, plus personne ne vote ; rouvrir les recache', async () => {
  const { make } = setup();
  const host = make('host');
  const { code } = await host.store.createRoom('Rétro');
  const voters = ['a', 'b', 'c', 'd'].map(make);
  const notes = [5, 4, 4, 2];
  for (const [i, v] of voters.entries()) assert.ok(await v.store.vote(code, notes[i]));
  await voters[0].store.saveComment(code, 'Bravo');
  await voters[3].store.saveComment(code, '<img src=x onerror=alert(1)>');

  assert.equal(await voters[0].store.reveal(code), false);
  assert.ok(await host.store.reveal(code));

  const results = await new Promise((resolve) => voters[1].store.watchResults(code, resolve));
  assert.equal(average(notesOf(results.votes)), 3.8);
  assert.deepEqual(commentsOf(results.comments).sort(), ['<img src=x onerror=alert(1)>', 'Bravo'].sort());

  assert.equal(await voters[1].store.vote(code, 1), false);
  assert.match(await voters[1].store.saveComment(code, 'Trop tard'), /refusé/);
  assert.match(await voters[0].store.saveComment(code, 'Modifié trop tard'), /refusé/);

  // Rouvrir : les résultats sont de nouveau cachés, un retardataire vote, tout est conservé.
  let lastSeen = 'pas encore';
  voters[2].store.watchResults(code, (v) => { lastSeen = v; });
  assert.ok(await host.store.reopen(code));
  await flush();
  await rejects(voters[2].db.get(`${room(code)}/votes`));
  const late = make('late');
  assert.ok(await late.store.vote(code, 3));
  assert.ok(await host.store.reveal(code));
  const again = await new Promise((resolve) => voters[2].store.watchResults(code, resolve));
  assert.equal(notesOf(again.votes).length, 5);
  assert.equal(commentsOf(again.comments).length, 2);
  assert.notEqual(lastSeen, 'pas encore');
});

test('ma note et mon commentaire sont retrouvés après un rechargement', async () => {
  const { make } = setup();
  const host = make('host');
  const { code } = await host.store.createRoom('');
  const alice = make('alice');
  await alice.store.vote(code, 3);
  await alice.store.saveComment(code, 'Correct');
  const reloaded = make('alice');
  const mine = await new Promise((resolve) => reloaded.store.watchMine(code, resolve));
  assert.deepEqual(mine, { note: 3, comment: 'Correct' });
  const nobody = make('nobody');
  assert.deepEqual(await new Promise((resolve) => nobody.store.watchMine(code, resolve)), { note: null, comment: null });
});

test('présence : un participant compte tant qu\'un onglet est ouvert ; présence seulement si la salle existe', async () => {
  const { server, make } = setup();
  const host = make('host');
  const { code } = await host.store.createRoom('');
  const alice = make('alice');
  alice.store.openPresence(code);
  assert.equal(Object.keys(server.read(`${room(code)}/participants/alice/connections`)).length, 1);
  await rejects(make('bob').db.get(`${room(code)}/participants`));
  assert.ok(await host.db.get(`${room(code)}/participants`));
  await alice.store.closePresence();
  assert.equal(server.read(`${room(code)}/participants`), null);
  await rejects(alice.db.set(`${room('ZZZZ')}/participants/alice/connections/x`, true));
  await rejects(alice.db.set(`${room(code)}/participants/bob/connections/x`, true));
});

test('Mes ROTI : résumé, suppression par l\'animateur', async () => {
  const { server, make } = setup();
  const host = make('host');
  const { code, createdAt } = await host.store.createRoom('Démo');
  await make('a').store.vote(code, 5);
  assert.deepEqual(await host.store.summary(code), { code, title: 'Démo', createdAt, status: 'open', isHost: true, votes: 1 });
  assert.equal((await make('a').store.summary(code)).votes, null);
  assert.ok(await host.store.deleteRoom(code));
  assert.equal(server.read(room(code)), null);
  assert.equal(server.read(`${ROOT}/expiry/${code}`), null);
  assert.equal(await host.store.summary(code), null);
});

test('purge : salles de plus de 30 jours supprimées par n\'importe qui, pas avant', async () => {
  const { server, make, tick } = setup();
  const host = make('host');
  const { code: oldCode } = await host.store.createRoom('Ancien');
  tick(ROOM_TTL_MS - 1000);
  const other = make('other');
  assert.equal(await other.store.deleteRoom(oldCode), false);
  const { code: recent } = await other.store.createRoom('Récent');
  assert.ok(server.read(room(oldCode)), 'pas encore expiré');
  tick(2000);
  await other.store.createRoom('Nouveau');
  assert.equal(server.read(room(oldCode)), null, 'expiré, purgé à la création');
  assert.equal(server.read(`${ROOT}/expiry/${oldCode}`), null);
  assert.ok(server.read(room(recent)));
});

test('codes déjà pris : un autre code est tiré', async () => {
  const values = [0, 0, 0, 0, 0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5];
  let i = 0;
  const server = createMemoryServer({ now: () => 1_800_000_000_000, rules: checker });
  const store = createRotiStore(server.client('host'), { random: () => values[i++ % values.length] });
  const first = await store.createRoom('');
  const second = await store.createRoom('');
  assert.equal(first.code, 'AAAA');
  assert.notEqual(second.code, 'AAAA');
});
