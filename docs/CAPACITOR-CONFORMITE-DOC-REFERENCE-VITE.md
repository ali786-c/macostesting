# Conformité au document « Capacitor – fonctionnement complet et structure » (référence Vite)

Ce document indique si le **projet Rentoall (Next.js + Capacitor)** est conforme au document de référence qui décrit un projet **Vite + React + Capacitor** (Uman Patient, build → `dist/`, `useDeviceOS`, etc.).

**Mise en pratique** : la même logique que la référence a été appliquée au projet (hook `useDeviceOS`, scripts alignés, scripts shell init-android / dev-ios, structure documentée). Voir **`docs/CAPACITOR-STRUCTURE-FONCTIONNEMENT.md`** pour la structure et le flux détaillés.

---

## Réponse courte

**On n’est pas conforme à la lettre** (stack différente : Next.js au lieu de Vite), mais **on est équivalent sur le principe et la logique** : une seule codebase web, un build qui produit un dossier statique, `cap sync` qui copie ce dossier dans les projets natifs, et les apps iOS/Android qui affichent ce contenu dans un WebView. Le rôle de Capacitor, le flux build → sync → run, le hook de détection plateforme et les scripts sont alignés sur la référence.

---

## Comparaison point par point

| Élément du document de référence (Vite) | Projet Rentoall (Next.js) | Conforme ? |
|----------------------------------------|---------------------------|------------|
| **Build tool** | Vite → `dist/` | Next.js (export statique) → **`out/`** | ❌ Différent (normal) |
| **webDir** | `"dist"` | **`"out"`** dans `capacitor.config.ts` | ✅ Équivalent (autre nom de dossier) |
| **Point d’entrée** | `index.html` + `/src/main.tsx` | Next : `app/layout.tsx` + App Router, pas d’`index.html` à la racine | ❌ Différent (Next) |
| **Router** | BrowserRouter (React) | App Router Next.js | ❌ Différent (Next) |
| **Détection plateforme** | `useDeviceOS()` avec `@capacitor/device` (Device.getInfo()) | **`src/hooks/useDeviceOS.ts`** : hook **`useDeviceOS()`** → `"ios"` \| `"android"` \| `"web"` (utilise `getPlatform()`) ; **`CapacitorPlatformRoot`** dans le layout (même logique que la référence) | ✅ Conforme (même API) |
| **Packages Capacitor** | core, cli, android, ios, device | core, cli, android, ios, **preferences** (pas device) | ✅ Équivalent (preferences pour le storage) |
| **Config** | `capacitor.config.ts` avec appId, appName, webDir, server.androidScheme, SplashScreen | Idem : appId `com.rentoall.app`, webDir `out`, androidScheme `https`, SplashScreen, **+ App.disableBackButtonHandler** | ✅ Conforme |
| **Flux build → sync** | `npm run build` → `dist/` puis `npx cap sync` | **`npm run build:capacitor`** → `out/` puis **`npx cap sync`** | ✅ Conforme (script dédié pour le build mobile) |
| **Scripts** | cap:add, cap:sync, cap:open, cap:build, ios:dev, android:debug, etc. | **cap:add:android**, **cap:add:ios**, **cap:sync**, **cap:sync:ios**, **cap:open**, **cap:build**, **ios:dev**, **android:debug**, **android:release**, **android:install** ; **scripts/init-android.sh**, **scripts/dev-ios.sh** | ✅ Conforme |
| **Dossiers android/ et ios/** | Générés par `cap add android` / `cap add ios` | Idem : à créer avec `npx cap add android` et `npx cap add ios` après le premier build | ✅ Conforme |
| **Même appId partout** | Oui (capacitor.config.ts, Android, iOS) | Oui : `com.rentoall.app` dans `capacitor.config.ts` ; à aligner dans les projets natifs après `cap add` | ✅ Conforme |
| **Ne pas modifier assets/public (contenu copié)** | Oui | Oui : contenu de `out/` copié dans les projets natifs par `cap sync` ; ne pas modifier à la main | ✅ Conforme |
| **Variables d’env** | VITE_* (ex. VITE_EXPO_PUBLIC_API_URL) | **NEXT_PUBLIC_*** (ex. NEXT_PUBLIC_API_URL, NEXT_PUBLIC_APP_URL) | ❌ Différent (convention Next) |

---

## Ce qui est en plus sur Rentoall (par rapport au doc de référence)

- **Back button Android** : géré côté front (`CapacitorBackButton.tsx`) avec `App.disableBackButtonHandler: true`.
- **Storage persistant** : `@capacitor/preferences` + abstraction `src/lib/storage.ts` pour l’auth (pas seulement détection plateforme).
- **Return URLs / deep links** : `getAppBaseUrl()`, listener `appUrlOpen`, intercepteur 401, page 404, meta apple-mobile-web-app*.
- **Build dédié** : `scripts/capacitor-build.mjs` (masque `app/api` pendant le build, lance Next avec `CAPACITOR_BUILD=1`).

---

## Conclusion

- **Conforme au principe** : une codebase web, un build statique, Capacitor qui copie ce build dans les projets natifs, apps = WebView qui charge ce contenu. Même appId, même attention à ne pas modifier le contenu copié, même flux « build puis cap sync ».
- **Non conforme à la lettre** : Vite vs Next, `dist/` vs `out/`, pas de `index.html` ni de `main.tsx`, pas de `@capacitor/device` (détection via `window.Capacitor`), scripts nommés différemment.

Pour expliquer à quelqu’un comment Capacitor fonctionne **sur ce projet**, utiliser en priorité :
- **`docs/CAPACITOR-STRUCTURE-FONCTIONNEMENT.md`** — structure et flux (aligné référence, sections 3.1–3.5).
- **`docs/CAPACITOR-GUIDE-COMPLET.md`** — prérequis, lancer iOS, build App Store.
- **`docs/CAPACITOR-ETAT-ET-RESTE-A-FAIRE.md`** — ce qui est fait, ce qu’il reste à faire.
