# 🧸 Projet : Investir à la BRVM

Ce document contient l'explication simplifiée du projet (pour comprendre sa philosophie d'un coup d'œil) ainsi que le brief complet de design à transmettre pour concevoir les maquettes.

---

## 📖 Le Projet Raconté simplement (Comme à un enfant)

> Imagine que la **BRVM** soit un immense marché de fruits géant. Dans ce marché, au lieu d'acheter des bananes ou des pommes, on achète de petits morceaux d'entreprises (comme des morceaux d'une compagnie de téléphone ou d'une banque). Quand ces entreprises gagnent des sous, elles partagent un morceau de leur gâteau avec nous : ce cadeau s'appelle un **dividende**.
>
> Notre application, **Investir à la BRVM**, est comme une boîte à outils magique pour aider les gens à faire les meilleurs choix dans ce grand marché, sans se tromper et sans perdre de sous. 
> 
> Elle possède **3 super-pouvoirs** :
> 1. **La Longue-Vue (Veille.BRVM)** : Chaque semaine, elle nous donne 2 petites histoires (articles) et 2 vidéos faciles à comprendre pour nous expliquer comment le marché fonctionne et quelles sont les meilleures entreprises.
> 2. **La Sonnette aux Cadeaux (DiviAlerte)** : Elle liste toutes les entreprises, nous montre celles qui distribuent les plus gros cadeaux (dividendes), calcule combien de jours il reste avant la distribution, et nous envoie un message sur WhatsApp pour nous dire : *"Hé ! C'est l'heure d'aller chercher ton cadeau !"*
> 3. **Le Coffre-Fort Intelligent (Gestia.BRVM)** : C'est un carnet secret où l'on note ce qu'on a acheté. Il calcule tout seul si le marchand (le courtier) nous a pris trop de frais pour la transaction, et nous permet d'écrire pourquoi on a choisi cette entreprise et combien de temps on veut garder notre trésor.

---

## 🎨 Design System : Direction retenue (style "Nike")

⚠️ Cette section remplace l'ancien brief "dark mode + émeraude/or/orange" : après revue du wireframe généré (`Wireframe app BRVM/`), on garde sa direction visuelle monochrome, plus sobre et plus proche d'un produit financier premium.

### 🚀 1. L'Atmosphère & le Style Visuel
Inspiration **nike.com** : un système **monochrome noir/blanc/gris**, où la couleur n'apparaît jamais comme "couleur de marque" mais uniquement pour une signification fonctionnelle précise.
- **Le Thème** : Mode clair. Fond principal blanc pur (`--surface-app: #ffffff`), cartes en gris très clair (`--surface-card: #f7f7f5`).
- **L'Esthétique** : Épurée, plate, "industrielle" — pas de glow, pas de gradient, pas de texture. Rayons d'angle serrés (6–16px pour l'UI, 24px max pour les modales). Ombres douces et sobres pour la séparation des cartes (pas de glow coloré).
- **La Typographie** : Système à deux familles — **Barlow Condensed** (700–900, souvent en capitales, tracking serré) pour les titres/prix en "registre d'annonce", et **Barlow** (400–700) pour le corps de texte. **JetBrains Mono** pour les chiffres tabulaires (tickers, prix, %).

### 🎨 2. La Palette de Couleurs (Signification Fonctionnelle, pas de couleur de marque)
Pas de couleur dédiée par module. La couleur sert uniquement à communiquer un état :
1. 🟢 **Vert (gains)** : hausse du marché (`--market-up-500 #17c964`).
2. 🔴 **Rouge (pertes)** : baisse du marché (`--market-down-500 #ef4444`).
3. 🟩 **Vert sourd (alertes)** : rappels/alertes DiviAlerte (`--alert-500 #2f6b4f`) — volontairement distinct du vert de hausse pour ne jamais confondre les deux sens.
4. 🔵 **Bleu (info)** : notices informatives, ex. écran sécurisé Gestia (`--info-500 #2f6fed`).
5. **Noir/blanc/gris** : tout le reste — boutons, nav, focus, liens (`--action-primary` = noir pur, jamais une couleur).

### 🛠️ 3. Les 3 Pages Clés à maquetter

*   **Page 1 : Le Dashboard (Accueil / Bento Grid)**
    *   Un titre d'accroche fort et minimaliste en lettres capitales épaisses.
    *   Une grille Bento de 3 grandes cartes interactives menant aux 3 modules. Chaque carte doit arborer son style lumineux propre (glow vert pour Veille, glow jaune pour DiviAlerte, glow orange pour Gestia) avec des mini-illustrations de tableaux de bord, de téléphones recevant une alerte ou de graphiques financiers.
*   **Page 2 : DiviAlerte (Le Tableau des Dividendes)**
    *   Un moteur de recherche épuré et des filtres par secteurs (Banque, Télécoms, etc.).
    *   Un tableau interactif listant les entreprises avec leur taux de rendement (ex: 8.5%), la date de distribution et un indicateur visuel de "compte à rebours" (ex: "J-7" ou "Urgent").
    *   Un bouton d'action très visible : "Activer une alerte WhatsApp".
*   **Page 3 : Gestia.BRVM (Le Gestionnaire de Portefeuille)**
    *   Une fausse page de connexion épurée (style "Coffre-fort") avant d'entrer.
    *   Une fois connecté, un formulaire simple pour ajouter un achat (Nom de l'entreprise, quantité, prix, montant total débité).
    *   Un tableau récapitulatif des achats avec le calcul automatique et visuel des frais réels de transaction prélevés en pourcentage (ex: "Frais : 1.32%").
    *   Un encart textuel pour la "Thèse d'investissement" (pourquoi l'utilisateur a acheté cette action).

### 💻 4. Stack technique cible
*   **Framework** : Next.js 14 (App Router)
*   **Style** : Tailwind CSS (avec des classes utilitaires claires et réutilisables)
*   **Base de données & Auth** : Supabase
*   **Icônes** : Lucide React
