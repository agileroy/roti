## REMOVED Requirements

### Requirement: Règles de sécurité partagées
**Reason**: le ROTI a désormais son propre projet Firebase ; la base n'est plus partagée avec le poker planning.
**Migration**: remplacé par « Projet Firebase dédié » et « Déploiement automatique des règles » ; les contraintes des règles restent décrites par « Écritures contrôlées par la base » et « Lectures contrôlées par la base ».

## ADDED Requirements

### Requirement: Projet Firebase dédié
Le ROTI SHALL utiliser un projet Firebase qui lui est propre (`roti-vleroy`), qu'aucun autre outil n'utilise. `database.rules.json` SHALL ne contenir que la branche `roti`, et tout le reste de la base SHALL être fermé en lecture comme en écriture.

#### Scenario: Fichier commun recopié par erreur
- **GIVEN** un `database.rules.json` qui contient aussi la branche d'un autre outil
- **WHEN** les tests s'exécutent
- **THEN** un test échoue et ni les règles ni le site ne sont publiés

### Requirement: Déploiement automatique des règles
À chaque push sur `main`, après la réussite des tests, GitHub Actions SHALL publier `database.rules.json` dans le projet du ROTI, avec un compte de service gardé en secret (`FIREBASE_SERVICE_ACCOUNT`), puis seulement publier le site. Sans secret, le déploiement des règles SHALL être sauté avec un avertissement, sans empêcher la publication du site.

#### Scenario: Règles modifiées
- **GIVEN** un push sur `main` qui modifie `database.rules.json` et dont les tests réussissent
- **WHEN** le workflow s'exécute
- **THEN** les nouvelles règles sont actives dans le projet du ROTI, sans action dans la console
