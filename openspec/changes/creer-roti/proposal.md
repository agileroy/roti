## Why

À la fin d'une réunion ou d'un atelier, le ROTI (Return On Time Invested) mesure en une minute ce que chacun en a retiré : une note de 1 à 5 et, si on veut, un mot. On le fait aujourd'hui à main levée (les avis s'alignent sur les premiers doigts levés) ou avec des outils en ligne chargés de publicité. La boîte à outils (https://agileroy.github.io/outils/) n'a pas encore d'outil de clôture de réunion.

## What Changes

- **Salles de ROTI** : l'animateur crée une salle par réunion, avec un titre facultatif (« Sprint Review du 3 novembre »). Il obtient un code de 4 lettres, l'adresse et un QR code à projeter ; les participants rejoignent depuis leur téléphone, sans compte ni prénom.
- **Gestion des salles** : l'animateur retrouve dans son navigateur la liste des ROTI qu'il a créés (titre, date, nombre de votes, état), peut en rouvrir un et le supprimer. Les salles de plus de 30 jours sont supprimées automatiquement.
- **Vote** : 5 étoiles, chacune avec son libellé (de « J'ai perdu mon temps » à « Génial, j'ai adoré et j'en retire beaucoup de valeur »), et un commentaire facultatif. Une note par participant, modifiable jusqu'à la révélation, comme le commentaire.
- **Anonymat** : aucun prénom ; la note et le commentaire sont stockés séparément, sans lien : personne, pas même l'animateur, ne peut savoir quel commentaire va avec quelle note.
- **Révélation** : l'écran de l'animateur affiche en direct le nombre de votes et de participants connectés, rien d'autre. « Révéler » fige les votes et affiche d'un coup, sur tous les écrans, la moyenne, la répartition des notes et tous les commentaires. « Rouvrir les votes » permet d'accueillir un retardataire.
- **Mode démo** (`?demo`) : l'outil fonctionne sans Firebase, entre les onglets d'un même navigateur.
- **Règles Firebase** : nouvelle branche `roti` dans `database.rules.json`, recopié à l'identique dans les 7 autres dépôts qui partagent la base.
- **Boîte à outils** : carte « ROTI » dans la section « En atelier » de https://agileroy.github.io/outils/.
- Site statique sur GitHub Pages, publié après les tests, thème clair et sombre, identité visuelle des outils frères.

Hors périmètre : export des résultats, historique des ROTI d'une équipe dans le temps, question libre personnalisée, prénom facultatif, échelle autre que 1 à 5, interface en anglais.

## Capabilities

### New Capabilities

- `roti-room` : création d'une salle, code et QR code, rejoindre, présence, liste des ROTI de l'animateur, réouverture, suppression et purge après 30 jours.
- `roti-vote` : vue participant : étoiles et libellés, commentaire facultatif, modification jusqu'à la révélation, anonymat et dissociation note / commentaire.
- `roti-results` : vue animateur : suivi en direct sans dévoiler les votes, révélation, moyenne, répartition, commentaires, réouverture des votes.
- `site-publication` : publication GitHub Pages, interface (langue, appareils, thèmes), service tiers limité à Firebase, connexion, mode démo, règles de sécurité partagées.

### Modified Capabilities

_Aucune._

## Impact

- Ajoutés dans `roti` : `site/` (page, styles, scripts, favicon, générateur de QR code `qrcode-generator` 1.4.4 sous licence MIT), `tests/`, `.github/workflows/pages.yml`, `package.json`, `database.rules.json`, `README.md`, `openspec/` et les commandes OpenSpec de `.claude/` (reprises de `scrum-increment`).
- `database.rules.json` modifié (branche `roti` ajoutée, autres branches inchangées) dans `poker-planning`, `matrice-competences`, `wheel-of-chance`, `moving-motivators`, `roles-responsabilites`, `scrum-events` et `scrum-increment`.
- `agileroy.github.io` : carte ROTI dans `outils/index.html`.
- Actions manuelles de l'auteur : publier les nouvelles règles dans la console Firebase (Realtime Database, onglet Règles) ; vérifier que GitHub Pages publie depuis « GitHub Actions ».
