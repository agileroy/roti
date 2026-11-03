## Context

Dépôt neuf (un README). Les outils frères donnent le modèle : `poker-planning` pour le vote caché puis révélé, `scrum-increment` (Fournée) pour les salles à code avec un animateur, l'abstraction de base (`firebase-db.js` / `memory-db.js`), le mode démo et les tests de cohérence des règles. Le ROTI combine les deux : plusieurs salles comme Fournée, un vote révélé d'un coup comme le poker planning. La base Firebase est partagée par 8 dépôts et ses règles se publient à la main.

## Goals / Non-Goals

**Goals:**
- Un ROTI fait en moins de deux minutes en fin de réunion : QR code projeté, vote au téléphone, révélation.
- Un anonymat réel, garanti par les règles de la base et pas seulement par l'interface.
- Des salles que l'animateur retrouve, rouvre et supprime, sans compte.
- La même allure que les outils frères, projetée et sur téléphone, en clair et en sombre.

**Non-Goals:**
- Comptes, équipes, historique d'une équipe dans le temps, export.
- Retrouver ses ROTI depuis un autre navigateur que celui qui les a créés.

## Decisions

- **Organisation des fichiers** (`site/`) : `index.html`, `app.css`, `img/favicon.svg`, `vendor/qrcode-generator-1.4.4.js`, et dans `js/` : `roti-core.js` (logique pure : libellés, code, validation, moyenne, répartition, liste des ROTI), `roti-store.js` (actions sur la base), `firebase-db.js` et `memory-db.js` (repris de `scrum-increment`, même interface), `firebase-config.js` (configuration du projet partagé), `ui.js` (écrans), `theme.js` (clé `roti.theme`), `app.js` (point d'entrée). Les modules importés par Node.js ne touchent ni au DOM ni à Firebase.

- **Adresses** : accueil `/`, vue participant `?salle=CODE`, vue animateur `?animer=CODE` (`&demo` conservé en mode démo). Le QR code mène à `?salle=CODE`. La vue animateur n'est accessible qu'au navigateur dont l'identifiant anonyme est le `hostUid` de la salle ; un autre navigateur est renvoyé vers la vue participant. L'animateur peut donc aussi voter depuis son téléphone.

- **Données** (branche `roti`) :
  ```
  roti/expiry/{code}              { createdAt, hostUid }       réservation du code et date de purge
  roti/rooms/{code}/meta          { hostUid, createdAt, title, status: open|revealed }
  roti/rooms/{code}/votes/{uid}   1 à 5
  roti/rooms/{code}/comments/{cid} texte (1 à 500 caractères)
  roti/rooms/{code}/mine/{uid}    cid : le commentaire de ce participant
  roti/rooms/{code}/claimed/{cid} true : identifiant de commentaire déjà attribué
  roti/rooms/{code}/participants/{uid}/connections/{id}  true (présence, une entrée par onglet)
  ```
  Alternative écartée : un nœud par participant `{ note, commentaire }`, qui relie forcément les deux.

- **Dissociation note / commentaire** : le commentaire est rangé sous un identifiant aléatoire `cid` de 20 caractères (`crypto.getRandomValues`, pas un identifiant `push` qui encode l'heure), sans auteur. Le lien entre le participant et son `cid` est dans `mine/{uid}`, lisible et écrivable par ce seul participant, et fixé une fois pour toutes : l'animateur lit `votes` et `comments`, jamais `mine`. Les règles n'autorisent l'écriture de `comments/{cid}` qu'au participant dont `mine/{uid}` vaut `cid`, ce qui limite aussi chacun à un seul commentaire. `mine/{uid}` ne s'écrit qu'une fois, avec un `cid` encore libre, réservé dans la même écriture sous `claimed/{cid}` (sans auteur) : un participant qui a vu les identifiants des commentaires après une révélation ne peut donc pas s'approprier celui d'un autre en rouvrant sa propre entrée. Premier commentaire : une écriture groupée `mine` + `claimed` + `comments` ; les suivants ne touchent que `comments/{cid}`. Les commentaires sont affichés dans l'ordre de leurs identifiants aléatoires, donc sans rapport avec l'ordre d'arrivée ni l'ordre des votes.

- **Secret avant la révélation** : `votes` et `comments` ne sont lisibles que par l'animateur, ou par tous une fois `status` à `revealed` ; chacun lit sa propre note (`votes/{uid}`) et son propre commentaire (par `mine`). Les règles refusent toute écriture de note ou de commentaire après la révélation. L'écran de l'animateur n'affiche avant la révélation que des compteurs (votes, commentaires, connectés). Alternative écartée : compteurs publics tenus à jour par les participants, falsifiables et inutiles puisque seul l'animateur projette.

- **Lectures par nœud plutôt que la salle entière** : une salle n'a pas de règle de lecture globale (sinon `mine` serait lisible). L'interface s'abonne séparément à `meta`, à `votes` et `comments` (animateur, ou participant après la révélation, avec réabonnement au changement d'état), à sa note et à son commentaire. `memory-db.js` ne contrôle pas les règles : les tests de `roti-store` vérifient que le store ne lit que les chemins autorisés pour son rôle, grâce à un journal des lectures du serveur en mémoire.

- **Révéler et rouvrir** : un seul champ `status`. « Révéler » le passe à `revealed` ; « Rouvrir les votes » le remet à `open`, les votes et commentaires déjà donnés sont conservés et redeviennent cachés aux participants.

- **Liste des ROTI de l'animateur** : les codes créés sont mémorisés dans le `localStorage` (`roti.mine`, au plus 50, les plus récents d'abord). L'accueil relit `meta` et le nombre de votes de chacun ; un code dont la salle n'existe plus est retiré de la liste. Suppression : salle et réservation du code effacées en une écriture, après confirmation.

- **Purge après 30 jours** : `expiry/{code}.createdAt` est l'heure du serveur ; les règles autorisent n'importe qui à supprimer une salle de plus de 30 jours (2 592 000 000 ms), et l'accueil de l'animateur balaie les salles expirées à chaque création, comme les jeux frères le font à 24 heures.

- **Codes** : 4 lettres sans I, L ni O, comme les jeux frères, réservés par une écriture qui échoue si le code existe (`claim`).

- **Moyenne et répartition** : moyenne arrondie à une décimale, écrite à la française (« 3,8 »), avec des étoiles remplies en proportion ; répartition en barres horizontales de 5 à 1 étoile, avec le nombre de votes et le pourcentage. Sans vote, « Révéler » est désactivé.

- **Vue participant** : rangée de 5 étoiles (boutons radio stylés, 52 px au moins), libellé de la note survolée ou choisie en dessous, puis la légende des 5 libellés, chacun cliquable. Le vote est enregistré au clic, avec un retour « Note enregistrée ». Le commentaire a son propre bouton « Envoyer » et un compteur de caractères ; il peut être modifié ou retiré.

- **Identité visuelle** : variables de couleur, police système et composants de `scrum-increment/site/app.css`, plus une couleur d'étoile (`--star`, ambre). Barre d'en-tête avec le bouton de thème mémorisé, script de thème en tête de page pour éviter le flash.

- **Règles partagées** : la branche `roti` ne référence qu'elle-même ; `tests/rules.test.mjs` vérifie l'alphabet des codes, les valeurs de note, la longueur des commentaires, la durée de purge, la lecture réservée de `votes`, `comments` et `mine`, et la présence des branches des outils frères. Le fichier est recopié tel quel dans les 7 autres dépôts.

## Risks / Trade-offs

- [Animateur qui change de navigateur ou vide ses données] → ses ROTI deviennent orphelins et disparaissent à 30 jours ; les participants ne perdent rien. Acceptable pour un outil sans compte, dit dans la page.
- [Peu de votants : avec 2 votes, chacun devine la note de l'autre] → inhérent au ROTI ; la dissociation note / commentaire évite au moins de relier un commentaire critique à une note.
- [Animateur curieux qui lit la base avant la révélation] → il peut lire les notes, pas qui les a données ; l'interface ne les montre pas avant la révélation.
- [Règles non publiées dans la console] → l'outil échoue à créer une salle (écriture refusée) : message d'erreur explicite, et rappel dans le README et le récapitulatif de livraison.
- [Spam de commentaires] → un seul commentaire par participant, imposé par les règles ; une session anonyme neuve permet d'en ajouter un autre, risque accepté pour un usage d'équipe.

## Migration Plan

Aucune migration : premier contenu du dépôt et nouvelle branche de la base. Étapes manuelles : publier `database.rules.json` dans la console Firebase, vérifier la source GitHub Pages (« GitHub Actions »).

## Open Questions

_Aucune._
