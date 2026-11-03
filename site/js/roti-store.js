// Actions du ROTI sur la base partagée (Firebase en production, mémoire pour les tests et la démo).
// database.rules.json (branche roti) applique les mêmes contraintes côté base. La salle n'a pas de règle de
// lecture globale : chaque rôle ne lit que les nœuds qui lui sont permis (l'animateur ne lit jamais `mine`).

import {
  ROOM_TTL_MS, STATUS, generateCode, generateCommentId, isValidCode, isValidCommentId, isValidNote,
  normalizeCode, normalizeComment, normalizeTitle, validateComment, validateTitle, notesOf,
} from './roti-core.js?v=__VERSION__';

export const ROOT = 'roti';
const roomPath = (code) => `${ROOT}/rooms/${code}`;

function cryptoRandom() {
  return crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
}

export function createRotiStore(db, { random = cryptoRandom } = {}) {
  let stopPresence = null;
  let presenceFor = null;

  /** Abonnement à plusieurs nœuds : `callback({ clé → valeur })` dès que tous ont répondu, puis à chaque changement. */
  function watchMany(paths, callback) {
    const values = {};
    const pending = new Set(Object.keys(paths));
    const stops = Object.entries(paths).map(([key, path]) => db.onValue(path, (value) => {
      values[key] = value;
      pending.delete(key);
      if (!pending.size) callback({ ...values });
    }));
    return () => stops.forEach((stop) => stop());
  }

  const store = {
    get uid() { return db.uid; },
    start: () => db.start(),
    serverNow: () => db.serverNow(),
    onConnection: (callback) => db.onConnection(callback),

    // ------------------------------------------------------------ Animateur

    /** Supprime les salles de plus de 30 jours (les règles l'autorisent à tous au-delà de ce délai). */
    async sweepExpired() {
      const expiry = (await db.get(`${ROOT}/expiry`).catch(() => null)) ?? {};
      const limit = db.serverNow() - ROOM_TTL_MS;
      const old = Object.entries(expiry).filter(([, e]) => typeof e?.createdAt === 'number' && e.createdAt < limit);
      await Promise.all(old.map(([code]) =>
        db.update(ROOT, { [`rooms/${code}`]: null, [`expiry/${code}`]: null }).catch(() => {})));
      return old.map(([code]) => code);
    },

    /** Crée un ROTI avec un code libre ; le navigateur appelant en devient l'animateur. Renvoie { code, createdAt }. */
    async createRoom(rawTitle = '') {
      const error = validateTitle(rawTitle);
      if (error) throw new Error(error);
      const title = normalizeTitle(rawTitle);
      await store.sweepExpired();
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const code = generateCode(random);
        const reserved = await db.claim(`${ROOT}/expiry/${code}`, { createdAt: db.TIMESTAMP, hostUid: db.uid });
        if (!reserved) continue;
        const createdAt = (await db.get(`${ROOT}/expiry/${code}/createdAt`)) ?? db.serverNow();
        await db.set(`${roomPath(code)}/meta`, { hostUid: db.uid, createdAt, title, status: STATUS.open });
        return { code, createdAt };
      }
      throw new Error('Impossible de trouver un code de salle libre.');
    },

    /** Résumé d'un ROTI pour « Mes ROTI » (null s'il n'existe plus ; votes null si l'on n'est pas l'animateur). */
    async summary(code) {
      const meta = await db.get(`${roomPath(code)}/meta`).catch(() => undefined);
      if (meta === undefined) return undefined; // lecture impossible (réseau) : on ne conclut rien
      if (!meta) return null;
      let votes = null;
      if (meta.hostUid === db.uid) votes = notesOf(await db.get(`${roomPath(code)}/votes`).catch(() => null)).length;
      return { code, title: meta.title ?? '', createdAt: meta.createdAt, status: meta.status, isHost: meta.hostUid === db.uid, votes };
    },

    reveal(code) {
      return db.set(`${roomPath(code)}/meta/status`, STATUS.revealed).then(() => true, () => false);
    },

    reopen(code) {
      return db.set(`${roomPath(code)}/meta/status`, STATUS.open).then(() => true, () => false);
    },

    deleteRoom(code) {
      return db.update(ROOT, { [`rooms/${code}`]: null, [`expiry/${code}`]: null }).then(() => true, () => false);
    },

    /** Vue animateur : notes, commentaires et présences, en temps réel. */
    watchHost(code, callback) {
      return watchMany({
        votes: `${roomPath(code)}/votes`,
        comments: `${roomPath(code)}/comments`,
        participants: `${roomPath(code)}/participants`,
      }, callback);
    },

    // ------------------------------------------------------------ Tous

    /** En-tête de la salle (titre, état, animateur) ; null si elle n'existe pas. */
    watchMeta(code, callback) {
      return db.onValue(`${roomPath(code)}/meta`, callback);
    },

    getMeta(code) {
      return db.get(`${roomPath(code)}/meta`);
    },

    /** Résultats d'une salle révélée (refusés par la base avant la révélation). */
    watchResults(code, callback) {
      return watchMany({ votes: `${roomPath(code)}/votes`, comments: `${roomPath(code)}/comments` }, callback);
    },

    // ------------------------------------------------------------ Participant

    /** Ma note et mon commentaire : `callback({ note, comment })`. */
    watchMine(code, callback) {
      let note = null;
      let cid = null;
      let comment = null;
      let stopComment = null;
      let ready = { note: false, cid: false };
      const emit = () => { if (ready.note && ready.cid) callback({ note, comment }); };
      const stopNote = db.onValue(`${roomPath(code)}/votes/${db.uid}`, (value) => {
        note = isValidNote(value) ? value : null;
        ready.note = true;
        emit();
      });
      const stopCid = db.onValue(`${roomPath(code)}/mine/${db.uid}`, (value) => {
        const next = isValidCommentId(value) ? value : null;
        if (next === cid && ready.cid) return;
        cid = next;
        stopComment?.();
        stopComment = null;
        comment = null;
        if (!cid) { ready.cid = true; emit(); return; }
        stopComment = db.onValue(`${roomPath(code)}/comments/${cid}`, (text) => {
          comment = typeof text === 'string' ? text : null;
          ready.cid = true;
          emit();
        });
      });
      return () => { stopNote(); stopCid(); stopComment?.(); ready = { note: false, cid: false }; };
    },

    /** Donne ou change sa note ; false si refusé (salle révélée ou supprimée). */
    vote(code, note) {
      if (!isValidNote(note)) return Promise.resolve(false);
      return db.set(`${roomPath(code)}/votes/${db.uid}`, note).then(() => true, () => false);
    },

    /** Envoie ou remplace son commentaire ; renvoie null ou un message d'erreur. */
    async saveComment(code, text) {
      const error = validateComment(text);
      if (error) return error;
      const existing = await db.get(`${roomPath(code)}/mine/${db.uid}`).catch(() => null);
      const value = normalizeComment(text);
      try {
        if (isValidCommentId(existing)) {
          await db.set(`${roomPath(code)}/comments/${existing}`, value);
        } else {
          // Premier commentaire : identifiant aléatoire réservé (claimed), relié à soi seul (mine), en une écriture.
          const cid = generateCommentId(random);
          await db.update(roomPath(code), { [`mine/${db.uid}`]: cid, [`claimed/${cid}`]: true, [`comments/${cid}`]: value });
        }
        return null;
      } catch {
        return 'Commentaire refusé : les votes sont peut-être clos.';
      }
    },

    async removeComment(code) {
      const cid = await db.get(`${roomPath(code)}/mine/${db.uid}`).catch(() => null);
      if (!isValidCommentId(cid)) return true;
      return db.remove(`${roomPath(code)}/comments/${cid}`).then(() => true, () => false);
    },

    /** Présence dans la salle (une entrée par onglet, retirée à la déconnexion). */
    openPresence(code) {
      if (presenceFor === code) return;
      stopPresence?.();
      presenceFor = code;
      stopPresence = db.presence(`${roomPath(code)}/participants/${db.uid}/connections`);
    },

    async closePresence() {
      const stop = stopPresence;
      stopPresence = null;
      presenceFor = null;
      await stop?.();
    },
  };
  return store;
}

export { normalizeCode, isValidCode };
