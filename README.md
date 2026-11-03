# roti

**ROTI** (Return On Time Invested) pour clore une réunion ou un atelier, sans publicité : chacun note de 1 à 5 étoiles ce que lui a rapporté le temps passé, depuis son téléphone, et peut laisser un commentaire.

**Site : https://agileroy.github.io/roti/**

| Note | Libellé |
|---|---|
| ★ | J'ai perdu mon temps |
| ★★ | Peu utile, j'en retire peu de chose |
| ★★★ | Correct, ça valait le temps passé |
| ★★★★ | Utile, j'en retire de la valeur |
| ★★★★★ | Génial, j'ai adoré et j'en retire beaucoup de valeur |

## Fonctionnement

- **Une salle par réunion** : l'animateur clique sur « Créer un ROTI » (titre facultatif) et projette son écran : code de 4 lettres, adresse et QR code. Les participants rejoignent depuis leur téléphone, sans compte ni prénom.
- **Vote** : 5 étoiles, chacune avec son libellé, enregistrée au clic ; un commentaire facultatif (500 caractères au plus). Note et commentaire se changent jusqu'à la révélation.
- **Anonymat** : la note et le commentaire sont stockés séparément, sans lien lisible par un autre que leur auteur. Personne, pas même l'animateur, ne peut savoir quel commentaire va avec quelle note.
- **Révélation** : avant, l'écran de l'animateur n'affiche que le nombre de votes, de commentaires et de participants connectés. « Révéler » fige les votes et affiche d'un coup, sur tous les écrans, la moyenne (« 3,8 / 5 »), la répartition des notes et les commentaires. « Rouvrir les votes » accueille un retardataire ; tout redevient caché jusqu'à la révélation suivante.
- **Mes ROTI** : l'accueil liste les ROTI créés dans ce navigateur (titre, date, nombre de votes, état), à rouvrir ou à supprimer. Les salles sont supprimées automatiquement après 30 jours.
- **Mode démo** : avec `?demo` dans l'adresse, l'outil fonctionne sans Firebase, entre les onglets d'un même navigateur (un onglet animateur, d'autres onglets participants).

## Réseau d'entreprise

Le VPN de l'entreprise (proxy Zscaler) bloque GitHub Pages et Firebase : voter depuis son téléphone, hors VPN, via le QR code.

## Architecture

Site statique (HTML/CSS/JavaScript, sans build) publié sur GitHub Pages, polices système, ni CDN ni traceur. Seul service tiers : Firebase Realtime Database (connexion anonyme), dans un projet Firebase propre au ROTI (`roti-vleroy`).

- `site/js/roti-core.js` : logique pure (libellés, code de salle, validations, moyenne, répartition, liste « Mes ROTI »), testée avec Node.js ;
- `site/js/roti-store.js` : actions sur la base (création, purge, vote, commentaire, révélation, réouverture, suppression, présence) ; chaque rôle ne lit que les nœuds qui lui sont permis ;
- `site/js/firebase-db.js` (seul module qui parle à Firebase), `site/js/memory-db.js` (même interface en mémoire, pour les tests et le mode démo), `site/js/firebase-config.js` ;
- `site/js/ui.js` : accueil, vue participant et vue animateur ; `site/js/theme.js` : thème clair ou sombre ; `site/js/app.js` : point d'entrée ;
- `site/vendor/qrcode-generator-1.4.4.js` : QR code de la salle (licence MIT) ;
- `database.rules.json` : règles de sécurité de la base, limitées à la branche `roti` (projet désigné par `firebase.json` et `.firebaserc`). Elles sont publiées automatiquement à chaque push sur `main`, après les tests, par le job `rules` du workflow (Firebase CLI avec le compte de service du secret `FIREBASE_SERVICE_ACCOUNT`) ; sans ce secret, le job est sauté avec un avertissement et les règles sont à publier à la main dans la console Firebase.

Données de la branche `roti` :

```
roti/expiry/{code}                     { createdAt, hostUid }   réservation du code, purge à 30 jours
roti/rooms/{code}/meta                 { hostUid, createdAt, title, status: open | revealed }
roti/rooms/{code}/votes/{uid}          note de 1 à 5
roti/rooms/{code}/comments/{cid}       texte du commentaire (identifiant aléatoire, sans auteur)
roti/rooms/{code}/claimed/{cid}        true : identifiant déjà attribué
roti/rooms/{code}/mine/{uid}           cid du commentaire de ce participant, lisible par lui seul
roti/rooms/{code}/participants/{uid}/connections/{id}   présence (une entrée par onglet)
```

## Développement

```sh
npm test                                          # logique, règles, parcours complets sous les règles
python3 -m http.server 8765 --directory site      # puis http://localhost:8765/?demo
```

Les tests de `tests/roti-store.test.mjs` jouent des parcours à plusieurs participants sur une base en mémoire soumise à `database.rules.json`, évalué par un petit simulateur de règles (`tests/rules-sim.mjs`) : anonymat, votes cachés avant la révélation, participant malveillant, purge.

Chaque push sur `main` lance les tests, publie les règles Firebase puis publie `site/` sur GitHub Pages ; un test en échec bloque les deux publications.

## Méthode

Le projet suit le développement piloté par les spécifications avec [OpenSpec](https://github.com/Fission-AI/OpenSpec) : `openspec/specs/` décrit le comportement attendu, `openspec/changes/` les changements en cours. Commandes Claude Code : `/opsx:explore`, `/opsx:propose`, `/opsx:apply`, `/opsx:archive`.
