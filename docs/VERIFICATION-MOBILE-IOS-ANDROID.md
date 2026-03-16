# Vérification mobile iOS / Android — Rentoall

Ce document recense **tout ce qui est documenté** dans les docs mobile et confirme que c’est **bien implémenté** dans le code (ou indique ce qui reste à faire côté natif / backend).

**Dernière vérification** : 8 mars 2025.

---

## 1. Détection plateforme (AUDIT §1)

| Élément | Statut | Fichier / détail |
|--------|--------|-------------------|
| `isCapacitor()` | ✅ | `src/lib/capacitor.ts` — isNativePlatform, getPlatform, origin |
| `isMobileOrCapacitor()` | ✅ | `src/lib/capacitor.ts` — viewport < 768 ou isCapacitor() |

---

## 2. Homepage et redirections (AUDIT §2)

| Élément | Statut | Fichier / détail |
|--------|--------|-------------------|
| `/` (landing) → mobile : client → `/search-parkings`, hôte → `/mon-calendrier` | ✅ | `src/app/page.tsx` — useLayoutEffect, isMobileOrCapacitor(), router.replace |
| `/home` → idem | ✅ | `src/app/home/page.tsx` — useLayoutEffect, même logique |
| Logo header → `/search-parkings` (mobile) | ✅ | `src/components/sections/header-navigation.tsx` — isMobileOrCap → href search-parkings |
| Logo menu mobile → `/search-parkings` (mobile) | ✅ | Idem, lien menu burger |

---

## 3. Navigation et liens (AUDIT §3)

| Élément | Statut | Fichier / détail |
|--------|--------|-------------------|
| Bascule mode client/hôte → search-parkings / host/my-places (mobile) | ✅ | header-navigation.tsx — toggleUserMode, isMobileOrCap |
| Liens avec handleCapacitorLinkClick ou safePush | ✅ | parking/[id], reservations, host/my-places, messages, favoris, etc. |
| Routes dynamiques : capacitorNavigate (safePush) | ✅ | `src/lib/capacitor.ts` — handleMobileLinkClick → capacitorNavigate pour /reservations/\d+, /parking/\d+, /host/my-places/\d+, /user/\d+ |

---

## 4. Redirections de sécurité (AUDIT §4)

| Élément | Statut | Fichier / détail |
|--------|--------|-------------------|
| Favoris en mode hôte → /host/my-places (mobile) | ✅ | Page favoris + redirection |
| host/my-places sans être hôte → /search-parkings (mobile) | ✅ | Pages host/my-places |

---

## 5. Safe Area (AUDIT §5)

| Élément | Statut | Fichier / détail |
|--------|--------|-------------------|
| viewportFit: "cover" | ✅ | `src/app/layout.tsx` — export const viewport |
| Footer mobile : paddingBottom env(safe-area-inset-bottom) | ✅ | `src/app/globals.css` — .pb-mobile-footer + footer fixe ; `src/components/sections/mobile-footer.tsx` — style paddingBottom |
| Pages : paddingTop/Bottom avec env(safe-area-inset-*) | ✅ | home, parametres, reservations, payment/success, etc. — style inline max(..., env(safe-area-inset-*)) |
| Modales : pb avec safe-area | ✅ | alert-modal, confirmation-modal, RatingModal, LoginRequiredModal, etc. |

---

## 6. API et Capacitor (AUDIT §6)

| Élément | Statut | Fichier / détail |
|--------|--------|-------------------|
| URL API prod (jamais localhost) | ✅ | `src/services/api.ts` — getBaseURL(), PRODUCTION_API_URL |
| Intercepteur 401 → login, nettoyage storage | ✅ | api.ts — intercepteur response |
| CapacitorHttp enabled | ✅ | `capacitor.config.ts` — plugins.CapacitorHttp.enabled: true |

---

## 7. Capacitor config (AUDIT §7, SPECIFICITES §3.1)

| Élément | Statut | Fichier / détail |
|--------|--------|-------------------|
| appId: com.rentoall.app | ✅ | capacitor.config.ts |
| webDir: "out" | ✅ | capacitor.config.ts |
| server.androidScheme / iosScheme: "https" | ✅ | capacitor.config.ts |
| allowNavigation (API, MapTiler) | ✅ | capacitor.config.ts |
| SplashScreen 2.5 s, launchAutoHide | ✅ | capacitor.config.ts — 2500 ms |
| Push : badge, sound, alert | ✅ | capacitor.config.ts — presentationOptions |
| App.disableBackButtonHandler: true | ✅ | capacitor.config.ts |
| android.allowMixedContent: true | ✅ | capacitor.config.ts (dev) |
| ios.contentInset: "automatic" | ✅ | capacitor.config.ts |

---

## 8. Stockage (AUDIT §8)

| Élément | Statut | Fichier / détail |
|--------|--------|-------------------|
| Abstraction storage (getItem/setItem/removeItem) | ✅ | `src/lib/storage.ts` — Web = localStorage, Capacitor = Preferences + localStorage |
| CapacitorStorageInit au lancement | ✅ | `src/app/layout.tsx` + `src/components/CapacitorStorageInit.tsx` — initFromNative(), mise à jour __INITIAL_AUTH_STATE__ |
| auth-state-changed sur setItem('userId') | ✅ | storage.ts — dispatch CustomEvent('auth-state-changed') quand key === 'userId' |

---

## 9. Composants Capacitor (AUDIT §9)

| Composant | Statut | Fichier / détail |
|-----------|--------|-------------------|
| CapacitorPlatformRoot | ✅ | layout.tsx + CapacitorPlatformRoot.tsx — health check, data-platform |
| CapacitorStorageInit | ✅ | layout.tsx + CapacitorStorageInit.tsx |
| CapacitorBackButton | ✅ | layout.tsx + CapacitorBackButton.tsx — gestion bouton retour Android |
| CapacitorPushNotifications | ✅ | layout.tsx + CapacitorPushNotifications.tsx — addPushListeners, registerForPushNotifications, auth-state-changed |
| CapacitorAppUrlListener | ✅ | layout.tsx + CapacitorAppUrlListener.tsx — appUrlOpen → safePush(router, path) |

---

## 10. Touch targets (AUDIT §10)

| Élément | Statut | Fichier / détail |
|--------|--------|-------------------|
| min-h-[44px] / min-w-[44px] sur boutons | ✅ | Utilisé sur modales, formulaires, header, footer (mobile-audit-checklist) |
| touch-manipulation sur cliquables | ✅ | Classes sur boutons et liens mobiles |

---

## 11. Notifications push (NOTIFICATIONS, NOTIFICATIONS-BACKEND)

| Élément | Statut | Fichier / détail |
|--------|--------|-------------------|
| POST /api/users/{userId}/device-tokens, body { pushToken, platform } | ✅ | `src/services/api.ts` — rentoallUsersAPI.registerDeviceToken(userId, pushToken, "ios" \| "android") |
| Envoi du token après permission + registration (FCM/APNs) | ✅ | `src/lib/push-notifications.ts` — listener 'registration' → registerDeviceToken |
| Envoi du token après auth (auth-state-changed) | ✅ | CapacitorPushNotifications écoute auth-state-changed → runInit ou registerTokenOnly |
| Canal Android rentoall_default | ✅ | push-notifications.ts — createDefaultChannel ANDROID_CHANNEL_ID = 'rentoall_default' |
| Navigation au clic : type, reservationId, conversationId, placeId | ✅ | getPathFromNotificationData + pushNotificationActionPerformed → onNavigate(path) |
| Types supportés : new_message, new_reservation, reservation_update, reservation_status, place | ✅ | getPathFromNotificationData — switch sur type |

**Backend** : à mettre en place selon NOTIFICATIONS-BACKEND.md (endpoint device-tokens, FCM v1, APNs, payload data).

---

## 12. Contact / Signalements (API)

| Élément | Statut | Fichier / détail |
|--------|--------|-------------------|
| POST /api/contact/request { title, description, userId? } | ✅ | api.ts — contactAPI.sendContactRequest |
| POST /api/places/report { placeId, reason, description?, reporterId? } | ✅ | api.ts — reportingAPI.reportPlace, PlaceReportDTO |
| POST /api/users/report { userId, reason, description?, reporterId? } | ✅ | api.ts — reportingAPI.reportUser, UserReportDTO |
| Raisons : INACCURATE_OR_INCORRECT, NOT_A_REAL_ACCOMMODATION, SCAM, SHOCKING_CONTENT, ILLEGAL_CONTENT, SPAM, OTHER | ✅ | api.ts — ReportReason type ; UI sans INAPPROPRIATE_BEHAVIOR |

---

## 13. Paiement in-app (Stripe Embedded)

| Élément | Statut | Fichier / détail |
|--------|--------|-------------------|
| uiMode: 'embedded' + clientSecret sur Capacitor | ✅ | parking/[id], reservations, reservations/[id] — isCapacitor() → uiMode embedded, affichage StripeEmbeddedCheckout |
| getAppBaseUrl() pour return URLs (NEXT_PUBLIC_APP_URL) | ✅ | src/lib/app-url.ts — successUrl/cancelUrl Stripe, Stripe Connect returnUrl |
| Deep links : CapacitorAppUrlListener (appUrlOpen) | ✅ | Pour retour Stripe Connect / liens universels |

---

## 14. Config native (capacitor-native-config, SPECIFICITES)

Tout ce qui peut être versionné dans le repo est **conforme**. Le reste est à faire une fois (serveur ou compte développeur).

| Élément | Statut | Détail |
|--------|--------|--------|
| iOS Info.plist : usage descriptions (caméra, photos, localisation) | ✅ | `ios/App/App/Info.plist` |
| iOS Associated Domains (applinks:rentoall.fr) | ✅ | `ios/App/App/App.entitlements` — domaine configuré. **Hors repo** : héberger le fichier AASA sur https://rentoall.fr |
| Android AndroidManifest : permissions + App Links | ✅ | `android/app/src/main/AndroidManifest.xml` — INTERNET, READ_MEDIA_IMAGES, READ_EXTERNAL_STORAGE, CAMERA, ACCESS_*_LOCATION ; intent-filter `https://rentoall.fr` avec `autoVerify="true"`. **Hors repo** : héberger `assetlinks.json` sur https://rentoall.fr |
| iOS UIBackgroundModes remote-notification | ✅ | Info.plist |
| iOS Push (entitlement) | ✅ | App.entitlements `aps-environment` (development ; passer à `production` pour release). **Hors repo** : certificat APNs dans Apple Developer |
| Android Push (config) | ✅ | strings.xml canal `rentoall_default`, build.gradle applique google-services si présent. **Hors repo** : placer `google-services.json` dans `android/app/` (non versionné) |

---

## 15. Fichiers natifs dans le repo — iOS et Android ✅

Vérification directe des dossiers **ios/App** et **android/** : **tout est conforme** pour ce qui est dans le repo.

| Élément | iOS | Android |
|--------|-----|---------|
| **Permissions / usage** | ✅ Info.plist : NSCameraUsageDescription, NSPhotoLibraryUsageDescription, NSLocationWhenInUseUsageDescription | ✅ AndroidManifest : INTERNET, READ_MEDIA_IMAGES, READ_EXTERNAL_STORAGE, CAMERA, ACCESS_FINE_LOCATION, ACCESS_COARSE_LOCATION |
| **Push** | ✅ UIBackgroundModes `remote-notification` ; App.entitlements `aps-environment` | ✅ strings.xml `default_notification_channel_id` = rentoall_default ; meta-data AndroidManifest ; build.gradle (google-services si fichier présent) |
| **Identifiants** | ✅ Bundle ID com.rentoall.app (Xcode) | ✅ applicationId com.rentoall.app ; minSdk 24, targetSdk 36 |
| **Deep links / retour Stripe** | ✅ Associated Domains dans App.entitlements (`applinks:rentoall.fr`) | ✅ Intent-filters App Links dans AndroidManifest (`https://rentoall.fr`, autoVerify) |

**Hors repo (une fois avant prod)** : fichier AASA sur le serveur (iOS), `assetlinks.json` sur le serveur (Android), `google-services.json` dans `android/app/`, certificat APNs (Apple Developer), et pour release App Store passer `aps-environment` à `production`.

---

## 15bis. Checklist avant soumission App Store & Google Play

Pour **répondre aux exigences Apple et Google** et pouvoir publier :

| Étape | iOS | Android |
|-------|-----|---------|
| **Dans le repo (déjà fait)** | ✅ Permissions, Associated Domains, push (entitlements), UIBackgroundModes | ✅ Permissions, App Links, canal push, build.gradle |
| **Serveur** | Héberger **apple-app-site-association** sur https://rentoall.fr (pour retour Stripe / deep links) | Héberger **assetlinks.json** sur https://rentoall.fr |
| **Push en prod** | Certificat/clé APNs dans Apple Developer ; dans Xcode passer `aps-environment` à **production** pour la release | Placer **google-services.json** dans `android/app/` (téléchargé depuis Firebase) |
| **Compte développeur** | Apple Developer (99 €/an) | Google Play Console (paiement unique) |
| **Signing** | Team + certificat dans Xcode (Automatic ou manuel) | Keystore release configuré (build.gradle ou Android Studio) |
| **Build** | `NEXT_PUBLIC_APP_URL` et `NEXT_PUBLIC_API_URL` définis avant `npm run build:capacitor` | Idem |
| **Fiche store** | App Store Connect : description, captures, politique de confidentialité (URL), questionnaire | Play Console : description, captures, politique de confidentialité, questionnaire contenu |
| **Tests** | Checklist `docs/qa-capacitor.md` sur device réel ; TestFlight pour bêta | Checklist QA ; Internal testing puis production |

**En résumé** : le **code et la config Capacitor (dans le repo) sont conformes** aux exigences techniques iOS et Android. Pour **lancer sur les stores**, il reste : config serveur (AASA, assetlinks), fichiers et certificats hors repo (google-services.json, APNs), comptes et signing, puis fiches et tests.

## 16. Variables d’environnement (SPECIFICITES §3.2)

| Variable | Usage |
|----------|--------|
| NEXT_PUBLIC_APP_URL | Return URLs Stripe, deep links (ex. https://rentoall.fr) |
| NEXT_PUBLIC_API_URL | URL de l’API (ex. https://rentoall.onrender.com/api). En prod pas de localhost. |

Figées au build Capacitor ; à définir avant `npm run build:capacitor`.

---

## 17. Résumé

- **Côté code (Next.js + Capacitor config)** : tout ce qui est décrit dans AUDIT-MOBILE-IOS-ANDROID.md, SPECIFICITES-ANDROID-IOS.md, NOTIFICATIONS.md, capacitor-native-config.md est **implémenté** et vérifié.
- **Côté natif (ios/, android/)** : **conforme** dans le repo — permissions, Associated Domains (iOS), App Links (Android), push (entitlements, canal, UIBackgroundModes). Hors repo : AASA et assetlinks.json sur le serveur, google-services.json dans android/app/, certificat APNs, et aps-environment → production pour release App Store.
- **Côté backend** : endpoint device-tokens (NOTIFICATIONS-BACKEND.md), contact/request, places/report, users/report ; Stripe avec ui_mode embedded et clientSecret.

Si vous ajoutez une fonctionnalité mobile, mettre à jour ce fichier et les docs concernés.

---

## 18. Documents dédiés Capacitor / Android / iOS (alignés et vérifiés)

| Document | Rôle |
|----------|------|
| **AUDIT-MOBILE-IOS-ANDROID.md** | Comportements (redirections, safe area, navigation, composants). |
| **SPECIFICITES-ANDROID-IOS.md** | Par plateforme : prérequis, permissions, App Links, push, stores. |
| **capacitor-native-config.md** | Info.plist, AndroidManifest, Associated Domains, storage. |
| **VERIFICATION-MOBILE-IOS-ANDROID.md** | Ce document — vérification point par point. |
| **CAPACITOR-GUIDE-COMPLET.md** | Prérequis, lancer iOS/Android, build App Store, commandes, dépannage. |
| **CAPACITOR-ETAT-ET-RESTE-A-FAIRE.md** | Ce qui est fait / reste à faire, verdict TestFlight / Play. |
| **qa-capacitor.md** | Checklist QA sur device avant soumission. |
| **NOTIFICATIONS.md** | Push côté app (token, clic, payload data). |
| **NOTIFICATIONS-BACKEND.md** | Push côté backend (endpoint, FCM, APNs). |
| **STRIPE-EMBEDDED-BACKEND.md** | Paiement in-app (modifications backend). |
| **BACKEND-CORS-ORIGINS-SIMULATEURS.md** | CORS et origines pour simulateurs / Capacitor. |

Tous ces documents ont été passés en revue pour cohérence avec le code et entre eux (8 mars 2025).
