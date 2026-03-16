# Rentoall — Web + applications mobiles (Capacitor)

> **État et reste à faire** : **`docs/CAPACITOR-ETAT-ET-RESTE-A-FAIRE.md`** — Guide complet (prérequis, iOS, App Store) : **`docs/CAPACITOR-GUIDE-COMPLET.md`**.

Ce projet est **une seule codebase** :
- **Web** : site Next.js classique (build standard, déployable sur Vercel/autre).
- **Mobile** : les mêmes pages peuvent tourner dans une WebView native via **Capacitor**, pour des apps **Android** et **iOS**.

Aucune réécriture en “pur React” : Next.js (React) est conservé.

**Recommandation** : pour avoir tout de suite des apps Android/iOS sans toucher aux routes dynamiques, déployez le site (Vercel, etc.) puis dans `capacitor.config.ts` configurez `server.url` vers l’URL de production. L’app native chargera alors le site en ligne (voir §4 B).  
Si vous voulez une app **hors ligne** (export statique), il faudra ajouter `generateStaticParams` aux routes dynamiques (voir §4 A).

---

## Prérequis

- **Node.js** 18+
- **Android** : Android Studio + SDK (pour build Android)
- **iOS** : Xcode (Mac uniquement) + CocoaPods
- **Capacitor** : déjà installé (`@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, `@capacitor/ios`)

---

## 1. Build Web (comportement actuel)

```bash
npm run build
npm run start
```

- Pas d’export statique.
- Routes API Next.js disponibles (ex. `/api/index`).
- Déploiement classique (Vercel, etc.).

---

## 2. Build pour les applications mobiles (Capacitor)

### 2.1 Export statique + sync Capacitor

```bash
# Génère le site statique dans ./out (optimisé pour mobile)
npm run build:capacitor

# Copie out/ vers android/ et ios/ et met à jour les configs natives
npx cap sync
```

**Sous Windows** (variable d’environnement) :

```cmd
set CAPACITOR_BUILD=1 && npm run build
npx cap sync
```

### 2.2 Ouvrir et lancer les apps

**Android :**

```bash
npm run cap:open:android
# ou
npx cap open android
```

Puis dans Android Studio : Run sur un émulateur ou un appareil.

**iOS (Mac uniquement) :**

```bash
npm run cap:open:ios
# ou
npx cap open ios
```

Puis dans Xcode : Run sur simulateur ou appareil.

### 2.3 Tout en une commande

```bash
# Build + sync + ouvrir Android
npm run mobile:android

# Build + sync + ouvrir iOS
npm run mobile:ios
```

---

## 3. Configuration

### 3.1 Next.js (`next.config.ts`)

- Si **`CAPACITOR_BUILD=1`** :
  - `output: 'export'` → build statique dans `out/`
  - `trailingSlash: true` → URLs compatibles WebView
  - `images: { unoptimized: true }` → pas de serveur d’optimisation d’images (nécessaire en statique)

- Sinon : build Next.js normal (Web).

### 3.2 Capacitor (`capacitor.config.ts`)

- **appId** : `com.rentoall.app` (à adapter pour la prod)
- **appName** : `Rentoall`
- **webDir** : `out` (dossier généré par `next build` quand `CAPACITOR_BUILD=1`)

Pour pointer l’app native vers le serveur de dev Next (éviter de rebuild à chaque fois) :

```ts
server: {
  url: 'http://192.168.x.x:3000',
  cleartext: true,
},
```

(Décommenter dans `capacitor.config.ts` et remplacer par l’IP de votre machine.)

---

## 4. Deux façons d’utiliser Capacitor

### A) Export statique (hors ligne, build local)

- **Build** : `npm run build:capacitor` → génère `out/` (les routes API sont temporairement exclues).
- **Limitation** : les routes dynamiques (ex. `/parking/[id]`, `/create/[id]`) doivent exposer `generateStaticParams` pour l’export. Sans ça, le build échoue. Pour l’instant, ajoutez `generateStaticParams` (éventuellement avec un placeholder) sur chaque segment dynamique, ou privilégiez le mode B.

### B) Chargement depuis une URL (recommandé pour démarrer)

- Vous déployez le site Next.js comme d’habitude (Vercel, etc.).
- Dans `capacitor.config.ts`, vous pointez l’app native vers cette URL :

```ts
server: {
  url: 'https://votre-domaine.com',
  cleartext: true,  // uniquement si vous testez en http
},
```

- Puis `npx cap sync` et ouvrir Android/iOS. L’app native affiche alors le site en ligne ; pas besoin d’export statique ni de gérer les routes dynamiques. L’utilisateur doit être connecté à internet.

## 5. Différences Web vs build Capacitor (export statique)

| Élément              | Web                    | Build Capacitor (export statique) |
|----------------------|------------------------|-----------------------------------|
| Build                | `npm run build`        | `npm run build:capacitor`         |
| Sortie               | `.next/`               | `out/`                            |
| Routes API Next.js   | Disponibles            | Exclues pendant le build          |
| Images               | Optimisation Next      | `unoptimized: true`               |
| Backend métier       | `NEXT_PUBLIC_API_URL`  | Idem (appel depuis la WebView)    |

L’app utilise déjà une API externe (`NEXT_PUBLIC_API_URL`). En build Capacitor, elle continue d’appeler cette URL depuis la WebView ; seule l’API Next.js (ex. `/api/index`, `/api/chat`) n’est pas disponible dans l’app native.

---

## 6. Premier déploiement des projets natifs

### Première fois : créer les projets Android et iOS

Si les dossiers `android/` et `ios/` n’existent pas encore :

```bash
# 1. Générer le site statique (obligatoire : Capacitor a besoin de out/)
npm run build:capacitor

# 2. Créer le projet Android
npx cap add android

# 3. Créer le projet iOS (Mac uniquement)
npx cap add ios

# 4. Synchroniser le contenu
npx cap sync
```

Ensuite, ouvrir et lancer comme ci-dessous.

### Android

1. `npm run build:capacitor && npx cap sync android`
2. `npx cap open android`
3. Dans Android Studio : configurer une clé de signature si besoin, puis Build → Run.

### iOS

1. `npm run build:capacitor && npx cap sync ios`
2. `npx cap open ios`
3. Dans Xcode : choisir l’équipe (Team) et un device/simulateur, puis Run.

---

## 7. Bonnes pratiques

- **Safe area** : le CSS utilise déjà `env(safe-area-inset-*)` et des classes type `mobile-page-main` pour le padding bas (footer, barre gestuelle).
- **Viewport** : le layout inclut les meta nécessaires ; Capacitor gère le viewport dans la WebView.
- **Plugins** : pour caméra, géoloc, push, etc., installer les plugins Capacitor (ex. `@capacitor/camera`, `@capacitor/geolocation`) et les utiliser dans le code ; le build Web reste inchangé.
- **Identifiants** : avant publication, changer `appId` dans `capacitor.config.ts` et les identifiants dans les projets Android/iOS (package name, bundle id).

---

## 8. Récap des commandes

| Commande                | Rôle                                      |
|-------------------------|-------------------------------------------|
| `npm run build`         | Build Web classique                       |
| `npm run build:capacitor` | Build statique pour mobile (`out/`)     |
| `npx cap sync`          | Sync `out/` → projets Android + iOS       |
| `npx cap open android`  | Ouvrir le projet Android                  |
| `npx cap open ios`      | Ouvrir le projet iOS                      |
| `npm run mobile:android`| Build Capacitor + sync + ouvrir Android   |
| `npm run mobile:ios`    | Build Capacitor + sync + ouvrir iOS       |

---

*Dernière mise à jour : février 2025*
