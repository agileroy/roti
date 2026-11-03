// Logique pure du ROTI : libellés, code de salle, validations, moyenne, répartition, liste « Mes ROTI ».
// Ni DOM ni base : testée avec Node.js, utilisée par roti-store.js et ui.js.

export const LABELS = Object.freeze([
  "J'ai perdu mon temps",
  'Peu utile, j\'en retire peu de chose',
  'Correct, ça valait le temps passé',
  'Utile, j\'en retire de la valeur',
  'Génial, j\'ai adoré et j\'en retire beaucoup de valeur',
]);
export const MIN_NOTE = 1;
export const MAX_NOTE = 5;
export const TITLE_MAX = 80;
export const COMMENT_MAX = 500;
export const CODE_LENGTH = 4;
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ';
export const COMMENT_ID_LENGTH = 20;
export const COMMENT_ID_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';
export const ROOM_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const MINE_MAX = 50;
export const STATUS = Object.freeze({ open: 'open', revealed: 'revealed' });

/* ---------- Notes ---------- */

export function isValidNote(value) {
  return Number.isInteger(value) && value >= MIN_NOTE && value <= MAX_NOTE;
}

/** Libellé d'une note (1 à 5), chaîne vide sinon. */
export function labelFor(note) {
  return isValidNote(note) ? LABELS[note - 1] : '';
}

/* ---------- Code de salle ---------- */

/** Code saisi : majuscules, sans espaces. */
export function normalizeCode(code) {
  return String(code ?? '').replace(/\s+/g, '').toUpperCase();
}

export function isValidCode(code) {
  return new RegExp(`^[${CODE_ALPHABET}]{${CODE_LENGTH}}$`).test(code);
}

export function generateCode(random = Math.random) {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i += 1) code += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)];
  return code;
}

/** Identifiant aléatoire d'un commentaire : sans lien avec l'heure ni avec l'auteur. */
export function generateCommentId(random = Math.random) {
  let id = '';
  for (let i = 0; i < COMMENT_ID_LENGTH; i += 1) id += COMMENT_ID_ALPHABET[Math.floor(random() * COMMENT_ID_ALPHABET.length)];
  return id;
}

export function isValidCommentId(id) {
  return new RegExp(`^[a-z0-9]{${COMMENT_ID_LENGTH}}$`).test(String(id ?? ''));
}

/* ---------- Titre et commentaire ---------- */

export function normalizeTitle(title) {
  return String(title ?? '').trim().replace(/\s+/g, ' ');
}

/** Message d'erreur pour un titre (facultatif), null s'il convient. */
export function validateTitle(title) {
  const value = normalizeTitle(title);
  if ([...value].length > TITLE_MAX) return `Le titre fait ${TITLE_MAX} caractères au plus.`;
  return null;
}

export function normalizeComment(text) {
  return String(text ?? '').replace(/\r\n?/g, '\n').trim();
}

/** Longueur comptée comme les règles de la base (unités UTF-16). */
export function commentLength(text) {
  return normalizeComment(text).length;
}

export function validateComment(text) {
  const length = commentLength(text);
  if (!length) return 'Écrivez votre commentaire.';
  if (length > COMMENT_MAX) return `Le commentaire fait ${COMMENT_MAX} caractères au plus.`;
  return null;
}

/* ---------- Résultats ---------- */

/** Notes valides d'une salle, à partir du nœud `votes` ({ uid → note }). */
export function notesOf(votes) {
  return Object.values(votes ?? {}).filter(isValidNote);
}

/** Moyenne arrondie à une décimale (null sans vote). */
export function average(notes) {
  if (!notes.length) return null;
  const sum = notes.reduce((total, n) => total + n, 0);
  return Math.round((sum / notes.length) * 10) / 10;
}

/** Moyenne écrite à la française : « 3,8 ». */
export function formatAverage(value) {
  if (value === null || value === undefined) return '–';
  return value.toFixed(1).replace('.', ',');
}

/** Note entière la plus proche de la moyenne (arrondi au plus proche, 0,5 vers le haut). */
export function nearestNote(value) {
  if (value === null || value === undefined) return null;
  return Math.min(MAX_NOTE, Math.max(MIN_NOTE, Math.floor(value + 0.5)));
}

/** Répartition de 5 à 1 : [{ note, count, percent }], percent arrondi à l'entier. */
export function distribution(notes) {
  const total = notes.length;
  const rows = [];
  for (let note = MAX_NOTE; note >= MIN_NOTE; note -= 1) {
    const count = notes.filter((n) => n === note).length;
    rows.push({ note, count, percent: total ? Math.round((count / total) * 100) : 0 });
  }
  return rows;
}

/** Commentaires à afficher, dans l'ordre de leurs identifiants aléatoires. */
export function commentsOf(comments) {
  return Object.entries(comments ?? {})
    .filter(([, text]) => typeof text === 'string' && text.trim())
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([, text]) => text);
}

/** Participants connectés (au moins un onglet ouvert). */
export function connectedCount(participants) {
  return Object.values(participants ?? {})
    .filter((p) => p?.connections && Object.keys(p.connections).length > 0).length;
}

export function plural(count, singular, pluralForm = `${singular}s`) {
  return `${count} ${count > 1 ? pluralForm : singular}`;
}

/* ---------- Mes ROTI (mémorisés dans le navigateur) ---------- */

/** Lit la liste mémorisée : [{ code, createdAt }], valide, sans doublon, la plus récente d'abord. */
export function parseMine(raw) {
  let list;
  try { list = JSON.parse(raw ?? '[]'); } catch { list = []; }
  if (!Array.isArray(list)) list = [];
  const seen = new Set();
  return list
    .filter((e) => e && isValidCode(e.code) && typeof e.createdAt === 'number')
    .sort((a, b) => b.createdAt - a.createdAt)
    .filter((e) => (seen.has(e.code) ? false : seen.add(e.code)))
    .slice(0, MINE_MAX)
    .map(({ code, createdAt }) => ({ code, createdAt }));
}

export function addMine(list, code, createdAt) {
  return parseMine(JSON.stringify([{ code, createdAt }, ...list.filter((e) => e.code !== code)]));
}

export function removeMine(list, code) {
  return list.filter((e) => e.code !== code);
}

/** Date courte à la française : « 3 nov. 2026, 14:05 ». */
export function formatDate(ms) {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(ms));
}
