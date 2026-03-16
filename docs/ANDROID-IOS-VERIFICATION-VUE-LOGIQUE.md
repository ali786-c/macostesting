# Vérification Android (et iOS) — Vue et logique

Vérification que l’app se comporte correctement sur **Android** comme sur **iOS** (vues, safe areas, API).

---

## 1. API (backend)

| Point | iOS | Android | Statut |
|-------|-----|--------|--------|
| URL de l’API en prod | `https://rentoall.onrender.com/api` | Idem | OK |
| Détection plateforme | `isCapacitor()` (true sur les deux) | Idem | OK |
| Pas de localhost en prod | `getBaseURL()` + interceptor forcent onrender | Idem | OK |
| CORS back | Origine `capacitor://localhost` | Idem | OK |

La logique dans `src/services/api.ts` utilise **uniquement** `isCapacitor()` (pas de branche `getPlatform() === 'ios'` pour l’API). Donc **Android et iOS utilisent la même URL et les mêmes règles**.

---

## 2. Safe areas (vue)

| Élément | iOS | Android | Statut |
|--------|-----|--------|--------|
| Viewport | `viewportFit: "cover"` (layout) | Idem (même build) | OK |
| Homepage | `paddingTop: env(safe-area-inset-top)` sur le conteneur principal | Idem | OK |
| Header | `paddingTop: env(safe-area-inset-top)` sur le `<header>` | Idem | OK |
| Pages (main) | `paddingTop/Bottom` avec `env(safe-area-inset-*)` sur les `<main>` | Idem | OK |
| Footer mobile | `paddingBottom: env(safe-area-inset-bottom)` | Idem | OK |
| globals.css | `.mobile-page-main`, `.pb-safe` avec safe-area | Idem | OK |

Aucun style ou composant ne cible **uniquement** iOS : tout passe par `env(safe-area-inset-*)`, qui s’applique aux deux plateformes.

**Note Android :** sur certaines versions anciennes de WebView (< 140), `env(safe-area-inset-*)` peut être mal pris en charge. Sur appareils récents / simulateur récent, le comportement est en général correct.

---

## 3. Composants et logique métier

| Fichier / zone | Comportement | Statut |
|----------------|-------------|--------|
| `CapacitorPlatformRoot` | Expose `data-platform` = ios / android / web (pas de branche iOS-only) | OK |
| `CapacitorBackButton` | Utilise `isCapacitor()` — actif sur iOS et Android | OK |
| `CapacitorStorageInit` | Idem | OK |
| `CapacitorAppUrlListener` | Idem | OK |
| `CapacitorPushNotifications` | Envoi du token si platform === ios OU android | OK |
| `getAppBaseUrl()` (app-url.ts) | En Capacitor, même logique pour les deux | OK |
| `storage.ts` | Préférences Capacitor pour les deux | OK |

Aucune logique métier ou vue ne traite **uniquement** iOS au détriment d’Android.

---

## 4. Config native Android

| Élément | Valeur / remarque |
|--------|--------------------|
| `capacitor.config.ts` | androidScheme https, allowMixedContent true (dev) |
| MainActivity | BridgeActivity par défaut (standard Capacitor) |
| activity_main.xml | WebView plein écran, pas de fitsSystemWindows custom |
| Thème | AppTheme.NoActionBarLaunch (splash), pas de config spécifique safe area |

Pour des appareils avec encoche / barre de statut, le rendu repose sur le viewport cover et les env(safe-area-inset-*) dans le HTML/CSS. Si sur un device Android précis les insets sont à 0, c’est en général un souci du WebView ou du thème système, pas d’une branche iOS-only dans le code.

---

## 5. Récap

- **Vue :** même layout, même viewport, mêmes safe areas en CSS pour iOS et Android.
- **Logique :** API, storage, back button, URLs, push — tout passe par isCapacitor() ou getPlatform() avec ios ou android, pas d’exclusion d’Android.
- **Android est aligné avec iOS** pour la vue et la logique.

---

*Rentoall – vérification Android / iOS (vue et logique).*
