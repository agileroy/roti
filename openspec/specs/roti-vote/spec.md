# roti-vote Specification

## Purpose
La vue participant : note en étoiles et libellés, commentaire facultatif, modification jusqu'à la révélation, anonymat et dissociation entre note et commentaire.

## Requirements

### Requirement: Note en étoiles
La vue participant SHALL afficher le titre du ROTI et 5 étoiles cliquables ; cliquer sur la n-ième étoile donne la note n. La note SHALL être enregistrée au clic, avec la confirmation « Note enregistrée ». Les étoiles SHALL être utilisables au clavier (flèches) et au doigt (au moins 44 × 44 px).

#### Scenario: Premier vote
- **GIVEN** un participant dans une salle aux votes ouverts
- **WHEN** il clique sur la quatrième étoile
- **THEN** 4 étoiles sont remplies et la note 4 est enregistrée

### Requirement: Libellés des notes
Chaque note SHALL avoir un libellé : 1 « J'ai perdu mon temps », 2 « Peu utile, j'en retire peu de chose », 3 « Correct, ça valait le temps passé », 4 « Utile, j'en retire de la valeur », 5 « Génial, j'ai adoré et j'en retire beaucoup de valeur ». Le libellé de l'étoile survolée, ou à défaut de la note choisie, SHALL s'afficher sous les étoiles. La légende des 5 libellés SHALL rester visible, chaque ligne étant elle aussi cliquable.

#### Scenario: Libellé de la note choisie
- **GIVEN** un participant qui vient de cliquer sur la quatrième étoile
- **WHEN** il ne survole aucune étoile
- **THEN** « Utile, j'en retire de la valeur » s'affiche sous les étoiles

#### Scenario: Vote par la légende
- **GIVEN** la légende des libellés
- **WHEN** le participant touche la ligne « J'ai perdu mon temps »
- **THEN** sa note devient 1

### Requirement: Changer sa note
Un participant SHALL avoir une seule note par salle, qu'il SHALL pouvoir changer tant que les votes sont ouverts. Après la révélation, sa note SHALL être figée et affichée comme telle. Un participant qui recharge la page SHALL retrouver sa note et son commentaire.

#### Scenario: Changement d'avis
- **GIVEN** un participant qui a donné 4
- **WHEN** il clique sur la deuxième étoile avant la révélation
- **THEN** sa note devient 2 et la salle compte toujours un seul vote pour lui

#### Scenario: Après la révélation
- **GIVEN** une salle révélée
- **WHEN** le participant essaie de changer sa note
- **THEN** les étoiles sont désactivées et la base refuse l'écriture

### Requirement: Commentaire facultatif
Un participant SHALL pouvoir laisser un commentaire de 1 à 500 caractères, avec ou sans note, l'envoyer, le modifier et le retirer tant que les votes sont ouverts. Un compteur SHALL indiquer les caractères restants. Un participant a au plus un commentaire par salle.

#### Scenario: Commentaire modifié
- **GIVEN** un participant qui a envoyé « Trop long »
- **WHEN** il le remplace par « Trop long, mais utile » et clique sur « Envoyer »
- **THEN** la salle compte toujours un seul commentaire pour lui, avec le nouveau texte

### Requirement: Anonymat et dissociation
Aucun prénom ni identifiant visible ne SHALL être demandé ni affiché. La note et le commentaire d'un participant SHALL être stockés sans lien lisible par un autre que lui : l'animateur et les autres participants MUST NOT pouvoir relier un commentaire à une note, ni à l'ordre d'arrivée des votes. La vue participant SHALL rappeler que la note et le commentaire sont anonymes et dissociés.

#### Scenario: L'animateur tente de relier
- **GIVEN** une salle révélée avec 3 notes et 3 commentaires
- **WHEN** l'animateur lit tout ce que la base lui permet de lire
- **THEN** il obtient les notes et les commentaires, mais aucune donnée qui associe un commentaire à une note

### Requirement: Votes cachés avant la révélation
Avant la révélation, un participant MUST NOT pouvoir lire les notes ni les commentaires des autres, ni dans l'interface ni dans la base. Après la révélation, il SHALL voir les mêmes résultats que l'animateur ; si les votes sont rouverts, les résultats SHALL de nouveau lui être cachés.

#### Scenario: Participant curieux
- **GIVEN** une salle aux votes ouverts
- **WHEN** un participant tente de lire les notes de la salle
- **THEN** la base refuse la lecture
