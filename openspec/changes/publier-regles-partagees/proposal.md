## Why

Le fichier de règles commun au projet Firebase partagé (`poker-planning-vleroy`) se publie à la main dans la console, à chaque évolution. Pendant le déplacement des outils vers leurs propres projets, il change à chaque étape (une branche retirée par outil déplacé) : la publication manuelle devient une source d'oubli et de décalage entre les dépôts et la base réelle.

## What Changes

- **Publication automatique du fichier commun depuis ce dépôt** : à chaque push sur `main`, après les tests, GitHub Actions publie `database.rules.json` dans le projet partagé, avec un compte de service de ce projet gardé dans le secret `FIREBASE_SERVICE_ACCOUNT` du dépôt `roti` ; le site n'est publié qu'après les règles. Sans secret, le job est sauté avec un avertissement.
- `firebase.json` et `.firebaserc` désignent le projet partagé.
- Le fichier reste identique dans les dépôts qui partagent encore la base ; seul `roti` le publie. Toute évolution du fichier commun passe donc par un push sur `roti`.

Hors périmètre : déplacement du ROTI dans son propre projet (plus tard, avec les autres outils).

## Capabilities

### New Capabilities

_Aucune._

### Modified Capabilities

- `site-publication` : le fichier de règles commun est publié automatiquement depuis ce dépôt ; le nombre de dépôts qui partagent la base n'est plus figé.

## Impact

- `roti` : `firebase.json`, `.firebaserc` (nouveaux), `.github/workflows/pages.yml`, `tests/rules.test.mjs`, `README.md`, `openspec/config.yaml`.
- Action manuelle de l'auteur : générer une clé de compte de service du projet `poker-planning-vleroy` et créer le secret `FIREBASE_SERVICE_ACCOUNT` dans le dépôt `roti`.
