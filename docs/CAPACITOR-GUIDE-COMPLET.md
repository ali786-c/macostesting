# Guide complet Capacitor — Rentoall (Next.js → iOS + Android)

Document unique : **prérequis**, **ce qu’il manque**, **lancer et tester sur iOS**, **build et déploiement App Store**.

> **État à jour** : pour une liste précise de ce qui est fait côté code et de ce qu’il reste à faire (config native, env, tests), voir **`docs/CAPACITOR-ETAT-ET-RESTE-A-FAIRE.md`**.

---

## Sommaire

1. [Vue d’ensemble](#1-vue-densemble)
2. [Prérequis](#2-prérequis)
3. [Ce qu’il manque avant production](#3-ce-quil-manque-avant-production)
4. [Lancer le produit pour tester sur iOS](#4-lancer-le-produit-pour-tester-sur-ios)
5. [Build pour déployer sur l’App Store](#5-build-pour-déployer-sur-lapp-store)
6. [Variables d’environnement](#6-variables-denvironnement)
7. [Récap des commandes](#7-récap-des-commandes)
8. [Dépannage](#8-dépannage)

---

## 1. Vue d’ensemble

- **Une seule codebase** : Next.js pour le web et pour les apps mobiles (Capacitor).
- **Build mobile** : export statique Next dans `out/`, servi par la WebView dans les projets natifs `ios/` et `android/`.
- **App** : `appId` = `com.rentoall.app`, `appName` = Rentoall.

**Fichiers clés :**

- `capacitor.config.ts` — config Capacitor (appId, webDir, plugins).
- `next.config.ts` — en build Capacitor : `output: 'export'`, `trailingSlash: true`, images non optimisées.
- `scripts/capacitor-build.mjs` — build Next avec `CAPACITOR_BUILD=1` et masquage temporaire de `src/app/api` (incompatible avec l’export statique).

---

## 2. Prérequis

### Sur ta machine

- **Node.js** 18+
- **npm** (ou yarn/pnpm) — les commandes ci‑dessous utilisent `npm`

### Pour iOS (obligatoire pour tester et publier sur l’App Store)

- **Mac** avec **Xcode** (dernière version stable recommandée), installé depuis l’App Store.
- **CocoaPods** :  
  `sudo gem install cocoapods`  
  (ou `brew install cocoapods`).
- **Compte Apple Developer** (gratuit pour simulateur ; payant pour device physique et App Store).
- **Compte Apple Developer payant** (99 €/an) pour publier sur l’App Store.

### Pour Android (optionnel pour ce guide)

- Android Studio + SDK Android.
- Pour publier sur le Play Store : compte développeur Google.

---

## 3. Ce qu’il manque avant production

Checklist à cocher avant de considérer l’app prête pour TestFlight / App Store.

### 3.1 Projets natifs iOS/Android

- [ ] Les dossiers **`ios/`** et **`android/`** existent.  
  Si non : après le premier `npm run build:capacitor`, lancer :
  - `npx cap add ios`
  - `npx cap add android`
  - puis `npx cap sync`.

### 3.2 Configuration native iOS (dans Xcode / `ios/`)

- [ ] **Info.plist** : textes d’usage (usage descriptions) pour chaque permission utilisée :
  - **Photos** (galerie) : `NSPhotoLibraryUsageDescription` — ex. « Rentoall a besoin d’accéder à vos photos pour ajouter des images à vos annonces. »
  - **Caméra** (si vous proposez de prendre une photo) : `NSCameraUsageDescription`
  - **Localisation** (si utilisée) : `NSLocationWhenInUseUsageDescription`
- [ ] **Associated Domains** (pour les liens de retour paiement / deep links) :  
  Dans Xcode → Signing & Capabilities → Associated Domains → ajouter par ex. :  
  `applinks:rentoall.fr`  
  (adapter au domaine utilisé pour les return URLs Stripe).
- [ ] **Team & signing** : une équipe (compte Apple) et un profil de signature valide pour la release.

### 3.3 Configuration native Android (si vous publiez sur le Play Store)

- [ ] **AndroidManifest** : permissions cohérentes avec l’app (galerie, caméra, etc.) ; pas de permission inutile.
- [ ] **App Links** pour le domaine de retour (ex. `https://rentoall.fr`) configurés (intent-filters).
- [ ] En release : `usesCleartextTraffic="false"` (pas de HTTP en prod).

### 3.4 Environnement et retour après paiement

- [ ] **`NEXT_PUBLIC_APP_URL`** défini au build de prod (ex. `https://rentoall.fr`).  
  Utilisé pour les return URLs Stripe (succès / annulation) afin que l’app se rouvre au bon écran. Sans Universal Links / App Links configurés, le lien ouvrira le navigateur au lieu de l’app.
- [ ] **Universal Links (iOS)** et **App Links (Android)** configurés et testés (fichier `apple-app-site-association` sur le domaine, etc.).

### 3.5 Tests à faire sur appareil

- [ ] **Refresh** sur une route profonde (ex. détail d’un parking) : pas d’écran blanc ni 404.
- [ ] **Retour Stripe** (succès et annulation) : l’app se rouvre et affiche la bonne page.
- [ ] **Ajout de photo** (galerie / caméra) : pas de crash, permissions demandées avec un message clair.
- [ ] **Mode avion** : écran « Pas de connexion » puis « Réessayer » au retour du réseau.
- [ ] **Bouton retour Android** : navigation arrière cohérente (pas de fermeture aléatoire).

### 3.6 Documentation / autres

- [ ] **Politique de confidentialité** accessible dans l’app (déjà une page `/privacy` + lien depuis les paramètres).
- [ ] **Suppression de compte** disponible pour un utilisateur connecté (déjà dans Paramètres).
- Version et build number incrémentés pour chaque soumission (voir section 5).

---

## 4. Lancer le produit pour tester sur iOS

### 4.1 Première fois : créer le projet iOS

Si le dossier **`ios/`** n’existe pas :

```bash
# 1. Build statique (obligatoire : Capacitor a besoin de out/)
npm run build:capacitor

# 2. Ajouter la plateforme iOS
npx cap add ios

# 3. Synchroniser out/ vers ios/
npx cap sync ios
```

Ensuite, tu peux utiliser directement les étapes 4.2 ou 4.3.

### 4.2 Ouvrir le projet dans Xcode et lancer sur simulateur

```bash
# Build + sync + ouvrir Xcode
npm run mobile:ios
```

Ou en deux temps :

```bash
npm run build:capacitor
npx cap sync ios
npx cap open ios
```

Dans **Xcode** :

1. En haut à gauche : choisir un **simulateur** (ex. iPhone 15, iOS 17).
2. Cliquer sur le bouton **Run** (triangle) ou `Cmd + R`.
3. L’app se lance dans le simulateur ; tu peux naviguer comme sur un iPhone.

**Remarque :** l’app charge le contenu depuis le dossier `out/` copié dans le projet iOS (pas besoin de serveur Next en marche).

### 4.3 Tester sur un iPhone physique

1. Connecter l’iPhone au Mac en USB.
2. Dans Xcode, sélectionner ton **iPhone** dans la liste des devices (au lieu du simulateur).
3. Au premier lancement, Xcode peut demander de faire confiance au certificat sur l’iPhone (Paramètres → Général → Gestion des appareils).
4. Si « Untrusted Developer » apparaît : sur l’iPhone, aller dans Réglages → Général → Gestion des appareils → ton compte → Faire confiance.
5. Cliquer sur **Run** dans Xcode ; l’app s’installe et se lance sur l’iPhone.

**Compte Apple :** pour installer sur un device, il faut au minimum un compte Apple (gratuit) configuré dans Xcode (Signing & Capabilities → Team). Pour publier sur l’App Store, il faut un compte Apple Developer payant.

### 4.4 Option : tester en chargeant le site en ligne (sans rebuild)

Pour éviter de refaire un build à chaque changement (utile en dev) :

1. Dans **`capacitor.config.ts`**, décommenter et remplir :

```ts
server: {
  url: 'https://votre-domaine.com',  // ou en dev : http://IP_DE_TA_MACHINE:3000
  // cleartext: true,  // à mettre true seulement si vous utilisez http en dev
},
```

2. Lancer `npx cap sync ios` puis rouvrir Xcode et Run.  
L’app chargera alors le site depuis l’URL indiquée au lieu du contenu de `out/`.  
Penser à **recommenter** `server` (ou à remettre l’URL de prod) avant de construire la version pour l’App Store si vous voulez une app autonome (contenu dans `out/`).

---

## 5. Build pour déployer sur l’App Store

Objectif : produire une **archive** iOS signée, puis la soumettre à Apple (TestFlight puis App Store).

### 5.1 Vérifications avant de builder

- [ ] `capacitor.config.ts` : **pas** de `server.url` activé (ou alors uniquement l’URL de prod si vous voulez que l’app charge le site en ligne). Pour une app autonome, laisser `server` commenté.
- [ ] Variables d’environnement de **prod** au build (voir [§6](#6-variables-denvironnement)) : au minimum `NEXT_PUBLIC_API_URL` et, si besoin, `NEXT_PUBLIC_APP_URL`.
- [ ] Dans Xcode : **Team** et **Signing** configurés pour la release (compte Apple Developer payant).

### 5.2 Build web + sync iOS

Depuis la racine du projet :

```bash
npm run build:capacitor
npx cap sync ios
```

Ou en une commande :

```bash
npm run build:ios
```

Cela génère `out/` et met à jour le projet dans `ios/`.

### 5.3 Ouvrir Xcode et configurer la version

```bash
npx cap open ios
```

Dans Xcode :

1. Dans le navigateur de projet (panneau de gauche), cliquer sur le projet **App** (icône bleue).
2. Sélectionner la cible **App**.
3. Onglet **General** :
   - **Version** (ex. `1.0.0`) = numéro visible pour l’utilisateur (CFBundleShortVersionString).
   - **Build** (ex. `1`, puis `2`, `3`…) = numéro interne. Apple exige que chaque soumission ait un **Build** supérieur au précédent pour la même Version.
4. Onglet **Signing & Capabilities** :
   - Choisir ton **Team** (compte Apple Developer).
   - Cocher **Automatically manage signing** (recommandé).
   - Vérifier que le **Bundle Identifier** est bien celui voulu (ex. `com.rentoall.app`).

### 5.4 Créer l’archive (build de release)

1. En haut de Xcode : sélectionner **Any iOS Device (arm64)** (et non un simulateur).
2. Menu **Product** → **Archive**.
3. Attendre la fin de la compilation. Si tout va bien, la fenêtre **Organizer** s’ouvre avec la nouvelle archive.

### 5.5 Distribuer vers l’App Store (ou TestFlight)

1. Dans l’Organizer, sélectionner l’archive que tu viens de créer.
2. Cliquer sur **Distribute App**.
3. Choisir **App Store Connect** → Next.
4. **Upload** (ou **Export** si tu préfères exporter une IPA pour plus tard).
5. Suivre l’assistant (options de signature, etc.) jusqu’à l’envoi.
6. Une fois l’upload terminé :
   - Aller sur [App Store Connect](https://appstoreconnect.apple.com).
   - L’app apparaît dans **TestFlight** après traitement (quelques minutes à quelques dizaines de minutes).
   - Pour la **mise en vente** : créer une fiche d’app, ajouter la build depuis TestFlight, remplir les métadonnées et soumettre en revue.

### 5.6 Résumé des étapes App Store

| Étape | Action |
|-------|--------|
| 1 | `npm run build:capacitor && npx cap sync ios` (ou `npm run build:ios`) |
| 2 | `npx cap open ios` |
| 3 | Dans Xcode : Version + Build, Signing (Team) |
| 4 | Device = **Any iOS Device (arm64)** |
| 5 | **Product → Archive** |
| 6 | **Distribute App** → App Store Connect → Upload |
| 7 | Dans App Store Connect : TestFlight puis (optionnel) soumission pour l’App Store |

---

## 6. Variables d’environnement

À définir **avant** le build (fichier `.env.production` ou variables dans la CI).

| Variable | Rôle | Exemple |
|----------|------|--------|
| `NEXT_PUBLIC_API_URL` | URL de l’API backend (appelée depuis la WebView) | `https://api.rentoall.fr/api` |
| `NEXT_PUBLIC_APP_URL` | URL de base pour les return URLs (Stripe, liens profonds). À utiliser avec le domaine qui a Universal Links / App Links | `https://rentoall.fr` |

**Build avec des variables :**

```bash
# Exemple (à adapter)
export NEXT_PUBLIC_API_URL=https://api.rentoall.fr/api
export NEXT_PUBLIC_APP_URL=https://rentoall.fr
npm run build:capacitor
npx cap sync ios
```

Ou en mettant ces variables dans `.env.production` à la racine du projet, puis :

```bash
npm run build:capacitor
```

**Important :** ne pas commiter de secrets dans le repo. Les variables `NEXT_PUBLIC_*` sont incluses dans le build côté client (elles sont donc visibles dans l’app) ; n’y mettre que des URLs ou clés publiques.

---

## 7. Récap des commandes

| Commande | Rôle |
|----------|------|
| `npm run build` | Build web Next.js classique (pas pour l’app) |
| `npm run build:capacitor` | Build statique pour mobile → génère `out/` |
| `npm run build:fix` | Build Capacitor + sync (une commande pour tout mettre à jour) |
| `npm run build:web` | Alias build web classique |
| `npx cap sync` | Copie `out/` vers `ios/` et `android/` |
| `npx cap sync ios` | Sync uniquement iOS |
| `npx cap open ios` | Ouvre le projet iOS dans Xcode |
| `npm run mobile:ios` | Build Capacitor + sync iOS + ouvre Xcode |
| `npm run build:ios` | Build Capacitor + sync iOS (sans ouvrir Xcode) |

**Workflow typique :**

- **Tester sur simulateur / device :**  
  `npm run mobile:ios` → Xcode → Run.

- **Préparer une release App Store :**  
  `npm run build:ios` (ou `build:capacitor` + `cap sync ios`) → `npx cap open ios` → Version/Build + Signing → Product → Archive → Distribute App.

---

## 8. Dépannage

### Le build Capacitor échoue

- Vérifier que **Node 18+** est installé.
- Supprimer le cache : `rm -rf .next out` puis relancer `npm run build:capacitor`.
- Si une route dynamique pose problème à l’export, vérifier que toutes les routes dynamiques sont bien gérées par Next (export statique avec `trailingSlash: true` génère des dossiers pour chaque route).

### « Module not found » ou erreur dans Xcode après `cap sync`

- Relancer `npm install` à la racine, puis `npx cap sync ios`.
- Dans Xcode : **Product → Clean Build Folder**, puis rebuild.

### L’app reste blanche sur simulateur / device

- Vérifier que `out/` contient bien des fichiers (index.html, etc.) après `npm run build:capacitor`.
- Vérifier que dans `capacitor.config.ts`, `webDir` est bien `'out'` et que `server.url` n’est pas défini (ou pointe vers une URL valide).
- Regarder la console Xcode (ou les logs du device) pour d’éventuelles erreurs JavaScript.

### Je ne peux pas installer sur mon iPhone

- Vérifier le **Team** et le **Signing** dans Xcode (Signing & Capabilities).
- Sur l’iPhone : Réglages → Général → Gestion des appareils → faire confiance au développeur.
- Pour une distribution hors App Store (ad hoc), il faut un profil de provisioning et un device enregistré dans le compte Apple Developer.

### Retour Stripe ouvre le navigateur au lieu de l’app

- Les **return URLs** Stripe doivent pointer vers le domaine configuré en **Universal Links** (iOS) et **App Links** (Android).
- Vérifier que `NEXT_PUBLIC_APP_URL` est ce domaine (ex. `https://rentoall.fr`) au moment du build.
- Vérifier dans Xcode que **Associated Domains** contient bien `applinks:rentoall.fr` (ou ton domaine).
- Sur le serveur du domaine, le fichier `apple-app-site-association` doit être exposé en HTTPS (voir doc Apple).

---

## Documents complémentaires

- **`docs/CAPACITOR-ETAT-ET-RESTE-A-FAIRE.md`** — **Référence principale** : ce qui est fait (code), ce qu’il reste à faire (config native, env, tests), verdict prêt ou non.
- **`docs/VERIFICATION-MOBILE-IOS-ANDROID.md`** — Vérification point par point (code, natif, backend).
- **`docs/CAPACITOR-STRUCTURE-FONCTIONNEMENT.md`** — Structure du projet et flux (aligné document de référence Capacitor Vite).
- **`docs/capacitor-native-config.md`** — Détail Info.plist, AndroidManifest, Associated Domains.
- **`docs/qa-capacitor.md`** — Checklist QA (parcours, offline, paiement, uploads) pour les tests manuels.
- **`docs/NOTIFICATIONS.md`** / **`docs/NOTIFICATIONS-BACKEND.md`** — Notifications push (app + backend).
- **`docs/STRIPE-EMBEDDED-BACKEND.md`** — Paiement in-app (modifications backend).
- **`docs/capacitor-audit.md`** / **`docs/capacitor-audit-complet.md`** — Audits détaillés (historique).

---

*Dernière mise à jour : mars 2025*
