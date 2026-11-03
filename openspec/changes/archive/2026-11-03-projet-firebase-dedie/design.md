## Context

Même recette que les six outils déjà déplacés (changements `projet-firebase-dedie` de Fournée, des jeux de formation, de la matrice et de la roue). Le ROTI ne lit et n'écrit que sous `roti/`, et son code ne connaît le projet que par `site/js/firebase-config.js`.

## Goals / Non-Goals

**Goals:**
- Le ROTI ne dépend plus du quota de connexions du poker planning.
- Les règles du ROTI vivent dans son seul dépôt et sont publiées automatiquement, testées avant.

**Non-Goals:**
- Changer le modèle de données ou les règles de la branche `roti`.

## Decisions

- **Garder la branche `roti`** à la racine du nouveau projet : aucune ligne de code ni règle ne change.
- **Déploiement par Firebase CLI avec un compte de service** (job `rules` après les tests, site publié après les règles, sauté avec un avertissement sans secret), comme les autres outils.
- **Test** : le fichier ne contient que la branche `roti` ; `firebase.json` et `.firebaserc` visent `roti-vleroy`.
- **`poker-planning`** retire la branche `roti` de son fichier et le publie automatiquement : le projet partagé redevient celui du seul poker planning.

## Risks / Trade-offs

- [Secret absent au moment de la fusion] → le site viserait une base verrouillée ; le journal du job `rules` est vérifié après chaque fusion.
- [ROTI en cours au moment de la bascule] → perdu ; la bascule se fait hors réunion.

## Migration Plan

1) Projet et secret créés par l'auteur ; 2) fusion : tests, règles, site ; 3) ROTI de test créé puis supprimé sur le site publié ; 4) retrait de la branche `roti` du fichier de `poker-planning`, publié automatiquement.

## Open Questions

_Aucune._
