# DiviAlerte — Design

Date : 2026-07-15

## Contexte

DiviAlerte est le deuxième des 3 modules de l'app "Investir à la BRVM" (après Veille.BRVM, déjà livré). C'est aujourd'hui une page vide ("DiviAlerte — à construire dans son propre spec."). Le spec fondations (`2026-07-13-fondations-veille-brvm-design.md`) prévoyait déjà pour ce module : "tableau des dividendes, calcul de compte à rebours, alertes WhatsApp" — ce document précise et ajuste ce périmètre.

**But :** permettre à un utilisateur connecté de suivre les dividendes des sociétés cotées à la BRVM qui l'intéressent, et d'être alerté par email avant la date limite pour en profiter (date de détachement).

## 1. Vue d'ensemble

- Le calendrier complet des dividendes (~47 sociétés BRVM) est visible publiquement sur `/divialerte`, avec compte à rebours avant chaque date de détachement.
- Un utilisateur connecté peut suivre une société individuellement (watchlist personnelle), comme le système de favoris de Veille.
- Deux alertes email sont envoyées par société suivie : à J-3 et à J-1 avant la date de détachement.
- Les données sont alimentées par scraping automatisé de deux sources croisées (Sika Finance + RichBourse), pas de saisie manuelle.
- Chaque dividende affiche aussi son **montant net après IRVM** (impôt sur le revenu des valeurs mobilières, prélevé à la source selon le pays de la société), en plus du montant brut habituellement affiché ailleurs.

**Accès :** page publique en lecture (calendrier). Le suivi (watchlist + alertes) nécessite le compte utilisateur existant (même mécanisme signup/login que le reste de l'app).

## 2. Sources de données

Vérifiées le 2026-07-15 :

| Source | URL | Format | Verdict |
|---|---|---|---|
| Sika Finance | `sikafinance.com/marches/dividendes` | Tableau HTML : date détachement, nom (lien vers `cotation_<TICKER>.<place>`), montant, rendement | Retenue |
| RichBourse | `richbourse.com/common/dividende/index` | Tableau HTML paginé : société, montant, rendement, date détachement, date paiement | Retenue — source la plus complète (a les 2 dates) |
| BRVM.org (officiel) | `brvm.org/fr/calendrier-de-paiement-de-dividendes-12` | PDF publié ~1x/an | Écartée — pas exploitable pour un scraping régulier |
| Dabafinance | — | Pas de calendrier structuré, seulement des articles d'analyse | Écartée |

Les liens Sika Finance suivent le format `cotation_<TICKER>.<pays>` (ex: `cotation_BICB.bj`) — le suffixe à 2 lettres est le code pays UEMOA de la société (`.ci`, `.sn`, `.bf`, `.ml`, `.bj`, `.tg`, `.ne`, `.gw`). Ce suffixe est capturé en même temps que le ticker et sert à déterminer le taux d'IRVM applicable (section 3bis). RichBourse n'expose pas ce code dans ses liens.

## 3. Modèle de données (Supabase)

**`divialerte_companies`** — table pivot des sociétés, alimentée automatiquement (pas de seed manuel)
- `id` (uuid, pk), `name` (nom canonique, tel que vu en premier), `ticker` (nullable, extrait de l'URL source quand disponible, ex: `BICB`), `country` (nullable, code pays à 2 lettres extrait de l'URL Sika, ex: `bj`), `created_at`

**`divialerte_dividends`** — un enregistrement par société et par exercice
- `id`, `company_id` (FK), `exercice_year` (int, dérivé de `date_detachement` ou de l'année de scraping si date encore inconnue), `montant` (numeric), `rendement` (numeric, nullable), `date_detachement` (date, nullable si "à préciser"), `date_paiement` (date, nullable), `updated_at`
- Contrainte unique `(company_id, exercice_year)`

**`divialerte_watchlist`** — équivalent des favoris Veille
- `id`, `profile_id` (FK `profiles.id`), `company_id` (FK), `created_at`
- Contrainte unique `(profile_id, company_id)`

**`divialerte_alerts_sent`** — empêche les doublons d'alerte
- `id`, `profile_id` (FK), `dividend_id` (FK `divialerte_dividends.id`), `alert_type` (`'j3'` | `'j1'`), `sent_at`
- Contrainte unique `(profile_id, dividend_id, alert_type)`

**RLS :** même politique que Veille — lecture publique sur `divialerte_companies`/`divialerte_dividends`, lecture/écriture restreinte au propriétaire sur `divialerte_watchlist` (`auth.uid() = profile_id`). `divialerte_alerts_sent` n'est manipulée que côté serveur (service role), pas de policy utilisateur nécessaire.

## 3bis. Fiscalité — IRVM

L'IRVM (Impôt sur le Revenu des Valeurs Mobilières) est un impôt **national** (pas régional BRVM) prélevé à la source sur les dividendes, avant versement à l'actionnaire. Le taux dépend du pays de la société, pas du pays de résidence de l'investisseur. Vérifié le 2026-07-15 :

| Pays (code) | Taux IRVM dividendes |
|---|---|
| Côte d'Ivoire (`ci`) | 10% |
| Sénégal (`sn`) | 10% |
| Burkina Faso (`bf`) | 12,5% |
| Mali (`ml`) | 7% |
| Bénin (`bj`) | 5% |
| Togo (`tg`) | 3% (taux "personne physique" — retenu par défaut, l'app cible l'investisseur individuel ; le taux "personne morale" est de 7% mais n'est pas modélisé) |

Niger et Guinée-Bissau : taux non trouvé lors de la recherche — traités comme "inconnu" (voir ci-dessous), pas d'invention de chiffre.

**Calcul :** `montant_net = montant_brut × (1 - taux_pays)`. Si le pays de la société est inconnu (`country` null) ou absent du tableau ci-dessus, le montant net n'est pas calculé — l'UI affiche uniquement le brut, sans faire semblant de connaître le taux.

**Trois exceptions ivoiriennes** (FILTISAC, BOLLORÉ, SITAB) appliquent un taux variable d'une année sur l'autre selon leurs comptes consolidés — hors périmètre, elles utilisent le taux CI standard (10%) comme les autres, avec une légère imprécision assumée pour ces 3 sociétés sur ~47.

## 4. Pipeline de scraping + alerte

**Déclenchement :** Vercel Cron quotidien (8h) → `/api/cron/divialerte`, protégée par le header `Bearer ${CRON_SECRET}` (même mécanisme que les crons Veille).

**Étapes :**
1. Scrape Sika Finance et RichBourse, chacun isolé dans son propre `try/catch` (l'échec d'une source ne bloque pas l'autre, comme pour Veille). RichBourse étant paginé, on boucle sur ses pages jusqu'à épuisement.
2. **Rapprochement société :** pour chaque ligne scrapée, on tente un match par `ticker` (extrait de l'URL de la source) sur `divialerte_companies`. Si aucun ticker ou pas de match, on retente par nom normalisé (majuscules, sans accents, trim). Si toujours aucun match : nouvelle ligne insérée dans `divialerte_companies` (avec son `country` si la ligne scrapée en fournit un). Si la société existait déjà sans `country` connu et que la ligne scrapée en fournit un (Sika uniquement), on le renseigne rétroactivement.
3. **Upsert dividende :** dans `divialerte_dividends`, clé `(company_id, exercice_year)`. En cas de conflit entre les deux sources sur `date_detachement`/`date_paiement` : RichBourse prime (il a les deux dates) ; Sika ne comble que les champs laissés vides par RichBourse. `montant`/`rendement` : première source non nulle rencontrée dans l'ordre Sika → RichBourse → conservée si déjà en base.
4. **Détection des alertes :** pour chaque ligne de `divialerte_watchlist`, si le dividende associé a une `date_detachement` non nulle et que `date_detachement - aujourd'hui <= 3 jours` et qu'aucune ligne `(profile_id, dividend_id, 'j3')` n'existe dans `divialerte_alerts_sent` → envoi email + insertion de la ligne. Même logique avec le seuil `<= 1 jour` pour `'j1'`. Le seuil "inférieur ou égal" (plutôt qu'une égalité stricte sur J-3/J-1 exact) rend le système robuste si un cycle de cron a été manqué.

**Cas "rien de nouveau" :** le job se termine sans erreur si aucune ligne scrapée n'a changé ; log simple, pas d'alerte critique (identique à Veille).

**Échec d'envoi email :** l'échec n'empêche pas la mise à jour des données ; la ligne `divialerte_alerts_sent` n'est insérée qu'après un envoi réussi, donc l'alerte sera retentée au cycle suivant tant que le seuil de jours reste valide.

## 5. Notification email

Réutilise le SMTP o2switch déjà configuré pour Veille (`lib/mailer.ts`).

- **Déclencheurs :** J-3 et J-1 avant `date_detachement`, par société suivie.
- **Objet :** "Dividende [Société] dans 3 jours" / "Dividende [Société] demain".
- **Corps :** société, montant brut, **montant net après IRVM** (si le pays est connu), rendement, date de détachement, date de paiement, lien vers `/divialerte`.
- Pas de lien de désabonnement par email individuel ici : le suivi se gère directement via la cloche sur `/divialerte` (retirer une société de la watchlist arrête ses alertes).

## 6. UI `/divialerte`

**Structure de page** (mobile-first, cohérente avec le design system existant) :
- Header "DiviAlerte"
- 2 onglets : `Toutes` (calendrier complet, trié par date de détachement la plus proche) · `Suivies` (watchlist personnelle)
- Carte par société : nom, montant brut, **montant net après IRVM** (si pays connu, sinon rien), rendement, date de détachement, **compte à rebours** ("J-12"), date de paiement, icône cloche pour suivre/ne plus suivre

**Icône cloche :**
- Non connecté : clic ouvre le flow signup/login (retour vers `/divialerte` après connexion, réutilise `redirectMessage`).
- Connecté : toggle instantané dans `divialerte_watchlist`, mise à jour optimiste (même pattern que `FavoriteButton` de Veille).

**Cas particuliers :**
- `date_detachement` encore "à préciser" (nulle) → affiche "Date à préciser" à la place du compte à rebours, pas de calcul de jours.
- Aucun dividende à venir → état vide simple ("Aucun dividende à venir actuellement").
- Onglet "Suivies" sans société suivie et non connecté → CTA "Se connecter pour suivre des dividendes".

## 7. Gestion d'erreurs & tests

**Pipeline :** voir section 4 (isolation par source, retry naturel au cycle suivant pour les alertes en échec).

**UI :** toggle suivi en échec réseau → rollback visuel optimiste + message d'erreur discret (identique à Veille).

**Tests (logique métier uniquement, pas pixel-perfect UI) :**
- Unitaires : rapprochement société par ticker/nom normalisé
- Unitaires : fusion des deux sources selon priorité (RichBourse > Sika pour les dates)
- Unitaires : détermination du déclenchement d'alerte (seuils J-3/J-1, non-doublon)
- Unitaires : calcul du compte à rebours à partir d'une date de détachement
- Unitaires : calcul du montant net après IRVM selon le pays (taux connu, pays inconnu, montant nul)
- Intégration : route cron (mock Firecrawl) → upsert Supabase + email envoyé une fois par seuil, jamais deux fois

## Hors périmètre (v2 éventuelle)

- Alertes WhatsApp (nécessite l'API WhatsApp Business : validation Meta, coût par message, délai de mise en place)
- Ajout/correction manuelle d'une société ou d'un dividende via une page d'administration
- Historique des dividendes passés (le scope actuel ne couvre que les dividendes à venir)
- Taux IRVM précis pour Niger/Guinée-Bissau, et taux variable des 3 exceptions ivoiriennes (FILTISAC, BOLLORÉ, SITAB)
- Calcul de frais plus large pour Gestia (frais de courtage, commissions SGI, etc.) — l'IRVM couvre uniquement la fiscalité sur dividendes, pas l'ensemble des "frais réels" d'un portefeuille
