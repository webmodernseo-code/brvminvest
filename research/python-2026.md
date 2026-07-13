# Cas d'usage de Python en production en 2026

Python, en 2026, a dépassé son image de « langage de script ». L'écosystème s'est structuré en couches bien distinctes (ingestion de données, calcul, orchestration IA, API, infrastructure), chacune dominée par des outils spécialisés. FastAPI a dépassé Django en popularité sur les nouveaux projets, Polars s'impose face à Pandas sur les gros volumes, et une nouvelle génération de frameworks d'agents IA (LangGraph, CrewAI, Pydantic AI, SDK vendor OpenAI/Anthropic/Google) structure la production de systèmes IA agentiques. Voici cinq cas d'usage concrets et représentatifs de cet état de l'art.

## 1. Data engineering — pipelines analytiques temps réel avec Polars et DuckDB

**Contexte/domaine**
Construction de pipelines de données pour l'ingestion, la transformation et l'analyse de flux à haut volume (facturation, télémétrie, logs applicatifs). En 2026, la pile type combine Apache Kafka pour le transport d'événements, Polars (basé sur Rust) pour la manipulation de DataFrames en remplacement progressif de Pandas, et DuckDB comme moteur analytique embarqué offrant des performances proches d'un entrepôt de données, le tout orchestré par Apache Airflow.

**Extrait de code représentatif**

```python
import polars as pl
import duckdb

# Lecture paresseuse d'un flux de fichiers Parquet déposés par le producteur Kafka
transactions = pl.scan_parquet("s3://brvm-events/transactions/*.parquet")

daily_volume = (
    transactions
    .filter(pl.col("status") == "executed")
    .group_by(["ticker", pl.col("traded_at").dt.date().alias("day")])
    .agg(
        pl.col("quantity").sum().alias("volume"),
        pl.col("price").mean().alias("prix_moyen"),
    )
    .sort("day")
    .collect(streaming=True)
)

# Requête analytique ad hoc directement sur le résultat, sans base externe
duckdb.sql("""
    SELECT ticker, day, volume
    FROM daily_volume
    WHERE volume > 10000
    ORDER BY volume DESC
""").show()
```

**Avantages**
- Écosystème mature et unifié (Polars, DuckDB, Airflow, PyArrow) qui couvre ingestion, transformation et orchestration sans changer de langage.
- Polars exploite le multi-threading natif et une exécution paresseuse, offrant des gains de 5 à 20x par rapport à Pandas sur de gros volumes tout en gardant une syntaxe Python lisible.
- DuckDB permet des requêtes SQL analytiques embarquées sans infrastructure serveur, idéal pour du prototypage rapide qui part directement en production.
- Interopérabilité native avec le reste de la pile data (Parquet, Arrow, S3, notebooks).

**Inconvénients**
- Pour des volumes dépassant la mémoire d'une seule machine ou nécessitant du calcul distribué massif, Spark/Scala ou des solutions cloud managées restent plus adaptées.
- Le GIL historique de Python limite encore la parallélisation fine côté pur Python (bien que Polars/DuckDB contournent le problème en s'appuyant sur du code natif Rust/C++).
- La coexistence de plusieurs bibliothèques de DataFrames (Pandas historique + Polars) dans une même base de code augmente la dette technique et la charge de migration.
- La latence garbage collector et le typage dynamique restent pénalisants pour du streaming ultra basse latence (sub-milliseconde), où Rust ou Java/Flink sont préférés.

## 2. IA / Agents — systèmes d'agents IA orchestrés en production (LangGraph, Pydantic AI)

**Contexte/domaine**
Déploiement d'agents IA autonomes ou semi-autonomes en production : assistants métier, automatisation de tâches multi-étapes, systèmes multi-agents avec rôles spécialisés (recherche, rédaction, vérification). En 2026, le paysage s'est structuré autour de LangGraph (exécution durable et reprise sur incident), CrewAI (agents à rôles), Pydantic AI (contrats de type stricts façon FastAPI), et les SDK natifs des fournisseurs de modèles (OpenAI Agents SDK, Anthropic Agent SDK, Google ADK).

**Extrait de code représentatif**

```python
from pydantic import BaseModel
from pydantic_ai import Agent

class RapportMarche(BaseModel):
    resume: str
    tickers_a_surveiller: list[str]
    niveau_confiance: float

analyste = Agent(
    "anthropic:claude-sonnet-5",
    output_type=RapportMarche,
    system_prompt=(
        "Tu es un analyste financier. Analyse les données fournies "
        "et produis un rapport structuré et vérifiable."
    ),
)

async def generer_rapport(donnees_marche: str) -> RapportMarche:
    resultat = await analyste.run(donnees_marche)
    if resultat.output.niveau_confiance < 0.6:
        raise ValueError("Confiance insuffisante, escalade vers un humain")
    return resultat.output
```

**Avantages**
- Python reste le langage natif des SDK IA (Anthropic, OpenAI, Google), avec l'accès le plus rapide aux nouvelles fonctionnalités des modèles dès leur sortie.
- Des frameworks comme Pydantic AI apportent une validation de type stricte des sorties de LLM, réduisant les erreurs silencieuses en production.
- LangGraph permet le « durable execution » : reprise après incident, points de contrôle (checkpointing), et boucles d'intervention humaine, essentiels pour des agents en production réelle.
- Écosystème d'outils complémentaires immense (RAG avec LlamaIndex/Haystack, observabilité, évaluation) qui s'intègre nativement.

**Inconvénients**
- Le champ a explosé (plus d'une douzaine de frameworks concurrents en 2026), rendant les choix d'architecture rapidement obsolètes ou nécessitant des migrations (ex. AutoGen mis en maintenance par Microsoft au profit du fork communautaire AG2).
- Le risque de verrouillage fournisseur est réel avec les SDK vendor natifs, qui sacrifient la portabilité pour la rapidité de mise en production.
- Les performances brutes d'exécution (hors appel réseau au LLM) restent limitées par le GIL pour de l'orchestration très concurrente ; les workloads à très haute fréquence s'appuient souvent sur des workers asynchrones ou des files de tâches externes.
- La nature non déterministe des LLM complique les tests classiques et exige des couches de validation/garde-fou supplémentaires (coût de développement et de maintenance accru).

## 3. Backend web — API haute performance avec FastAPI

**Contexte/domaine**
Construction d'API REST/GraphQL asynchrones à forte charge, souvent en façade de modèles d'IA ou de services de données. FastAPI a dépassé Django en téléchargements PyPI en 2026 (environ 9 millions par mois contre 8 pour Django), porté par la génération automatique de documentation OpenAPI, le typage natif et le support asynchrone.

**Extrait de code représentatif**

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import httpx

app = FastAPI(title="API Cours BRVM")

class Cotation(BaseModel):
    ticker: str
    cours: float
    variation_pct: float

@app.get("/cotations/{ticker}", response_model=Cotation)
async def obtenir_cotation(ticker: str) -> Cotation:
    async with httpx.AsyncClient(timeout=2.0) as client:
        try:
            reponse = await client.get(f"https://data-interne/cours/{ticker}")
            reponse.raise_for_status()
        except httpx.HTTPError:
            raise HTTPException(status_code=502, detail="Source de données indisponible")

    donnees = reponse.json()
    return Cotation(**donnees)
```

**Avantages**
- Support asynchrone natif (async/await) permettant de gérer des milliers de connexions I/O-bound concurrentes avec un seul processus.
- Validation automatique des entrées/sorties via Pydantic et documentation interactive générée automatiquement (Swagger/OpenAPI), réduisant fortement le code répétitif.
- Intégration directe avec l'écosystème IA/data Python (modèles ML, pipelines Polars/DuckDB) sans changement de langage entre le backend et la couche data science.
- Grande vitesse de développement et courbe d'apprentissage douce, ce qui accélère le time-to-market.

**Inconvénients**
- Pour du calcul pur CPU-bound à très haute fréquence (traitement d'image temps réel, matching engine ultra basse latence), les performances restent inférieures à Go, Rust ou Java.
- Le GIL limite le parallélisme réel dans un seul processus ; il faut multiplier les workers (Gunicorn/Uvicorn multi-process) pour exploiter plusieurs cœurs, ce qui complique la gestion d'état partagé.
- L'écosystème async (SQLAlchemy async, drivers compatibles) est encore plus jeune et parfois moins stable que ses équivalents synchrones.
- Le typage optionnel de Python, même renforcé par Pydantic, n'offre pas les garanties de sûreté à la compilation d'un langage comme Rust ou TypeScript strict.

## 4. Automatisation / DevOps — Infrastructure as Code et orchestration de déploiements

**Contexte/domaine**
Automatisation des déploiements cloud, gestion d'infrastructure et pratiques MLOps (déploiement, monitoring et retraining des modèles). Des outils comme Pulumi permettent de définir l'infrastructure directement en Python plutôt qu'en DSL déclaratif (Terraform HCL), et des scripts Python orchestrent des pipelines CI/CD, des tâches planifiées et des vérifications de conformité.

**Extrait de code représentatif**

```python
import pulumi
import pulumi_aws as aws

# Définition d'un bucket S3 et d'une fonction Lambda de traitement quotidien
bucket = aws.s3.Bucket(
    "brvm-rapports-quotidiens",
    versioning={"enabled": True},
    lifecycle_rules=[{"enabled": True, "expiration": {"days": 90}}],
)

fonction_traitement = aws.lambda_.Function(
    "traitement-cours-quotidien",
    runtime="python3.13",
    handler="main.gerer_evenement",
    timeout=60,
    memory_size=512,
    environment={"variables": {"BUCKET_CIBLE": bucket.id}},
)

pulumi.export("bucket_name", bucket.id)
pulumi.export("fonction_arn", fonction_traitement.arn)
```

**Avantages**
- Utiliser le même langage (Python) pour l'infrastructure, les scripts d'automatisation et les applications réduit la charge cognitive des équipes.
- Écosystème riche de SDK cloud officiels (boto3 pour AWS, azure-sdk-for-python, google-cloud) et d'outils MLOps (MLflow, Feast) qui couvrent tout le cycle de vie.
- Expressivité du langage (boucles, conditions, fonctions) permet de générer dynamiquement de l'infrastructure complexe plus facilement qu'avec un DSL déclaratif statique.
- Vaste base de scripts et de connecteurs déjà existants pour l'automatisation de tâches (nettoyage de données, notifications, rapports planifiés).

**Inconvénients**
- Le typage dynamique et les erreurs runtime peuvent introduire des bugs d'infrastructure difficiles à détecter avant l'exécution, contrairement à des outils avec vérification statique plus stricte.
- Les outils historiques comme Terraform (HCL) bénéficient d'un écosystème de modules communautaires plus large et d'un mode de fonctionnement purement déclaratif jugé plus prévisible par certaines équipes SRE.
- La gestion des dépendances Python (versions, environnements virtuels) ajoute une couche de complexité opérationnelle par rapport à des binaires statiques auto-suffisants (Go).
- Les scripts d'automatisation Python mal maintenus (dette technique, absence de tests) deviennent vite un point de fragilité critique dans les chaînes de déploiement.

## 5. Calcul scientifique et bioinformatique — traitement de données expérimentales avec SciPy et BioPython

**Contexte/domaine**
Recherche académique et industrielle (pharma, santé, climat, finance quantitative) où Python sert de couche de calcul, d'analyse statistique et de visualisation. Les modèles de diagnostic médical sont entraînés avec PyTorch et déployés via FastAPI ; les workflows bioinformatiques s'appuient sur BioPython et SciPy ; les pipelines de données cliniques utilisent Polars et DuckDB pour un traitement rapide des dossiers patients.

**Extrait de code représentatif**

```python
import numpy as np
from scipy import stats
from Bio import SeqIO

# Analyse statistique d'un essai clinique : comparaison de deux groupes
groupe_traite = np.array([12.4, 15.1, 13.8, 16.2, 14.9])
groupe_controle = np.array([9.8, 10.5, 11.1, 9.9, 10.7])

t_stat, p_value = stats.ttest_ind(groupe_traite, groupe_controle, equal_var=False)
print(f"t = {t_stat:.3f}, p = {p_value:.4f}")

# Parcours d'un fichier FASTA pour calculer la teneur en GC des séquences
for enregistrement in SeqIO.parse("sequences.fasta", "fasta"):
    sequence = enregistrement.seq
    gc_pct = 100 * (sequence.count("G") + sequence.count("C")) / len(sequence)
    print(f"{enregistrement.id}: GC = {gc_pct:.1f}%")
```

**Avantages**
- Bibliothèques scientifiques matures et éprouvées (NumPy, SciPy, BioPython, Pandas/Polars) qui constituent la référence de facto dans la recherche depuis plus d'une décennie.
- Syntaxe lisible qui rapproche le code du langage mathématique/scientifique, facilitant la collaboration entre chercheurs non-développeurs et ingénieurs.
- Interopérabilité immédiate avec les notebooks (Jupyter) pour l'exploration interactive, la visualisation (Matplotlib, Plotly) et la publication reproductible.
- Passerelle naturelle vers le déploiement en production via FastAPI ou des pipelines Polars/DuckDB, sans réécriture dans un autre langage.

**Inconvénients**
- Les calculs numériques intensifs en pur Python restent lents ; il faut déléguer aux couches C/Fortran/Rust sous-jacentes (NumPy, SciPy) ou à des accélérateurs (CUDA, Numba), sous peine de goulots d'étranglement.
- La reproductibilité des environnements scientifiques (versions de bibliothèques, dépendances natives) est notoirement fragile, nécessitant des outils supplémentaires (conda, Docker) pour garantir la portabilité.
- Pour des simulations HPC à très grande échelle (calcul climatique, physique des particules), des langages compilés comme Fortran, C++ ou Julia restent privilégiés pour la performance brute.
- La gestion mémoire moins fine qu'en C/C++ peut poser problème sur des jeux de données scientifiques massifs qui dépassent la RAM disponible.
