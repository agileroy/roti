## Why

Le ROTI partage le projet Firebase `poker-planning-vleroy` avec le poker planning, dernier outil à y rester après le déplacement des six autres. Sur l'offre gratuite (Spark), une Realtime Database accepte au plus 100 connexions simultanées : un ROTI de fin de réunion qui tombe pendant un poker planning d'une autre équipe se partage ce quota. Le fichier de règles commun doit en plus être tenu identique dans deux dépôts.

## What Changes

- **Projet Firebase dédié** (`roti-vleroy` : Realtime Database en europe-west1, connexion anonyme, domaine `agileroy.github.io` autorisé), créé par l'auteur ; `site/js/firebase-config.js` pointe vers ce projet.
- **Règles propres au ROTI** : `database.rules.json` ne contient plus que la branche `roti` (inchangée) ; il n'est plus recopié dans `poker-planning`.
- **Déploiement automatique des règles** à chaque push sur `main`, après les tests (secret `FIREBASE_SERVICE_ACCOUNT`), puis publication du site.
- **Projet partagé** : la branche `roti` est retirée du fichier de `poker-planning`, qui publie ses règles automatiquement ; `poker-planning-vleroy` ne sert plus qu'au poker planning.

Pas de migration des données : les ROTI existants sont des essais, et les salles expirent de toute façon après 30 jours.

Hors périmètre : offre payante.

## Capabilities

### New Capabilities

_Aucune._

### Modified Capabilities

- `site-publication` : la base n'est plus partagée ; règles propres au ROTI, déployées automatiquement après les tests.

## Impact

- Ce dépôt : `site/js/firebase-config.js`, `database.rules.json`, `firebase.json` et `.firebaserc` (nouveaux), `.github/workflows/pages.yml`, `tests/rules.test.mjs`, `README.md`, `openspec/config.yaml`.
- `poker-planning` : branche `roti` retirée de `database.rules.json` ; README et contexte OpenSpec : projet propre au poker planning.
- Actions manuelles de l'auteur : créer le projet (fait) et le secret `FIREBASE_SERVICE_ACCOUNT` dans le dépôt `roti`.
