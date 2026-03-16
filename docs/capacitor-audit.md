# Audit Capacitor — Web → iOS/Android (zéro surprise)

**Objectif** : emballer la webapp Next.js dans des apps iOS/Android via Capacitor, éviter les pièges WebView et les rejets App Store/Play Store.

**Date** : 2026-02-18

> **Statut à jour** : voir **`docs/CAPACITOR-ETAT-ET-RESTE-A-FAIRE.md`** pour ce qui est fait côté code et ce qu’il reste à faire (config native, env, tests).

---

## 1) Risques audités (liste exhaustive)

### A) ROUTING / NAVIGATION

| Point | Statut | Preuve / Action |
|-------|--------|------------------|
| Routes profondes (ex: `/parking/123`) au lancement | **OK** | Next export statique : toutes les routes sont des dossiers dans `out/`. Ouvrir `out/parking/123/index.html` ou charger avec base path fonctionne. |
| Reload sur route profonde | **OK** | Avec `output: 'export'`, chaque route a son `index.html`. Pas de serveur Next ; en app, `webDir: 'out'` sert les fichiers. Recharger sur `/parking/123` charge `out/parking/123/index.html`. |
| Android back button | **FIXED** | `CapacitorBackButton.tsx` écoute `backButton` et appelle `router.back()`. `capacitor.config.ts` : `App.disableBackButtonHandler: true`. |
| Redirections (auth guard, 404) | **OK** | `ProtectedRoute` redirige vers `/auth/login` et stocke `redirectAfterLogin` en sessionStorage. 404 géré par Next. |

**Conclusion A** : **OK**

---

### B) DEEP LINKS / RETURN URL (CRITIQUE)

| Point | Statut | Preuve / Action |
|-------|--------|------------------|
| Payment success/cancel return URL | **FIXED** | `getAppBaseUrl()` dans `src/lib/app-url.ts` utilisé pour `successUrl` / `cancelUrl` (parking, reservations, parametres). En prod app : définir `NEXT_PUBLIC_APP_URL=https://rentoall.fr` (ou domaine avec Universal Links). |
| Universal Links / App Links | **À CONFIGURER** | Non présents dans le repo (ios/android générés par `cap sync`). À faire côté projet natif : **iOS** Associated Domains `applinks:rentoall.fr`, **Android** intent-filter avec `https://rentoall.fr`. Voir section K. |
| Schéma custom `myapp://` | **OPTIONNEL** | Pas implémenté. Si besoin : configurer URL scheme dans Xcode/AndroidManifest et `App.addListener('appUrlOpen', ...)` dans l’app. |
| Test lien email/navigateur → app | **À TESTER** | Après mise en place Universal Links / App Links, tester un lien vers `https://rentoall.fr/payment/success?...` ouvre l’app. |

**Conclusion B** : **FIXED** (code) ; **KO** tant que Universal Links / App Links ne sont pas configurés et testés sur devices.

---

### C) AUTH / COOKIES / SESSION

| Point | Statut | Preuve / Action |
|-------|--------|------------------|
| Stockage token (JWT) | **FIXED** | Abstraction `src/lib/storage.ts` : sur Capacitor, `setItem`/`removeItem` écrivent aussi dans `@capacitor/preferences` ; `initFromNative()` restaure vers localStorage au démarrage. `api.ts`, login, callbacks, ProtectedRoute, header, parametres utilisent `storage`. |
| Restauration session au relaunch | **FIXED** | `CapacitorStorageInit` appelle `initFromNative()` au montage ; les clés auth sont rechargées depuis Preferences vers localStorage. |
| CORS + credentials | **OK** | API appelée avec `Authorization: Bearer`. Pas de cookies cross-domain pour l’auth (JWT). |
| Boucles login / refresh | **OK** | Pas de refresh token automatique identifié ; logout nettoie le storage. |

**Conclusion C** : **OK**

---

### D) STORAGE / SÉCURITÉ

| Point | Statut | Preuve / Action |
|-------|--------|------------------|
| Secrets (token) en stockage sécurisé | **FIXED** | Token et clés auth dans Capacitor Preferences (persistant, propre à l’app). Abstraction web = localStorage, natif = Preferences + copie localStorage pour lecture sync. |
| Abstraction storage | **FIXED** | `getItem`, `setItem`, `removeItem` dans `src/lib/storage.ts`. Code partagé utilise storage pour auth. |
| Dépendance directe à localStorage | **RÉDUITE** | Auth migrée vers storage. Autres usages (favoris, UI) restent en localStorage ; à migrer si besoin. |
| Quotas IndexedDB / cache | **NON AUDITÉ** | Pas de changement spécifique ; comportement standard WebView. |

**Conclusion D** : **OK**

---

### E) NETWORK / OFFLINE / ERREURS

| Point | Statut | Preuve / Action |
|-------|--------|------------------|
| Détection réseau | **FIXED** | `OfflineScreen.tsx` utilise `navigator.onLine` et événements `offline`/`online`. Optionnel : `@capacitor/network` pour plus de fiabilité. |
| Écran offline + retry | **FIXED** | Composant plein écran avec message et bouton « Réessayer » (reload). Intégré dans `layout.tsx`. |
| Timeouts / erreurs API | **OK** | Axios timeout 30s ; pas d’écran blanc identifié (gestion erreurs dans les pages). |
| Mode avion + retour réseau | **OK** | `navigator.onLine` + events ; retry manuel via le bouton. |

**Conclusion E** : **OK**

---

### F) PERFORMANCE / UX WEBVIEW

| Point | Statut | Preuve / Action |
|-------|--------|------------------|
| Scroll / rubber band | **OK** | UI mobile déjà audité (safe area, overflow, `mobile-page-main`). Voir `docs/mobile-audit-checklist.md`. |
| Freezes (listes, images, maps) | **NON PROUVÉ** | À valider sur device (listes longues, cartes). |
| Lazy loading / images | **OK** | Next Image + `unoptimized: true` en build Capacitor. |
| Libs lourdes / DOM | **OK** | Pas de changement. |
| Clavier mobile (inputs, focus, scroll) | **OK** | Safe area et padding bottom sur les pages. |

**Conclusion F** : **OK** (à confirmer sur device pour listes/maps).

---

### G) PERMISSIONS & INTÉGRATIONS NATIVES

| Point | Statut | Preuve / Action |
|-------|--------|------------------|
| Camera / Photos / Location | **À CONFIGURER** | Utilisation de `<input type="file">` (host/my-places, parametres, influenceur-settings). Pas de plugin Camera dédié. **iOS** : ajouter dans Info.plist `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`, `NSLocationWhenInUseUsageDescription` si utilisés. **Android** : permissions dans manifest. |
| Notifications push | **NON UTILISÉ** | Pas de setup push dans le code. |
| Partage natif | **NON IMPLÉMENTÉ** | Partages via URL / clipboard. Optionnel : `@capacitor/share`. |
| Permissions inutiles | **OK** | Ne demander que ce qui est utilisé (fichiers, éventuellement localisation). |

**Conclusion G** : **À CONFIGURER** (textes Info.plist / manifest selon fonctionnalités réelles).

---

### H) UPLOADS / CAMERA / FICHIERS

| Point | Statut | Preuve / Action |
|-------|--------|------------------|
| `<input type="file">` en WebView | **À TESTER** | Utilisé dans `host/my-places/[id]/page.tsx`, `parametres/page.tsx`, `influenceur-settings/page.tsx`. Comportement iOS/Android à valider sur device. |
| Fallback plugin Camera | **NON IMPLÉMENTÉ** | Si rejet ou bug, envisager `@capacitor/camera`. |
| Permissions + compression | **NON AUDITÉ** | Pas de compression côté client identifiée. |

**Conclusion H** : **À TESTER** sur devices réels.

---

### I) PAIEMENTS / CONFORMITÉ STORE

| Point | Statut | Preuve / Action |
|-------|--------|------------------|
| Type de monétisation | **SERVICE RÉEL** | Location de parkings / espaces (physique). Stripe pour paiement de **services réels** → pas d’obligation In-App Purchase Apple. |
| Stripe checkout + returnUrl | **FIXED** | `successUrl` / `cancelUrl` construites avec `getAppBaseUrl()` (parking, reservations, parametres). En prod : `NEXT_PUBLIC_APP_URL` = domaine avec Universal Links pour rouvrir l’app. |
| Éviter Safari externe non maîtrisé | **OK** | Stripe Checkout redirige vers les URLs configurées ; si Universal Links sont en place, l’app rouvre. |
| Test success/cancel E2E | **À FAIRE** | Tester sur device : checkout → success → retour dans l’app sur la bonne page. |

**Conclusion I** : **OK** (conformité) ; **FIXED** (return URLs) ; **À TESTER** E2E.

---

### J) MINIMUM FUNCTIONALITY APPLE

| Point | Statut | Preuve / Action |
|-------|--------|------------------|
| Valeur « app » au-delà du site | **PARTIEL** | Offline screen, back button Android, storage natif, return URLs / deep links prévus. Optionnel : push, partage natif, biométrie. |
| UI / branding | **OK** | Icon, splash (config Capacitor), nom Rentoall, infos légales dans l’app (parametres, pages légales). |

**Conclusion J** : **OK** (enrichir si rejet « thin wrapper »).

---

### K) CONFIG iOS / ANDROID

| Point | Statut | Preuve / Action |
|-------|--------|------------------|
| iOS Info.plist | **À AJOUTER** | Usage descriptions (camera, photo, location) si utilisés. Associated Domains pour Universal Links. Fichiers dans `ios/App/` après `cap sync`. |
| ATS / HTTPS | **OK** | Pas de cleartext dans le code ; API en HTTPS en prod. |
| AndroidManifest | **À VÉRIFIER** | intent-filters pour App Links (domaine), permissions (camera, storage si besoin). `android/` après `cap sync`. |
| Orientation, status bar, safe area | **OK** | `viewportFit: 'cover'`, safe area dans les styles, `contentInset: 'automatic'` iOS. |

**Conclusion K** : **À CONFIGURER** dans les projets natifs après `cap sync`.

---

### L) ENV / CONFIG MULTI-ENV

| Point | Statut | Preuve / Action |
|-------|--------|------------------|
| dev / staging / prod | **OK** | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_URL` (pour return URLs). Pas de secrets côté client. |
| Variables Next public vs secrets | **OK** | Secrets uniquement côté API/backend. |

**Conclusion L** : **OK**

---

### M) BUILD / RELEASE

| Point | Statut | Preuve / Action |
|-------|--------|------------------|
| Scripts reproductibles | **FIXED** | `build:web`, `build:capacitor`, `cap:sync`, `cap:open:ios`, `cap:open:android`, `build:ios`, `build:android` dans `package.json`. |
| Versioning | **À CONFIGURER** | CFBundleShortVersionString / Build (iOS), versionCode / versionName (Android) dans projets natifs. |
| Signing | **À CONFIGURER** | Certificats iOS, keystore Android ; en dehors du repo. |

**Conclusion M** : **OK** (scripts) ; reste config native + signing.

---

## 2) Correctifs implémentés

- **Storage sécurisé + abstraction** : `src/lib/storage.ts`, `CapacitorStorageInit`, migration auth vers `setItem`/`removeItem`/`getItem`.
- **Return URLs / base URL app** : `src/lib/app-url.ts` + `getAppBaseUrl()` dans paiement (parking, reservations, parametres) et partage.
- **Écran offline** : `OfflineScreen.tsx` + intégration dans `layout.tsx`.
- **Bouton retour Android** : déjà en place (`CapacitorBackButton.tsx`).
- **Gestion background/foreground** : restauration session au cold start via `initFromNative()` ; pas de listener explicite foreground pour l’instant.

---

## 3) Scripts build / release

- `npm run build:web` — build Next classique.
- `npm run build:capacitor` — build Next pour Capacitor (export statique dans `out/`).
- `npm run cap:sync` — sync des projets ios/android.
- `npm run cap:open:ios` / `cap:open:android` — ouvrir Xcode / Android Studio.
- `npm run build:ios` — build Capacitor + sync iOS (archive à faire dans Xcode).
- `npm run build:android` — build Capacitor + sync Android (bundle à faire dans Android Studio).

---

## 4) Rapport final (OK/KO)

| Catégorie | Statut |
|-----------|--------|
| Routing / navigation | **OK** |
| Deep links / return URLs | **FIXED** (code) ; **KO** tant que Universal Links / App Links non configurés et testés |
| Auth / session | **OK** |
| Storage sécurité | **OK** |
| Offline / network | **OK** |
| Performance / UX | **OK** (à valider sur device) |
| Permissions | **À CONFIGURER** (Info.plist / manifest) |
| Uploads | **À TESTER** sur devices |
| Paiements + conformité store | **OK** (service réel ; return URLs en place) |
| Minimum functionality Apple | **OK** |
| Config iOS | **À CONFIGURER** (Associated Domains, usage descriptions) |
| Config Android | **À CONFIGURER** (intent-filters, permissions) |
| Build / release | **OK** (scripts) ; signing à faire côté natif |

---

## 5) Conclusion

**PRÊT POUR TESTFLIGHT + PLAY INTERNAL TESTING** : **CONDITIONNEL**

- **OUI** une fois :
  1. Universal Links (iOS) et App Links (Android) configurés et testés (lien → ouverture de l’app).
  2. `NEXT_PUBLIC_APP_URL` défini en prod (ex. `https://rentoall.fr`).
  3. Info.plist / AndroidManifest complétés (permissions, usage descriptions, Associated Domains / intent-filters).
  4. Tests E2E sur devices : parcours login → home → search → détail → réservation/paiement → success/cancel → reservations → settings → logout ; offline ; back button Android ; upload fichier.
  5. Signing et versioning configurés pour TestFlight et Play Internal Testing.

- **NON** tant que les points 1 à 4 ne sont pas faits et validés.

---

*Checklist QA détaillée : voir `docs/qa-capacitor.md`.*
