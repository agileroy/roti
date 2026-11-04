## MODIFIED Requirements

### Requirement: Moyenne
La moyenne SHALL être arrondie à une décimale et écrite à la française (« 3,8 / 5 »), accompagnée de 5 étoiles remplies en proportion, du nombre de votes et du libellé de la note la plus proche de la moyenne. Les étoiles de la moyenne SHALL être plus grandes que le chiffre de la moyenne et tenir dans la largeur de l'écran, téléphone compris.

#### Scenario: Moyenne arrondie
- **GIVEN** les notes 5, 4 et 4
- **WHEN** les résultats sont révélés
- **THEN** la moyenne affichée est « 4,3 / 5 », sur 3 votes, avec le libellé « Utile, j'en retire de la valeur »

#### Scenario: Étoiles en grand
- **GIVEN** les notes 3 et 2
- **WHEN** l'animateur révèle les résultats sur l'écran projeté
- **THEN** deux étoiles et demie sont remplies, et chaque étoile est plus haute que le chiffre « 2,5 »

## ADDED Requirements

### Requirement: Disposition des résultats
La répartition SHALL s'afficher sous la moyenne. Sur l'écran de l'animateur, quand la zone des résultats fait au moins 640 px de large, les commentaires SHALL occuper la colonne à côté de la moyenne et de la répartition ; sinon, et dans la vue participant, moyenne, répartition et commentaires SHALL se suivre en une seule colonne, sans défilement horizontal.

#### Scenario: Écran projeté
- **GIVEN** une salle révélée avec trois commentaires, sur un écran de 1440 px
- **WHEN** l'animateur regarde les résultats
- **THEN** la répartition est sous la moyenne et les commentaires sont à côté
