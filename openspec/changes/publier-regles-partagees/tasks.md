## 1. Préparation (auteur)

- [ ] 1.1 Générer une clé de compte de service du projet `poker-planning-vleroy` et créer le secret `FIREBASE_SERVICE_ACCOUNT` dans le dépôt `roti`. Vérification : secret listé dans les paramètres du dépôt.

## 2. Dépôt

- [x] 2.1 Ajouter `firebase.json`, `.firebaserc` (projet partagé) et le job `rules` du workflow (après les tests, site publié après les règles, sauté sans secret) ; test de `firebase.json`. Vérification : `npm test` au vert.
- [x] 2.2 Mettre à jour `README.md` et `openspec/config.yaml`. Vérification : plus de mention d'une publication manuelle.
- [ ] 2.3 Pousser sur `main` après création du secret. Vérification : job `rules` « released successfully » et branche `incrementGame` absente des règles publiées.
