## Why

Après la révélation, les cinq étoiles de la moyenne sont petites (32 px) à côté du chiffre (« 2,5 / 5 »), alors que c'est le signal le plus parlant de l'écran projeté. La moyenne et la répartition occupent en plus deux colonnes, ce qui repousse les commentaires tout en bas.

## What Changes

- **Étoiles de la moyenne en grand** : plus grandes que le chiffre de la moyenne, toujours remplies en proportion (demi-étoile pour 2,5).
- **Répartition sous la moyenne** : la moyenne et la répartition forment une seule colonne ; sur grand écran, les commentaires prennent la colonne voisine au lieu de passer dessous.
- Sur téléphone (vue participant), tout reste en une colonne, étoiles à la largeur de l'écran.

Aucun changement de données, de règles ni de calcul.

## Capabilities

### New Capabilities

_Aucune._

### Modified Capabilities

- `roti-results` : taille des étoiles de la moyenne et disposition moyenne / répartition / commentaires.

## Impact

- `site/app.css`, `site/js/ui.js` (remplissage proportionnel des étoiles, indépendant de leur taille), `site/index.html` (gabarit des résultats).
