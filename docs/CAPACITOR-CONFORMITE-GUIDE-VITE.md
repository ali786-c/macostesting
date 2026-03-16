# Vérification conformité — Guide Vite PWA + Capacitor vs projet Rentoall (Next.js + Capacitor)

Ce document compare **point par point** le guide technique “PWA + Android + iOS avec Vite et Capacitor” à l’état actuel du projet **Rentoall (Next.js + Capacitor)**. On indique ce qui est **conforme** (ou équivalent), **différent** (à cause de Next.js), ou **manquant** à traiter.

---

## Rappel : différence de stack

| Guide (référence) | Projet Rentoall |
|-------------------|------------------|
| **Vite 5** + React | **Next.js 16** + React |
| Build → `dist/` | Build Capacitor → `out/` |
| `react-router-dom` | Next.js App Router |
| Variables `VITE_*` + `import.meta.env` | Variables `NEXT_PUBLIC_*` + `process.env` |
| PWA (vite-plugin-pwa, Workbox) | Pas de PWA dans le projet (optionnel) |
| Point d’entrée `index.html` + `main.tsx` | `app/layout.tsx` + `app/page.tsx` |

Beaucoup de différences sont **normales** (stack différente), pas des oublis.

---

## 1. Pourquoi quitter Next.js ? (section 1 du guide)

**Conforme / N/A.**  
Le guide explique pourquoi **leur** projet a choisi Vite (build statique unique, PWA, une sortie pour web + natif). Ici on **reste sur Next.js** : on a déjà un export statique pour Capacitor (`output: 'export'`, `trailingSlash: true`) et une seule sortie `out/` pour le natif. Pas de migration Vite nécessaire.

---

## 2. Stack technique globale (section 2)

| Élément guide | Statut projet Rentoall |
|---------------|------------------------|
| Build / dev | **Équivalent** — Next.js au lieu de Vite (`next dev`, `next build`, `build:capacitor` pour `out/`) |
| UI React + TypeScript | **Conforme** — React 19, TypeScript |
| PWA (manifest + SW) | **Différent** — Pas de PWA (pas de vite-plugin-pwa ni Workbox). Optionnel si vous ne ciblez pas l’installabilité web. |
| Capacitor 8 | **Conforme** — @capacitor/core, cli, android, ios ^8.1.0 |
| Routing | **Équivalent** — App Router Next.js au lieu de react-router-dom |
| Styles Tailwind | **Conforme** — Tailwind CSS |
| State / API | **Équivalent** — Contexts + API axios (pas Zustand/TanStack Query dans le guide, mais équivalent métier) |

**Résumé** : Stack différente mais objectif identique (une codebase → web + Android + iOS). Pas de changement requis pour “être comme le guide”.

---

## 3. Chaîne de build (section 3)

| Guide | Rentoall |
|-------|----------|
| `Vite build` → `dist/` | `npm run build:capacitor` → `out/` (Next avec `CAPACITOR_BUILD=1`) |
| `cap sync` copie `dist/` vers android/ios | **Conforme** — `cap sync` copie `out/` vers `android/` et `ios/` |
| Un build, trois plateformes | **Conforme** — Un build Capacitor, même contenu pour Android et iOS |

**Manquant côté doc** : préciser clairement dans votre doc que **webDir** = `out` (et non `dist`). Déjà correct dans `capacitor.config.ts` (`webDir: 'out'`).

---

## 4. Configuration “Vite” (section 4) — N/A

Alias, plugin React, plugin PWA : **spécifiques à Vite**. En Next.js les alias sont gérés par `tsconfig.json` (paths) et Next lui-même. **Rien à reproduire** pour ce projet.

---

## 5. Point d’entrée HTML et meta PWA / mobile (section 5)

| Meta / élément guide | Statut Rentoall |
|----------------------|------------------|
| `viewport` avec `viewport-fit=cover` | **Conforme** — `layout.tsx` : `viewport: { viewportFit: "cover" }` |
| `theme-color` | **Conforme** — `<meta name="theme-color" content="#ffffff" />` dans layout |
| `apple-mobile-web-app-capable`, `apple-mobile-web-app-title` | **Optionnel** — Non présents. À ajouter si vous voulez le même comportement “app” sur Safari (ajout à l’écran d’accueil). |
| `apple-touch-icon` | **Conforme** — `metadata.icons.apple` + lien dans head |
| Manifest PWA | **Différent** — Pas de manifest (pas de PWA). Si vous ajoutez une PWA plus tard, il faudra un manifest + SW. |

**À faire (optionnel)** : ajouter dans `app/layout.tsx` (head) :
- `<meta name="apple-mobile-web-app-capable" content="yes" />`
- `<meta name="apple-mobile-web-app-status-bar-style" content="default" />`
- `<meta name="apple-mobile-web-app-title" content="Rentoall" />`

---

## 6. Configuration Capacitor (section 6)

| Option guide | Rentoall | Conformité |
|--------------|----------|------------|
| `appId` | `com.rentoall.app` | **Conforme** |
| `appName` | `Rentoall` | **Conforme** |
| `webDir` | `out` (et non `dist`) | **Conforme** (équivalent, juste le nom du dossier Next) |
| `server.url` / `server.cleartext` | Commentés (dev possible) | **Conforme** |
| `server.androidScheme` | **Non défini** | **À ajouter** — Le guide recommande `androidScheme: "https"` pour éviter des blocages. À mettre dans `capacitor.config.ts` → `server: { androidScheme: "https" }`. |
| `plugins.SplashScreen.launchShowDuration` | `0` + `launchAutoHide: true` | **Conforme** |
| `plugins.App` (back button) | `disableBackButtonHandler: true` | **Conforme** (et au-delà du guide : back géré côté front) |
| `android.allowMixedContent` | `true` | **Attention** — Utile en dev ; en prod idéalement tout en HTTPS et désactiver si possible. |
| `ios.contentInset` | `'automatic'` | **Conforme** |

**Action recommandée** : ajouter dans `capacitor.config.ts` :

```ts
server: {
  androidScheme: "https",
  // url / cleartext en dev si besoin
},
```

---

## 6.2 Comment Capacitor et React fonctionnent ensemble (section 6.2)

**Conforme.**  
Même principe : en natif, un WebView charge le contenu du build (`out/`). La logique est en React (Next) ; Capacitor = conteneur + bridge. Vous avez bien :
- Détection plateforme : `src/lib/capacitor.ts` (`isCapacitor()`, `getPlatform()`) — équivalent du `useDeviceOS` du guide (sans dépendance à `@capacitor/device`).
- Back button géré dans le front : `CapacitorBackButton.tsx`.

---

## 6.3 Structure du projet (section 6.3)

| Guide (Vite) | Rentoall (Next.js) | Conformité |
|--------------|--------------------|------------|
| `index.html` à la racine | Pas d’index.html (Next génère le HTML) | **Normal** |
| `src/main.tsx`, `src/App.tsx` | `src/app/layout.tsx`, `src/app/page.tsx`, routes dans `app/` | **Équivalent** |
| `src/pages/`, `src/components/` | `src/app/` (pages) + `src/components/` | **Équivalent** |
| `dist/` généré | `out/` généré (build Capacitor) | **Équivalent** |
| `android/`, `ios/` après `cap add` | Idem : créés par `cap add android` / `cap add ios` | **Conforme** |

Pas de changement de structure nécessaire.

---

## 7. Variables d’environnement (section 7)

| Guide | Rentoall |
|-------|----------|
| Préfixe `VITE_*`, `import.meta.env.VITE_*` | Préfixe `NEXT_PUBLIC_*`, `process.env.NEXT_PUBLIC_*` |
| Fichier `vite-env.d.ts` pour les types | Next expose les `NEXT_PUBLIC_*` au build ; pas de fichier dédié obligatoire |

**Conforme.**  
Vous utilisez déjà `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_URL` (voir `src/lib/app-url.ts`).  
**Recommandation** : avoir un `.env.example` (ou le documenter dans le README / CAPACITOR-GUIDE-COMPLET.md) avec les variables attendues, sans valeurs sensibles. Le guide en fait une obligation pour “Cité” ; ici c’est une bonne pratique.

---

## 7.2 Fichiers clés (section 7.2)

- **Point d’entrée** : en Next, c’est le layout et les routes ; pas de `main.tsx`. **Conforme.**
- **Détection plateforme** : `src/lib/capacitor.ts` avec `window.Capacitor` (pas de plugin Device). **Équivalent** et plus léger (pas d’import async possible en build web). **Conforme.**

---

## 7.3 Pièges courants (section 7.3)

| Piège guide | Statut Rentoall |
|-------------|------------------|
| Page blanche / chemins incorrects | Évité : pas de `base` dans Next pour Capacitor ; `out/` à la racine. |
| `cap sync` pas fait après build | Documenté : toujours `build:capacitor` puis `cap sync` (ou `mobile:ios` / `mobile:android`). |
| Variables d’env undefined | Utilisation correcte de `NEXT_PUBLIC_*` ; à ne pas oublier au build (ex. CI). |
| CORS en natif | Même logique : appels API en HTTPS ; CORS à gérer côté backend. |
| Router 404 en direct | Géré par l’export statique Next (une page = dossier avec `index.html`). |
| Plugin non synchronisé | Après `npm install @capacitor/xxx`, faire `npx cap sync`. |

**Conforme** ; les bonnes pratiques du guide s’appliquent.

---

## 7.4 Ajouter un plugin Capacitor (section 7.4)

**Conforme.**  
Procédure identique : `npm install @capacitor/xxx` → utilisation dans le code → `npx cap sync` → permissions Android/iOS si besoin. Vous avez déjà `@capacitor/preferences` ; aucun oubli.

---

## 7.5 Permissions Android (section 7.5)

**À configurer côté projet natif.**  
Les dossiers `android/` / `ios/` ne sont pas dans le repo (ou générés par `cap sync`). Après `cap add android`, il faut vérifier dans `android/app/src/main/AndroidManifest.xml` :
- `INTERNET` (souvent déjà présent),
- Permissions pour fichiers / caméra / localisation selon les fonctionnalités.

Déjà listé dans `docs/CAPACITOR-GUIDE-COMPLET.md` et `docs/capacitor-audit.md`. **Conforme** à ce qui est attendu (config native à faire après création des projets).

---

## 7.6 Permissions iOS (section 7.6)

**À configurer dans Info.plist** (après `cap add ios`) :  
`NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`, `NSLocationWhenInUseUsageDescription`, etc. Déjà décrit dans vos docs. **Conforme.**

---

## 8. Android : structure et build (section 8)

- Génération : `npx cap add android` — **conforme.**
- `cap sync` copie `out/` (équivalent de `dist/`) — **conforme.**
- Scripts : vous avez `build:android`, `cap:sync`, `cap:open:android`, `mobile:android`. **Conforme.**

---

## 9. iOS : structure et build (section 9)

- Génération : `npx cap add ios` — **conforme.**
- `cap sync ios` copie `out/` — **conforme.**
- Scripts : `build:ios`, `cap:open:ios`, `mobile:ios`. **Conforme.**

Pas de script “watch” comme `dev-ios.sh` dans le guide ; optionnel. En dev on peut utiliser `server.url` dans `capacitor.config.ts` pour charger le serveur Next en direct.

---

## 10. Routing (section 10)

**Équivalent.**  
Le guide utilise BrowserRouter ; vous utilisez le App Router Next.js. En export statique, chaque route est un dossier avec `index.html`. Pas de HashRouter nécessaire. **Conforme.**

---

## 11. Détection de la plateforme (section 11)

**Équivalent.**  
Le guide a `useDeviceOS()` avec `@capacitor/device`. Vous avez `getPlatform()` et `isCapacitor()` dans `src/lib/capacitor.ts` via `window.Capacitor.getPlatform()` / `isNativePlatform()`. Même usage (adapter UI, liens stores, etc.) sans dépendance supplémentaire. **Conforme.**

---

## 12. Récap des scripts npm (section 12)

| Script guide | Équivalent Rentoall |
|--------------|----------------------|
| `npm run build` | `npm run build` (web) ; `npm run build:capacitor` (mobile) |
| `npm run cap:sync` | `npx cap sync` (script `cap:sync`) |
| `npm run cap:open` | `npx cap open android` → `cap:open:android` |
| `npm run cap:open:ios` | `npx cap open ios` → `cap:open:ios` |
| `npm run cap:build` | `npm run build:capacitor && npx cap sync` (équivalent : `build:ios` ou `build:android` sans open) |
| `npm run ios:dev` | `npm run mobile:ios` (build + sync + open Xcode) |
| Init Android | `build:capacitor` puis `cap add android` puis `cap sync` (dans CAPACITOR-GUIDE-COMPLET.md) |

**Conforme.** Vous avez les mêmes usages, avec des noms de scripts clairs.

---

## 13. Checklist migration Next → PWA + Android + iOS (section 13)

**N/A** pour ce projet : vous ne migrez pas vers Vite. La checklist “Cité” du guide ne s’applique pas telle quelle. Votre propre checklist est dans `CAPACITOR-GUIDE-COMPLET.md` et `capacitor-audit.md`. **Rien à aligner.**

---

## 14–16. Résumé, procédure Cité, tableau de bord (sections 14–16)

**Référence utile** pour les concepts (un build, trois cibles ; webDir ; permissions ; scripts). Pour Rentoall, le “tableau de bord” équivalent est dans `docs/CAPACITOR-GUIDE-COMPLET.md` (variables, permissions, commandes, dépannage).

---

# Synthèse : ce qui est conforme, ce qui manque, ce qu’il faut faire

## Conforme ou équivalent (rien à changer)

- Capacitor 8, appId, appName, webDir `out`, SplashScreen, back button.
- Export statique Next → `out/` → `cap sync` → Android/iOS.
- Détection plateforme (`lib/capacitor.ts`), return URLs (`lib/app-url.ts`), storage abstrait (`lib/storage.ts`).
- Viewport (viewportFit cover), theme-color, icônes, scripts build/sync/open.
- Gestion des permissions et config native documentée (Info.plist, AndroidManifest) dans vos guides.

## Différent “par design” (Next.js, pas Vite)

- Pas de Vite ni de `dist/` : vous utilisez Next et `out/`.
- Pas de PWA (manifest, Service Worker) : optionnel ; à ajouter seulement si vous voulez une PWA web.
- Variables `NEXT_PUBLIC_*` au lieu de `VITE_*`.
- Routing et structure : App Router et `src/app/` au lieu de react-router et `src/pages/`.

## À faire ou à améliorer

1. **capacitor.config.ts** — **Fait** : `server.androidScheme: "https"` est présent.
2. **Meta “app”** — **Fait** : `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, `apple-mobile-web-app-title` sont dans `app/layout.tsx`.
3. **.env.example** — **Recommandé** : créer un fichier listant `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_URL` sans valeurs sensibles (voir aussi `CAPACITOR-ETAT-ET-RESTE-A-FAIRE.md`).
4. **Config native (Info.plist / AndroidManifest)** — À faire après `cap add ios` / `cap add android` ; détail dans `docs/capacitor-native-config.md`.

---

## Conclusion

Le projet **Rentoall est aligné** avec l’esprit du guide Vite + Capacitor (un build, trois cibles ; config Capacitor ; permissions ; scripts). Les écarts viennent de l’utilisation de **Next.js** au lieu de Vite et de l’**absence volontaire de PWA**.  

Les seuls points à traiter pour “coller” au maximum au guide sont :
- ajouter **`server.androidScheme: "https"`** dans `capacitor.config.ts` ;
- optionnel : meta apple-mobile-web-app* et **.env.example**.

Le reste est soit déjà en place, soit spécifique à la stack Vite et non requis pour votre projet.
