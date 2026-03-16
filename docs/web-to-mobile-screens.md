p## Mapping écrans Web ↔ Mobile

Ce document liste les **pages clés** de l’app et précise comment elles se comportent sur :
- **Desktop / Web** (largeur ≥ `md`)
- **Mobile** (largeur \< `md`)

Toutes les routes sont servies par le **même Next.js**, la différence se fait uniquement par le layout responsive (`md:hidden`, `hidden md:block`, grilles, paddings…).

---

## 1. Navigation globale

### 1.1 Header

- **Composant** : `HeaderNavigation`  
- **Fichier** : `src/components/sections/header-navigation.tsx`

**Desktop :**
- Barre supérieure complète :
  - Logo + sélection de ville / dates / type, actions (mode, profil, etc.).
  - Recherche accessible directement dans le header (aucun overlay).
  - Filtres visibles en largeur (`flex`, `gap-*`, etc.).

**Mobile :**
- Même composant, mais :
  - Bouton central “Rechercher” (`md:hidden`) qui ouvre un **panneau plein écran** :
    - Champ de saisie libre (ville / texte).
    - Accès aux mêmes filtres (Ville / Dates / Type) en pile verticale.
  - Plusieurs éléments deviennent :
    - `hidden md:flex` (affichés seulement sur desktop).
    - Boutons ronds/compacts avec `min-h-[44px]`, `min-w-[44px]`.

### 1.2 Footer

- **Desktop** :  
  - Footers classiques (ex. `FooterNavigation` ou `Footer`) dans certaines pages.

- **Mobile** :  
  - **`MobileFooter`** (`src/components/sections/mobile-footer.tsx`) est injecté globalement dans `src/app/layout.tsx` et reste **fixe en bas**.
  - Liens :
    - Mode client : `Messages`, `Réservations`, `Rechercher`, `Favoris`, `Profil`.
    - Mode hôte : `Annonces`, `Calendrier`, `Agenda`, `Messages`, `Profil`.

---

## 2. Pages client principales

### 2.1 `/home`

**Desktop :**
- Dashboard client (et host) avec sections larges :
  - Espaces populaires, meilleures offres, plus réservés.
  - Lorsque l’utilisateur est hôte : statistiques, graphiques, listes avec colonnes, etc.

**Mobile :**
- Contenu **empilé verticalement** :
  - Beaucoup de `gap-*` réduits (`gap-1`, `gap-2`) et `px-3`.
  - Cartes plus compactes (icônes plus petites, textes en `text-xs` / `text-sm`).
  - Padding top / bottom ajustés pour header fixe + footer mobile.

---

### 2.2 `/search-parkings`

**Desktop :**
- Page de recherche principale :
  - Souvent **liste + carte** côte à côte.
  - Filtres visibles en haut (ou dans une sidebar).
  - Grand espace pour la carte (MapLibre / Mapbox).

**Mobile :**
- `main` adapté :
  - `px-0`, `pt-2`, `pb-20` (pour le footer).
  - `mobile-page-main` + safe area top.
- Filtres :
  - Scrollers horizontaux pour les filtres rapides (`overflow-x-auto`, `scrollbar-hide`).
  - Sections repliables/stackées pour limiter la hauteur.
- Carte :
  - Affichée soit sous la liste soit dans un panneau dédié, avec hauteurs adaptées (pas de scroll interne trop complexe).

---

### 2.3 `/parking/[id]` (fiche d’un bien)

**Desktop :**
- Fiche détaillée avec plusieurs colonnes possibles :
  - Carrousel d’images / vidéo large.
  - Infos détaillées à droite (prix, disponibilité, bouton de réservation).

**Mobile :**
- `main` :
  - `px-3`, `pb-20`, `mobile-page-main` + safe area top.
- Layout :
  - Carrousel photo/vidéo en pleine largeur en haut.
  - Sections empilées : description, caractéristiques, avis, carte, bloc de réservation.
  - Boutons CTA dimensionnés pour le tactile (`min-h-[44px]`).

---

### 2.4 `/reservations`

**Desktop :**
- Vue plus “tableau de bord” :
  - Filtres bien visibles dans une carte en haut.
  - Cartes de réservation larges, beaucoup d’infos visibles en un coup d’œil.

**Mobile :**
- Header compact (`text-base` + `text-[10px]`).
- Filtres :
  - Dans un bloc repliable (`showFilters`) pour ne pas prendre tout l’écran.
  - Boutons et tags plus petits, mais toujours cliquables (`min-h-[36px]`).
- Liste :
  - Cartes verticales occupant la largeur, images réduites, sections condensées.
  - Boutons d’actions (annuler, modifier, laisser un avis…) mis en avant mais sans surcharger.

---

### 2.5 `/messages`

**Desktop :**
- Grille 3 colonnes :
  - Liste des conversations.
  - Flux de messages.
  - Panneau latéral (détails du bien / réservation).

**Mobile :**
- Grille toujours définie, mais :
  - Une seule colonne visible à la fois (certains blocs masqués via conditions + breakpoints).
  - Hauteur de la zone principale : `h-[calc(100vh-9rem)]` pour laisser la place
    - au header,
    - au footer mobile.
- Interactions :
  - Taper sur une conversation fait disparaître la liste (mobile) pour se concentrer sur le flux — retour via contrôles dédiés.

---

### 2.6 `/favoris`

**Desktop :**
- Grille `sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`.
- Filtres et tri dans une barre en tête (select, boutons carte / filtre).

**Mobile :**
- Layout :
  - Toujours une seule colonne (`grid-cols-1`).
  - `main` avec `pb-20` + `mobile-page-main`.
- UI :
  - Titre plus petit (`text-xl` sur mobile).
  - Boutons filtre/tri compacts.
  - Cartes avec image réduite (`h-16` sur très petit écran), texte en `text-sm` / `text-xs`.

---

### 2.7 `/parametres`

**Desktop :**
- Layout 2 colonnes :
  - Sidebar de navigation à gauche (onglets paramètres).
  - Contenu riche à droite (profil, sécurité, notifications, parrainage, paiements…).

**Mobile :**
- `main` :
  - `pt-4`, `pb-24`, `mobile-page-main`, safe area top.
- Navigation :
  - Sidebar devient **barre horizontale** avec icônes, scrollable (`overflow-x-auto`, `scrollbar-hide`).
- Sections :
  - Cartes empilées, marges réduites, textes légèrement plus petits.

---

## 3. Pages hôte / back-office

### 3.1 `/host/my-places`

**Desktop :**
- Large tableau de bord pour gérer les annonces :
  - Titre, compteur d’annonces.
  - Bouton “Nouvelle annonce”.
  - Liste / cartes de biens.

**Mobile :**
- `main` :
  - `pt-20 sm:pt-24 pb-20 md:pb-16 mobile-page-main`, `px-3`.
- Cartes :
  - Infos principales condensées (ville, statut, prix).
  - Boutons d’édition / détail sous forme de petits CTA.

### 3.2 `/mon-calendrier`

**Desktop :**
- Vue calendrier avancée :
  - Largeur maximale, barre d’onglets “CALENDRIERS”, topper pro.

**Mobile :**
- Bloc principal :
  - `pt-20 sm:pt-24 pb-20 sm:pb-12 bg-white mobile-page-main`.
- Interaction :
  - Navigation entre “jour / semaine / mois” optimisée pour le tactile.
  - Moins d’éléments visibles en même temps, mais même logique métier.

---

## 4. Règles pour ajouter / modifier un écran

Quand tu crées ou modifies une page :

1. **Toujours vérifier les 2 vues** :
   - Largeur mobile typique (375–414 px).
   - Largeur desktop (≥ 1024 px).
2. **Sur mobile** :
   - Ajouter `mobile-page-main` sur le conteneur principal si le footer mobile est visible.
   - Vérifier qu’aucun élément important n’est collé au bas de l’écran.
   - Limiter la largeur des textes (`px-3`, `px-4`) pour éviter les lignes trop longues.
3. **Côté UX** :
   - Préférer des sections **empilées** aux grilles compliquées.
   - Utiliser des scrollers horizontaux (`overflow-x-auto`) si besoin d’onglets / filtres multiples.
4. **Côté navigation** :
   - Si une nouvelle page devient un “pilier” mobile, l’ajouter dans `MobileFooter` (client ou host) pour qu’elle soit accessible en 1 tap.

---

## 5. Résumé rapide

- Web et mobile partagent **les mêmes routes**.
- La différence vient :
  - du layout responsive (Tailwind),
  - du header (`HeaderNavigation`),
  - du footer (`MobileFooter`),
  - de quelques comportements spécifiques (panneau de recherche mobile, listes compactes, scrollers horizontaux).
- Utiliser `mobile-page-main` + safe areas pour garantir une **expérience propre, pro et mobile‑friendly** sur tous les nouveaux écrans.

# Web-to-Mobile Screens

Table de correspondance : **route Next.js** → **écran mobile Expo Router** → **statut**.

| Route Web | Écran Mobile | Statut |
|-----------|--------------|--------|
| `/` | `app/index.tsx` (redirect) | DONE |
| `/home` | `app/(tabs)/index.tsx` | DONE |
| `/auth/login` | `app/(auth)/login.tsx` | DONE |
| `/auth/signup` | `app/(auth)/signup.tsx` | DONE |
| `/auth/forgot-password` | `app/(auth)/forgot-password.tsx` | DONE |
| `/auth/reset-password` | `app/(auth)/reset-password.tsx` | DONE |
| `/auth/callback`, `/auth/google/callback`, `/auth/oauth2/callback` | (OAuth web uniquement) | N/A |
| `/search-parkings` | `app/search-parkings.tsx` | DONE |
| `/search-results` | (fusion avec search-parkings) | DONE |
| `/parking/[id]` | `app/parking/[id].tsx` | DONE |
| `/favoris` | `app/(tabs)/favoris.tsx` | DONE |
| `/reservations` | `app/(tabs)/reservations.tsx` | DONE |
| `/reservations/[id]` | `app/reservations/[id].tsx` | DONE |
| `/reservation/confirmation`, `/reservation-confirmation` | `app/reservation/confirmation.tsx` | DONE |
| `/payment-confirmation`, `/payment/success` | `app/payment/success.tsx` | DONE |
| `/payment/cancel` | `app/payment/cancel.tsx` | DONE |
| `/payment/[id]` | (redirection web si besoin) | N/A |
| `/host` | `app/host/index.tsx` | DONE |
| `/host/create` | `app/host/create.tsx` (lien vers web) | DONE |
| `/host/my-places` | `app/host/my-places.tsx` | DONE |
| `/host/my-places/[id]` | `app/host/my-places/[id].tsx` | DONE |
| `/host/referrals` | `app/host/referrals.tsx` (lien vers web) | DONE |
| `/mon-calendrier` | `app/mon-calendrier.tsx` | DONE |
| `/settings`, `/parametres`, `/settings-new` | `app/(tabs)/settings.tsx` | DONE |
| `/privacy` | `app/privacy.tsx` | DONE |
| `/cgv` | `app/legal/cgv.tsx` | DONE |
| `/cgu` | `app/legal/cgu.tsx` | DONE |
| `/mentions-legales` | `app/legal/mentions-legales.tsx` | DONE |
| `/faq` | `app/faq.tsx` | DONE |
| `/help` | `app/help.tsx` | DONE |
| `/security` | (lien depuis settings vers web si besoin) | N/A |
| `/account-type` | (non porté, web only) | N/A |
| `/user/[id]` | (non porté, web only) | N/A |
| `/annonces`, `/mes-annonces`, `/creer-annonce`, etc. | (métier influenceurs/entreprises, web only) | N/A |
| `/quotes`, `/devis/[id]`, `/mes-devis*` | (non porté, web only) | N/A |
| `/conversations`, `/messages` | (non porté, web only) | N/A |
| `/prestations`, `/prestation-etablissement/[id]` | (non porté, web only) | N/A |
| `/design-system` | - | N/A |
| `/investisseur` | - | N/A |

**Légende** : **DONE** = écran mobile présent et fonctionnel ; **N/A** = non porté (hors périmètre mobile ou web only).

Voir `docs/web-to-mobile-mapping.md` pour le détail (API, notes UI).
