## Guide technique Web / Mobile

Ce document décrit comment l’application gère les différences entre **vue web (desktop/tablette)** et **vue mobile** dans le même code Next.js.

L’objectif est que tu puisses :
- comprendre *où* se trouvent les comportements spécifiques mobile,
- savoir *quoi vérifier* quand tu modifies une page,
- garder l’expérience **propre, compacte et cohérente** sur mobile.

---

## 1. Architecture générale

- **Framework**: `next` (App Router dans `src/app`).
- **Responsif**: on utilise les breakpoints Tailwind (notamment `md`).
- **Mobile vs desktop**:  
  - **Même routes** (`/home`, `/search-parkings`, `/reservations`, etc.).  
  - **Comportement différent** selon la taille d’écran avec des classes `md:hidden`, `hidden md:flex`, grilles différentes, etc.
- **Navigation haute**: `HeaderNavigation` (`src/components/sections/header-navigation.tsx`)  
  - Gère la recherche, les filtres, les menus.  
  - Très riche en logique mobile (panneau de recherche, inputs, etc.).
- **Navigation basse (mobile)**: `MobileFooter` (`src/components/sections/mobile-footer.tsx`)  
  - Visible uniquement sur mobile (`md:hidden`).  
  - Liens principaux : recherche, favoris, réservations, messages, profil, etc.

---

## 2. Layout global et safe areas

**Fichier clé**: `src/app/layout.tsx`

- Importe le `MobileFooter` et l’affiche uniquement sur mobile :
  - `div` avec `md:hidden` à la fin du `<body>`.
- Ajout de providers (langue, favoris, recherche).

**CSS global**: `src/app/globals.css`

Ajouts importants côté mobile :

- `body` (mobile) :
  - `overflow-x: hidden;`
  - `-webkit-overflow-scrolling: touch;`
- **Classe utilitaire `mobile-page-main`** (à utiliser sur les `<main>` / blocs principaux) :
  - En dessous de 768px, ajoute un `padding-bottom` suffisant pour ne pas masquer le contenu sous le footer :  
    `padding-bottom: max(5rem, calc(env(safe-area-inset-bottom, 0px) + 5rem));`
- **Classe utilitaire `mobile-content-px`** :
  - Padding horizontal cohérent sur mobile (`padding-left/right: 0.75rem`).

Guideline :
- Sur une page qui a le footer mobile actif, le **wrapper principal** doit utiliser :
  - `className="... mobile-page-main ..."`  
  - + éventuellement un `style={{ paddingTop: 'max(..., env(safe-area-inset-top, 0px))' }}` si le header est fixe.

---

## 3. Navigation mobile (MobileFooter)

**Fichier**: `src/components/sections/mobile-footer.tsx`

- Footer fixe :
  - `fixed bottom-0 left-0 right-0 md:hidden`
  - `bg-white/95 backdrop-blur-sm border-t border-slate-200/80`
  - `shadow-[0_-1px_6px_rgba(0,0,0,0.06)]`
  - `style={{ paddingBottom: 'env(safe-area-inset-bottom, 0)' }}` pour la safe area.
- Navigation :
  - `<nav className="flex items-stretch justify-around min-h-14" aria-label="Navigation principale">`
  - Boutons avec `min-h-[3.5rem] min-w-[44px]` (touch friendly).
  - Label en `text-[11px]` + `truncate` pour rester compact.
- Comportement :
  - **Mode client vs mode hôte** via `localStorage.getItem('userMode')`.
  - `messagesAPI.getUnreadCount` pour le badge non lus.
  - Cas spéciaux `isActive` pour `/search-parkings`, `/reservations`, `/mes-annonces`, `/mon-calendrier`.

À retenir :
- Toute nouvelle route **importante sur mobile** doit idéalement être câblée ici (client ou host menu).

---

## 4. Header & recherche : différences Web / Mobile

**Fichier central**: `src/components/sections/header-navigation.tsx`

Points principaux côté mobile :

- **Bouton barre de recherche** (mobile uniquement) :
  - Bloc centré `md:hidden`, avec un bouton arrondi qui ouvre le panneau de recherche.
  - Texte dynamique : `t('header.search')` ou `Masquer`.
- **Panneau de recherche mobile** :
  - Overlay plein écran (`fixed top-0 left-0 right-0 bottom-0 bg-white z-[70] md:hidden`).
  - Comportement :
    - Champ de **saisie libre** en haut (ville / texte).
    - Filtres empilés : Ville (dropdown + suggestions), Dates, Type.
    - Bouton “Rechercher” qui construit les params d’URL à partir de la ville saisie / sélectionnée.
  - State important :
    - `mobileSearchText` : texte libre mobile.
    - `city`, `startDate`, `endDate`, `selectedTypes`, `selectedCityCoords`, etc. (via `SearchContext`).
  - Fonction clé :
    - `buildSearchParams(cityOverride?: string)` qui gère la différence entre ville texte et coordonnées.

Sur desktop :
- La recherche est accessible directement dans le header (filtres plus visibles).
- Les mêmes states sont réutilisés mais l’UI est horizontale (non overlay).

---

## 5. Pages principales et comportement mobile

Les mêmes routes sont utilisées pour desktop et mobile. Les différences se font par :
- Layout (`flex-col` vs grilles multiples).
- Marges / paddings (`px-3`, `gap-2`, `mb-3`).
- `md:hidden` / `hidden md:block`.

Quelques exemples importants :

### 5.1 `src/app/home/page.tsx`

- Client :
  - Sections empilées verticalement (Populaires, Meilleures offres, Plus réservés).
  - `main` avec :  
    - `pt-20 md:pt-28 lg:pt-32`  
    - `pb-20 md:pb-8`  
    - `style={{ paddingTop: 'max(calc(env(safe-area-inset-top, 0px) + 5rem), 5rem)', paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 5rem), 5rem)' }}`
- Host :
  - Dashboard compact mobile (grille 2 colonnes, petites cartes statistiques).
  - Sur desktop : plus d’espace, textes plus grands.

### 5.2 `src/app/search-parkings/page.tsx`

- `main` :
  - `className="w-full px-0 pt-2 md:pt-4 sm:pt-6 pb-20 md:pb-0 overflow-x-hidden flex-1 mobile-page-main"`
  - `style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top, 0px))' }}`
- Spécifique mobile :
  - Scrollers horizontaux avec `overflow-x-auto` + `scrollbar-hide` pour les filtres rapides.
  - Panneau de filtres avancés / cartes compact sur petit écran.
- Desktop :
  - Grille plus large, carte + liste côte à côte.

### 5.3 `src/app/reservations/page.tsx`

- `main` :
  - `pt-2 sm:pt-6 md:pt-20 pb-20 md:pb-12 overflow-x-hidden flex-1 mobile-page-main`.
- Mobile :
  - Header compact (`text-base` / `text-[10px]`).
  - Filtres dans une carte pliable, optimisée pour petit écran.
- Desktop :
  - Plus d’espace, cartes plus grandes, marges augmentées.

### 5.4 `src/app/messages/page.tsx`

- `main` :
  - `pt-4 sm:pt-6 md:pt-24 pb-20 md:pb-12 flex-1 mobile-page-main`.
- Grille :
  - `grid-cols-1` sur mobile, `lg:grid-cols-[350px_1fr_400px]` sur grand écran.
  - Hauteur : `h-[calc(100vh-9rem)]` pour laisser la place au header + footer.
- Objectif :
  - Sur mobile : liste + détails restent utilisables sans scroll infini ni éléments masqués.

### 5.5 `src/app/parametres/page.tsx`

- `main` :
  - `pt-4 sm:pt-6 md:pt-24 pb-24 md:pb-12 flex-1 mobile-page-main`.
  - Safe area top via `style={{ paddingTop: 'max(1rem, env(safe-area-inset-top, 0px))' }}`.
- Mobile :
  - Sidebar transformée en **navigation horizontale à icônes** (`overflow-x-auto scrollbar-hide`).
  - Sections regroupées dans des cartes compactes.
- Desktop :
  - Large layout deux colonnes (sidebar à gauche, contenu à droite).

### 5.6 `src/app/parking/[id]/page.tsx`

- `main` :
  - `className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 pt-2 sm:pt-6 md:pt-20 lg:pt-24 pb-20 sm:pb-12 md:pb-16 relative mobile-page-main"`.
  - Safe area top avec `paddingTop` dans le `style`.
- Mobile :
  - Carrousel photo / vidéo plein écran + sections empilées.
- Desktop :
  - Mise en page plus large avec colonnes (infos / réservation).

---

## 6. Règles à suivre pour les futures modifs

1. **Toujours penser “mobile d’abord”** :
   - Touch targets ≥ 44px (`min-h-[44px]`, `min-w-[44px]`).
   - Typo lisible (`text-sm` minimum pour les contenus fréquents).
2. **Ne jamais masquer du contenu sous le footer** :
   - Utiliser `mobile-page-main` sur les `<main>` quand le footer est visible.
3. **Éviter le scroll horizontal** :
   - `overflow-x-hidden` sur `body` (déjà en place).  
   - Utiliser `scrollbar-hide` + `overflow-x-auto` pour les scrollers de filtres.
4. **Garder la cohérence des paddings** :
   - Mobile : `px-3` ou `px-4` max dans les conteneurs principaux.
   - Desktop : `md:px-6 lg:px-8`.
5. **Si tu ajoutes une nouvelle page majeure** :
   - Vérifie :
     - Header (`HeaderNavigation`) bien inclus.
     - Footer desktop (si besoin) et footer mobile (depuis `layout.tsx`).
     - `main` avec `mobile-page-main` si la page est accessible via le footer mobile.

---

## 7. À faire quand tu modifies une page

Checklist rapide :

1. Tester **mobile** (375px / 414px) dans DevTools.
2. Vérifier :
   - Pas de barre de scroll horizontale.
   - Rien de masqué derrière le footer.
   - Boutons facilement cliquables.
   - Titres / textes pas trop gros ni trop serrés.
3. Si tu ajoutes un nouvel onglet important pour mobile :
   - Pense à mettre à jour `MobileFooter`.

