# Checklist audit mobile — Rentoall

Ce document sert de **référence** pour vérifier que la version mobile est épurée, propre et que les boutons/appels API sont correctement câblés.

---

## 1. Conventions responsive et touch

| Règle | Détail |
|-------|--------|
| **Breakpoint mobile** | `< 768px` (classe `md:`) ; `globals.css` utilise `max-width: 767px` pour `.mobile-page-main` et `overflow-x`) |
| **Padding bas (footer fixe)** | `pb-20` ou `pb-24` sur le `main` + classe `mobile-page-main` (voir `globals.css`) |
| **Safe area** | `env(safe-area-inset-bottom)` sur le footer ; `paddingTop: max(..., env(safe-area-inset-top))` sur les pages |
| **Zones tactiles** | Boutons/liens importants : `min-h-[44px]` et `min-w-[44px]`, avec `touch-manipulation` |
| **Conteneur principal** | Classe `mobile-page-main` sur les `<main>` des pages avec contenu scrollable |

---

## 2. Pages à vérifier (main + footer + boutons)

- [x] **`/search-parkings`** — `main` avec `pb-20`, barre sticky mobile, boutons Filtres/Rechercher câblés (pas de `hidden md:hidden`)
- [x] **`/parking/[id]`** — `main` avec `pb-20`, CTA Réserver, favoris (add/remove), avis
- [x] **`/home`** — `mobile-page-main` sur les 3 variantes de main, cartes cliquables
- [x] **`/reservations`** — Filtres, liste, actions (annuler, approuver, rejeter, modifier)
- [x] **`/reservations/[id]`** — Détail + boutons d’action
- [x] **`/messages`** — Liste conversations, envoi message, marquer lu
- [x] **`/favoris`** — Liste, retirer des favoris
- [x] **`/parametres`** — Onglets horizontaux, formulaire, sauvegarde
- [x] **`/auth/login`** et **`/auth/signup`** — Champs et boutons de soumission (min-h-[44px], touch-manipulation)
- [x] **Header** — Panneau « Rechercher » mobile, menu burger, liens
- [x] **MobileFooter** — 5 onglets (Messages, Réservations, Rechercher, Favoris, Profil) ou variante hôte

---

## 3. Câblage boutons / appels API (résumé)

| Page / composant | Action | API / logique |
|------------------|--------|----------------|
| **search-parkings** | Recherche | `placesAPI.search(params)` |
| **search-parkings** | Favoris (cœur) | `rentoallFavoritesAPI.addFavorite` / `removeFavorite` |
| **search-parkings** | « Espaces à découvrir » (0 résultat) | `placesAPI.getAll` |
| **parking/[id]** | Réserver | `reservationsAPI.create`, puis paiement |
| **parking/[id]** | Favoris | `rentoallFavoritesAPI.addFavorite` / `removeFavorite` |
| **favoris** | Charger liste | `rentoallFavoritesAPI.getFavorites` |
| **favoris** | Retirer | `rentoallFavoritesAPI.removeFavorite` |
| **reservations** | Liste (client/hôte) | `reservationsAPI.getClientReservations` / `getOwnedReservations` |
| **reservations** | Annuler / Approuver / Rejeter | `reservationsAPI.cancel` / `approveReservation` / `rejectReservation` |
| **messages** | Compteur non lus | `messagesAPI.getUnreadCount` (dans MobileFooter) |
| **messages** | Envoyer / Liste | `messagesAPI.sendMessage`, `getConversation`, etc. |
| **parametres** | Sauvegarder profil | `rentoallUsersAPI.updateProfile` (via AdaptiveSettings) |
| **auth/login** | Connexion | `authAPI.login` |
| **auth/signup** | Inscription | `authAPI.signup` ou register |
| **MobileFooter** | Navigation | `router.push(path)` (pas d’API directe) |
| **MobileFooter** | Badge messages | `messagesAPI.getUnreadCount(userId)` |

---

## 4. Épuration mobile (à vérifier partout)

- [x] Pas de `hidden md:hidden` (bloc jamais affiché) — bloc supprimé dans `search-parkings/page.tsx`.
- [x] Pas de doublon desktop/mobile qui afficherait deux fois le même contenu sur une même largeur.
- [x] Champs de formulaire et CTAs avec zone tactile ≥ 44px sur mobile (`min-h-[44px]`, `touch-manipulation` ou classe `.touch-target` dans `globals.css`).
- [x] Modales / popups mobile (dates, type, ville) qui ne se ferment pas au premier clic à l’intérieur (conteneur avec `data-mobile-*` ou `mobile-popup-container`).
- [x] Scroll horizontal des filtres avec `overflow-x-auto scrollbar-hide` et `touch-pan-x` (barre sticky dans `search-parkings`).
- [x] Images et cartes responsives — `overflow-x-hidden` sur `main` et `html/body` en mobile (`globals.css`).

---

## 5. Tests à maintenir / ajouter

- [x] **API** : `reservationsAPI.create` (payload avec `clientId`), `placesAPI.getAll`, `placesAPI.getById`, `placesAPI.search`, `placesAPI.getAvailableFilters`, `messagesAPI.getUnreadCount`, `rentoallFavoritesAPI.getFavorites` — handlers MSW dans `src/__mocks__/handlers.ts`, tests dans `src/services/__tests__/api.test.ts`.
- [x] **Composants** : `MobileFooter` — `src/components/sections/__tests__/mobile-footer.test.tsx` (rendu client, navigation, aria-current, safe area). `Button` — `touch-manipulation` + test dans `Button.test.tsx`.
- [x] **Utils** : `lib/capacitor.ts` — `src/lib/__tests__/capacitor.test.ts` (isCapacitor, getPlatform avec/sans Capacitor).

Pour lancer les tests : `npm test`. Si erreur `Cannot find module 'msw/node'`, exécuter `npm install`.

---

---

## 6. Tour complet iOS/Android (Capacitor) — écrans adaptés

Tous les écrans listés ci-dessous ont un `<main>` avec :
- **Padding bas mobile** : `pb-20` ou `pb-24` (éviter que le contenu passe sous le footer fixe).
- **Classe** : `mobile-page-main` (padding bas + safe area via `globals.css`).
- **Safe area** : `paddingTop: max(..., env(safe-area-inset-top))` et `paddingBottom: max(..., env(safe-area-inset-bottom))` sur les pages avec footer fixe.

**Flux principal (footer mobile)**  
`/`, `/home`, `/search-parkings`, `/parking/[id]`, `/reservations`, `/reservations/[id]`, `/messages`, `/favoris`, `/parametres`, `/auth/login`, `/auth/signup`.

**Réservation & paiement**  
`/reservation/confirmation`, `/reservation-confirmation`, `/payment/success`, `/payment/cancel`, `/payment-confirmation`.

**Hôte**  
`/host/my-places`, `/host/my-places/[id]`, `/host/create`, `/host/referrals`.

**Profil & légal**  
`/user/[id]`, `/cgu`, `/cgv`, `/mentions-legales`.

**Autres**  
`/create`, `/create/[id]`, `/mon-calendrier`, `/bons-cadeaux` (main avec `mobile-page-main` + safe area).

**Devis / influence / stats**  
`/quotes`, `/mes-devis-influenceur`, `/mes-devis-entreprise`, `/search-establishments`, `/ajouter-annonce`, `/investisseur`, `/statistiques`, `/influenceur-stats`.

**Auth**  
`/auth/forgot-password` (conteneur avec `mobile-page-main` + safe area, pas de `<main>`).

**Web inchangé**  
Le site web (npm run dev / build + start) reste identique : les classes et styles safe area / `pb-20` ne s’appliquent qu’en dessous du breakpoint `md` (767px) ou via les media queries mobile. Aucun impact sur le rendu desktop.

**Global**  
- `body` / `html` : `overflow-x: hidden` et `max-width: 100vw` sur mobile (globals.css).
- **Tablette Capacitor (ex. iPad)** : le wrapper a la classe `capacitor-app` (via `CapacitorLayoutWrapper`) pour garder le padding bas footer + safe area même en viewport ≥ 768px.
- `CapacitorBackButton` : gestion du bouton retour Android (via `window.Capacitor.Plugins.App`, pas d'import au build).
- Header et `MobileFooter` : `env(safe-area-inset-*)` appliqué ; boutons en `min-h-[3.5rem]` `min-w-[44px]` `touch-manipulation`.
- `overflow-x-hidden` sur tous les `<main>` listés ci-dessus pour éviter le débordement horizontal sur iOS/Android.

**Landing `/`**  
- Pas de `<main>` : contenu dans `div` avec `overflow-x-hidden`, section hero avec `pb-20 md:pb-28` ; conforme pour Capacitor.

---

## 7. État de conformité global (Capacitor + mobile)

| Critère | Statut |
|--------|--------|
| Tous les écrans avec `<main>` ont `pb-20` ou `pb-24` + `mobile-page-main` | ✅ |
| Safe area (top/bottom) en style inline ou via `.mobile-page-main` | ✅ |
| Aucun bloc `hidden md:hidden` | ✅ (supprimé dans search-parkings) |
| Modales mobile avec `data-mobile-*` / `mobile-popup-container` | ✅ |
| Filtres horizontaux : `overflow-x-auto scrollbar-hide touch-pan-x` | ✅ |
| Zones tactiles ≥ 44px sur CTAs / footer | ✅ |
| `overflow-x-hidden` sur les main + html/body en mobile | ✅ |
| Câblage API conforme (section 3) | ✅ |
| Tests API + composants + capacitor (section 5) | ✅ |

---

## 8. Popups et modales — adaptation mobile / Capacitor

Toutes les modales utilisées sur desktop sont adaptées pour mobile et Capacitor :

| Composant / écran | Mobile | Safe area | Boutons 44px |
|------------------|--------|-----------|--------------|
| **Modal** (base) | Plein écran `min-h-[100dvh]` | `env(safe-area-inset-*)` sur le conteneur | Fermer `min-w-[44px] min-h-[44px]` |
| **ConfirmationModal** | Plein écran | `pt`/`pb` safe area | Annuler / Confirmer `min-h-[44px]` `touch-manipulation` |
| **ConfirmModal** | Plein écran | `pb` safe area | Tous les boutons |
| **AlertModal** | Plein écran `min-h-[100dvh]` | `pt`/`pb` safe area | Bouton OK `min-h-[44px]` |
| **LoginRequiredModal** | Plein écran | Déjà en place | Fermer + CTAs |
| **RatingModal** | Plein écran | `pt`/`pb` safe area | Fermer, Annuler, Envoyer |
| **QuoteModal** | Bottom sheet | `pb` safe area | Fermer, Annuler, Envoyer |
| **DeleteModal** | Plein écran | `pt`/`pb` safe area | Annuler, Supprimer |
| **DepositSetupModal** | Plein écran | `pt`/`pb` safe area | Fermer, Annuler, Enregistrer |
| **Cookie consent** | Bottom sheet `rounded-t-2xl` | `pb` safe area | 3 boutons `min-h-[44px]` |
| **Paramètres 2FA** (setup, backup, disable) | Bottom sheet | `pb` safe area | Fermer + actions 44px |
| **Host referrals** (nouveau code) | Bottom sheet | `pb` safe area | Annuler, Créer 44px |
| **Host my-places** (suppression) | Plein écran | `pt`/`pb` safe area | Annuler, Supprimer |
| **Parking** (signalement) | Bottom sheet | `pb` safe area | Fermer, Annuler, Envoyer |
| **Messages** (signalement) | Bottom sheet | `pb` safe area | Fermer, Annuler, Signaler |
| **Reservations [id]** (erreur annulation, modification) | Erreur : bottom sheet ; Modification : plein écran | safe area | Boutons 44px |

---

## 9. Checklist Stores (Apple App Store / Google Play) — Capacitor

| Critère | Vérification |
|--------|----------------|
| **Viewport** | `viewport-fit=cover` + `width=device-width` (layout.tsx) |
| **Safe area** | Toutes les pages et modales utilisent `env(safe-area-inset-*)` (notch, barre gestuelle) |
| **Zones tactiles** | Boutons et liens principaux ≥ 44×44 pt (min-h-[44px], min-w-[44px], touch-manipulation) |
| **Pas de contenu masqué** | Footer fixe + `pb-mobile-footer` / `capacitor-app` sur tablette ; modales en plein écran ou bottom sheet avec safe area |
| **Orientation** | Pas de lock forcé (pas de restriction dans config) ; layout s’adapte |
| **Splash** | Configuré dans `capacitor.config.ts` (SplashScreen) |
| **Back Android** | `CapacitorBackButton` + `App.disableBackButtonHandler: true` pour navigation in-app |
| **Build** | `npm run build` puis `npx cap sync` ; iOS : `npx cap open ios` ; Android : `npx cap open android` |

**Dernière passe complète**  
- Layout : viewport `viewport-fit=cover`, `CapacitorLayoutWrapper` + classe `capacitor-app` pour padding tablette.  
- Pages : tous les `<main>` avec footer ont `mobile-page-main` + safe area (inline ou via globals).  
- **Pages sans `<main>` (layout custom)** : `/host`, `/privacy`, `/legal`, `/security` — ajout de `overflow-x-hidden` et `pb-mobile-footer md:pb-0` pour réserver l’espace du footer + safe area sur mobile/Capacitor.  
- **Redirections** : `/mes-annonces` — `pb-mobile-footer` + `overflow-x-hidden` sur le conteneur de chargement.  
- **Auth callbacks** : `/auth/oauth2/callback`, `/auth/google/callback`, `/auth/callback` — `overflow-x-hidden` + `pb-mobile-footer` sur le conteneur principal et le fallback Suspense.  
- **Auth reset-password** : les 3 états (sans token, succès, formulaire) ont `overflow-x-hidden` + `pb-mobile-footer`.  
- Home, payment/cancel, parking [id] not-found, 404 : déjà traités (safe area, mobile-page-main).  
- CapacitorPlatformRoot : health check et logs uniquement en `NODE_ENV === 'development'`.

*Dernière mise à jour : mars 2025 — Passe complète tous écrans Capacitor Android/iOS*
