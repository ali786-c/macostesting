# Capacitor — État actuel et ce qu’il reste à faire

**Document unique de référence** pour savoir où en est le projet Rentoall côté Capacitor (iOS/Android) et **ce qu’il reste à faire** avant TestFlight / Play Internal Testing.

*Dernière mise à jour : mars 2025*

---

## 1. Ce qui est fait (côté code)

| Élément | Fichier(s) / preuve |
|--------|----------------------|
| **Export statique** | `next.config.ts` (CAPACITOR_BUILD → `output: 'export'`, `trailingSlash: true`) ; `scripts/capacitor-build.mjs` (masque `app/api` pendant le build). |
| **Config Capacitor** | `capacitor.config.ts` : `webDir: 'out'`, `server.androidScheme: 'https'`, SplashScreen, `App.disableBackButtonHandler: true`, `android.allowMixedContent: true` (à passer à `false` en prod si tout est en HTTPS). |
| **Storage auth** | `src/lib/storage.ts` (getItem, setItem, removeItem, initFromNative avec `@capacitor/preferences`) ; `CapacitorStorageInit` dans le layout ; auth (api, login, callbacks, ProtectedRoute, header, parametres) utilise cette abstraction. |
| **Return URLs** | `src/lib/app-url.ts` avec `getAppBaseUrl()` ; utilisé pour Stripe (parking, reservations, parametres) et partage d’URL. |
| **Page 404** | `src/app/not-found.tsx` (exportée dans `out/`). |
| **Meta « app »** | `src/app/layout.tsx` : `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, `apple-mobile-web-app-title`. |
| **Intercepteur 401** | `src/services/api.ts` : sur 401 (hors pages auth), nettoyage storage + redirection vers `/auth/login?session_expired=1`. |
| **Flash auth au démarrage** | `CapacitorStorageInit` : après `initFromNative()`, mise à jour de `window.__INITIAL_AUTH_STATE__` + dispatch `storage`. |
| **Deep link listener** | `src/components/CapacitorAppUrlListener.tsx` : `App.addListener('appUrlOpen', ...)` → `safePush(router, path)` (sur Capacitor, safePush utilise `window.location` pour la navigation). Intégré dans le layout. |
| **Offline** | `OfflineScreen.tsx` dans le layout (navigator.onLine + bouton Réessayer). |
| **Bouton retour Android** | `CapacitorBackButton.tsx` + `capacitor.config.ts` avec `App.disableBackButtonHandler: true`. |
| **Build reproductible** | `package.json` : build:web, build:capacitor, build:fix, cap:sync, cap:open:ios, cap:open:android, build:ios, build:android, mobile:ios, mobile:android. |
| **Layouts dynamiques** | Chaque segment `[id]` a un `layout.tsx` avec `generateStaticParams()` (et Suspense pour `parking/[id]`) pour que l’export statique passe. |

**Résumé** : Côté code applicatif (Next.js + composants Capacitor), tout ce qui était recommandé par les audits est en place. Il ne reste **aucune tâche de code** obligatoire pour Capacitor dans ce repo.

---

## 2. Ce qu’il reste à faire (hors code)

### 2.1 Projets natifs (obligatoire)

- [ ] **Créer les dossiers `ios/` et `android/`** s’ils n’existent pas :  
  `npm run build:capacitor` puis `npx cap add ios` et `npx cap add android`, puis `npx cap sync`.
- [ ] **iOS — Info.plist** (dans Xcode) :  
  - Usage descriptions : `NSPhotoLibraryUsageDescription`, `NSCameraUsageDescription`, `NSLocationWhenInUseUsageDescription` (selon fonctionnalités utilisées).  
  - **Associated Domains** : `applinks:rentoall.fr` (ou le domaine de `NEXT_PUBLIC_APP_URL`).  
  Voir `docs/capacitor-native-config.md`.
- [ ] **Android — AndroidManifest** :  
  - Permissions (INTERNET, READ_MEDIA_IMAGES, CAMERA, ACCESS_FINE_LOCATION selon besoin).  
  - **App Links** (intent-filters) pour le domaine de retour.  
  - En release : `usesCleartextTraffic="false"`.  
  Voir `docs/capacitor-native-config.md`.
- [ ] **Signing** : Team et certificats iOS ; keystore Android. Configurés dans Xcode / Android Studio, pas dans le repo.

### 2.2 Environnement (obligatoire pour prod)

- [ ] **`NEXT_PUBLIC_APP_URL`** défini au build de prod (ex. `https://rentoall.fr`). Utilisé pour les return URLs Stripe ; sans Universal Links / App Links, le lien ouvrira le navigateur au lieu de l’app.
- [ ] **`NEXT_PUBLIC_API_URL`** défini au build de prod (ex. `https://api.rentoall.fr/api`).
- [ ] **`.env.example`** (recommandé) : lister `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_URL` sans valeurs sensibles. Si absent, le faire une fois pour l’équipe.

### 2.3 Universal Links / App Links (obligatoire pour retour paiement)

- [ ] **Serveur** : héberger le fichier **apple-app-site-association** (iOS) et la verification Android pour le domaine (ex. `https://rentoall.fr`).
- [ ] **Tester** : un lien vers `https://rentoall.fr/parking/123` ou `/payment/success?...` ouvre l’app (pas le navigateur) sur device.

### 2.4 Tests sur appareil (obligatoire avant soumission)

À exécuter sur **devices réels** (ou simulateur) — checklist détaillée dans `docs/qa-capacitor.md` :

- [ ] **Parcours core** : Login → Home → Search → Détail → Réservation/Paiement → Success/Cancel → Réservations → Paramètres → Logout.
- [ ] **Refresh** sur une route profonde (ex. `/parking/123`) : pas d’écran blanc ni 404.
- [ ] **Retour Stripe** (success et cancel) : l’app se rouvre et affiche la bonne page.
- [ ] **Mode avion** : écran « Pas de connexion » puis « Réessayer » au retour du réseau.
- [ ] **Bouton retour Android** : navigation arrière cohérente.
- [ ] **Upload photo** (galerie / caméra) : au moins un flux OK sur iOS et Android (host/my-places, parametres, influenceur-settings).
- [ ] **Session** : après login, kill app puis rouvrir → utilisateur toujours connecté.

### 2.5 Optionnel (améliorations)

- **Favoris** : migrer vers `src/lib/storage.ts` (ou une clé Preferences) pour limiter la purge iOS (actuellement en localStorage direct).
- **allowMixedContent** : en prod tout-HTTPS, passer à `false` dans `capacitor.config.ts`.
- **Refresh token** : si le backend en fournit un, l’utiliser dans un intercepteur sur 401 avant redirection login.
- **@capacitor/network** : en complément de `navigator.onLine` pour une détection offline plus fiable.

---

## 3. Verdict : prêt pour TestFlight / Play Internal Testing ?

| Condition | Statut |
|-----------|--------|
| Code (routing, auth, storage, 404, 401, deep link listener, offline, back button, build) | ✅ Fait |
| Projets `ios/` et `android/` créés et synchronisés | ⬜ À faire |
| Info.plist + Associated Domains (iOS) | ⬜ À faire |
| AndroidManifest (permissions + App Links) + cleartext false en release | ⬜ À faire |
| `NEXT_PUBLIC_APP_URL` et `NEXT_PUBLIC_API_URL` en prod | ⬜ À faire |
| Universal Links / App Links configurés et testés | ⬜ À faire |
| Tests manuels (parcours, offline, paiement, upload, session) sur device | ⬜ À faire |
| Signing (iOS + Android) | ⬜ À faire |

**Conclusion** : **OUI, prêt pour TestFlight + Play Internal Testing** dès que les points 2.1 à 2.4 et le signing sont faits et validés. Aucun correctif de code supplémentaire n’est requis pour Capacitor.

---

## 4. Documents à utiliser

| Document | Usage |
|----------|--------|
| **Ce fichier** (`CAPACITOR-ETAT-ET-RESTE-A-FAIRE.md`) | Référence unique : ce qui est fait, ce qu’il reste à faire, verdict. |
| `CAPACITOR-GUIDE-COMPLET.md` | Prérequis, lancer sur iOS, build pour l’App Store, commandes, dépannage. |
| `capacitor-native-config.md` | Détail Info.plist, AndroidManifest, Associated Domains, règle storage. |
| `qa-capacitor.md` | Checklist QA à cocher sur devices avant soumission. |
| `VERIFICATION-MOBILE-IOS-ANDROID.md` | Vérification point par point (code + natif + backend). |
| `NOTIFICATIONS.md` / `NOTIFICATIONS-BACKEND.md` | Push (app + backend). |
| `STRIPE-EMBEDDED-BACKEND.md` | Paiement in-app (backend). |
| `capacitor-audit.md` / `capacitor-audit-complet.md` | Audits détaillés (historique) ; les écarts signalés ont été corrigés. |

---

*Pour toute question « est-ce que X est prêt pour Capacitor ? », se référer à la section 1 (fait) et 2 (reste à faire) de ce document.*
