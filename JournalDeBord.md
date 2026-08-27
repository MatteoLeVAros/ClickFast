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

 ### PARTIE 2

### Phase 3 : mesure du cache npm

| Mesure | Avant cache | Après cache | Écart |
|---|---:|---:|---:|
| Durée totale du workflow | 1 min 2 s | 1 min 4 s | +2 s |
| Durée du job de tests | 16 s | 13 s | -3 s |
| Taille compressée de l’image publiée | 21,97 MB | 21,97 MB | 0 MB |

Détail du run avant cache :

- lint : 17 secondes ;
- tests Jest : 16 secondes ;
- build et publication Docker : 20 secondes ;
- taille compressée de l’image Docker : 21,97 MB.

Détail du run après cache :

- lint : 14 secondes ;
- tests Jest : 13 secondes ;
- build et publication Docker : 30 secondes ;
- taille compressée de l’image Docker : 21,97 MB.

Le cache npm a été correctement restauré, comme l’indiquent les messages
`Cache hit` et `Cache restored successfully`.

Le job de lint a gagné 3 secondes et le job de tests a également gagné
3 secondes. La durée totale a cependant augmenté de 2 secondes, principalement
parce que le job de build et de publication Docker est passé de 20 à
30 secondes.

La taille de l’image reste identique, car le cache npm accélère l’installation
des dépendances dans la pipeline sans modifier le contenu de l’image Docker.

### Phase 4 : audit des dépendances et recherche de secrets

Un job `security-deps` a été ajouté à la pipeline. Il exécute :

- `npm audit --audit-level=high` pour détecter les vulnérabilités HIGH et
  CRITICAL ;
- Gitleaks pour rechercher des secrets dans l’ensemble de l’historique Git.

Le job de sécurité s’exécute en parallèle du lint. Le job de publication attend
désormais la réussite des tests et du contrôle de sécurité.

Résultats observés :

- durée du lint : 8 secondes ;
- durée du contrôle de sécurité : 18 secondes ;
- durée des tests Jest : 11 secondes ;
- durée totale du workflow : 25 secondes ;
- vulnérabilité bloquante détectée : non ;
- secret détecté par Gitleaks : non ;
- statut final : succès.

Le job de publication Docker a été ignoré, car le workflow s’est exécuté sur la
branche `ci-cd-partie-2`. La publication reste limitée à `master`.

### Phase 5 : scan de l’image avec Trivy

Le job `security-image` dépend du job `build-and-push`. Il analyse donc
l’image publiée avec le SHA du commit comme tag.

Lors du premier scan, Trivy a détecté :

- 2 vulnérabilités HIGH ;
- 0 vulnérabilité CRITICAL.

Les vulnérabilités concernaient les paquets `libcrypto3` et `libssl3`. La
version installée était `3.5.7-r0` et la version corrigée indiquée était
`3.5.8-r0`.

Le job Trivy s’est terminé en erreur, avec le code de sortie 1. Cette exécution
rouge a confirmé que la pipeline bloquait correctement une image contenant une
vulnérabilité de gravité HIGH.


### Phase 6 : génération du SBOM

Un job `generate-sbom` a été ajouté après le job `build-and-push`.

Le SBOM est généré avec Syft à partir de l’image réellement publiée et
identifiée par le SHA du commit.

Le format utilisé est CycloneDX JSON. Le fichier produit est :

clickfast-sbom.cdx.json

### Phase 7 : résumé centralisé de la sécurité

Un job `security-summary` a été ajouté à la fin de la pipeline.

Le job dépend :

- de l’audit npm et de Gitleaks ;
- du build et de la publication Docker ;
- du scan Trivy ;
- de la génération du SBOM CycloneDX.

La condition `if: always()` garantit que le résumé s’exécute même lorsqu’un
contrôle échoue ou est ignoré.

Le résumé est écrit dans `$GITHUB_STEP_SUMMARY`. Il permet de consulter l’état
global de la sécurité sans ouvrir séparément les logs de chaque scanner.

Résultats du run sur `master` :

- lint : succès, 13 secondes ;
- audit npm et Gitleaks : succès, 10 secondes ;
- tests Jest : succès, 11 secondes ;
- build et publication Docker : succès, 25 secondes ;
- génération du SBOM : succès, 14 secondes ;
- scan Trivy : succès, 8 secondes ;
- résumé de sécurité : succès, 3 secondes ;
- durée totale : 1 minute 20 secondes ;
- nombre d’artefacts : 3.

Le résumé final indique que les contrôles de sécurité, la publication de
l’image et la génération du SBOM ont tous réussi.

### Phase 8 : validation humaine avant publication

Un environnement GitHub nommé `production` a été créé avec une validation
obligatoire avant publication.

Le job `build-and-push` a été associé à cet environnement avec :

```yaml
environment: production
```

### Phase 9 : séparation des workflows

Le workflow unique a été remplacé par deux fichiers distincts :

- `verify.yml`, déclenché uniquement lors d’une Pull Request vers `master` ;
- `release.yml`, déclenché uniquement lors d’un push vers `master`.

Lors de la Pull Request, seul le workflow `Verification` s’est exécuté. Il a
lancé le lint, les tests Jest et les contrôles de sécurité. Aucune image Docker
n’a été publiée.

Après la fusion, seul le workflow `Publication` s’est exécuté. La publication
s’est arrêtée avant le job `build-and-push` afin de demander une validation
humaine pour l’environnement `production`.

Après approbation, la pipeline a repris et a exécuté :

- le build et la publication de l’image Docker ;
- le scan Trivy ;
- la génération du SBOM CycloneDX ;
- le résumé de sécurité.

Résultats :

- vérification déclenchée sur la Pull Request : oui ;
- publication déclenchée sur la Pull Request : non ;
- publication déclenchée après fusion sur `master` : oui ;
- vérification déclenchée après fusion sur `master` : non ;
- validation humaine demandée : oui ;
- statut final du workflow de publication : succès.

### Phase 10 : pipeline volontairement cassée puis réparée

Une branche dédiée nommée `test/phase-10-pipeline-rouge` a été créée.

Une assertion Jest a été volontairement modifiée pour attendre une valeur
incorrecte.

Lors de la Pull Request vers `master` :

- le lint a réussi ;
- le contrôle des dépendances et des secrets a réussi ;
- les tests Jest ont échoué ;
- le job `Verification terminee` a échoué ;
- le workflow `Publication` ne s’est pas déclenché.

La Pull Request a été fusionnée volontairement malgré l’échec de la
vérification.

Le workflow `Publication` déclenché sur `master` a échoué au niveau des tests
Jest. Le job de build et de publication n’a pas été exécuté. Aucune image
Docker défectueuse n’a donc été publiée.

Ce comportement démontre le principe de fail fast : une erreur détectée dans
les tests empêche les étapes suivantes de s’exécuter inutilement.

L’assertion Jest a ensuite été rétablie dans le commit `941f136`.

Après la correction, la pipeline complète est repassée au vert :

- lint : succès en 8 secondes ;
- contrôle des dépendances et des secrets : succès en 16 secondes ;
- tests Jest : succès en 15 secondes ;
- build et publication Docker : succès en 31 secondes ;
- génération du SBOM CycloneDX : succès en 8 secondes ;
- scan Trivy : succès en 1 minute 17 secondes ;
- résumé de sécurité : succès en 4 secondes ;
- durée totale : 2 minutes 43 secondes ;
- nombre d’artefacts : 3.

L’ancienne image Docker est restée disponible pendant l’incident. Aucun nouvel
artefact n’a été publié tant que les tests étaient en échec.

La protection recommandée consiste à rendre le check
`Verification terminee` obligatoire avant toute fusion vers `master`.

- début de l’incident : 27 août 2026 à 18:01:14 ;
- fin de l’incident : 27 août 2026 à 18:07:14 ;
- temps de rétablissement : 6 minutes ;
- ancienne image Docker restée disponible : oui ;
- nouvel artefact publié pendant la panne : non ;
- pipeline redevenue entièrement verte : oui.