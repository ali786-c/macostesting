# Audit Mobile iOS / Android — Rentoall

> Vérification complète des comportements spécifiques mobile et Capacitor (iOS/Android).

---

## 1. Détection plateforme

| Helper | Usage |
|--------|-------|
| `isCapacitor()` | App native (iOS ou Android) uniquement |
| `isMobileOrCapacitor()` | Viewport < 768px **ou** app native |

**Fichier** : `src/lib/capacitor.ts`

---

## 2. Homepage et redirections

| Page | Mobile/Capacitor | Desktop |
|------|------------------|---------|
| `/` (landing) | Mode client → `/search-parkings`, Mode hôte → `/mon-calendrier` | Landing visible |
| `/home` | Mode client → `/search-parkings`, Mode hôte → `/mon-calendrier` | Dashboard client/hôte |
| Logo header | → `/search-parkings` | → `/home` ou `/` |
| Logo menu mobile | → `/search-parkings` | → `/home` ou `/` |

**Implémentation** : `useLayoutEffect` pour éviter le flash de la homepage.

---

## 3. Navigation et liens

| Contexte | Mobile/Capacitor | Desktop |
|----------|------------------|---------|
| Bascule mode (client↔hôte) | Client → `/search-parkings`, Hôte → `/host/my-places` | → `/home` |
| Modifier annonce (Mes espaces → Edit) | `handleCapacitorLinkClick` + `router.push` (évite reload WebView) | — |
| Dashboard hôte (header) | → `/host/my-places` | → `/home` |
| Tableau de bord (paramètres) | → `/host/my-places` | → `/home` |
| Commencer ma recherche (favoris) | → `/search-parkings` | → `/search-parkings` |
| Rechercher un espace (réservations) | → `/search-parkings` | → `/search-parkings` |
| Footer « Rechercher » | → `/search-parkings` | — |

**Navigation Capacitor** : Pour les routes **statiques**, utilisation de `router.push` / `router.replace` via `handleCapacitorLinkClick`. Pour les **routes dynamiques** (`/reservations/[id]`, `/parking/[id]`, `/host/my-places/[id]`, `/user/[id]`) sur Capacitor, la navigation utilise `capacitorNavigate` (donc `window.location`) pour éviter les problèmes d’export statique. Liens : `handleCapacitorLinkClick` + `prefetch={false}`.

---

## 4. Redirections de sécurité (accès non autorisé)

| Page | Condition | Mobile | Desktop |
|------|-----------|--------|---------|
| Favoris | Mode hôte | → `/host/my-places` | → `/home` |
| host/my-places | Non hôte | → `/search-parkings` | → `/home` |
| host/my-places/[id] | Non hôte | → `/search-parkings` | → `/home` |

---

## 5. Safe Area (iOS notch, Android gesture bar)

- **Layout** : `viewportFit: "cover"` dans `layout.tsx`
- **Footer mobile** : `paddingBottom: env(safe-area-inset-bottom)`
- **Pages** : `paddingTop/Bottom` avec `max(..., env(safe-area-inset-*))` sur les pages principales
- **Modales** : `pb-[max(1rem, env(safe-area-inset-bottom))]`

---

## 6. API et Capacitor

| Aspect | Config |
|--------|--------|
| URL API | `https://rentoall.onrender.com/api` (jamais localhost en prod) |
| OAuth2 | Même base URL, jamais localhost |
| Intercepteur 401 | Redirection login, nettoyage storage |
| HTTP natif | `CapacitorHttp` enabled (éviter CORS) |

---

## 7. Capacitor config

- **iOS** : `iosScheme: "https"`, `contentInset: "automatic"`
- **Android** : `androidScheme: "https"`, `allowMixedContent: true` (dev)
- **Back button** : `disableBackButtonHandler: true` (gestion front)
- **Splash** : 2.5 s
- **Push** : badge, sound, alert

---

## 8. Stockage

- **Capacitor** : `@capacitor/preferences` (persistant)
- **Web** : `localStorage`
- **Init** : `CapacitorStorageInit` restaure les préférences au lancement

---

## 9. Composants Capacitor

| Composant | Rôle |
|-----------|------|
| `CapacitorPlatformRoot` | Health check API, `data-platform` |
| `CapacitorStorageInit` | Restaure préférences |
| `CapacitorBackButton` | Gestion bouton retour Android |
| `CapacitorPushNotifications` | Enregistrement push |
| `CapacitorAppUrlListener` | Deep linking |

---

## 10. Touch targets

- Boutons interactifs : `min-h-[44px]` ou `min-w-[44px]`
- `touch-manipulation` sur les éléments cliquables

---

## 11. Permissions (Info.plist / AndroidManifest)

**iOS** : Caméra, Photos, Localisation, Notifications à distance  
**Android** : Internet, Photos, Caméra, Géolocalisation

---

## 12. Vérification complète redirections (iOS/Android Capacitor)

**window.location conservé (externe ou cas spécial)** :
- OAuth (login, signup) → URL externe
- Stripe Checkout (réservations, paiement) → URL externe
- mailto: → ouverture app mail
- Intercepteur API 401 (session expirée) → `/auth/login` (hors contexte React)

**router.push / handleCapacitorLinkClick / safePush** :
- Header logout, toggle mode, paramètres mode
- PropertiesMapMapLibre (carte) : **safePush** pour /parking/[id] (marker + popup)
- Tous les Links header-navigation (logo, menu, dropdown)
- Liens parking, host, reservations, messages, favoris, parametres
- Header.tsx logout (page reset-password)
- CapacitorAppUrlListener, CapacitorPushNotifications : **safePush** pour deep links
- Pages payment/success, payment/cancel, reservation/confirmation : **handleCapacitorLinkClick** sur Links

**Routes dynamiques (capacitorNavigate/safePush sur Capacitor)** : `/reservations/[id]`, `/parking/[id]`, `/host/my-places/[id]`, `/user/[id]`

**Pages avec handleCapacitorLinkClick sur tous les Links** : home, reservations, reservations/[id], host/my-places, host/my-places/[id], messages, favoris, parking/[id], search-parkings, help, faq, payment/success, payment/cancel, reservation/confirmation, space-type-section, featured-spaces-section, header-navigation, mobile-footer, InteractiveMap.

**generateStaticParams** : reservations/[id], parking/[id], host/my-places/[id], user/[id] — IDs 0-5000 pour export statique.

**Note** : `Header.tsx` utilisé uniquement par `auth/reset-password` — logout corrigé pour router.push.

---

**Vérification détaillée** : voir `docs/VERIFICATION-MOBILE-IOS-ANDROID.md` (dernière vérification : 8 mars 2025).
