## 1. Préparation (auteur)

- [x] 1.1 Créer le projet Firebase `roti-vleroy` : Realtime Database en europe-west1, connexion anonyme activée, `agileroy.github.io` dans les domaines autorisés, appli Web enregistrée. Vérification : configuration Web transmise, fournisseur « Activé » et base visibles dans la console. Fait le 3 novembre 2026 (`databaseURL` relevée dans la console, la base ayant été créée après la copie du bloc).
- [ ] 1.2 Créer le secret `FIREBASE_SERVICE_ACCOUNT` dans le dépôt `roti`. Vérification : job `rules` réussi.

## 2. Dépôt

- [x] 2.1 Réduire `database.rules.json` à la branche `roti` et adapter `tests/rules.test.mjs`. Vérification : `npm test` au vert.
- [x] 2.2 Ajouter `firebase.json`, `.firebaserc` et le job `rules` du workflow. Vérification : règles « released successfully ».
- [x] 2.3 Pointer `site/js/firebase-config.js` vers le nouveau projet ; mettre à jour `README.md` et `openspec/config.yaml`. Vérification : ROTI de test créé puis supprimé sur le site publié.

## 3. Projet partagé

- [ ] 3.1 Retirer la branche `roti` du fichier de `poker-planning` et mettre à jour son README et son contexte OpenSpec. Vérification : tests au vert, job `rules` de `poker-planning` réussi.
