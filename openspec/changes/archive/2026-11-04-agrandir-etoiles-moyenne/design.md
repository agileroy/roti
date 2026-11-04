## Context

Les résultats sont rendus par `renderResults` (`ui.js`) à partir du gabarit `results-template`. Les étoiles de la moyenne sont deux rangées superposées (vides, puis pleines coupées à la bonne largeur) ; la largeur coupée est calculée en pixels à partir d'une taille d'étoile fixe de 32 px.

## Goals / Non-Goals

**Goals:**
- Étoiles de la moyenne visiblement plus grandes que le chiffre, sur l'écran projeté comme sur téléphone.
- Commentaires visibles sans défiler sur un écran projeté de 1280 × 720 avec quelques commentaires.

**Non-Goals:**
- Changer le calcul de la moyenne, la répartition ou les libellés.

## Decisions

- **Taille des étoiles par variable CSS** (`--avg-star`) et unités de conteneur : `min(80px, 17cqi)` dans le bloc de la moyenne, pour que 5 étoiles et leurs espaces tiennent toujours dans la largeur disponible (téléphone de 360 px compris) ; l'écart entre étoiles est proportionnel (6 % de la taille).
- **Remplissage en pourcentage** plutôt qu'en pixels : largeur de la rangée pleine = (étoiles entières × (1 + écart) + fraction) / (5 + 4 × écart), indépendante de la taille réelle. Alternative écartée : mesurer les étoiles dans le DOM, fragile pendant l'animation de révélation.
- **Chiffre de la moyenne réduit** (jusqu'à 3,6 rem au lieu de 5 rem) pour que les étoiles dominent, sans perdre la lisibilité projetée.
- **Disposition** : grille à deux colonnes `résumé | commentaires` sur l'écran de l'animateur (le résumé empile moyenne puis répartition), une seule colonne quand la zone des résultats fait moins de 640 px (requête de conteneur) et dans la vue participant.
- **Calcul du remplissage dans `roti-core.js`** (`filledPercent`, `STAR_GAP`), testé avec Node.js.

## Risks / Trade-offs

- [Unités de conteneur non gérées par un vieux navigateur] → repli sur 56 px déclaré avant.

## Migration Plan

Aucune.

## Open Questions

_Aucune._
