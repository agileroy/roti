# site-publication Specification

## Purpose
Publication sur GitHub Pages, interface (langue, appareils, thèmes), service tiers limité à Firebase, mode démo et règles de sécurité partagées.

## Requirements

### Requirement: Publication automatique
Le site SHALL être publié sur GitHub Pages, à l'adresse https://agileroy.github.io/roti/, à chaque push sur `main`. Les tests automatiques SHALL être lancés avant la publication, et la publication MUST NOT avoir lieu si un test échoue. Les tests SHALL aussi être lancés sur chaque pull request, sans publication. Les fichiers publiés SHALL être versionnés (paramètre de version dans leurs adresses) pour éviter les styles et scripts périmés en cache après une mise à jour.

#### Scenario: Test en échec
- **GIVEN** un push sur `main` qui casse un test
- **WHEN** le workflow GitHub Actions s'exécute
- **THEN** le job de tests échoue et le site publié reste la version précédente

### Requirement: Interface et appareils
L'interface SHALL être en français. La vue animateur SHALL être lisible projetée (1280 px et plus) et la vue participant utilisable sur téléphone (360 px et plus), toutes deux sans défilement horizontal. Le site SHALL fonctionner en thème clair et en thème sombre, avec un bouton de bascule mémorisé dans le navigateur ; sans choix mémorisé, le thème suit le réglage du système, y compris quand ce réglage change.

#### Scenario: Bascule de thème
- **GIVEN** un navigateur en thème clair
- **WHEN** l'utilisateur clique sur le bouton de thème puis recharge la page
- **THEN** la page s'affiche en thème sombre dès le chargement, sans flash clair

#### Scenario: Participant sur téléphone
- **GIVEN** un téléphone de 360 px de large
- **WHEN** le participant note, commente puis consulte les résultats
- **THEN** tout tient dans la largeur de l'écran, sans défilement horizontal

### Requirement: Service tiers limité à Firebase
Le site MUST NOT charger de police web, de CDN, de traceur ni de publicité. Le SDK Firebase et la base temps réel SHALL être le seul service tiers. Si le service est injoignable, le site SHALL l'indiquer dès l'ouverture (« Service temps réel injoignable : vérifiez votre réseau, le VPN de l'entreprise le bloque. »), et la création d'un ROTI comme le vote SHALL être indisponibles.

#### Scenario: Réseau qui bloque Firebase
- **GIVEN** un réseau qui bloque Firebase
- **WHEN** l'utilisateur ouvre le site, ou le lien d'un ROTI
- **THEN** le message de service injoignable s'affiche à la place de l'accueil ou du vote

### Requirement: Connexion au service temps réel
Le site SHALL n'utiliser que des connexions HTTPS (port 443) vers Firebase, avec une connexion anonyme. Si la connexion est perdue, l'écran SHALL afficher « Connexion perdue, reconnexion… » et reprendre automatiquement à son retour, sans recharger la page.

#### Scenario: Coupure réseau
- **GIVEN** un participant dans une salle
- **WHEN** sa connexion est coupée puis rétablie
- **THEN** le message de connexion perdue s'affiche pendant la coupure, puis la salle se met à jour

### Requirement: Mode démo
Avec `?demo` dans l'adresse, le site SHALL fonctionner sans Firebase : les onglets d'un même navigateur partagent les mêmes salles, ce qui permet d'essayer le ROTI avec un onglet animateur et plusieurs onglets participants. Chaque onglet SHALL y être un participant distinct.

#### Scenario: Essai à plusieurs onglets
- **GIVEN** un onglet animateur et deux onglets participants ouverts avec `?demo`
- **WHEN** les deux participants votent et l'animateur révèle
- **THEN** les trois onglets affichent les mêmes résultats

### Requirement: Règles de sécurité partagées
La base Firebase est partagée avec les outils frères : `database.rules.json` SHALL contenir une branche `roti`, sans modifier les autres branches, et SHALL rester identique dans tous les dépôts qui partagent encore la base ; seul `poker-planning` le publie.

#### Scenario: Fichier recopié
- **GIVEN** la branche `roti` ajoutée dans ce dépôt
- **WHEN** on compare `database.rules.json` des dépôts qui partagent la base
- **THEN** les fichiers sont identiques

### Requirement: Écritures contrôlées par la base
Les règles de la branche `roti` SHALL n'autoriser que l'animateur à modifier, révéler, rouvrir et supprimer sa salle (ou n'importe qui après 30 jours). Un participant SHALL n'écrire que sa propre note (entier de 1 à 5), son propre commentaire (1 à 500 caractères) et sa présence, et seulement tant que les votes sont ouverts. Les codes et les titres SHALL être validés.

#### Scenario: Participant malveillant
- **GIVEN** un participant d'une salle aux votes ouverts
- **WHEN** il tente d'écrire la note d'un autre, une note de 6, de modifier le commentaire d'un autre ou de révéler la salle
- **THEN** les règles refusent l'écriture

### Requirement: Lectures contrôlées par la base
Les règles de la branche `roti` SHALL rendre les notes et les commentaires lisibles par l'animateur, et par tous seulement après la révélation. Le lien entre un participant et son commentaire SHALL n'être lisible que par lui.

#### Scenario: Animateur qui cherche l'auteur d'un commentaire
- **GIVEN** une salle révélée
- **WHEN** l'animateur tente de lire le lien entre les participants et les commentaires
- **THEN** les règles refusent la lecture
