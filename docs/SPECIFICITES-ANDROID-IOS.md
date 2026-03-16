# Spécificités Android et iOS — Ce qu’il faut avoir par plateforme

Document de référence : **tout ce qui est nécessaire** pour chaque plateforme (Android / iOS) dans le projet Rentoall (Capacitor + Next.js).

---

## Vue d’ensemble

| Besoin | Android | iOS |
|--------|---------|-----|
| **Outil de build** | Android Studio + JDK | Mac + Xcode |
| **Compte développeur** | Google Play Console (payant une fois) | Apple Developer (99 €/an) |
| **Signing** | Keystore (release) | Certificat + provisioning |
| **Permissions** | AndroidManifest.xml | Info.plist (usage descriptions) |
| **Deep links / retour paiement** | App Links (intent-filters) | Associated Domains + AASA |
| **Push** | Firebase (google-services.json) + canal notif | APNs (entitlements + certificat) |

---

## 1. Android — Spécificités nécessaires

### 1.1 Outils et prérequis

- **Android Studio** (dernier stable) ou SDK en ligne de commande.
- **JDK 17** (recommandé pour Capacitor / Gradle récent).
- **Projet natif** : dossier `android/` créé avec `npx cap add android` après un premier `npm run build:capacitor`.

### 1.2 Configuration technique (déjà en place ou à vérifier)

| Élément | Fichier | Valeur / action |
|--------|---------|----------------|
| **applicationId** | `android/app/build.gradle` | `com.rentoall.app` (aligné avec `capacitor.config.ts`) |
| **minSdkVersion** | `android/variables.gradle` | **24** minimum (Capacitor) |
| **targetSdkVersion** | `android/variables.gradle` | **36** (exigence Play Store récente) |
| **versionCode / versionName** | `android/app/build.gradle` | Incrémenter à chaque release (versionCode entier, versionName "1.0", "1.1", …) |

### 1.3 Permissions (AndroidManifest.xml)

À garder **uniquement** si l’app utilise la fonctionnalité :

| Permission | Usage |
|------------|--------|
| `INTERNET` | Obligatoire (app web) |
| `READ_MEDIA_IMAGES` | Galerie (Android 13+) |
| `READ_EXTERNAL_STORAGE` | Galerie (anciennes versions) |
| `CAMERA` | Prise de photo (annonces, profil) |
| `ACCESS_FINE_LOCATION` | Carte, « à proximité » |
| `ACCESS_COARSE_LOCATION` | Optionnel, souvent utilisé avec FINE |

**Réseau en production** : en build **release**, pas de HTTP en clair vers des serveurs non autorisés. Le projet utilise `server.androidScheme: "https"` dans `capacitor.config.ts`. Si vous chargez du contenu HTTP en dev, `android:allowMixedContent: true` est dans la config Capacitor ; en prod tout-HTTPS, on peut le passer à `false`.

### 1.4 App Links (retour paiement Stripe, deep links)

- Dans **AndroidManifest.xml**, dans l’`<activity>` principale (`MainActivity`), ajouter des **intent-filters** pour le domaine de l’app (ex. `https://rentoall.fr`) afin que les URLs de retour Stripe et les liens profonds ouvrent l’app.
- Sur le **serveur** (domaine) : héberger le fichier de vérification **assetlinks.json** (Google) pour le package `com.rentoall.app`.

Sans ça : le lien « Retour à l’app » après paiement ouvre le navigateur au lieu de l’app.

### 1.5 Push Notifications

- **Firebase** : ajouter `google-services.json` dans `android/app/` et appliquer le plugin (déjà prévu dans `build.gradle` si le fichier existe).
- **Canal par défaut** : déjà déclaré dans `strings.xml` (`default_notification_channel_id` → `rentoall_default`).
- Sans `google-services.json`, les push ne fonctionneront pas sur Android.

### 1.6 Rôle du bouton Retour

- **Capacitor** : `App.disableBackButtonHandler: true` dans `capacitor.config.ts` → le **front** gère le bouton retour (modales d’abord, puis navigation).
- Aucune config native supplémentaire nécessaire pour le back.

### 1.7 Build release et signature

- **Keystore** : créer un keystore pour la release et le configurer dans Android Studio (Build → Generate Signed Bundle / APK) ou dans `android/app/build.gradle` (signingConfigs).
- **Ne pas** commiter le keystore ni les mots de passe dans le repo ; utiliser des variables d’environnement ou un secret manager en CI.

### 1.8 Play Store

- **Politique de confidentialité** : URL accessible depuis l’app (déjà une page `/privacy` + lien dans les paramètres).
- **Fiche Play Console** : description, captures d’écran, contenu, public cible, questionnaire de contenu.
- **Target SDK** : respecter la cible exigée par Google (actuellement 33+ voire 34+ selon le type d’app).

---

## 2. iOS — Spécificités nécessaires

### 2.1 Outils et prérequis

- **Mac** avec **Xcode** (dernier stable).
- **Apple Developer** : compte gratuit pour simulateur ; **compte payant (99 €/an)** pour device physique, TestFlight et App Store.
- **Projet natif** : dossier `ios/` créé avec `npx cap add ios` après un premier `npm run build:capacitor`.
- **CocoaPods** : `pod install` dans `ios/App/` (souvent fait par `npx cap sync ios`).

### 2.2 Configuration technique (déjà en place ou à vérifier)

| Élément | Fichier | Valeur / action |
|--------|---------|------------------|
| **Bundle Identifier** | Xcode → Target → General | `com.rentoall.app` (aligné avec `capacitor.config.ts`) |
| **Deployment target** | `ios/App/Podfile` | **iOS 15.0** (`platform :ios, '15.0'`) |
| **Version / Build** | Xcode → Target → General | MARKETING_VERSION (ex. 1.0), CURRENT_PROJECT_VERSION (entier, incrémenté à chaque soumission) |

### 2.3 Info.plist — Usage descriptions (obligatoires)

Sans ces textes, l’app peut être **refusée** à la review App Store. À adapter au ton de l’app :

| Clé | Exemple de valeur |
|-----|--------------------|
| `NSCameraUsageDescription` | Rentoall a besoin d’accéder à la caméra pour prendre des photos de vos biens et de votre profil. |
| `NSPhotoLibraryUsageDescription` | Rentoall a besoin d’accéder à vos photos pour ajouter des images à vos annonces et à votre profil. |
| `NSLocationWhenInUseUsageDescription` | Rentoall utilise votre localisation pour afficher les annonces et parkings à proximité. |

**Déjà présents** dans le projet (à vérifier dans Xcode si vous avez régénéré `ios/`).

### 2.4 App Transport Security (ATS)

- Le projet utilise `iosScheme: "https"` et peut avoir `NSAllowsArbitraryLoads` en dev. Pour la **prod** : éviter d’autoriser tout le trafic arbitraire ; autoriser uniquement les domaines nécessaires (API, MapTiler, etc.) si besoin.

### 2.5 Associated Domains (Universal Links)

- **Xcode** : Target → **Signing & Capabilities** → **+ Capability** → **Associated Domains**.
- Ajouter une entrée du type : `applinks:rentoall.fr` (ou le domaine de `NEXT_PUBLIC_APP_URL`).
- **Serveur** : héberger le fichier **apple-app-site-association** (sans extension) à la racine du domaine (ou `/.well-known/`), comme demandé par Apple / Stripe.

Sans ça : le retour après paiement Stripe ou un lien profond ouvre Safari au lieu de l’app.

### 2.6 Push Notifications (APNs)

- **App.entitlements** : clé `aps-environment` déjà présente (`development` pour dev ; passer à `production` pour release App Store).
- **Certificat / clé APNs** : configurer dans Apple Developer (Identifiers → App ID → Push) et dans le backend qui envoie les notifications.
- **Xcode** : capability **Push Notifications** activée pour la target.

### 2.7 UIBackgroundModes

- **Info.plist** : `remote-notification` dans `UIBackgroundModes` pour recevoir les push en arrière-plan (déjà présent dans le projet).

### 2.8 Safe Area et affichage

- **Capacitor** : `contentInset: "automatic"` dans `capacitor.config.ts` (déjà configuré).
- Côté front : `viewport-fit=cover`, `env(safe-area-inset-*)` sur les pages et le footer (déjà en place).

### 2.9 Build release et signature

- **Signing** : dans Xcode, choisir la **Team** (compte Apple Developer) et laisser Xcode gérer le certificat et le provisioning (Automatic), ou configurer un profil manuel.
- **Archive** : Product → Archive, puis Distribute App → App Store Connect (ou TestFlight).
- **Export** : ne pas commiter les certificats ni les profils de provisioning dans le repo ; utiliser Xcode ou CI avec gestion des secrets.

### 2.10 App Store

- **Politique de confidentialité** : URL accessible dans l’app (page `/privacy` + lien depuis paramètres).
- **App Store Connect** : fiche d’app, description, captures d’écran, métadonnées, questionnaire export / chiffrement / IDFA si besoin.
- **TestFlight** : build uploadée depuis Xcode → disponible pour les testeurs après traitement Apple.

---

## 3. Commun aux deux plateformes

### 3.1 Capacitor (capacitor.config.ts)

- **appId** : `com.rentoall.app` (identique à Android `applicationId` et iOS Bundle Identifier).
- **webDir** : `out` (build Next en `output: 'export'` avec `CAPACITOR_BUILD=1`).
- **server.androidScheme** / **server.iosScheme** : `https`.
- **SplashScreen** : durée et auto-hide déjà configurés.
- **App.disableBackButtonHandler** : `true` pour que le front gère le bouton retour Android.
- **CapacitorHttp** : `enabled: true` pour éviter les blocages CORS/ATS.
- **allowNavigation** : domaines autorisés (API, MapTiler, etc.) déjà listés si besoin.

### 3.2 Variables d’environnement (build)

- **NEXT_PUBLIC_APP_URL** : URL publique de l’app (ex. `https://rentoall.fr`) — utilisée pour les return URLs Stripe et les liens profonds.
- **NEXT_PUBLIC_API_URL** : URL de l’API (ex. `https://rentoall.onrender.com/api`). En prod, ne pas utiliser localhost.

Ces variables sont figées au moment du `npm run build:capacitor` ; les définir correctement avant de builder pour iOS/Android.

### 3.3 Stockage et auth

- Utiliser **`src/lib/storage.ts`** (getItem / setItem / removeItem) pour tout ce qui doit persister (auth, préférences). En Capacitor, cela s’appuie sur `@capacitor/preferences`.
- **CapacitorStorageInit** dans le layout restaure les préférences au lancement.

### 3.4 Stores (résumé)

| Exigence | Android (Play Store) | iOS (App Store) |
|----------|----------------------|------------------|
| Politique de confidentialité | URL dans l’app + fiche Play Console | URL dans l’app + fiche App Store Connect |
| Compte développeur | Google Play Console (paiement unique) | Apple Developer (99 €/an) |
| Signature | Keystore release | Certificat + provisioning |
| Deep links / retour paiement | App Links + assetlinks.json | Associated Domains + apple-app-site-association |
| Permissions | AndroidManifest (déclarer uniquement ce qui est utilisé) | Info.plist usage descriptions (obligatoires) |
| Push | Firebase + google-services.json | APNs + entitlements + certificat |

---

## 4. Références dans le projet

| Document | Contenu |
|----------|---------|
| **docs/capacitor-native-config.md** | Détail Info.plist, AndroidManifest, Associated Domains, App Links. |
| **docs/CAPACITOR-ETAT-ET-RESTE-A-FAIRE.md** | État global, reste à faire, verdict TestFlight / Play. |
| **docs/CAPACITOR-GUIDE-COMPLET.md** | Prérequis, lancer iOS/Android, build App Store. |
| **docs/qa-capacitor.md** | Checklist QA sur device avant soumission. |
| **docs/AUDIT-MOBILE-IOS-ANDROID.md** | Comportements mobile (redirections, safe area, back button, etc.). |
| **docs/VERIFICATION-MOBILE-IOS-ANDROID.md** | Vérification point par point (code + natif + backend). |

---

*Dernière mise à jour : 8 mars 2025*
