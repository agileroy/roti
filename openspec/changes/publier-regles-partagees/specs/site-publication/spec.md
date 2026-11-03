## MODIFIED Requirements

### Requirement: Règles de sécurité partagées
La base Firebase est partagée avec les outils frères qui ne sont pas encore déplacés dans leur propre projet : `database.rules.json` SHALL contenir une branche `roti`, sans modifier les autres branches, et SHALL rester identique dans tous les dépôts qui partagent encore la base. Ce dépôt SHALL être le seul à publier ce fichier : à chaque push sur `main`, après la réussite des tests, GitHub Actions SHALL le publier dans le projet partagé avec le compte de service du secret `FIREBASE_SERVICE_ACCOUNT`, puis seulement publier le site. Sans secret, la publication des règles SHALL être sautée avec un avertissement.

#### Scenario: Fichier recopié
- **GIVEN** la branche `roti` ajoutée dans ce dépôt
- **WHEN** on compare `database.rules.json` des dépôts qui partagent la base
- **THEN** les fichiers sont identiques

#### Scenario: Branche retirée après le déplacement d'un outil
- **GIVEN** un fichier commun dont on retire la branche d'un outil déplacé
- **WHEN** la modification est poussée sur `main` de ce dépôt et que les tests réussissent
- **THEN** les règles du projet partagé sont mises à jour sans action dans la console
