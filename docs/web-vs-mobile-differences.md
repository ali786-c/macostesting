# Différences Web vs Mobile (vue web réduite) – Liste et points à corriger

Ce document recense les **différences** entre la version desktop (web) et la version mobile (même app, responsive) et signale les **soucis éventuels** à corriger.

---

## 1. Navigation et layout global

### 1.1 Header (`HeaderNavigation`)

| Élément | Desktop | Mobile | Remarque |
|--------|---------|--------|----------|
| Barre de recherche (ville, dates, type) | Visible dans le header (`hidden md:flex`) | Masquée ; un **bouton "Rechercher"** ouvre un panneau plein écran | OK, cohérent. |
| Champs ville / dates / type | Directement dans le header | Dans le panneau « Rechercher » (pile verticale) | OK. |
| Liens (Calendrier, Messagerie, etc.) | Visibles (`hidden md:flex`) | Masqués sur très petit écran (`hidden lg:inline` sur certains libellés) | Vérifier que les icônes seules sont claires. |
| Bouton « Mettre mon espace en ligne » | Texte long sur lg, « Publier » sur md | `lg:hidden` → « Publier » | OK. |
| Menu burger / profil | Masqué sur desktop | Visible (`md:hidden`) avec drawer plein écran | OK. |
| Header fixe | `fixed` sur mobile, `fixed` sur desktop (avec `hidden md:block` pour la version desktop) | Deux variantes selon breakpoint | À vérifier : pas de double header. |

**Points à corriger :**
- Aucun identifié pour l’instant. Si le header desktop s’affiche en même temps que le mobile sur une plage de largeur, corriger les classes (ex. `md:hidden` / `hidden md:block`).

---

### 1.2 Footer

| Élément | Desktop | Mobile | Remarque |
|--------|---------|--------|----------|
| Footer classique (liens, etc.) | Selon les pages | Souvent masqué ou simplifié | - |
| Barre fixe en bas | Absente | **MobileFooter** (`md:hidden`) dans `layout.tsx` | Liens : Messages, Réservations, Rechercher, Favoris, Profil (ou variante hôte). |

**Points à corriger :**
- Vérifier que **toutes** les pages avec contenu scrollable ont un `padding-bottom` suffisant (`pb-20` ou équivalent) pour ne pas être masquées par le footer fixe. Déjà appliqué sur plusieurs pages (`mobile-page-main`, `pb-20`).

---

## 2. Page Recherche (`/search-parkings`)

### 2.1 Accès aux filtres

| Élément | Desktop | Mobile | Remarque |
|--------|---------|--------|----------|
| Filtres (ville, dates, type, prix, etc.) | **Barre sticky** sous le header, toujours visible (`hidden md:block`) | 1) Panneau « Rechercher » (bouton header) : Ville, Dates, Type. 2) **Barre sticky** (Type compact, Dates, bouton Filtres) affichée **uniquement si** `showMobileFiltersBar` est true (toggle utilisateur) | Sur mobile, la barre de filtres est **cachée par défaut** ; l’utilisateur doit cliquer pour l’afficher. Risque de confusion. |
| Champ Ville (autocomplétion) | Dans la barre desktop mais dans un bloc avec classe **`hidden`** → jamais visible | Dans le panneau « Rechercher » uniquement ; dans la barre sticky mobile le champ ville est **commenté** (caché) | **À corriger** : sur desktop, le champ ville de la barre est inutile (toujours caché). Soit le rendre visible, soit supprimer le bloc. Sur mobile, la ville n’est éditable que dans le panneau « Rechercher ». |
| Filtres avancés (prix, rayon, options) | Modal **AdvancedFilters** (`hidden md:block`) | Même composant **AdvancedFilters** dans un popup bottom sheet avec `embedInContainer` | OK, même logique. |

### 2.2 Contenu principal (résultats)

| Élément | Desktop | Mobile | Remarque |
|--------|---------|--------|----------|
| Carte | Visible à droite (grille `lg:grid-cols-[3fr_2fr]`) | Carte en plein écran au-dessus d’un **volet déroulable** contenant la liste | OK. |
| Liste des résultats | À gauche sur desktop | Dans le volet en bas sur mobile | OK. |
| Hauteur carte mobile | `calc(100vh - 4rem)` | - | Vérifier sur petits écrans (safe area, barre d’état). |
| État « Aucun résultat » | Message + suggestions + villes + **Espaces à découvrir** (liste type page d’accueil) | Idem (responsive) | OK. |

### 2.3 Code mort / incohérences

| Fichier / zone | Problème | Action recommandée |
|----------------|----------|--------------------|
| `search-parkings/page.tsx` | Bloc « Formulaire de recherche mobile » avec **`hidden md:hidden`** → jamais affiché (commentaire : « Les filtres sont maintenant dans le header ») | **Supprimer** tout le bloc (ou le garder commenté proprement) pour alléger le fichier. |
| Barre desktop | Champ ville avec **`hidden`** (ligne ~2967) | Soit afficher le champ (retirer `hidden`), soit supprimer le bloc s’il est redondant avec le header. |
| Barre mobile (sticky) | Champ ville **commenté** (lignes ~2856–2884) | Décider : réactiver un champ ville compact dans la barre, ou documenter que la ville se fait uniquement via le panneau « Rechercher ». |

### 2.4 Libellés et UX mobile

| Élément | Comportement | Remarque |
|--------|-------------|----------|
| Boutons Type (P/B/C) | Sur mobile, libellés courts ; « Réinit. » et « Filtres » en `hidden sm:inline` | Sur très petit écran, uniquement les icônes ; vérifier accessibilité (title, aria-label). |
| Rayon | `hidden sm:inline` pour le texte « Rayon: » | Même remarque. |

---

## 3. Page Détail parking (`/parking/[id]`)

| Élément | Desktop | Mobile | Remarque |
|--------|---------|--------|----------|
| Colonne réservation (prix, dates, CTA) | Visible à droite (`hidden lg:block`, sticky) | En bas de page, bloc dédié (`lg:hidden`) | OK. |
| Carrousel / galerie | Une variante selon breakpoint (`hidden lg:block` / `lg:hidden`) | - | Vérifier que les deux variantes restent cohérentes (mêmes images, même ordre). |
| Bloc calendrier / disponibilités | Affichage conditionnel `md:hidden` / `hidden md:block` selon `selectedPeriod` | Une version plus compacte ou réorganisée sur mobile | Vérifier que toutes les infos (jour/semaine/mois) restent accessibles. |
| CTA (Réserver, etc.) | `min-h-[44px]` sur mobile pour la zone tactile | - | OK. |

**Points à corriger :**
- Vérifier les paddings (`px-3`, `pb-20`, etc.) et que le bloc de réservation n’est pas coupé par le footer mobile.

---

## 4. Page Accueil (`/home`)

| Élément | Desktop | Mobile | Remarque |
|--------|---------|--------|----------|
| Sections (Populaires, Meilleures offres, etc.) | Même contenu, grilles plus larges | Empilées, `gap` réduit, cartes plus compactes | OK. |
| Loading | Deux blocs (logo + texte) : un `md:hidden`, un `hidden md:block` pour le même contenu | Éviter doublon visuel sur une même largeur ; déjà séparés par breakpoint | OK. |

---

## 5. Réservations (`/reservations`)

| Élément | Desktop | Mobile | Remarque |
|--------|---------|--------|----------|
| Filtres / onglets | Barre visible | Même barre, responsive | Pas de `md:hidden`/`hidden md:` spécifique trouvé ; vérifier en manuel que les filtres restent utilisables (scroll horizontal si besoin). |
| Cartes réservation | Plus larges | Cartes pleine largeur, contenu condensé | OK si pas de débordement. |
| `main` | `pb-20 md:pb-12`, `mobile-page-main` | - | Cohérent avec le footer mobile. |

---

## 6. Messages (`/messages`)

| Élément | Desktop | Mobile | Remarque |
|--------|---------|--------|----------|
| Grille 3 colonnes | Liste conversations \| Flux messages \| Détails | Sur mobile, **une colonne visible à la fois** ; liste masquée quand une conversation est ouverte (`hidden lg:flex` / affichage conditionnel) | OK. |
| Bouton retour (conversation ouverte) | `lg:hidden` | Visible sur mobile pour revenir à la liste | OK. |
| Hauteur zone principale | `h-[calc(100vh-9rem)]` ou similaire | - | Vérifier que le clavier ne cache pas le champ de saisie sur mobile. |

---

## 7. Favoris (`/favoris`)

| Élément | Desktop | Mobile | Remarque |
|--------|---------|--------|----------|
| Grille | `sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` | `grid-cols-1` | OK. |
| `main` | `pb-20 md:pb-16`, `mobile-page-main` | - | OK. |

---

## 8. Paramètres (`/parametres`)

| Élément | Desktop | Mobile | Remarque |
|--------|---------|--------|----------|
| Navigation | Sidebar à gauche | **Barre horizontale** scrollable (onglets) | OK. |
| `main` | `pb-24 md:pb-12`, `mobile-page-main` | - | OK. |

---

## 9. Pages hôte (my-places, mon-calendrier, etc.)

- Même principe : `mobile-page-main`, `pb-20` / `pt-20` pour header/footer, cartes et tableaux en colonne unique ou grille réduite sur mobile.
- Vérifier que les boutons d’action restent accessibles (taille tactile, pas masqués par le footer).

---

## 10. Récapitulatif des actions recommandées

| Priorité | Action |
|----------|--------|
| Haute | **search-parkings** : Supprimer ou réactiver le bloc avec `hidden md:hidden` (formulaire recherche mobile mort). |
| Haute | **search-parkings** : Décider du champ Ville desktop dans la barre sticky (actuellement `hidden`) : l’afficher ou supprimer. |
| Moyenne | **search-parkings** : Revoir l’affichage par défaut de la barre sticky mobile (`showMobileFiltersBar`) : affichée par défaut quand il y a des résultats, ou garder le toggle mais le rendre plus visible. |
| Moyenne | **search-parkings** : Supprimer ou réactiver le champ Ville commenté dans la barre sticky mobile. |
| Basse | Vérifier sur toutes les pages que les boutons/liens importants ont une zone tactile ≥ 44px et, si besoin, des `aria-label` / `title` quand le libellé est masqué (`hidden sm:inline`). |
| Basse | Vérifier une fois en manuel sur 375px et 414px que le footer fixe ne coupe aucun CTA et que le scroll est fluide. |

---

## 11. Convention responsive utilisée

- **Breakpoints** : `sm` (640px), `md` (768px), `lg` (1024px).
- **Mobile** : largeur \< `md` en général ; parfois `lg` pour la carte / colonne réservation.
- **Classes récurrentes** : `md:hidden` (visible uniquement mobile), `hidden md:block` (visible uniquement desktop), `mobile-page-main`, `pb-20` (ou plus) pour la réserve au-dessus du footer mobile.
- **Touch** : `min-h-[44px]`, `min-w-[44px]`, `touch-manipulation` sur les boutons importants.

Si tu veux, on peut enchaîner par les corrections concrètes (patches) sur `search-parkings` en priorité (suppression du bloc mort, choix pour le champ Ville desktop/mobile).
