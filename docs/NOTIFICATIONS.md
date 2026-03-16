# Notifications push (iOS & Android)

Ce document décrit la mise en place des notifications push dans l’app Rentoall (Capacitor) et ce que le backend doit fournir.

## Côté app (déjà en place)

- **Plugin** : `@capacitor/push-notifications` (FCM sur Android, APNs sur iOS).
- **Quand l’utilisateur est connecté** : l’app demande les permissions, enregistre le token FCM/APNs et l’envoie au backend via `POST /api/users/{userId}/device-tokens`. L’envoi a lieu au lancement (si déjà connecté) et après chaque connexion (événement `auth-state-changed`).
- **Au clic sur une notification** : l’app ouvre le bon écran selon le champ `data.type` et les IDs (réservation, conversation, etc.).

### Payload attendu dans la notification

Pour que le clic ouvre le bon écran, le backend doit envoyer un payload **data** contenant au moins :

| Champ             | Description                                      | Exemple d’écran ouvert              |
|-------------------|--------------------------------------------------|-------------------------------------|
| `type`            | `message` / `new_message` / `reservation` / `new_reservation` / `reservation_status` / `reservation_update` / `reservation_modified` / `place` | - |
| `conversationId`   | ID de la conversation                            | `/messages?conversationId=…`        |
| `reservationId`   | ID de la réservation                             | `/reservations/{id}`                |
| `placeId`         | ID du bien (parking)                             | `/parking/{id}`                     |

Exemples de payload **data** (FCM / APNs) :

- **Nouveau message** : `{ "type": "new_message", "conversationId": "123" }`
- **Nouvelle réservation (pour l’hôte)** : `{ "type": "new_reservation", "reservationId": "456" }`
- **Réservation modifiée** : `{ "type": "reservation_update", "reservationId": "456" }` ou `{ "type": "reservation_modified", "reservationId": "456" }`
- **Statut réservation** : `{ "type": "reservation_status", "reservationId": "456" }`

Le **titre** et le **body** de la notification sont gérés comme d’habitude (titre, body, etc.) ; les champs ci‑dessus servent uniquement à la navigation au clic.

---

## Backend : endpoint requis

### Enregistrement du token push

- **URL** : `POST /api/users/{userId}/device-tokens`
- **Headers** : `Authorization: Bearer <JWT>`, `Content-Type: application/json`
- **Body** :
  ```json
  {
    "pushToken": "<FCM token ou APNs token>",
    "platform": "ios" | "android"
  }
  ```
- **Comportement attendu** : enregistrer ou mettre à jour le token pour cet utilisateur (et la plateforme). Un même utilisateur peut avoir un token iOS et un token Android ; à vous de les stocker (ex. table `device_tokens` avec `user_id`, `token`, `platform`, `updated_at`).

Quand l’utilisateur se déconnecte, vous pouvez supprimer les tokens de cet appareil (optionnel ; l’app ne rappelle pas l’endpoint à la déco pour l’instant).

---

## Envoi des notifications

### Android (Firebase Cloud Messaging)

- Utiliser l’API HTTP v1 de FCM avec le token enregistré (`pushToken`).
- Pour que le clic ouvre le bon écran, envoyer les infos dans `data` (et pas seulement dans `notification`), par exemple :
  ```json
  {
    "message": {
      "token": "<FCM token>",
      "notification": { "title": "Nouveau message", "body": "…" },
      "data": {
        "type": "new_message",
        "conversationId": "123"
      }
    }
  }
  ```

### iOS (APNs)

- Utiliser le token APNs enregistré (`pushToken`) et votre serveur APNs (ou FCM qui peut relayer vers APNs).
- Inclure les mêmes champs dans le payload (ex. `aps` + custom data) pour que l’app puisse lire `type`, `conversationId`, `reservationId`, `placeId` au clic.

---

## Configuration native

### iOS

1. **Xcode** : ouvrir `ios/App/App.xcworkspace`.
2. Sélectionner la target **App** → **Signing & Capabilities**.
3. Cliquer **+ Capability** et ajouter **Push Notifications**.
4. Les méthodes `didRegisterForRemoteNotificationsWithDeviceToken` et `didFailToRegisterForRemoteNotificationsWithError` sont déjà présentes dans `AppDelegate.swift`.

Pour envoyer des push en prod, vous devez aussi configurer un **certificat APNs** (ou une clé APNs) dans le compte Apple Developer et sur votre serveur / FCM.

### Android

1. **Firebase** : créer un projet (ou utiliser l’existant) sur [Firebase Console](https://console.firebase.google.com).
2. Ajouter une app **Android** avec le package `com.rentoall.app`.
3. Télécharger **google-services.json** et le placer dans `android/app/`.
4. Le plugin applique déjà le plugin Google Services si `google-services.json` est présent (voir `android/app/build.gradle`).

Optionnel : icône de notification blanche sur fond transparent dans `res/drawable` et référence dans `AndroidManifest.xml` :
```xml
<meta-data android:name="com.google.firebase.messaging.default_notification_icon" android:resource="@drawable/ic_push" />
```

---

## Résumé des cas couverts par l’app

- **Hôte** : nouvelle réservation sur un de mes biens → type `new_reservation` + `reservationId`.
- **Réservation modifiée** (dates, acceptation modification, etc.) → type `reservation_update` ou `reservation_modified` + `reservationId`.
- **Message** : quelqu’un m’envoie un message → type `new_message` + `conversationId`.
- **Réservation** : statut mis à jour (acceptée, annulée, etc.) → type `reservation_status` + `reservationId`.

Les préférences utilisateur (push réservations / messages) sont déjà gérées dans **Paramètres > Notifications** ; le backend peut les interroger avant d’envoyer une push (ex. ne pas envoyer de push “réservation” si `pushNotificationBooking === false`).
