// Base de données en mémoire, avec la même interface que firebase-db.js (reprise de scrum-increment).
// Sert aux tests Node.js (plusieurs clients partagent un serveur, éventuellement soumis aux règles de
// sécurité) et au mode démo du site (?demo), où les onglets d'un même navigateur partagent l'état par
// localStorage, sans Firebase.

const TIMESTAMP = { '.sv': 'timestamp' };

function split(path) {
  return String(path).split('/').filter(Boolean);
}

function clone(value) {
  return value === undefined ? null : JSON.parse(JSON.stringify(value));
}

function resolveTimestamps(value, now) {
  if (value && typeof value === 'object') {
    if (value['.sv'] === 'timestamp') return now;
    const out = Array.isArray(value) ? [] : {};
    for (const [key, child] of Object.entries(value)) out[key] = resolveTimestamps(child, now);
    return out;
  }
  return value;
}

/** Supprime les objets vides, comme Firebase qui ne stocke pas de nœud sans enfant. */
function prune(value) {
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      value[key] = prune(value[key]);
      if (value[key] === null || value[key] === undefined) delete value[key];
    }
    return Object.keys(value).length ? value : null;
  }
  return value;
}

function denied(path) {
  const error = new Error(`PERMISSION_DENIED: ${path}`);
  error.code = 'PERMISSION_DENIED';
  return error;
}

/**
 * Serveur en mémoire : `client(uid)` renvoie une connexion avec l'interface de firebase-db.js.
 * `rules` (facultatif, pour les tests) : { canRead(tree, path, auth, now), checkWrite(tree, changes, auth, now) }.
 */
export function createMemoryServer({ now = () => Date.now(), persist = null, rules = null } = {}) {
  let data = persist?.load() ?? {};
  const listeners = new Set();
  const reads = [];
  let connectionSeq = 0;

  function read(path) {
    let node = data;
    for (const key of split(path)) {
      if (node === null || typeof node !== 'object') return null;
      node = node[key];
    }
    return node === undefined ? null : node;
  }

  function write(path, value) {
    const keys = split(path);
    if (!keys.length) { data = prune(clone(value)) ?? {}; return; }
    let node = data;
    for (const key of keys.slice(0, -1)) {
      if (node[key] === null || typeof node[key] !== 'object') node[key] = {};
      node = node[key];
    }
    node[keys.at(-1)] = clone(value);
    data = prune(data) ?? {};
  }

  function notify() {
    persist?.save(data);
    for (const listener of [...listeners]) listener.fire();
  }

  /** Applique une écriture multi-chemins si les règles l'acceptent (atomique, comme Firebase). */
  function commit(uid, changes) {
    const stamp = now();
    const stamped = Object.fromEntries(Object.entries(changes).map(([p, v]) => [p, resolveTimestamps(v, stamp)]));
    if (rules) {
      const errors = rules.checkWrite(data, stamped, uid ? { uid } : null, stamp);
      if (errors.length) throw denied(errors.join(', '));
    }
    for (const [path, value] of Object.entries(stamped)) write(path, value);
    notify();
  }

  function allowedRead(uid, path) {
    reads.push({ uid, path: split(path).join('/') });
    return !rules || rules.canRead(data, path, uid ? { uid } : null, now());
  }

  function listen(uid, path, callback) {
    if (!allowedRead(uid, path)) { callback(null); return () => {}; }
    const listener = {
      last: undefined,
      fire() {
        if (rules && !rules.canRead(data, path, uid ? { uid } : null, now())) {
          // Comme Firebase : l'écoute est annulée quand la lecture n'est plus permise.
          listeners.delete(listener);
          callback(null);
          return;
        }
        const value = JSON.stringify(read(path));
        if (value === this.last) return;
        this.last = value;
        callback(JSON.parse(value));
      },
    };
    listeners.add(listener);
    listener.fire();
    return () => listeners.delete(listener);
  }

  function reload() {
    data = persist?.load() ?? data;
    for (const listener of [...listeners]) listener.fire();
  }

  function client(uid) {
    const connections = [];
    return {
      TIMESTAMP,
      get uid() { return uid; },
      async start() { return uid; },
      serverNow: now,
      onValue: (path, callback) => listen(uid, path, callback),
      async get(path) {
        if (!allowedRead(uid, path)) throw denied(path);
        return clone(read(path));
      },
      async set(path, value) { commit(uid, { [split(path).join('/')]: value }); },
      async update(path, patch) {
        const base = split(path).join('/');
        commit(uid, Object.fromEntries(Object.entries(patch).map(([key, value]) => [base ? `${base}/${key}` : key, value])));
      },
      async remove(path) { commit(uid, { [split(path).join('/')]: null }); },
      async transaction(path, fn) {
        if (!allowedRead(uid, path)) throw denied(path);
        const next = fn(clone(read(path)));
        if (next === undefined) return false;
        commit(uid, { [split(path).join('/')]: next });
        return true;
      },
      /** Écrit `value` seulement si rien n'existe à cet endroit. */
      async claim(path, value) {
        if (read(path) !== null) return false;
        try { commit(uid, { [split(path).join('/')]: value }); } catch { return false; }
        return true;
      },
      onConnection(callback) { callback(true); return () => {}; },
      presence(path) {
        connectionSeq += 1;
        const entry = `${split(path).join('/')}/c${Date.now().toString(36)}${connectionSeq}${Math.random().toString(36).slice(2, 6)}`;
        try { commit(uid, { [entry]: true }); } catch { return async () => {}; }
        connections.push(entry);
        return async () => {
          const i = connections.indexOf(entry);
          if (i >= 0) connections.splice(i, 1);
          try { commit(uid, { [entry]: null }); } catch { /* salle supprimée entre-temps */ }
        };
      },
      /** Simule la fermeture de l'onglet : le serveur retire les présences de ce client. */
      disconnect() {
        for (const entry of connections.splice(0)) write(entry, null);
        notify();
      },
    };
  }

  return {
    client, read, reload, reads,
    get data() { return data; },
    /** Remplace des données sans contrôle (préparer un test, simuler le temps qui passe). */
    seed(path, value) { write(path, value); notify(); },
  };
}

/** Base partagée entre les onglets du navigateur (mode démo) ; chaque onglet est un utilisateur distinct. */
export function createDemoDb() {
  const KEY = 'roti.demo-db';
  const persist = {
    load() { try { return JSON.parse(localStorage.getItem(KEY) ?? '{}'); } catch { return {}; } },
    save(value) { try { localStorage.setItem(KEY, JSON.stringify(value)); } catch { /* stockage indisponible */ } },
  };
  const server = createMemoryServer({ persist });
  window.addEventListener('storage', (event) => { if (event.key === KEY) server.reload(); });
  let uid;
  try {
    uid = sessionStorage.getItem('roti.demo-uid');
    if (!uid) {
      uid = `demo${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem('roti.demo-uid', uid);
    }
  } catch {
    uid = `demo${Math.random().toString(36).slice(2, 10)}`;
  }
  const db = server.client(uid);
  window.addEventListener('pagehide', () => db.disconnect());
  return db;
}
