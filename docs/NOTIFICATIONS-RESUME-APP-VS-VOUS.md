# Notifications push — Côté app vs côté vous

Ce document fait le point sur **ce qui est déjà fait côté app** (Android + iOS) et **ce que vous devez faire** (backend + config native) pour que les push fonctionnent.

---

## Côté app (déjà en place — rien à coder de plus)

### 1. Enregistrement du token

- **Quand** : au lancement si l’utilisateur est déjà connecté, et après chaque connexion (événement `auth-state-changed` quand `userId` est enregistré dans le storage).
- **Où** : `CapacitorPushNotifications` (dans le layout) appelle `addPushListeners` puis `registerForPushNotifications()`.
- **Envoi au backend** : à la réception du token FCM/APNs (listener `registration`), l’app envoie **POST** vers l’URL de votre API :  
  **`POST /api/users/{userId}/device-tokens`**  
  **Body** : `{ "pushToken": "<token>", "platform": "ios" | "android" }`  
  **Headers** : `Authorization: Bearer <JWT>`, `Content-Type: application/json`.

Si votre backend renvoie **404** (endpoint pas encore créé), l’app ne plante pas : elle log un avertissement et continue.

### 2. Navigation au clic sur une notification

- Les **data** envoyées par votre backend sont lues au clic.
- L’app ouvre l’écran en fonction de `data.type` et des IDs :

| `data.type` | + champs | Écran ouvert |
|-------------|----------|--------------|
| `new_message`, `message` | `conversationId` | `/messages` ou `/messages?conversationId=…` |
| `new_reservation`, `reservation`, `booking` | `reservationId` | `/reservations` ou `/reservations/{id}` |
| `reservation_status`, `reservation_update`, `reservation_modified` | `reservationId` | idem |
| `place` | `placeId` | `/parking/{id}` ou `/host/my-places` |

Fichier : `src/lib/push-notifications.ts` → `getPathFromNotificationData`.

### 3. Android

- **Canal** : l’app crée le canal **`rentoall_default`** au premier enregistrement (Android 8+).
- **strings.xml** : `default_notification_channel_id` = `rentoall_default` (déjà dans `android/app/src/main/res/values/strings.xml`).
- **Plugin** : `@capacitor/push-notifications` + `capacitor-push-notifications` dans le projet Android.  
- **google-services** : le `build.gradle` applique le plugin Google Services **si** le fichier **`google-services.json`** est présent dans `android/app/`. **Sans ce fichier, les push Android ne marcheront pas** — c’est à vous de l’ajouter (voir ci‑dessous).

### 4. iOS

- **Plugin** : `CapacitorPushNotifications` dans le Podfile.
- **Info.plist** : `UIBackgroundModes` → `remote-notification` (déjà présent).
- **App.entitlements** : `aps-environment` = `development` (pour TestFlight/dev). Pour la **production** App Store, utiliser un profil de distribution avec `aps-environment` = `production` (Xcode le gère avec le bon provisioning profile).
- Les **permissions** (demande à l’utilisateur) sont gérées par l’app via `PushNotifications.requestPermissions()`.

### 5. Config Capacitor

- **capacitor.config.ts** : `PushNotifications: { presentationOptions: ["badge", "sound", "alert"] }`.

---

## Côté vous — À faire

### A. Backend (obligatoire)

1. **Créer l’endpoint**  
   - **POST** `/api/users/{userId}/device-tokens`  
   - **Body** : `{ "pushToken": string, "platform": "ios" | "android" }`  
   - **Headers** : `Authorization: Bearer <JWT>`, `Content-Type: application/json`  
   - Vérifier que l’utilisateur authentifié correspond à `userId`.  
   - Enregistrer ou mettre à jour le token (ex. table `device_tokens` avec `user_id`, `token`, `platform`).  
   - Réponse : **200** ou **204**.

2. **Envoyer les push** aux bons utilisateurs avec le bon **format** :
   - **Android (FCM v1)** : mettre les infos de navigation dans **`data`** (pas seulement `notification`), et utiliser **`channel_id`: `"rentoall_default"`** dans `android.notification`.
   - **iOS (APNs)** : mettre **`type`**, **`reservationId`**, **`conversationId`**, **`placeId`** au même niveau que **`aps`** (ou dans la clé lue par l’app).

Tout le détail (exemples JSON FCM/APNs, quand notifier, types) est dans **`docs/NOTIFICATIONS-BACKEND.md`**.

### B. Android — Config native (vous)

1. **Firebase**  
   - Créer un projet Firebase (ou utiliser l’existant).  
   - Ajouter une app **Android** avec le **package** : **`com.rentoall.app`**.  
   - Télécharger **google-services.json** et le placer dans **`android/app/google-services.json`** (à la racine de `app/`, pas dans `res/`).  
   - Ne pas commiter ce fichier si il contient des infos sensibles, ou utiliser un fichier d’exemple pour le repo.

2. **Backend / FCM**  
   - Dans Firebase : **Paramètres du projet** → **Comptes de service** → générer une **clé de compte de service** (JSON).  
   - Sur votre serveur : utiliser ce JSON pour obtenir un **access token OAuth2** et appeler l’API HTTP v1 de FCM avec `Authorization: Bearer <access_token>`.

Sans **google-services.json** dans `android/app/`, l’app ne pourra pas recevoir de token FCM et les push Android ne fonctionneront pas.

### C. iOS — Config native (vous)

1. **Apple Developer**  
   - **Identifiers** → App ID **com.rentoall.app** → activer **Push Notifications**.  
   - Créer un **certificat APNs** (ou une **clé APNs**) pour cet App ID.

2. **Xcode**  
   - **Signing & Capabilities** : la capability **Push Notifications** doit être ajoutée (souvent déjà là avec Capacitor).  
   - **App.entitlements** : `aps-environment` = `development` pour le dev / TestFlight ; en **production** (App Store), utiliser un profil de distribution avec `aps-environment` = `production`.

3. **Backend / APNs**  
   - Votre serveur doit envoyer les requêtes à **api.sandbox.push.apple.com** (dev) ou **api.push.apple.com** (prod) avec le certificat ou la clé APNs.  
   - **Ou** : utiliser **Firebase** pour iOS (ajouter une app iOS dans le projet Firebase, Bundle ID **com.rentoall.app**, uploader la clé APNs) ; dans ce cas vous utilisez le même token que l’app envoie à votre API et FCM relaie vers APNs.

---

## Récap checklist « Côté vous »

- [ ] **Backend** : endpoint **POST** `/api/users/{userId}/device-tokens` qui enregistre `pushToken` + `platform`.
- [ ] **Backend** : envoi de push (FCM v1 pour Android, APNs pour iOS) avec **data** contenant `type`, `reservationId` / `conversationId` / `placeId` selon le cas (voir NOTIFICATIONS-BACKEND.md).
- [ ] **Android** : fichier **google-services.json** dans **android/app/** (projet Firebase avec app Android `com.rentoall.app`).
- [ ] **Android** : backend configuré avec une **clé de compte de service** Firebase pour appeler FCM v1.
- [ ] **iOS** : **Push Notifications** activées pour l’App ID **com.rentoall.app** (certificat ou clé APNs).
- [ ] **iOS** : backend envoie les push à Apple (APNs) ou passe par Firebase pour iOS.
- [ ] **iOS prod** : profil de distribution avec `aps-environment` = **production** pour l’App Store.

---

**Références** : **docs/NOTIFICATIONS.md** (côté app), **docs/NOTIFICATIONS-BACKEND.md** (contrat backend, exemples FCM/APNs, quand notifier).
