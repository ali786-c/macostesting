# Capacitor — Structure du projet et fonctionnement (aligné référence Vite)

Ce document décrit la **structure et le flux** Capacitor sur ce projet **Next.js**, en miroir du document de référence « Capacitor – fonctionnement complet et structure » (projet Vite). Même logique : une codebase, un build, trois cibles (web, Android, iOS).

---

## 1. Rôle de Capacitor ici

- L’app native est un **conteneur** (WebView) qui affiche **le même code** que le site : les fichiers générés par le build Next (dossier **`out/`**).
- **Une seule codebase** : Next.js pour le web et pour les apps mobiles ; pas de deuxième codebase.
- À chaque **`npx cap sync`**, le contenu de **`out/`** est copié dans les projets Android et iOS.

---

## 2. Ce qui a été fait (checklist alignée référence)

### 2.1 Installation et configuration de base

| Élément | Fait | Détail |
|--------|------|--------|
| Packages npm | ✅ | `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, `@capacitor/ios`, `@capacitor/preferences` (voir `package.json`) |
| Fichier de config | ✅ | `capacitor.config.ts` à la racine : `appId`, `appName`, `webDir: "out"`, `server.androidScheme`, `plugins.SplashScreen`, `App.disableBackButtonHandler` |
| Build web unique pour mobile | ✅ | Next avec `CAPACITOR_BUILD=1` produit **`out/`** (export statique ; pas de `base` / basePath) |
| Point d’entrée | ✅ | App Router : `app/layout.tsx` (meta viewport, theme-color, apple-mobile-web-app*) |

### 2.2 Plateformes

| Plateforme | Fait | Commande |
|------------|------|----------|
| Android | ✅ | `npm run cap:add:android` ou `npx cap add android` → dossier **`android/`** |
| iOS | ✅ | `npm run cap:add:ios` ou `npx cap add ios` → dossier **`ios/`** (Mac) |

### 2.3 Code métier lié à Capacitor

| Élément | Fait | Fichier / usage |
|--------|------|------------------|
| Détection plateforme | ✅ | Hook **`useDeviceOS()`** dans `src/hooks/useDeviceOS.ts` (retourne `"ios"` \| `"android"` \| `"web"` ; utilise `getPlatform()` de `src/lib/capacitor.ts`) |
| Utilisation du hook | ✅ | **`CapacitorPlatformRoot`** dans `app/layout.tsx` (expose `data-platform` pour adapter l’UI) ; `getPlatform()` / `isCapacitor()` utilisés dans storage, app-url, back button, appUrlOpen |
| Pas de logique native custom | ✅ | Aucun code Java/Kotlin ou Swift métier : tout reste en React/Next ; activité principale = bridge Capacitor |

### 2.4 Scripts et automatisation

| Script | Fait | Rôle |
|--------|------|------|
| npm | ✅ | `cap:add:android`, `cap:add:ios`, `cap:sync`, `cap:sync:ios`, `cap:open`, `cap:open:android`, `cap:open:ios`, `cap:build`, `ios:dev`, `mobile:ios`, `mobile:android`, `android:debug`, `android:release`, `android:install` |
| Shell | ✅ | `scripts/init-android.sh` (build → cap add android si absent → cap sync) ; `scripts/dev-ios.sh` (build → cap sync ios → open Xcode) |

### 2.5 Config et identifiants

| Plateforme | Fait | Détail |
|------------|------|--------|
| Capacitor | ✅ | `capacitor.config.ts` : `appId: "com.rentoall.app"`, `appName: "Rentoall"`, `webDir: "out"`, `server.androidScheme: "https"` |
| Android / iOS | À faire après `cap add` | Même **appId** dans `applicationId` (Android) et Bundle Identifier (iOS) ; permissions et usage descriptions selon besoin (voir `docs/capacitor-native-config.md`) |

---

## 3. Structure du projet (nécessaire pour que Capacitor fonctionne)

### 3.1 À la racine

```
easypark/
├── capacitor.config.ts    ← Config Capacitor (obligatoire)
├── package.json           ← Scripts cap:* et dépendances @capacitor/*
├── next.config.ts         ← Si CAPACITOR_BUILD=1 : output: 'export', trailingSlash, images.unoptimized
├── scripts/
│   ├── capacitor-build.mjs  ← Build Next avec CAPACITOR_BUILD=1, masque app/api
│   ├── init-android.sh      ← Init Android (build + cap add si besoin + sync)
│   └── dev-ios.sh           ← Build + sync ios + open Xcode
└── ...
```

- **capacitor.config.ts** : doit définir **`webDir: "out"`** pour que `cap sync` sache quel dossier copier.
- **next.config.ts** : en build Capacitor, pas de basePath ; les chemins restent `/`.

### 3.2 Dossier `src/` (app Next.js)

```
src/
├── app/
│   ├── layout.tsx         ← Layout racine ; inclut CapacitorPlatformRoot, CapacitorStorageInit, etc.
│   ├── page.tsx
│   └── ...
├── hooks/
│   └── useDeviceOS.ts     ← useDeviceOS() → "ios" | "android" | "web" (aligné référence)
├── lib/
│   ├── capacitor.ts      ← isCapacitor(), getPlatform()
│   ├── storage.ts        ← Abstraction storage (Preferences en natif)
│   └── app-url.ts        ← getAppBaseUrl() pour return URLs
├── components/
│   ├── CapacitorPlatformRoot.tsx  ← Utilise useDeviceOS(), expose data-platform
│   ├── CapacitorBackButton.tsx
│   ├── CapacitorAppUrlListener.tsx
│   ├── CapacitorStorageInit.tsx
│   └── OfflineScreen.tsx
└── ...
```

- Le layout utilise le hook via **CapacitorPlatformRoot** (même logique que « Layout utilise useDeviceOS » dans la référence).
- Aucun fichier spécial Capacitor ailleurs que les composants/listés ci-dessus et `lib/capacitor.ts`.

### 3.3 Dossier `out/` (généré par Next)

```
out/
├── index.html
├── [routes]/
│   └── index.html
├── ...
```

- **out/** est généré par **`npm run build:capacitor`**. C’est la sortie web pour mobile.
- **Ne pas commiter** `out/` : recréé à chaque build et copié par Capacitor.

### 3.4 Dossier `android/` (après `cap add android`)

- Créé par **`npx cap add android`**.
- **assets** (ou équivalent selon version Capacitor) : rempli par **`npx cap sync`** avec le contenu de **out/** ; ne pas modifier à la main.
- **applicationId** dans `app/build.gradle` doit être égal à **appId** dans `capacitor.config.ts` (**com.rentoall.app**).

### 3.5 Dossier `ios/` (après `cap add ios`)

- Créé par **`npx cap add ios`** (Mac).
- Dossier **public** (ou équivalent) : copie de **out/** par **`npx cap sync ios`** ; ne pas modifier à la main.
- **Bundle Identifier** dans Xcode = **appId** (**com.rentoall.app**).

---

## 4. Flux exact : comment ça fonctionne

### 4.1 Développement web uniquement

- **`npm run dev`** → Next sert l’app ; aucun Capacitor.

### 4.2 Build pour le mobile

1. **`npm run build:capacitor`** → exécute `scripts/capacitor-build.mjs` (masque `app/api`, lance `next build` avec `CAPACITOR_BUILD=1`) → génère **out/**.
2. **`npx cap sync`** (ou `cap sync ios` / `cap sync android`) → copie **out/** vers les projets natifs et met à jour les plugins.
3. **Ouvrir / lancer** :
   - **Android** : `npm run cap:open` ou `npm run mobile:android` → Android Studio → Run.
   - **iOS** : `npm run cap:open:ios` ou `npm run ios:dev` / `npm run mobile:ios` → Xcode → Run.

### 4.3 Lien build web ↔ natif

```
  npm run build:capacitor
       ↓
  out/  (fichiers statiques Next)
       ↓
  npx cap sync  (ou cap sync android / cap sync ios)
       ↓
  Copie de out/ vers android/ et ios/
       ↓
  L’app native charge le contenu depuis ces dossiers (WebView).
```

---

## 5. Fichier de configuration Capacitor

**`capacitor.config.ts`** (racine) :

- **appId** : `com.rentoall.app` (aligné avec Android et iOS).
- **appName** : `Rentoall`.
- **webDir** : `out` (ne pas changer tant que Next produit `out/`).
- **server.androidScheme** : `https`.
- **plugins.SplashScreen** : `launchShowDuration: 0`, `launchAutoHide: true`.
- **plugins.App** : `disableBackButtonHandler: true` (back géré côté front).

---

## 6. Scripts npm (référence)

| Script | Commande | Usage |
|--------|----------|------|
| `cap:add:android` | `npx cap add android` | Ajouter la plateforme Android (une fois) |
| `cap:add:ios` | `npx cap add ios` | Ajouter la plateforme iOS (une fois) |
| `cap:sync` | `npx cap sync` | Copier out/ vers Android + iOS |
| `cap:sync:ios` | `npx cap sync ios` | Sync uniquement iOS |
| `cap:open` | `npx cap open android` | Ouvrir Android Studio |
| `cap:open:ios` | `npx cap open ios` | Ouvrir Xcode |
| `cap:build` | `npm run build:capacitor && npx cap sync` | Build web puis sync |
| `ios:dev` | `npm run mobile:ios` | Build + sync iOS + ouvrir Xcode |
| `android:debug` | `cd android && ./gradlew assembleDebug` | APK debug |
| `android:install` | `cd android && ./gradlew installDebug` | Installer l’APK debug sur l’appareil |

---

## 7. Points critiques (comme dans la référence)

1. **Toujours builder avant sync** : après modification du code, **npm run build:capacitor** puis **npx cap sync** (ou cap sync ios/android) avant de lancer l’app native.
2. **Ne pas modifier à la main** le contenu copié dans **android/** et **ios/** par `cap sync` (écrasé à chaque sync).
3. **Même appId** partout : `capacitor.config.ts`, `applicationId` (Android), Bundle Identifier (iOS).
4. **webDir = "out"** : si le dossier de sortie Next change, adapter **webDir** en conséquence.

---

## 8. Résumé en une phrase

**Capacitor ne fait pas tourner une deuxième app : il prend le build web Next (dossier `out/`), le copie dans les projets Android et iOS avec `cap sync`, et les apps natives affichent ce contenu dans un WebView ; la logique et l’UI restent dans le code Next.js/React, avec un seul fichier de config à la racine (`capacitor.config.ts`), le hook `useDeviceOS()` pour la plateforme, et des scripts npm/shell pour build, sync et run.**

---

*Voir aussi : `docs/CAPACITOR-GUIDE-COMPLET.md`, `docs/CAPACITOR-ETAT-ET-RESTE-A-FAIRE.md`, `docs/CAPACITOR-CONFORMITE-DOC-REFERENCE-VITE.md`.*
