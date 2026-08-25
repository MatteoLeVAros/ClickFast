## Étape 4 : réseau Docker isolé

### Création du réseau

Commande utilisée :

docker network create clickfast-network

Nom retenu :

clickfast-network

### Communication entre l'API et PostgreSQL

Les conteneurs clickfast-api et clickfast-db sont connectés au réseau
clickfast-network