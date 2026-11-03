## ADDED Requirements

### Requirement: Suivi en direct sans dévoiler
Tant que les votes sont ouverts, la vue animateur SHALL afficher en temps réel le nombre de votes, de commentaires et de participants connectés, et rien qui permette de deviner les notes (ni moyenne, ni répartition, ni commentaires).

#### Scenario: Votes qui arrivent
- **GIVEN** la vue animateur projetée, votes ouverts
- **WHEN** deux participants votent et l'un commente
- **THEN** l'écran affiche « 2 votes » et « 1 commentaire », sans aucune note

### Requirement: Révéler
« Révéler » SHALL être désactivé tant qu'il n'y a aucun vote. Un clic SHALL figer les votes et afficher d'un coup, sur la vue animateur et sur toutes les vues participant de la salle, la moyenne, la répartition et les commentaires.

#### Scenario: Révélation
- **GIVEN** une salle avec les notes 5, 4, 4 et 2 et deux commentaires
- **WHEN** l'animateur clique sur « Révéler »
- **THEN** tous les écrans affichent la moyenne 3,8 sur 5, la répartition et les deux commentaires

### Requirement: Moyenne
La moyenne SHALL être arrondie à une décimale et écrite à la française (« 3,8 / 5 »), accompagnée de 5 étoiles remplies en proportion, du nombre de votes et du libellé de la note la plus proche de la moyenne.

#### Scenario: Moyenne arrondie
- **GIVEN** les notes 5, 4 et 4
- **WHEN** les résultats sont révélés
- **THEN** la moyenne affichée est « 4,3 / 5 », sur 3 votes, avec le libellé « Utile, j'en retire de la valeur »

### Requirement: Répartition
La répartition SHALL montrer, de 5 à 1 étoile, une barre proportionnelle au nombre de votes, avec le nombre et le pourcentage de votes de chaque note, y compris les notes qui n'ont reçu aucun vote.

#### Scenario: Note absente
- **GIVEN** les notes 5, 4 et 4
- **WHEN** les résultats sont révélés
- **THEN** les lignes 3, 2 et 1 étoile affichent 0 vote et une barre vide

### Requirement: Commentaires
Tous les commentaires SHALL s'afficher après la révélation, sans note associée, dans un ordre qui ne reflète ni l'ordre d'arrivée ni l'ordre des notes. Sans commentaire, la vue SHALL afficher « Aucun commentaire. ». Le texte des commentaires SHALL être affiché comme du texte, jamais interprété comme du HTML.

#### Scenario: Commentaire piégé
- **GIVEN** un commentaire « <img src=x onerror=alert(1)> »
- **WHEN** les résultats sont révélés
- **THEN** le texte s'affiche tel quel et aucun script ne s'exécute

### Requirement: Rouvrir les votes
Après la révélation, « Rouvrir les votes » SHALL remettre la salle en votes ouverts : les notes et commentaires déjà donnés sont conservés, redeviennent modifiables et sont de nouveau cachés aux participants jusqu'à la prochaine révélation.

#### Scenario: Retardataire
- **GIVEN** une salle révélée avec 5 votes
- **WHEN** l'animateur rouvre les votes et qu'un retardataire vote
- **THEN** la salle compte 6 votes, et la prochaine révélation en tient compte
