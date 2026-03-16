# Audit complet et validation Capacitor (Next.js → iOS + Android)

**Contexte** : Application Next.js emballée en mobile via Capacitor (WebView).  
**Objectif** : Stable, sécurisée, conforme App Store / Play Store, techniquement propre, sans pièges WebView, prête pour production.

**Date** : 2026-02-18

> **Référence à jour** : les points « ce qui manque » ou « améliorations recommandées » (page 404, intercepteur 401, listener appUrlOpen, mise à jour __INITIAL_AUTH_STATE__, meta apple-mobile-web-app*) ont été implémentés. Pour l’état actuel et ce qu’il reste à faire, voir **`docs/CAPACITOR-ETAT-ET-RESTE-A-FAIRE.md`**.

---

# 1️⃣ ROUTING & NAVIGATION

## Ce qui est OK
- **Routes profondes** : Export statique Next (`output: 'export'`, `trailingSlash: true`) génère `out/parking/[id]/index.html`, `out/reservations/[id]/index.html`. Navigation client-side (Next router) fonctionne depuis la home vers toute route profonde.
- **Bouton retour Android** : `CapacitorBackButton.tsx` écoute `backButton` via `window.Capacitor.Plugins.App.addListener('backButton', () => router.back())`. `capacitor.config.ts` a `App.disableBackButtonHandler: true` pour laisser le front gérer l’historique.
- **Redirections auth** : `ProtectedRoute` redirige vers `/auth/login` et enregistre `redirectAfterLogin` en `sessionStorage`. Comportement compatible WebView.
- **Pas de basePath** : Les chemins sont `/parking/123` sans préfixe, cohérent avec `webDir: 'out'`.

## Ce qui est risqué
- **Reload sur route profonde** : Avec `webDir: 'out'` et chargement local (pas de `server.url`), le WebView charge depuis le système de fichiers. Lors d’un **refresh** sur `/parking/123`, le WebView peut demander une URL du type `file://.../out/parking/123` (sans `index.html`). Selon la résolution des chemins par Capacitor/iOS/Android, cela peut **ne pas servir** `out/parking/123/index.html` et provoquer une 404 ou un écran blanc. **À tester impérativement** : ouvrir un détail parking, faire un refresh complet (pull-to-refresh ou équivalent) et vérifier que la page s’affiche.
- **Lancement direct sur URL profonde** : Au cold start, l’app charge en général `out/index.html` (racine). Un lancement **direct** sur une URL profonde (ex. via Universal Link `/parking/123`) dépend de la config native (Associated Domains / App Links) et du fait que le WebView charge la bonne ressource (même risque que le reload ci‑dessus si le natif ne fait pas de fallback vers `.../parking/123/index.html`).

## Ce qui manque
- **Page 404 explicite** : Aucun fichier `not-found.tsx` trouvé dans `src/app`. Next fournit une 404 par défaut ; en export statique, une route inconnue peut ne pas avoir de `index.html` dédié. Vérifier que les liens internes ne pointent pas vers des routes inexistantes.
- **Documentation** : Aucun doc dans le repo sur le comportement attendu du reload / lancement sur route profonde pour le mode “fichiers locaux” (`webDir: 'out'`).

## Erreurs classiques encore possibles
- Utiliser `router.push()` avec une base path inexistante.
- Supposer que “reload” sur une route profonde fonctionne sans l’avoir testé sur device (iOS + Android).

## Améliorations recommandées
1. **Tester sur device** : Refresh sur `/parking/[id]` et `/reservations/[id]` ; si 404, envisager soit `server.url` (charger depuis un serveur qui gère les fallbacks SPA), soit une doc native pour servir `index.html` pour toute sous‑route.
2. Ajouter une **page 404** (`app/not-found.tsx`) et vérifier qu’elle est bien exportée dans `out/`.
3. Si vous utilisez **Universal Links / App Links** pour ouvrir l’app sur une route profonde, documenter comment le natif passe l’URL au WebView et que le WebView charge le bon fichier (ou la bonne base URL).

---

# 2️⃣ AUTHENTIFICATION & SESSION (CRITIQUE)

## Ce qui est OK
- **Type d’auth** : JWT stocké côté client (pas de cookies HttpOnly pour l’auth). Pas de dépendance aux subtilités WKWebView/cookies (SameSite, Secure, cross-domain).
- **Abstraction storage** : `src/lib/storage.ts` avec `setItem` / `removeItem` / `getItem`. En Capacitor, écriture aussi dans `@capacitor/preferences` ; au démarrage, `CapacitorStorageInit` appelle `initFromNative()` qui recopie Preferences → localStorage pour que l’intercepteur axios (lecture synchrone) retrouve le token.
- **API** : Auth via header `Authorization: Bearer <token>`. Pas de CORS avec credentials cookies ; pas de cross-domain cookie.
- **Restauration session après fermeture** : Les clés auth (`authToken`, `userId`, `userName`, etc.) sont dans Preferences ; au cold start, `initFromNative()` les restaure dans localStorage.
- **Pas de boucle login identifiée** : Pas d’intercepteur global 401 qui redirige systématiquement vers login ; logout nettoie le storage (abstraction utilisée dans api, login, callbacks, header, parametres).

## Ce qui est risqué
- **Race au premier paint** : Dans `layout.tsx`, un script inline lit `localStorage` (authToken, finalIsLoggedIn, etc.) pour `window.__INITIAL_AUTH_STATE__` **avant** que React ne monte. En Capacitor après un cold start, `initFromNative()` s’exécute dans un `useEffect` (après le premier rendu). Donc au premier frame, localStorage peut encore être vide (si iOS a purgé), et `__INITIAL_AUTH_STATE__` indique “non connecté”. Une fois `initFromNative()` terminé, localStorage est rempli mais le script ne se rejoue pas. Les composants qui dépendent de `__INITIAL_AUTH_STATE__` peuvent afficher brièvement “déconnecté” puis se mettre à jour après un re-render ou un événement storage. **Risque** : flash “non connecté” au lancement.
- **Pas de refresh token** : Aucune logique de renouvellement du JWT à l’expiration. Quand le token expire, les appels API renvoient 401 ; l’utilisateur doit se reconnecter. Pas de boucle infinie, mais UX dégradée si les sessions sont courtes.
- **Expiration token** : Aucune vérification côté client (pas de décodage JWT pour vérifier `exp`). Pas de redirection automatique vers login à l’expiration.

## Ce qui manque
- Gestion explicite **401 globale** : par exemple intercepter les 401 et rediriger vers login (ou afficher une modale “session expirée”) de façon centralisée.
- **Refresh token** : si le backend en fournit un, pas d’utilisation côté app.
- **Listener foreground** : pas de revalidation explicite de la session au retour de l’app (background → foreground). La session est déjà restaurée au cold start via Preferences.

## Erreurs classiques encore possibles
- Ajouter du code qui lit encore `localStorage.getItem('authToken')` sans passer par `storage.getItem()` pour les clés auth (risque de désynchronisation avec Preferences).
- Oublier de définir `NEXT_PUBLIC_APP_URL` en prod Capacitor pour les return URLs Stripe/OAuth.

## Améliorations recommandées
1. **Optionnel** : après `initFromNative()`, mettre à jour `window.__INITIAL_AUTH_STATE__` (ou déclencher un event) pour que le header/footer se mettent à jour sans flash.
2. Si le backend propose un **refresh token** : le stocker via l’abstraction storage et implémenter un intercepteur axios qui, sur 401, tente un refresh puis refait la requête.
3. **Intercepteur 401** : sur réponse 401, soit rediriger vers `/auth/login` avec un paramètre `?session_expired=1`, soit afficher une modale “Session expirée” puis redirection.

---

# 3️⃣ STORAGE & SÉCURITÉ

## Ce qui est OK
- **Abstraction storage** : `src/lib/storage.ts` avec `getItem`, `setItem`, `removeItem` et `initFromNative()`. Utilisée pour toutes les clés d’auth (api.ts, login, callbacks OAuth, ProtectedRoute, header, parametres).
- **Stockage persistant en app** : En Capacitor, les clés listées dans `AUTH_KEYS` sont écrites dans `@capacitor/preferences` en plus de localStorage, ce qui limite le risque de purge iOS sur ces données.
- **Pas de secret côté client** : Les variables utilisées sont `NEXT_PUBLIC_*` (API URL, APP URL, clés cartes). Aucun secret backend dans le front.

## Ce qui est risqué
- **Purge iOS** : `localStorage` (et donc les données **non** migrées vers l’abstraction) peut être purgé par iOS sous pression de stockage. Les **favoris**, préférences UI, `sessionStorage` (ex. `redirectAfterLogin`), etc. sont encore en localStorage/sessionStorage direct. Si ces données sont critiques, elles peuvent disparaître au cold start.
- **Dépendance directe à localStorage** : De nombreux fichiers utilisent encore `localStorage` / `sessionStorage` en direct (favoris, layout script, parametres, header pour d’autres clés, etc.). Seule la partie “auth” est unifiée via l’abstraction.
- **IndexedDB** : Non audité. Si l’app ou une lib utilise IndexedDB, les mêmes risques de quota et de purge existent.

## Ce qui manque
- Migration des **favoris** (et autres données sensibles ou importantes pour l’UX) vers l’abstraction storage ou Preferences pour les protéger de la purge iOS.
- **Secure Storage** (Keychain / Keystore) : les tokens sont dans Preferences, pas dans un plugin type `@capacitor/preferences` “secure” ou Keychain. Pour une app grand public, Preferences est souvent suffisant ; pour des exigences renforcées, envisager un plugin type secure storage pour le token.

## Erreurs classiques encore possibles
- Introduire de nouveaux `localStorage.setItem` pour des données sensibles sans passer par `storage.setItem()` en Capacitor.
- Supposer que `sessionStorage` survive au cold start (il ne survit pas ; pour “redirectAfterLogin” c’est voulu).

## Améliorations recommandées
1. Étendre l’abstraction (ou une liste de clés) pour les données “importantes” (ex. favoris) et les persister aussi en Preferences en app.
2. Documenter dans le README ou la doc technique : “Données sensibles / persistantes = toujours passer par `src/lib/storage.ts`”.
3. Optionnel : pour le token uniquement, évaluer un plugin **secure storage** (Keychain/Keystore) si la politique de sécurité l’exige.

---

# 4️⃣ DEEP LINKS & RETURN URL (PAIEMENT)

## Ce qui est OK
- **Return URL Stripe** : Les URLs de succès/annulation sont construites avec `getAppBaseUrl()` (`src/lib/app-url.ts`) dans :
  - `parking/[id]` (checkout réservation),
  - `reservations` et `reservations/[id]` (paiement complément),
  - `parametres` (Stripe Connect onboarding/update).
- **Logique getAppBaseUrl()** : En web, `window.location.origin`. En Capacitor, si `NEXT_PUBLIC_APP_URL` est défini, il est utilisé ; sinon fallback sur origin ou `https://rentoall.fr`. Cela permet de pointer les return URLs vers le domaine qui portera Universal Links / App Links.
- **Pas d’ouverture Safari externe “non maîtrisée”** : Stripe redirige vers l’URL fournie ; si Universal Links / App Links sont configurés, l’OS rouvrira l’app.

## Ce qui est risqué
- **Universal Links / App Links non présents dans le repo** : Les dossiers `ios/` et `android/` (avec Info.plist, AndroidManifest) ne sont pas versionnés ou sont générés par `cap sync`. Sans **Associated Domains** (iOS) et **intent-filters** (Android) pour le domaine (ex. `https://rentoall.fr`), un clic sur le lien de retour Stripe ouvrira le **navigateur**, pas l’app. Donc retour paiement = expérience cassée tant que la config native n’est pas faite et testée.
- **Schéma custom `myapp://`** : Non configuré. Pas de `App.addListener('appUrlOpen', ...)` dans le code. Si vous ne passez pas par Universal Links / App Links, il faudrait un schéma custom et ce listener pour rouvrir l’app et naviguer vers la bonne route.
- **NEXT_PUBLIC_APP_URL** : S’il n’est pas défini en prod build Capacitor, `getAppBaseUrl()` en app utilise le fallback (ex. `https://rentoall.fr`). À expliciter en CI/prod pour éviter les mauvaises URLs (staging vs prod).

## Ce qui manque
- **Config native** : Associated Domains (iOS), intent-filters + verification (Android) pour le domaine de retour.
- **Listener `appUrlOpen`** : Si vous ajoutez un schéma custom (ex. `rentoall://`), il faut un listener pour parser l’URL et faire `router.push(path)`.
- **Tests E2E** : Aucun test automatisé “paiement success → retour dans l’app sur la bonne page”. À faire manuellement sur device après mise en place des liens.

## Erreurs classiques encore possibles
- Déployer en prod sans définir `NEXT_PUBLIC_APP_URL` et se retrouver avec des return URLs incorrectes (ex. `capacitor://localhost` ou `file://`).
- Configurer Universal Links côté iOS sans le fichier **apple-app-site-association** sur le domaine (hébergé et accessible en HTTPS).

## Améliorations recommandées
1. **Configurer et tester** Universal Links (iOS) et App Links (Android) pour le domaine de prod (ex. `https://rentoall.fr`), puis tester “lien email/SMS → ouverture de l’app” et “retour Stripe → ouverture de l’app”.
2. **Documenter** dans le repo (ou dans `docs/capacitor-audit.md`) les étapes exactes : Associated Domains, intent-filters, et valeur de `NEXT_PUBLIC_APP_URL` par environnement.
3. **Optionnel** : ajouter `App.addListener('appUrlOpen', ...)` et gérer un schéma custom en secours ou pour des cas spécifiques (ex. liens internes marketing).

---

# 5️⃣ PAIEMENT & CONFORMITÉ STORE

## Ce qui est OK
- **Type de monétisation** : Location de parkings / espaces de stockage (**service physique**). Les paiements Stripe concernent des **services réels**, pas du contenu digital (e‑books, musique, abonnements à du contenu in‑app). Donc **pas d’obligation In-App Purchase** Apple pour ces flux.
- **Politique de confidentialité** : Page `/privacy` présente ; onglet “Confidentialité” dans Paramètres ; lien “politique / confidentialité” possible depuis la page login (`login.privacyNotice`).
- **Suppression de compte** : `parametres` propose la suppression de compte avec appel à `rentoallUsersAPI.deleteAccount(userId)` et nettoyage du storage. Conforme aux attentes des stores (compte supprimable si l’utilisateur est connecté).
- **Pas de feature “digital payante”** : Aucun achat de contenu digital (credits, abo contenu) qui requerrait IAP Apple.

## Ce qui est risqué
- **Accessibilité de la politique de confidentialité** : Vérifier qu’elle est **facilement accessible** depuis l’app (menu, footer, écran d’inscription/connexion) sans avoir à chercher. Souvent exigé par les stores.
- **Lien “politique” sur l’écran d’inscription/connexion** : Présent côté texte (`login.privacyNotice`) ; s’assurer que le lien pointe bien vers `/privacy` ou l’URL légale officielle.

## Ce qui manque
- Rien de bloquant identifié pour la conformité store sur les paiements et la vie privée.

## Erreurs classiques encore possibles
- Ajouter plus tard un “achat de crédits” ou un abonnement à du “contenu” (ex. contenu premium) sans passer par IAP Apple → risque de rejet.
- Cacher la politique de confidentialité ou la suppression de compte.

## Améliorations recommandées
1. Vérifier sur les maquettes / écrans réels que “Politique de confidentialité” et “Supprimer mon compte” sont visibles et accessibles (App Store et Play Store vérifient).
2. Garder une trace (doc ou checklist) : “Paiements = services réels (location), pas d’IAP requis.”

---

# 6️⃣ PERMISSIONS & CONFIG NATIVE

## Ce qui est OK
- **capacitor.config.ts** : `appId: 'com.rentoall.app'`, `webDir: 'out'`, SplashScreen et App (back button) configurés. Pas de `server.url` en dur (donc chargement depuis `out/`).
- **ATS / HTTPS** : Aucun usage de HTTP forcé côté app pour l’API en prod ; `NEXT_PUBLIC_API_URL` pointe vers une API (en prod, à mettre en HTTPS). Pas de désactivation ATS dans le repo.
- **Orientation / safe area** : `viewportFit: 'cover'` dans le layout ; `contentInset: 'automatic'` iOS dans la config Capacitor ; classes safe area dans les pages (audit mobile existant).

## Ce qui est risqué
- **Info.plist / AndroidManifest absents du repo** : Les projets `ios/` et `android/` ne sont pas présents (ou pas commités). Donc **aucune preuve** dans le repo que :
  - **iOS** : `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`, `NSLocationWhenInUseUsageDescription` (si vous utilisez caméra, galerie, géoloc) sont renseignés.
  - **iOS** : Associated Domains pour Universal Links.
  - **Android** : Permissions (CAMERA, READ_EXTERNAL_STORAGE, etc.) et intent-filters pour App Links ; `android:usesCleartextTraffic` à `false` en release.
- **allowMixedContent: true (Android)** : Dans `capacitor.config.ts`, `android.allowMixedContent: true`. En prod, si aucune ressource HTTP n’est chargée, ce n’est pas un problème ; si une iframe ou un script HTTP est chargé, risque de contenu mixte. À garder sous contrôle (idéalement tout en HTTPS).

## Ce qui manque
- Fichiers **Info.plist** et **AndroidManifest** (ou extraits pertinents) documentés ou versionnés pour revue (au moins les clés sensibles : permissions, Associated Domains, intent-filters).
- Liste **officielle** des permissions utilisées (fichiers, caméra, localisation) et des justificatifs pour chaque permission (éviter les rejets pour “permission inutile”).

## Erreurs classiques encore possibles
- Demander la caméra ou la localisation sans usage réel → rejet possible.
- Oublier les **usage description** iOS (texte affiché à l’utilisateur) pour chaque permission utilisée.
- En Android, laisser `usesCleartextTraffic="true"` en release.

## Améliorations recommandées
1. Après `cap sync`, **documenter** (ou versionner dans un doc) les entrées critiques : Info.plist (usage descriptions, Associated Domains), AndroidManifest (permissions, intent-filters, cleartextTraffic).
2. **Vérifier** que seules les permissions réellement utilisées sont demandées (ex. `input type="file"` = pas forcément besoin de CAMERA si vous n’utilisez que la galerie).
3. En prod, si tout est HTTPS, envisager de retirer `allowMixedContent: true` ou de le commenter pour forcer le tout-HTTPS.

---

# 7️⃣ OFFLINE & NETWORK

## Ce qui est OK
- **Écran offline** : Composant `OfflineScreen.tsx` qui s’affiche quand `navigator.onLine === false`, avec message “Pas de connexion” et bouton “Réessayer” (reload). Intégré dans le layout racine.
- **Événements** : Listeners `offline` / `online` sur `window` pour mettre à jour l’état.
- **Retry** : L’utilisateur peut cliquer sur “Réessayer” pour recharger la page (revalidation au retour réseau).

## Ce qui est risqué
- **navigator.onLine** : Peut être imprécis sur certains appareils (ex. WiFi sans internet, ou connexion lente). Pas de vérification réelle (ping ou requête légère) pour “vrai offline”.
- **Pas de @capacitor/network** : Le plugin Capacitor Network n’est pas utilisé. Pour une détection plus fiable sur mobile (notamment quand le système sait que le réseau est down), l’ajouter pourrait améliorer la précision.
- **Revalidation** : Au retour du réseau, seul le “Réessayer” (reload) est proposé. Pas de revalidation automatique en arrière-plan (ex. refetch des données sans reload complet).

## Ce qui manque
- Détection “réelle” du réseau (optionnel : requête HEAD vers l’API ou utilisation de `@capacitor/network`).
- Comportement explicite en “mode avion” : les événements `online`/`offline` suffisent en théorie ; à valider sur device (iOS + Android).

## Erreurs classiques encore possibles
- Supposer que `navigator.onLine === true` signifie “internet disponible” (peut être faux sur certains réseaux).
- Afficher un écran offline qui bloque tout le contenu sans moyen de “réessayer” (vous avez le bouton, c’est bon).

## Améliorations recommandées
1. **Tester** sur device : activer mode avion → vérifier que l’écran offline s’affiche ; désactiver → vérifier que “Réessayer” ou le retour online fait disparaître l’écran et que l’app reprend.
2. **Optionnel** : intégrer `@capacitor/network` et utiliser son état en complément de `navigator.onLine` pour une UX plus fiable.
3. **Optionnel** : au passage foreground (App state), vérifier l’état réseau et afficher l’écran offline si nécessaire.

---

# 8️⃣ PERFORMANCE WEBVIEW

## Ce qui est OK
- **Images** : En build Capacitor (`CAPACITOR_BUILD=1`), `images.unoptimized: true` dans Next pour éviter les dépendances serveur d’optimisation. Les images distantes sont chargées telles quelles.
- **Safe area / padding** : Audit mobile existant (docs) ; pages avec `mobile-page-main`, safe area, padding bottom pour éviter le chevauchement avec la barre d’accueil.
- **Pas de librairie “lourde” évidente** : Utilisation de Leaflet/MapLibre pour les cartes ; pas de surcharge détectée dans l’audit.

## Ce qui est risqué
- **Scroll / freeze** : Non vérifié sur device. Listes longues (ex. résultats de recherche, réservations) et cartes (MapLibre) peuvent provoquer des ralentissements ou freezes sur appareils faibles. À valider en conditions réelles.
- **Clavier** : Focus sur un input et ouverture du clavier peuvent déformer la vue (champ masqué, scroll insuffisant). Les safe areas et padding aident ; pas de garantie sans test sur device.
- **Cartes** : Rendu de tuiles + nombreux markers peut être coûteux. À tester sur device (liste de parkings avec carte).

## Ce qui manque
- Lazy loading explicite pour listes très longues (virtualisation) : non audité.
- Mesure de performance (LCP, FID, etc.) en WebView : non faite.

## Erreurs classiques encore possibles
- Ajouter des images très lourdes sans compression ou sans `loading="lazy"`.
- Oublier de tester sur un appareil bas de gamme / ancien.

## Améliorations recommandées
1. **Tester sur device** : Parcours “recherche → liste → détail → carte” ; vérifier fluidité du scroll et absence de freeze.
2. **Tester clavier** : Ouvrir un formulaire (login, recherche), vérifier que le champ reste visible et que la page scroll correctement.
3. Si listes très longues : envisager une **virtualisation** (react-window ou équivalent) pour limiter le DOM.

---

# 9️⃣ UPLOAD / CAMERA

## Ce qui est OK
- **input type="file"** utilisé dans : `host/my-places/[id]/page.tsx` (photos bien), `parametres/page.tsx` (photo de profil), `influenceur-settings/page.tsx`. Comportement standard HTML ; en principe supporté par les WebViews iOS et Android (ouverture galerie / appareil photo selon `accept` et device).

## Ce qui est risqué
- **Comportement non validé sur device** : Sur iOS/Android, les WebViews peuvent avoir des différences (popup choix galerie/caméra, permissions, taille max, types MIME). Sans test réel, risque de crash ou de “rien ne se passe” sur certains appareils.
- **Permissions** : Si la galerie ou la caméra est utilisée, les **usage descriptions** (iOS) et **permissions** (Android) doivent être déclarées. Absentes du repo (config native non versionnée).
- **Compression** : Aucune compression côté client détectée. Gros fichiers = uploads lents et possible échec ou timeout.

## Ce qui manque
- **Fallback plugin Camera** : Si `input type="file"` pose problème (rejet store ou bug), envisager `@capacitor/camera` pour une expérience plus contrôlée.
- **Tests** : Aucun test automatisé ou procédure documentée “upload photo depuis galerie / caméra sur iOS et Android”.

## Erreurs classiques encore possibles
- Demander la permission caméra alors que seul l’accès à la galerie est utilisé (ou l’inverse) → message utilisateur et store à aligner.
- Fichiers trop gros sans limite ni compression → timeouts ou rejet par l’API.

## Améliorations recommandées
1. **Tester sur device** : “Ajouter une photo” (bien, profil, influenceur) sur iOS et Android ; vérifier que le sélecteur s’ouvre, que la sélection fonctionne et que l’upload aboutit.
2. **Vérifier** les usage descriptions et permissions pour “photo library” et “camera” selon ce que vous proposez vraiment (galerie seule vs caméra).
3. **Optionnel** : limite de taille côté client (ex. 5 Mo) et/ou compression (canvas ou lib) avant envoi.

---

# 🔟 BUILD & RELEASE

## Ce qui est OK
- **capacitor.config.ts** : `appId: 'com.rentoall.app'`, `webDir: 'out'`, pas de `server.url` (charge depuis `out/`). Build Next pour Capacitor : `scripts/capacitor-build.mjs` masque `src/app/api` (incompatible export statique), lance `next build` avec `CAPACITOR_BUILD=1`, restaure `api`.
- **next.config.ts** : Si `CAPACITOR_BUILD=1` → `output: 'export'`, `trailingSlash: true`, `images.unoptimized: true`. Cohérent avec un export statique.
- **Scripts package.json** : `build:web`, `build:capacitor`, `cap:sync`, `cap:open:ios`, `cap:open:android`, `build:ios`, `build:android`. Chaîne “build web → sync → ouvrir IDE” reproductible.
- **Variables d’environnement** : `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_URL` (pour return URLs), autres `NEXT_PUBLIC_*` pour cartes / Google. Pas de secret côté client. Pour la prod, il faut définir au moins `NEXT_PUBLIC_API_URL` et `NEXT_PUBLIC_APP_URL` au build.

## Ce qui est risqué
- **Versioning** : La version de l’app (CFBundleShortVersionString / versionCode) se gère dans les projets natifs (ios/android), pas dans le repo. Risque de désynchronisation (version web vs version app) si non documenté.
- **Signing** : Certificats iOS et keystore Android sont hors repo. Sans procédure documentée, risque d’erreur ou d’oubli lors d’un nouveau build de release.

## Ce qui manque
- **Documentation** : Étapes précises pour “build release iOS (archive)” et “build release Android (AAB)” (Xcode / Android Studio, signing, version). Les scripts `build:ios` et `build:android` font uniquement `build:capacitor` + `cap sync` ; l’archive et le signing restent manuels.
- **CI** : Aucune pipeline (GitHub Actions, etc.) vue dans l’audit pour build Capacitor + sync ; à ajouter si vous voulez des builds reproductibles en CI.

## Erreurs classiques encore possibles
- Lancer un build Capacitor sans `CAPACITOR_BUILD=1` (ou sans passer par `build:capacitor`) → pas d’export statique, `out/` incomplet ou absent.
- Oublier de définir `NEXT_PUBLIC_APP_URL` (et éventuellement `NEXT_PUBLIC_API_URL`) pour le build de prod.

## Améliorations recommandées
1. **Documenter** dans le repo (ex. `docs/build-release.md`) : variables d’env requises, commandes pour archive iOS et AAB Android, et où incrémenter les versions (Xcode / Android Studio).
2. **Optionnel** : script ou doc pour incrémenter la version (ex. `package.json` ou fichier dédié) et la propager aux projets natifs si vous automatisez.
3. Vérifier que **aucune variable d’environnement sensible** n’est requise côté client (uniquement `NEXT_PUBLIC_*`).

---

# 1️⃣1️⃣ MINIMUM FUNCTIONALITY (RISQUE REJET APPLE)

## Ce qui est OK
- **Valeur au-delà du “simple site”** : Écran offline dédié, bouton retour Android géré nativement, stockage persistant (Preferences) pour la session, return URLs pensées pour rouvrir l’app après paiement. Ce n’est pas “juste” un site dans une WebView sans adaptation.
- **UI / branding** : Nom “Rentoall”, icône, splash (config Capacitor), pages légales (CGU, CGV, confidentialité), paramètres et suppression de compte. Cohérent avec une app “produit”.
- **Service réel** : Location physique (parkings, stockage) ; pas un agrégateur de liens ou un simple wrapper sans valeur.

## Ce qui est risqué
- **Thin wrapper** : Si Apple considère que l’app n’apporte pas assez de valeur native, risque de rejet. Vous avez déjà : offline, back button, storage, deep links prévus. Ajouter **2–3 features** clairement “app” (ex. partage natif, notifications push, biométrie pour se connecter, ou raccourcis Siri) renforce le dossier.
- **Deep links** : Tant que Universal Links ne sont pas configurés et testés, l’“expérience app” (ouvrir un lien et arriver dans l’app) n’est pas démontrée.

## Ce qui manque
- **Partage natif** : Pas de `@capacitor/share` ; partage via copie d’URL ou lien. Optionnel mais souvent bien vu par Apple.
- **Push** : Pas de notifications push. Optionnel.
- **Biométrie** : Pas d’authentification Touch ID / Face ID. Optionnel.

## Erreurs classiques encore possibles
- Soumettre sans avoir testé le parcours complet sur device (navigation, offline, retour paiement).
- Ne pas mentionner dans la fiche store les “features natives” (offline, retour Android, retour après paiement, etc.).

## Améliorations recommandées
1. **Configurer et tester** Universal Links (et éventuellement schéma custom) pour que “ouvrir un lien → app” soit une démo claire pour la review.
2. **Optionnel** : ajouter le partage natif (ex. “Partager ce parking”) avec `@capacitor/share` pour renforcer l’argument “app native”.
3. Dans la **description App Store**, mettre en avant : expérience hors ligne, retour après paiement dans l’app, gestion du bouton retour, etc.

---

# RAPPORT FINAL (STRUCTURÉ)

| Catégorie        | Statut   | Commentaire |
|------------------|----------|-------------|
| **Routing**      | **Risque** | Reload sur route profonde et lancement direct sur URL profonde non validés sur device (risque 404 / écran blanc). Back button Android et redirections auth OK. |
| **Auth**         | **OK**   | JWT + abstraction storage + Preferences + restauration au cold start. Risque mineur : flash “déconnecté” au premier frame ; pas de refresh token. |
| **Storage**      | **OK**   | Abstraction en place pour l’auth ; tokens en Preferences. Risque : purge iOS sur données non migrées (favoris, etc.). |
| **Deep links**    | **Risque** | Code return URL OK (`getAppBaseUrl()`). Universal Links / App Links et `appUrlOpen` non configurés/testés → retour Stripe peut ouvrir le navigateur au lieu de l’app. |
| **Paiement**      | **OK**   | Service réel (location), pas d’IAP requis. Politique confidentialité et suppression de compte présents. Return URLs prêtes côté code. |
| **Permissions**   | **Risque** | Info.plist / AndroidManifest non audités dans le repo. Usage descriptions et permissions à configurer et à justifier (fichiers, galerie, caméra). |
| **Offline**       | **OK**   | Écran offline + retry. Détection via `navigator.onLine` ; optionnel : @capacitor/network pour plus de fiabilité. |
| **Performance**   | **Risque** | Non validée sur device (scroll, listes, cartes, clavier). Config Next et safe area OK. |
| **Uploads**       | **Risque** | `input type="file"` utilisé ; non testé sur device. Permissions et usage descriptions à aligner. |
| **Build**         | **OK**   | Config Capacitor et Next cohérentes ; scripts reproductibles. Versioning et signing à documenter. |
| **Conformité Store** | **OK** | Service réel, pas d’IAP ; politique de confidentialité et suppression de compte. |

---

# CONCLUSION

**PRÊT POUR TESTFLIGHT + PLAY INTERNAL TESTING : NON**

Actions correctives à appliquer avant de considérer l’app prête :

1. **Routing**  
   - Tester sur device (iOS + Android) : **refresh sur une route profonde** (ex. `/parking/123`, `/reservations/456`). Si 404 ou écran blanc, corriger (option : `server.url` ou doc native pour servir `index.html` sur les sous-routes).  
   - Tester le **lancement direct** sur une URL profonde (si vous utilisez Universal Links) et confirmer que la bonne page s’affiche.

2. **Deep links & return URL**  
   - Configurer **Universal Links** (iOS) et **App Links** (Android) pour le domaine de prod (ex. `https://rentoall.fr`).  
   - Définir **NEXT_PUBLIC_APP_URL** au build prod.  
   - Tester sur device : **lien externe** (email/SMS) → ouverture de l’app ; **retour Stripe** (success et cancel) → ouverture de l’app sur la bonne page.  
   - Optionnel : ajouter `App.addListener('appUrlOpen', ...)` si vous utilisez un schéma custom.

3. **Permissions & config native**  
   - Après `cap sync`, compléter **Info.plist** (usage descriptions pour caméra, galerie, localisation si utilisés ; Associated Domains).  
   - Compléter **AndroidManifest** (permissions, intent-filters pour App Links ; `usesCleartextTraffic=false` en release).  
   - Vérifier qu’aucune permission inutile n’est demandée.

4. **Performance**  
   - Tester sur **devices réels** (au moins un iOS et un Android) : parcours complet (recherche, liste, détail, carte, formulaire avec clavier). Corriger les freezes ou scroll cassé si constatés.

5. **Uploads**  
   - Tester sur device : **ajout de photo** (bien, profil, influenceur) sur iOS et Android. Vérifier permissions et messages affichés. Aligner usage descriptions / permissions avec l’usage réel.

6. **Documentation**  
   - Documenter : build release (archive iOS, AAB Android), variables d’env (dont `NEXT_PUBLIC_APP_URL`), et étapes de config des Universal Links / App Links.  
   - Optionnel : ajouter `app/not-found.tsx` et vérifier qu’il est bien exporté.

Une fois les points 1 à 5 validés (et 6 pour la maintenabilité), vous pourrez considérer l’app **prête pour TestFlight et Play Internal Testing**.  
→ **État actuel (code fait, reste à faire) : `docs/CAPACITOR-ETAT-ET-RESTE-A-FAIRE.md`**.
