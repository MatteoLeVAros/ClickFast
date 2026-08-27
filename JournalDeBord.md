## Étape 4 : réseau Docker isolé

### Création du réseau

Commande utilisée :

docker network create clickfast-network

Nom retenu :

clickfast-network

### Communication entre l'API et PostgreSQL

Les conteneurs clickfast-api et clickfast-db sont connectés au réseau
clickfast-network

# Journal de bord, étape 6 : Docker Compose

## Objectif

L’objectif de cette étape était de réunir l’ensemble de l’application ClickFast
dans un seul fichier Docker Compose.

La stack contient quatre services :

- `game` : le jeu servi par Nginx ;
- `api` : l’API Express chargée d’enregistrer et de lire les scores ;
- `postgres` : la base de données ;
- `adminer` : l’interface web permettant de consulter la base.

Toute la stack peut désormais être construite et démarrée avec une seule
commande :

```bash
docker compose up -d --build
```
## Réseau et stockage

Les quatre services utilisent le réseau Docker personnalisé
`clickfast-network`.

Le volume nommé `clickfast-postgres-data` permet de conserver les scores après
le redémarrage ou la recréation du conteneur PostgreSQL.

PostgreSQL ne publie pas son port 5432 vers l’hôte.

## Healthcheck

PostgreSQL utilise un healthcheck avec `pg_isready`.

L’API attend que PostgreSQL passe à l’état `healthy` avant de démarrer.

Temps nécessaire pour passer à l’état `healthy` : PostgreSQL est Healthy après 11 secondes

## Accès aux services

- Jeu : `http://localhost:8080`
- API : `http://localhost:3000`
- Adminer : `http://localhost:8081`
- Serveur PostgreSQL utilisé dans Adminer : `postgres`

Le jeu fonctionne complètement : le score est envoyé à l’API, enregistré dans
PostgreSQL puis affiché dans le classement.

## Tests de panne

Lorsque `POSTGRES_PASSWORD` est retiré du fichier `.env`, Docker Compose refuse
le démarrage car cette variable est obligatoire.

Lorsque PostgreSQL est arrêté, l’API renvoie une erreur HTTP 503. Le jeu reste
utilisable et affiche que le score n’a pas pu être enregistré.

Après le redémarrage de PostgreSQL, L’API a retrouvé automatiquement PostgreSQL.
Un redémarrage de l’API n'ai pas nécessaire.

## Ajustements réalisés

Les anciens conteneurs créés manuellement ont été remplacés par les services
Compose suivants :

- `game`
- `api`
- `postgres`
- `adminer`

Les variables suivantes ont été ajoutées dans `.env.example` :

```env
GAME_PORT=8080
API_PORT=3000
ADMINER_PORT=8081
DB_HOST=postgres
```

Les statistiques retournées par `stats-api` ont été comparées avec une requête
SQL exécutée directement dans PostgreSQL.

Les deux résultats correspondent :

- parties jouées : 11 ;
- joueurs distincts : 4 ;
- meilleur score : 52.

## Étape 8 : publication dans un registry

Les trois images personnalisées ont été publiées sur Docker Hub avec le tag
explicite `1.0.0` :

- `lecohier/clickfast-game:1.0.0`
- `lecohier/clickfast-api:1.0.0`
- `lecohier/clickfast-stats-api:1.0.0`

Un fichier `docker-compose.prod.yml` a été créé. Il ne contient aucune section
`build:` et utilise uniquement les images publiées.

Le déploiement a été testé dans un dossier indépendant contenant uniquement :

- `.env`
- `docker-compose.prod.yml`

Les cinq services ont démarré correctement. PostgreSQL est passé à l’état
`healthy` et n’a publié aucun port vers l’hôte.

Les tests ont donné les résultats suivants :

- l’API Node répond avec une base connectée ;
- l’API Python répond `{"status":"ok"}` ;
- sur la base vide, les statistiques étaient de 0 partie, 0 joueur et 0
  comme meilleur score ;
- après une partie, les statistiques étaient de 1 partie, 1 joueur et un
  meilleur score de 40.

Les commandes `docker history` et `docker image inspect` n’ont fait apparaître
aucun secret, mot de passe, token ou contenu du fichier `.env`.

## Étape 9 : mesures et optimisations

### Mesures avant optimisation

| Image | Taille | Couches, poids maximal | Build froid | Build chaud | Première réponse HTTP |
|---|---:|---:|---:|---:|---:|
| clickfast-game | 51,47 MB | 11 couches, 41,2 MB max | 2,21 s | 2,10 s | 7,16 s |
| clickfast-api | 159,72 MB | 8 couches, 151 MB max | 6,18 s | 1,88 s | 7,16 s |
| clickfast-stats-api | 142,61 MB | 8 couches, 78,6 MB max | 6,40 s | 0,85 s | 7,59 s |

### Mesures après optimisation

| Image | Taille | Couches, poids maximal | Build froid | Build chaud | Première réponse HTTP |
|---|---:|---:|---:|---:|---:|
| clickfast-game | 51,47 MB | 11 couches, 41,2 MB max | 2,37 s | 1,57 s | 6,94 s |
| clickfast-api | 159,72 MB | 8 couches, 151 MB max | 4,03 s | 1,50 s | 6,72 s |
| clickfast-stats-api | 134,92 MB | 7 couches, 78,6 MB max | 6,72 s | 0,70 s | 7,79 s |

### Bilan des optimisations

L’image du jeu n’a pas été modifiée. Elle utilise déjà une image Nginx
non privilégiée basée sur Alpine et ne contient que les trois fichiers
statiques nécessaires.

Pour l’API Node.js, `npm ci` suivi de `npm prune --omit=dev` a été remplacé
par `npm ci --omit=dev`. Les dépendances de développement ne sont donc plus
installées pendant le build.

La taille de l’image Node reste identique, car l’ancien stage final ne
contenait déjà que les dépendances de production. En revanche, le build froid
est passé de 6,18 à 4,03 secondes.

Pour `stats-api`, le cache pip et la création des fichiers bytecode ont été
désactivés. `COPY --chown` attribue directement le fichier Python à
l’utilisateur non privilégié.

La taille de `stats-api` est passée de 142,61 à 134,92 MB, soit une réduction
de 7,69 MB. Le nombre de couches non vides est passé de 8 à 7.

Le build froid de `stats-api` est passé de 6,40 à 6,72 secondes. Cette légère
augmentation est une petite régression de temps, mais elle est compensée par
une réduction de 5,4 % de la taille et par un build chaud plus rapide.

Les temps de première réponse HTTP restent proches des valeurs initiales.
Aucune régression importante du temps de démarrage n’a été observée.

### Coût estimé de la pipeline

Avant optimisation, le build à froid des trois images prenait :

```text
2,21 + 6,18 + 6,40 = 14,79 secondes

### Étape 10 : test de recette complet

Le test a été réalisé dans un dossier neuf contenant uniquement :

- `docker-compose.prod.yml` ;
- un fichier `.env` reconstruit depuis `.env.example`.

Les images applicatives versionnées `1.1.0` ont été téléchargées depuis Docker
Hub. Aucun code source ni Dockerfile n’était présent dans le dossier de
recette.

Une partie complète a été jouée. Le score a été enregistré et le classement
a été actualisé.

### Validation des données

Une requête sans nom d’utilisateur a été refusée avec le statut HTTP 400 :

```json
{
  "error": "invalid_username",
  "message": "Le nom doit contenir entre 1 et 50 caractères."
}