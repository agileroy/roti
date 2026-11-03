// Simulateur minimal des règles de sécurité de Firebase Realtime Database, pour les tests.
// Couvre ce qu'utilise la branche roti : .read (cascade descendante), .write (accordé par le premier
// ancêtre qui l'autorise), .validate (sur les nœuds écrits, leurs descendants et leurs ancêtres non nuls),
// jokers $variables, auth, now, root, data, newData et les méthodes de snapshot courantes.
// Ce n'est pas l'implémentation de Google : il sert à rejouer les scénarios, pas à prouver les règles.

const split = (path) => String(path).split('/').filter(Boolean);
const clone = (value) => (value === undefined ? null : JSON.parse(JSON.stringify(value)));

function readAt(tree, keys) {
  let node = tree;
  for (const key of keys) {
    if (node === null || typeof node !== 'object') return null;
    node = node[key];
    if (node === undefined) return null;
  }
  return node ?? null;
}

function prune(value) {
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      value[key] = prune(value[key]);
      if (value[key] === null || value[key] === undefined) delete value[key];
    }
    return Object.keys(value).length ? value : null;
  }
  return value ?? null;
}

/** Arbre après écriture de `changes` ({ chemin → valeur }), comme une mise à jour multi-chemins. */
export function applyChanges(tree, changes) {
  const out = clone(tree) ?? {};
  let root = out;
  for (const [path, value] of Object.entries(changes)) {
    const keys = split(path);
    if (!keys.length) { root = clone(value) ?? {}; continue; }
    let node = root;
    for (const key of keys.slice(0, -1)) {
      if (node[key] === null || typeof node[key] !== 'object') node[key] = {};
      node = node[key];
    }
    node[keys.at(-1)] = clone(value);
  }
  return prune(root) ?? {};
}

class Snapshot {
  constructor(tree, keys) { this.tree = tree; this.keys = keys; }
  val() { return clone(readAt(this.tree, this.keys)); }
  exists() { return readAt(this.tree, this.keys) !== null; }
  child(path) { return new Snapshot(this.tree, [...this.keys, ...split(path)]); }
  parent() { return new Snapshot(this.tree, this.keys.slice(0, -1)); }
  hasChild(path) { return this.child(path).exists(); }
  hasChildren(list) {
    const value = readAt(this.tree, this.keys);
    if (!list) return value !== null && typeof value === 'object';
    return list.every((key) => this.hasChild(key));
  }
  isNumber() { return typeof readAt(this.tree, this.keys) === 'number'; }
  isString() { return typeof readAt(this.tree, this.keys) === 'string'; }
  isBoolean() { return typeof readAt(this.tree, this.keys) === 'boolean'; }
}

function evaluate(expr, scope) {
  if (typeof expr === 'boolean') return expr;
  const names = Object.keys(scope);
  // Les chaînes de la base exposent .matches(/regex/), .contains(), .beginsWith() et .endsWith().
  const source = expr
    .replace(/\.matches\(/g, '.__matches(')
    .replace(/\.contains\(/g, '.includes(')
    .replace(/\.beginsWith\(/g, '.startsWith(');
  try {
    // eslint-disable-next-line no-new-func
    return Boolean(new Function(...names, `return (${source});`)(...names.map((n) => scope[n])));
  } catch {
    return false; // une erreur d'évaluation vaut un refus, comme dans Firebase
  }
}
// eslint-disable-next-line no-extend-native
Object.defineProperty(String.prototype, '__matches', {
  value(regex) { return regex.test(String(this)); }, configurable: true,
});

/** Nœud de règles qui correspond à `key` sous `node` : clé exacte, sinon joker $variable. */
function ruleChild(node, key) {
  if (!node || typeof node !== 'object') return { rule: null, variable: null };
  if (Object.hasOwn(node, key) && !key.startsWith('.') && !key.startsWith('$')) return { rule: node[key], variable: null };
  const wildcard = Object.keys(node).find((k) => k.startsWith('$'));
  return wildcard ? { rule: node[wildcard], variable: wildcard } : { rule: null, variable: null };
}

/** Parcourt les règles le long de `keys` : [{ rule, keys, vars }] depuis la racine. */
function walk(rules, keys) {
  const steps = [{ rule: rules, keys: [], vars: {} }];
  let current = rules;
  let vars = {};
  for (let i = 0; i < keys.length; i += 1) {
    const { rule, variable } = ruleChild(current, keys[i]);
    if (!rule) break;
    vars = variable ? { ...vars, [variable]: keys[i] } : vars;
    current = rule;
    steps.push({ rule, keys: keys.slice(0, i + 1), vars });
  }
  return steps;
}

export function createRulesChecker(rulesJson) {
  const rules = rulesJson.rules ?? rulesJson;

  function canRead(tree, path, auth, now) {
    const keys = split(path);
    for (const step of walk(rules, keys)) {
      if (step.rule['.read'] === undefined) continue;
      const scope = { auth, now, root: new Snapshot(tree, []), data: new Snapshot(tree, step.keys), ...step.vars };
      if (evaluate(step.rule['.read'], scope)) return true;
    }
    return false;
  }

  function validateTree(oldTree, newTree, rule, keys, vars, auth, now, errors) {
    const value = readAt(newTree, keys);
    if (value === null) return;
    if (rule['.validate'] !== undefined) {
      const scope = {
        auth, now, root: new Snapshot(oldTree, []), data: new Snapshot(oldTree, keys), newData: new Snapshot(newTree, keys), ...vars,
      };
      if (!evaluate(rule['.validate'], scope)) errors.push(`.validate ${keys.join('/')}`);
    }
    if (value && typeof value === 'object') {
      for (const key of Object.keys(value)) {
        const { rule: child, variable } = ruleChild(rule, key);
        if (child) validateTree(oldTree, newTree, child, [...keys, key], variable ? { ...vars, [variable]: key } : vars, auth, now, errors);
      }
    }
  }

  /** Vérifie une écriture (multi-chemins) ; renvoie la liste des refus (vide si acceptée). */
  function checkWrite(tree, changes, auth, now) {
    const newTree = applyChanges(tree, changes);
    const errors = [];
    for (const path of Object.keys(changes)) {
      const keys = split(path);
      const steps = walk(rules, keys);
      const granted = steps.some((step) => step.rule['.write'] !== undefined && evaluate(step.rule['.write'], {
        auth, now, root: new Snapshot(tree, []), data: new Snapshot(tree, step.keys), newData: new Snapshot(newTree, step.keys), ...step.vars,
      }));
      if (!granted) { errors.push(`.write ${path}`); continue; }
      // Ancêtres non nuls, puis le nœud écrit et ses descendants.
      for (const step of steps.slice(0, -1)) {
        if (step.rule['.validate'] === undefined || readAt(newTree, step.keys) === null) continue;
        const scope = {
          auth, now, root: new Snapshot(tree, []), data: new Snapshot(tree, step.keys), newData: new Snapshot(newTree, step.keys), ...step.vars,
        };
        if (!evaluate(step.rule['.validate'], scope)) errors.push(`.validate ${step.keys.join('/')}`);
      }
      const last = steps.at(-1);
      if (last.keys.length === keys.length) validateTree(tree, newTree, last.rule, keys, last.vars, auth, now, errors);
    }
    return errors;
  }

  return { canRead, checkWrite };
}
