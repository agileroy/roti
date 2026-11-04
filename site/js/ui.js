// Interface du ROTI : accueil (créer, rejoindre, Mes ROTI), vue participant et vue animateur.
// Aucune règle métier ici : elles sont dans roti-core.js, et les accès à la base dans roti-store.js.

import {
  LABELS, MAX_NOTE, STATUS, COMMENT_MAX, labelFor, isValidNote, normalizeCode, isValidCode, notesOf, average,
  formatAverage, nearestNote, distribution, commentsOf, connectedCount, plural, parseMine, addMine, removeMine,
  formatDate, commentLength, filledPercent,
} from './roti-core.js?v=__VERSION__';

const $ = (id) => document.getElementById(id);
const UNREACHABLE = 'Service temps réel injoignable : vérifiez votre réseau, le VPN de l\'entreprise le bloque.';
const NOT_FOUND = 'Aucun ROTI avec ce code.';

/* ---------------------------------------------------------------- Outils */

function readStored(key, fallback = null) {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}
function writeStored(key, value) {
  try { localStorage.setItem(key, value); } catch { /* stockage indisponible */ }
}

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children.flat()) if (child !== null && child !== undefined) node.append(child);
  return node;
}

const SVG = 'http://www.w3.org/2000/svg';
function starIcon(on) {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('class', `star-icon${on ? ' is-on' : ''}`);
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS(SVG, 'use');
  use.setAttribute('href', '#star');
  svg.append(use);
  return svg;
}
function starRow(count, filled, className = '') {
  return el('span', { class: className }, Array.from({ length: count }, (_, i) => starIcon(i < filled)));
}

function loadScript(src) {
  return new Promise((resolve) => {
    if (window.qrcode) { resolve(); return; }
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.head.append(script);
  });
}

function qrSvg(url) {
  try {
    const qr = window.qrcode(0, 'M');
    qr.addData(url);
    qr.make();
    return qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true, alt: `QR code : ${url}` });
  } catch {
    return '';
  }
}

/** Boîte de confirmation ; renvoie true si l'utilisateur confirme. */
function confirmAction(title, message, okLabel) {
  const dialog = $('confirm-dialog');
  $('confirm-title').textContent = title;
  $('confirm-text').textContent = message;
  $('confirm-ok').textContent = okLabel;
  return new Promise((resolve) => {
    dialog.addEventListener('close', () => resolve(dialog.returnValue === 'ok'), { once: true });
    dialog.returnValue = 'cancel';
    dialog.showModal();
  });
}

function bump(node, value) {
  if (node.textContent === String(value)) return;
  node.textContent = String(value);
  const counter = node.closest('.counter');
  counter?.classList.remove('bump');
  void counter?.offsetWidth; // relance l'animation
  counter?.classList.add('bump');
}

/* ---------------------------------------------------------------- Résultats (partagés) */

/** Affiche moyenne, répartition et commentaires dans `container`. */
export function renderResults(container, { votes, comments }) {
  const notes = notesOf(votes);
  const avg = average(notes);
  const view = $('results-template').content.firstElementChild.cloneNode(true);
  const ref = (name) => view.querySelector(`[data-ref="${name}"]`);

  ref('average').textContent = formatAverage(avg);
  const starsBox = ref('average-stars');
  starsBox.append(starRow(MAX_NOTE, 0, 'star-row'));
  const on = starRow(MAX_NOTE, MAX_NOTE, 'star-row star-row-on');
  on.style.width = `${filledPercent(avg)}%`;
  starsBox.append(on);
  ref('average-label').textContent = avg === null ? 'Aucun vote' : labelFor(nearestNote(avg));
  ref('average-count').textContent = `sur ${plural(notes.length, 'vote')}`;
  view.querySelector('.average').setAttribute('aria-label',
    avg === null ? 'Aucun vote' : `Moyenne ${formatAverage(avg)} sur 5, ${plural(notes.length, 'vote')}`);

  const bars = ref('bars');
  for (const row of distribution(notes)) {
    const label = `${plural(row.note, 'étoile')} : ${plural(row.count, 'vote')} (${row.percent} %)`;
    bars.append(el('li', { class: 'bar-row', 'aria-label': label },
      starRow(MAX_NOTE, row.note, 'bar-stars'),
      el('span', { class: 'bar-track' }, el('span', { class: 'bar-fill', style: `width:${row.percent}%` })),
      el('span', { class: 'bar-count', 'aria-hidden': 'true' }, el('strong', { text: String(row.count) }), ` · ${row.percent} %`),
    ));
  }

  const list = commentsOf(comments);
  ref('comments-title').textContent = list.length ? `Commentaires (${list.length})` : 'Commentaires';
  for (const text of list) ref('comments').append(el('li', { text }));
  ref('no-comment').hidden = list.length > 0;

  container.replaceChildren(view);
}

/* ---------------------------------------------------------------- Application */

export function showFatal(message) {
  $('loading').hidden = false;
  $('loading').textContent = message;
}

export async function startApp(store, { demo = false } = {}) {
  let offline = false;
  let everConnected = false;
  let teardown = null;

  $('demo-chip').hidden = !demo;

  try {
    await Promise.race([
      store.start(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('délai dépassé')), 15000)),
    ]);
  } catch (error) {
    console.error('Connexion refusée :', error?.code ?? error);
    offline = true;
  }

  // En démo, tous les onglets partagent le localStorage : la liste est propre à chaque onglet (utilisateur).
  const MINE_KEY = demo ? `roti.demo-mine.${store.uid}` : 'roti.mine';

  if (!offline) {
    store.onConnection((connected) => {
      everConnected ||= connected;
      $('banner').hidden = connected || !everConnected;
      $('banner').textContent = 'Connexion perdue, reconnexion…';
    });
  }

  /* ------------------------------------------------------------ Navigation */

  function urlFor(params = {}) {
    const parts = [];
    if (demo) parts.push('demo');
    for (const [key, value] of Object.entries(params)) parts.push(`${key}=${encodeURIComponent(value)}`);
    return `${location.pathname}${parts.length ? `?${parts.join('&')}` : ''}`;
  }
  function absoluteUrl(params) {
    return `${location.origin}${urlFor(params)}`;
  }

  function go(params, { replace = false, message = '' } = {}) {
    history[replace ? 'replaceState' : 'pushState'](null, '', urlFor(params));
    route(message);
  }

  function showScreen(id) {
    $('loading').hidden = true;
    for (const screen of document.querySelectorAll('.screen')) screen.hidden = screen.id !== id;
    window.scrollTo(0, 0);
  }

  async function route(message = '') {
    teardown?.();
    teardown = null;
    const params = new URLSearchParams(location.search);
    const hostCode = normalizeCode(params.get('animer'));
    const voteCode = normalizeCode(params.get('salle'));
    if (offline) { showHome(UNREACHABLE); return; }
    const code = hostCode || voteCode;
    if (!code) { showHome(message); return; }
    if (!isValidCode(code)) { history.replaceState(null, '', urlFor()); showHome(NOT_FOUND); return; }
    $('loading').hidden = false;
    $('loading').textContent = 'Connexion…';
    const meta = await store.getMeta(code).catch(() => undefined);
    if (meta === undefined) { showHome(UNREACHABLE); return; }
    if (!meta) { history.replaceState(null, '', urlFor()); forget(code); showHome(NOT_FOUND); return; }
    if (hostCode && meta.hostUid === store.uid) { showHost(code); return; }
    if (hostCode) history.replaceState(null, '', urlFor({ salle: code }));
    showVote(code);
  }

  window.addEventListener('popstate', () => route());
  $('brand-link').addEventListener('click', (event) => { event.preventDefault(); go({}); });
  $('brand-link').href = urlFor();
  $('host-home').addEventListener('click', (event) => { event.preventDefault(); go({}); });
  $('host-home').href = urlFor();

  /* ------------------------------------------------------------ Mes ROTI */

  const readMine = () => parseMine(readStored(MINE_KEY));
  const saveMine = (list) => writeStored(MINE_KEY, JSON.stringify(list));
  function forget(code) { saveMine(removeMine(readMine(), code)); }

  async function renderMine() {
    const list = readMine();
    $('mine-panel').hidden = !list.length;
    if (!list.length) return;
    const items = list.map((entry) => {
      const name = el('span', { class: 'mine-name', text: '…' });
      const meta = el('span', { class: 'mine-meta', text: formatDate(entry.createdAt) });
      const open = el('a', { class: 'button button-ghost button-small', href: urlFor({ animer: entry.code }), text: 'Ouvrir' });
      open.addEventListener('click', (event) => { event.preventDefault(); go({ animer: entry.code }); });
      const remove = el('button', { type: 'button', class: 'button button-ghost button-small button-danger', text: 'Supprimer' });
      const item = el('li', { class: 'mine-item' },
        el('div', { class: 'mine-main' }, name, meta),
        el('div', { class: 'mine-actions' }, open, remove));
      remove.addEventListener('click', async () => {
        const title = name.dataset.title || 'ce ROTI';
        if (!(await confirmAction('Supprimer ce ROTI ?', `« ${title} » et tous ses votes seront effacés pour tout le monde.`, 'Supprimer'))) return;
        if (await store.deleteRoom(entry.code)) {
          forget(entry.code);
          item.remove();
          $('mine-panel').hidden = !readMine().length;
        } else {
          meta.textContent = 'Suppression impossible pour l\'instant.';
        }
      });
      store.summary(entry.code).then((summary) => {
        if (summary === null) { forget(entry.code); item.remove(); $('mine-panel').hidden = !readMine().length; return; }
        if (summary === undefined) { name.textContent = `ROTI ${entry.code}`; return; }
        if (!summary.isHost) { forget(entry.code); item.remove(); $('mine-panel').hidden = !readMine().length; return; }
        name.textContent = summary.title || 'ROTI sans titre';
        name.dataset.title = summary.title || `ROTI ${entry.code}`;
        const status = summary.status === STATUS.revealed
          ? el('span', { class: 'status-pill status-revealed', text: 'Révélé' })
          : el('span', { class: 'status-pill status-open', text: 'Votes ouverts' });
        meta.replaceChildren(`${formatDate(summary.createdAt)} · ${plural(summary.votes ?? 0, 'vote')} · `, status);
      });
      return item;
    });
    $('mine-list').replaceChildren(...items);
  }

  /* ------------------------------------------------------------ Accueil */

  function showHome(message = '') {
    document.title = 'ROTI';
    showScreen('screen-home');
    $('home-error').hidden = !message;
    $('home-error').textContent = message;
    $('create-error').textContent = '';
    $('join-error').textContent = '';
    $('create-submit').disabled = offline;
    $('join-submit').disabled = offline;
    if (!offline) renderMine();
  }

  $('code-input').addEventListener('input', () => { $('code-input').value = normalizeCode($('code-input').value); });

  $('create-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    if (offline) return;
    $('create-submit').disabled = true;
    $('create-error').textContent = '';
    try {
      const { code, createdAt } = await store.createRoom($('title-input').value);
      saveMine(addMine(readMine(), code, createdAt));
      $('title-input').value = '';
      go({ animer: code });
    } catch (error) {
      console.error(error);
      $('create-error').textContent = /caractères/.test(error?.message ?? '')
        ? error.message
        : 'Création impossible : vérifiez votre connexion, puis réessayez.';
    } finally {
      $('create-submit').disabled = false;
    }
  });

  $('join-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    if (offline) return;
    const code = normalizeCode($('code-input').value);
    if (!isValidCode(code)) { $('join-error').textContent = 'Le code fait 4 lettres.'; return; }
    $('join-submit').disabled = true;
    $('join-error').textContent = '';
    const meta = await store.getMeta(code).catch(() => undefined);
    $('join-submit').disabled = false;
    if (meta === undefined) { $('join-error').textContent = UNREACHABLE; return; }
    if (!meta) { $('join-error').textContent = NOT_FOUND; return; }
    $('code-input').value = '';
    go({ salle: code });
  });

  /* ------------------------------------------------------------ Vue participant */

  const starButtons = Array.from({ length: MAX_NOTE }, (_, i) => el('button', {
    type: 'button', class: 'star-button', role: 'radio', 'aria-checked': 'false',
    'aria-label': `${plural(i + 1, 'étoile')} : ${LABELS[i]}`, 'data-note': String(i + 1),
  }, starIcon(false)));
  $('stars').replaceChildren(...starButtons);
  const legendButtons = LABELS.map((label, i) => el('button', {
    type: 'button', class: 'legend-item', 'data-note': String(i + 1), tabindex: '-1', 'aria-hidden': 'true',
  }, starRow(MAX_NOTE, i + 1, 'legend-stars'), el('span', { text: label })));
  $('legend').replaceChildren(...legendButtons.map((b) => el('li', {}, b)));

  const vote = { code: null, note: null, hover: null, open: true, saved: null };

  function paintStars() {
    const shown = vote.hover ?? vote.note ?? 0;
    starButtons.forEach((button, i) => {
      button.firstChild.classList.toggle('is-on', i < shown);
      button.setAttribute('aria-checked', String(vote.note === i + 1));
      button.tabIndex = (vote.note ?? 1) === i + 1 ? 0 : -1;
      button.disabled = !vote.open;
    });
    legendButtons.forEach((button, i) => {
      button.classList.toggle('is-selected', vote.note === i + 1);
      button.disabled = !vote.open;
    });
    $('star-label').textContent = labelFor(vote.hover ?? vote.note) || ' ';
  }

  async function castVote(note) {
    if (!vote.open || !isValidNote(note) || !vote.code) return;
    const previous = vote.note;
    vote.note = note;
    paintStars();
    $('vote-status').className = 'hint';
    $('vote-status').textContent = 'Enregistrement…';
    const ok = await store.vote(vote.code, note);
    if (ok) {
      $('vote-status').className = 'hint is-ok';
      $('vote-status').textContent = 'Note enregistrée';
    } else {
      vote.note = previous;
      paintStars();
      $('vote-status').className = 'hint is-error';
      $('vote-status').textContent = 'Note refusée : les votes sont peut-être clos.';
    }
  }

  for (const button of [...starButtons, ...legendButtons]) {
    button.addEventListener('click', () => castVote(Number(button.dataset.note)));
  }
  for (const button of starButtons) {
    button.addEventListener('pointerenter', (event) => {
      if (event.pointerType === 'mouse' && vote.open) { vote.hover = Number(button.dataset.note); paintStars(); }
    });
    button.addEventListener('pointerleave', () => { vote.hover = null; paintStars(); });
    button.addEventListener('keydown', (event) => {
      const step = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[event.key];
      if (!step) return;
      event.preventDefault();
      const next = Math.min(MAX_NOTE, Math.max(1, (vote.note ?? 0) + step));
      castVote(next);
      starButtons[next - 1].focus();
    });
  }

  function updateCount() {
    const left = COMMENT_MAX - commentLength($('comment-input').value);
    $('comment-count').textContent = left >= 0 ? `${plural(left, 'caractère restant', 'caractères restants')}` : `${-left} caractères en trop`;
    $('comment-count').classList.toggle('is-error', left < 0);
    const dirty = $('comment-input').value.trim() !== (vote.saved ?? '');
    $('comment-submit').disabled = !vote.open || !$('comment-input').value.trim() || !dirty;
  }
  $('comment-input').addEventListener('input', () => { $('comment-status').textContent = ''; updateCount(); });

  $('comment-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!vote.code || !vote.open) return;
    $('comment-submit').disabled = true;
    $('comment-status').className = 'hint';
    $('comment-status').textContent = 'Envoi…';
    const error = await store.saveComment(vote.code, $('comment-input').value);
    $('comment-status').className = error ? 'hint is-error' : 'hint is-ok';
    $('comment-status').textContent = error ?? 'Commentaire envoyé';
    updateCount();
  });

  $('comment-remove').addEventListener('click', async () => {
    if (!vote.code || !vote.open) return;
    const ok = await store.removeComment(vote.code);
    if (ok) $('comment-input').value = '';
    $('comment-status').className = ok ? 'hint is-ok' : 'hint is-error';
    $('comment-status').textContent = ok ? 'Commentaire retiré' : 'Retrait refusé : les votes sont peut-être clos.';
    updateCount();
  });

  function showVote(code) {
    showScreen('screen-vote');
    Object.assign(vote, { code, note: null, hover: null, open: true, saved: null });
    $('vote-code').textContent = code;
    $('vote-title').textContent = '';
    $('vote-status').textContent = '';
    $('comment-status').textContent = '';
    $('comment-input').value = '';
    $('vote-results').hidden = true;
    paintStars();
    updateCount();
    store.openPresence(code);

    let stopResults = null;
    let status = null;
    const stopMeta = store.watchMeta(code, (meta) => {
      if (!meta) { cleanup(); history.replaceState(null, '', urlFor()); showHome('Ce ROTI a été supprimé par son animateur.'); return; }
      const title = meta.title || 'Votre avis sur la réunion';
      $('vote-title').textContent = title;
      document.title = `ROTI · ${meta.title || code}`;
      vote.open = meta.status !== STATUS.revealed;
      paintStars();
      setCommentState();
      if (meta.status === status) return;
      status = meta.status;
      stopResults?.();
      stopResults = null;
      if (status === STATUS.revealed) {
        $('comment-status').textContent = '';
        $('vote-status').className = 'hint';
        $('vote-status').textContent = vote.note ? 'Votes clos : votre note est figée.' : 'Votes clos.';
        stopResults = store.watchResults(code, (results) => {
          if (!results.votes && !results.comments && status !== STATUS.revealed) return;
          $('vote-results').hidden = false;
          renderResults($('vote-results'), results);
        });
      } else {
        $('vote-results').hidden = true;
        if (/clos/.test($('vote-status').textContent)) $('vote-status').textContent = '';
      }
    });
    const stopMine = store.watchMine(code, ({ note, comment }) => {
      vote.note = note;
      const typing = document.activeElement === $('comment-input') || $('comment-input').value.trim() !== (vote.saved ?? '');
      vote.saved = comment;
      if (!typing) $('comment-input').value = comment ?? '';
      paintStars();
      setCommentState();
    });

    function setCommentState() {
      $('comment-input').disabled = !vote.open;
      $('comment-remove').hidden = !vote.open || !vote.saved;
      $('comment-submit').hidden = !vote.open;
      $('comment-form').hidden = !vote.open && !vote.saved;
      updateCount();
    }

    function cleanup() {
      stopMeta();
      stopMine();
      stopResults?.();
      store.closePresence();
    }
    teardown = cleanup;
  }

  /* ------------------------------------------------------------ Vue animateur */

  const qrReady = loadScript('vendor/qrcode-generator-1.4.4.js?v=__VERSION__');

  function showHost(code) {
    showScreen('screen-host');
    const joinUrl = absoluteUrl({ salle: code });
    $('join-code').textContent = code;
    $('join-url').textContent = joinUrl.replace(/^https?:\/\//, '');
    $('qr').innerHTML = '';
    qrReady.then(() => { $('qr').innerHTML = qrSvg(joinUrl); });
    $('host-results').hidden = true;

    let meta = null;
    let data = { votes: null, comments: null, participants: null };

    function render() {
      if (!meta) return;
      const revealed = meta.status === STATUS.revealed;
      const notes = notesOf(data.votes);
      const comments = commentsOf(data.comments);
      const online = connectedCount(data.participants);
      bump($('count-votes'), notes.length);
      $('count-votes-label').textContent = notes.length > 1 ? 'votes' : 'vote';
      bump($('count-comments'), comments.length);
      $('count-comments-label').textContent = comments.length > 1 ? 'commentaires' : 'commentaire';
      bump($('count-online'), online);
      $('count-online-label').textContent = online > 1 ? 'connectés' : 'connecté';
      $('reveal').hidden = revealed;
      $('reveal').disabled = !notes.length;
      $('reopen').hidden = !revealed;
      $('live-hint').textContent = revealed
        ? 'Votes clos. Rouvrez les votes pour accueillir un retardataire.'
        : (notes.length ? 'Les notes et les commentaires restent cachés jusqu\'à la révélation.' : 'En attente des premiers votes…');
      document.querySelector('.host-grid').classList.toggle('is-revealed', revealed);
      $('host-results').hidden = !revealed;
      if (revealed) renderResults($('host-results'), data);
    }

    const stopMeta = store.watchMeta(code, (value) => {
      if (!value) { cleanup(); forget(code); history.replaceState(null, '', urlFor()); showHome('Ce ROTI a été supprimé.'); return; }
      meta = value;
      $('host-title').textContent = meta.title || 'ROTI sans titre';
      $('host-date').textContent = `ROTI · ${formatDate(meta.createdAt)}`;
      document.title = `ROTI · ${meta.title || code} (animateur)`;
      render();
    });
    const stopData = store.watchHost(code, (value) => { data = value; render(); });

    function cleanup() { stopMeta(); stopData(); }
    teardown = cleanup;
    hostActions.code = code;
    hostActions.title = () => meta?.title || `ROTI ${code}`;
  }

  const hostActions = { code: null, title: () => '' };

  $('reveal').addEventListener('click', async () => {
    $('reveal').disabled = true;
    if (!(await store.reveal(hostActions.code))) $('live-hint').textContent = 'Révélation impossible pour l\'instant : réessayez.';
  });
  $('reopen').addEventListener('click', async () => {
    $('reopen').disabled = true;
    await store.reopen(hostActions.code);
    $('reopen').disabled = false;
  });
  $('host-delete').addEventListener('click', async () => {
    const code = hostActions.code;
    if (!(await confirmAction('Supprimer ce ROTI ?', `« ${hostActions.title()} » et tous ses votes seront effacés pour tout le monde.`, 'Supprimer'))) return;
    if (await store.deleteRoom(code)) {
      teardown?.();
      teardown = null;
      forget(code);
      go({});
    } else {
      $('live-hint').textContent = 'Suppression impossible pour l\'instant : réessayez.';
    }
  });

  route();
}
