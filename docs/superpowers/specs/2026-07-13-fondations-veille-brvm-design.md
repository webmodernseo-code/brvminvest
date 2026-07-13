# Fondations + Veille.BRVM — Design

Date : 2026-07-13

## Contexte

Le projet "Investir à la BRVM" a 3 modules : Veille.BRVM, DiviAlerte, Gestia.BRVM, reliés par un dashboard. Le concept, la palette (monochrome façon Nike) et un premier wireframe (5 écrans) sont déjà validés (voir `README.md` et `Wireframe app BRVM/`).

Le projet est trop large pour un seul spec/plan : les 3 modules sont des sous-systèmes largement indépendants. Ce document couvre uniquement :
1. Les **fondations techniques** communes à toute l'app (setup Next.js, design system, auth, dashboard shell)
2. Le module **Veille.BRVM** (scraping automatisé d'articles/vidéos, feed, favoris, notification email)

DiviAlerte et Gestia.BRVM feront l'objet de specs séparés, construits après ce premier périmètre.

## 1. Architecture globale

**Stack** : Next.js 14 (App Router) + TypeScript + Tailwind CSS + Supabase (DB/Auth), conforme au `README.md`.

**Accès** :
- **Dashboard** (accueil) : public. Les cartes DiviAlerte/Gestia affichent un CTA "Se connecter" / "Créer un compte" tant qu'il n'y a pas de session ; la carte Veille est toujours active.
- **Veille.BRVM** : 100% public en lecture (articles, vidéos, inscription email). L'onglet Favoris nécessite une connexion.
- **DiviAlerte / Gestia.BRVM** : protégés par Supabase Auth. Ce spec pose uniquement le mécanisme signup/login/route-guard ; le contenu métier de ces 2 modules sera défini dans leurs specs dédiés.

**Compte utilisateur** : un seul système de compte pour toute l'app (pas de compte séparé par module). Signup demande **nom, prénom, email, mot de passe**. Ce même compte sert à débloquer DiviAlerte/Gestia ET à activer les favoris Veille.

**Nouveaux services externes** :
| Service | Usage | Coût |
|---|---|---|
| Firecrawl | Scraping des articles (clé existante) | Gratuit à ce volume (1000 crédits/mois offerts, ~8 scrapes/mois utilisés) |
| YouTube Data API v3 | Recherche de vidéos (clé existante) | Gratuit (10 000 unités/jour offertes en permanence) |
| Resend | Envoi des notifications email (à configurer) | Gratuit à ce volume (3000 emails/mois offerts) |
| Vercel Cron | Déclenchement du pipeline de scraping | Gratuit (plan Hobby, cadence min. 1x/jour, notre usage ne dépasse jamais ce seuil) |

Aucun service payant n'est requis pour lancer ce périmètre.

## 2. Modèle de données (Supabase)

**`profiles`** — compte unique app-wide
- `id` (uuid, FK vers `auth.users`), `nom`, `prenom`, `email`, `created_at`

**`veille_articles`**
- `id`, `title`, `excerpt` (extrait/meta-description issu du scraping Firecrawl, sans reformulation IA), `source_name` (Sika Finance / Financial Afrik / RichBourse / BRVM.org), `source_url` (unique), `published_at`, `scraped_at`, `sent_at` (nullable)

**`veille_videos`**
- `id`, `title`, `youtube_url`, `youtube_video_id` (unique), `channel_name`, `published_at`, `scraped_at`, `sent_at` (nullable)

**`veille_youtube_channels`** — liste curatée de chaînes à surveiller, éditable sans redéploiement
- `id`, `channel_name` (ex: Sikarium), `channel_id`, `active`

**`veille_subscribers`** — inscription aux notifications email, sans compte requis
- `id`, `email`, `subscribed_at`, `unsubscribed_at` (nullable)

**`veille_favorites`** — table de liaison, nécessite un compte
- `id`, `profile_id` (FK `profiles.id`), `content_type` (`article` | `video`), `content_id`, `created_at`
- Contrainte unique sur `(profile_id, content_type, content_id)`

## 3. Pipeline de scraping

**Déclenchement** : Vercel Cron, 4 jobs/semaine, chacun appelle une route API protégée par un secret (`CRON_SECRET` en header) :
- Lundi & Jeudi 8h → `/api/cron/veille-articles`
- Mardi & Vendredi 8h → `/api/cron/veille-videos`

**Flow articles (Lun/Jeu)** :
1. Firecrawl scrape la page "actualités" de chaque source (Sika Finance, Financial Afrik, RichBourse, BRVM.org) → extrait liens, titres, dates candidats. Chaque source est isolée dans son propre `try/catch` : l'échec d'une source ne bloque pas les autres.
2. Filtre : on écarte tout article dont le `source_url` existe déjà dans `veille_articles`.
3. Sélection : parmi les candidats restants, on prend le plus récent toutes sources confondues (pas de rotation forcée par source).
4. Firecrawl scrape la page complète de l'article retenu pour en extraire titre + extrait/meta-description.
5. Insertion dans `veille_articles` (`sent_at = null`).
6. Déclenche l'envoi email (section 5) à `veille_subscribers`, puis `sent_at = now()`.

**Flow vidéos (Mar/Ven)** : identique mais via YouTube Data API (`search.list` par `channel_id` des chaînes actives de `veille_youtube_channels`, trié par date) ; dédoublonnage par `youtube_video_id`.

**Cas "rien de nouveau"** : si aucun candidat inédit n'est trouvé, le job se termine sans erreur et sans email ; le prochain cycle programmé retentera. Simple log, pas d'alerte critique.

**Idempotence** : les contraintes uniques (`source_url`, `youtube_video_id`) empêchent un double déclenchement du cron d'insérer deux fois le même contenu.

**Quota YouTube dépassé** : log l'erreur, aucune vidéo publiée ce jour, retry le lendemain programmé.

## 4. UI Veille.BRVM

**Structure de page** (mobile-first, cohérente avec le wireframe 1a) :
- Header "Veille.BRVM"
- 3 onglets : `Articles` · `Vidéos` · `Favoris`
- Liste de cartes : titre, extrait, source/chaîne, date, badge "Nouveau" si publié il y a < 48h

**Carte article/vidéo** :
- Icône favori (étoile) sur chaque carte.
  - Non connecté : clic ouvre le flow signup/login, avec retour vers le contenu après connexion.
  - Connecté : toggle instantané dans `veille_favorites`, sans rechargement de page (mise à jour optimiste).
- Carte vidéo : lecture **inline** via iframe YouTube (pas de redirection externe).

**Onglet Favoris** :
- Non connecté : état vide + CTA "Se connecter pour voir vos favoris".
- Connecté : liste des articles + vidéos favorisés, triés par date d'ajout, retrait possible directement.

**Inscription email** : champ email + bouton "S'abonner aux actus BRVM" (sans compte requis) → insertion dans `veille_subscribers`, confirmation visuelle. Chaque email envoyé inclut un lien de désabonnement.

## 5. Notification email (Resend)

**Déclenchement** : à la fin du cron, juste après l'insertion réussie d'un article ou d'une vidéo.

**Destinataires** : tous les `veille_subscribers` avec `unsubscribed_at IS NULL`, en envoi batch (pas de boucle bloquante appel par appel).

**Contenu** (template React Email, cohérent avec le design system monochrome) :
- Objet : "Nouvel article Veille.BRVM : [titre]" ou "Nouvelle vidéo Veille.BRVM : [titre]"
- Corps : titre + extrait (ou miniature pour vidéo) + bouton "Lire sur l'app"
- Pied de page obligatoire : lien de désabonnement signé par token (`/veille/unsubscribe?token=...`, sans connexion requise)

**Échec d'envoi** : le contenu reste publié dans le feed même si Resend échoue (`sent_at` reste `null`) ; un retry est retenté au prochain cron pour les entrées non envoyées. L'échec d'email ne bloque jamais la publication.

## 6. Fondations techniques

**Setup projet** :
- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Port des tokens du design system (`Wireframe app BRVM/_ds/.../tokens/*.css`) tels quels
- Composants UI de base recréés en React à partir du wireframe : `Card`, `Badge`, `Button`, `Input`, `Tag`, `Icon` (Lucide React)
- Supabase : client configuré (browser + server/route handlers via `@supabase/ssr`)

**Auth (signup/login)** :
- `/signup` : nom, prénom, email, mot de passe → `supabase.auth.signUp` + insertion dans `profiles`
- `/login` : email, mot de passe → `supabase.auth.signInWithPassword`
- Middleware Next.js pour route-guard : redirige vers `/login` si session absente sur les routes DiviAlerte/Gestia (Veille et Dashboard restent publics)
- Erreur signup email déjà utilisé → message clair. Erreur login → message générique (pas d'indice email vs mot de passe, pour la sécurité).

**Dashboard shell** :
- Layout avec nav (bottom nav mobile / topbar desktop, cf. wireframe 1e)
- 3 cartes menant aux modules ; cartes DiviAlerte/Gestia avec CTA connexion si pas de session (contenu réel différé aux specs dédiés) ; carte Veille toujours active

**Variables d'environnement** : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `FIRECRAWL_API_KEY`, `YOUTUBE_API_KEY`, `RESEND_API_KEY`, `CRON_SECRET`

## 7. Gestion d'erreurs & tests

**Erreurs pipeline** : voir section 3 (isolation par source, retry naturel au cycle suivant, quota YouTube géré par log + retry lendemain).

**Erreurs UI Veille** :
- Toggle favori en échec réseau → rollback visuel optimiste + message d'erreur discret
- Inscription email déjà abonné → message "Vous êtes déjà abonné" plutôt qu'une erreur

**Tests** (logique métier, pas pixel-perfect UI) :
- Unitaires : dédoublonnage articles/vidéos, filtrage "déjà connu", sélection "plus récent candidat"
- Unitaires : logique toggle favori (idempotence, contrainte unique)
- Intégration : route cron (mock Firecrawl/YouTube) → insertion Supabase + déclenchement email
- Intégration : signup/login/middleware route-guard
- E2E léger (Playwright, optionnel à ce stade) : "je m'abonne par email", "je me connecte puis favorise un article"

## Hors périmètre (specs futurs)

- Contenu métier de DiviAlerte (tableau des dividendes, calcul de compte à rebours, alertes WhatsApp)
- Contenu métier de Gestia.BRVM (CRUD portefeuille, calcul des frais réels, thèse d'investissement)
- Vue détail d'une action, versions desktop de DiviAlerte/Gestia
