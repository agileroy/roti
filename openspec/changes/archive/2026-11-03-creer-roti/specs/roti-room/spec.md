## ADDED Requirements

### Requirement: Création d'un ROTI
Depuis l'accueil, « Créer un ROTI » SHALL créer une salle avec un code libre de 4 lettres (sans I, L ni O) et faire du navigateur appelant l'animateur de cette salle. Un titre facultatif de 80 caractères au plus SHALL pouvoir être saisi avant la création. L'animateur SHALL arriver sur la vue animateur, qui affiche le code en grand, l'adresse à ouvrir et un QR code menant directement à la vue participant de la salle.

#### Scenario: ROTI créé avec un titre
- **GIVEN** l'accueil
- **WHEN** l'animateur saisit « Sprint Review » et clique sur « Créer un ROTI »
- **THEN** une salle est créée, la vue animateur affiche « Sprint Review », le code, l'adresse et le QR code, et 0 vote

#### Scenario: Titre trop long
- **GIVEN** l'accueil
- **WHEN** l'animateur saisit un titre de plus de 80 caractères
- **THEN** le champ n'accepte pas plus de 80 caractères

### Requirement: Rejoindre un ROTI
Un participant SHALL rejoindre la salle en scannant le QR code, en ouvrant l'adresse `?salle=CODE`, ou en saisissant le code à l'accueil (majuscules et espaces ignorés). Aucun compte ni prénom n'est demandé. Un code invalide ou inconnu SHALL être signalé.

#### Scenario: Code inconnu
- **GIVEN** l'accueil
- **WHEN** un participant saisit un code qui ne correspond à aucune salle
- **THEN** il voit « Aucun ROTI avec ce code. »

#### Scenario: Code mal saisi
- **GIVEN** l'accueil
- **WHEN** un participant saisit « ab »
- **THEN** il voit « Le code fait 4 lettres. »

### Requirement: Vue animateur réservée
La vue animateur (`?animer=CODE`) SHALL n'être affichée qu'au navigateur qui a créé la salle. Un autre navigateur qui ouvre cette adresse SHALL être redirigé vers la vue participant de la salle.

#### Scenario: Lien animateur partagé par erreur
- **GIVEN** une salle créée sur l'ordinateur de l'animateur
- **WHEN** un participant ouvre l'adresse `?animer=CODE` sur son téléphone
- **THEN** il arrive sur la vue participant

### Requirement: Présence
La vue animateur SHALL afficher en temps réel le nombre de participants connectés à la salle (un navigateur compte une fois, quel que soit le nombre d'onglets) ; un participant qui ferme la page ou perd le réseau SHALL cesser d'être compté.

#### Scenario: Participant qui part
- **GIVEN** 3 participants connectés
- **WHEN** l'un d'eux ferme son onglet
- **THEN** la vue animateur affiche 2 participants connectés

### Requirement: Mes ROTI
L'accueil SHALL lister les ROTI créés dans ce navigateur, du plus récent au plus ancien, avec leur titre (ou « ROTI sans titre »), leur date, leur nombre de votes et leur état (« Votes ouverts » ou « Révélé »). Chaque ROTI SHALL pouvoir être rouvert (vue animateur) ou supprimé après confirmation. Un ROTI qui n'existe plus SHALL disparaître de la liste. La liste SHALL indiquer qu'elle est propre à ce navigateur.

#### Scenario: Rouvrir un ROTI d'hier
- **GIVEN** un ROTI créé hier dans ce navigateur, révélé avec 6 votes
- **WHEN** l'animateur ouvre l'accueil puis clique sur « Ouvrir »
- **THEN** il retrouve la vue animateur avec la moyenne, la répartition et les commentaires

#### Scenario: Supprimer un ROTI
- **GIVEN** un ROTI dans la liste
- **WHEN** l'animateur clique sur « Supprimer » et confirme
- **THEN** la salle est effacée de la base, disparaît de la liste, et un participant qui ouvre son lien voit « Aucun ROTI avec ce code. »

### Requirement: Purge après 30 jours
Les salles SHALL être supprimées 30 jours après leur création : n'importe quel navigateur SHALL pouvoir supprimer une salle expirée, et la création d'un ROTI SHALL supprimer les salles expirées. Avant 30 jours, seul l'animateur SHALL pouvoir supprimer sa salle.

#### Scenario: Salle de 31 jours
- **GIVEN** une salle créée il y a 31 jours
- **WHEN** un animateur crée un nouveau ROTI
- **THEN** l'ancienne salle et la réservation de son code sont supprimées
