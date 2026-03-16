# Notifications push — Ce que le backend doit faire (Android + iOS)

Ce document décrit **exactement** ce que le backend doit mettre en place pour que les notifications push fonctionnent sur l’app Rentoall (Capacitor) : nouvelle réservation, modification de réservation, messages, etc.

---

## 1. Endpoint : enregistrer le token push

L’app envoie le token FCM (Android) ou APNs (iOS) **après connexion** et **à chaque lancement** si l’utilisateur est déjà connecté (événement `auth-state-changed`).

### Contrat

| Élément | Valeur |
|--------|--------|
| **Méthode** | `POST` |
| **URL** | `/api/users/{userId}/device-tokens` (ou équivalent selon votre base : ex. `https://votre-api.com/api/users/123/device-tokens`) |
| **Headers** | `Authorization: Bearer <JWT>`, `Content-Type: application/json` |
| **Body** | `{ "pushToken": "<string>", "platform": "ios" | "android" }` |

### Comportement attendu

1. Vérifier que l’utilisateur authentifié correspond à `userId` (ou que le JWT appartient à cet utilisateur).
2. Enregistrer ou mettre à jour le token pour cet utilisateur et cette plateforme.
   - Un même utilisateur peut avoir **un token iOS et un token Android** (ex. iPhone + tablette Android).
   - Si le même appareil se reconnecte, **écraser** l’ancien token pour cette combinaison `(userId, platform)`.
3. Réponse : **200** ou **204** (pas de body requis). En cas d’erreur : **4xx** avec message.

### Exemple de table (à adapter)

```sql
CREATE TABLE device_tokens (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(512) NOT NULL,
  platform VARCHAR(10) NOT NULL CHECK (platform IN ('ios', 'android')),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, platform)
);
```

À chaque `POST`, faire un **UPSERT** : si une ligne existe pour `(user_id, platform)`, mettre à jour `token` et `updated_at` ; sinon insérer.

---

## 2. Quand envoyer une notification push

Envoyer une push aux **utilisateurs concernés** dans les cas suivants. Récupérer leurs tokens via la table `device_tokens` (par `user_id`).

| Événement | Qui notifier | Type `data.type` | Champs `data` obligatoires | Exemple titre / body |
|-----------|--------------|-------------------|-----------------------------|----------------------|
| **Nouvelle réservation** créée (client a réservé un bien) | **Propriétaire du bien** (hôte) | `new_reservation` | `reservationId` | "Nouvelle réservation", "Un client a réservé [titre du bien]" |
| **Réservation modifiée** (changement de dates, demande de modification acceptée/refusée) | **Hôte et/ou client** selon le cas | `reservation_update` ou `reservation_modified` | `reservationId` | "Réservation modifiée", "Les dates de la réservation #X ont été modifiées" |
| **Statut de réservation** changé (acceptée, refusée, annulée, terminée) | **Hôte et/ou client** | `reservation_status` | `reservationId` | "Réservation acceptée", "Votre réservation a été acceptée par l'hôte" |
| **Nouveau message** dans une conversation | **L’autre participant** | `new_message` | `conversationId` (ou identifiant de la conversation) | "Nouveau message", "Vous avez reçu un nouveau message" |

Optionnel : avant d’envoyer, vérifier les préférences utilisateur (ex. ne pas envoyer de push "réservations" si l’utilisateur a désactivé les notifications réservations). L’app expose ces préférences ; le backend peut les exposer via un endpoint ou les stocker en base.

---

## 3. Format du payload : Android (FCM)

Utiliser l’**API HTTP v1** de Firebase Cloud Messaging.

### Prérequis

- Projet Firebase avec une app Android (package `com.rentoall.app`).
- Fichier **google-services.json** dans l’app (côté front, déjà prévu).
- Côté backend : **clé de compte de service** (Service Account) Firebase → JSON avec `private_key` et `client_email`. Utiliser ce compte pour obtenir un **access token OAuth2** et l’envoyer dans le header `Authorization: Bearer <access_token>`.

### Structure du message FCM v1

Pour que le **clic** sur la notification ouvre le bon écran dans l’app, les infos doivent être dans **`data`** (pas seulement dans `notification`). Sur Android, si vous n’envoyez que `notification`, le clic ouvre l’app mais pas une route précise.

```json
{
  "message": {
    "token": "<FCM device token enregistré>",
    "notification": {
      "title": "Nouvelle réservation",
      "body": "Un client a réservé votre place de parking du 10/04 au 12/04."
    },
    "data": {
      "type": "new_reservation",
      "reservationId": "456"
    },
    "android": {
      "priority": "high",
      "notification": {
        "channel_id": "rentoall_default"
      }
    }
  }
}
```

Exemple **réservation modifiée** :

```json
{
  "message": {
    "token": "<FCM token>",
    "notification": {
      "title": "Réservation modifiée",
      "body": "Les dates de votre réservation ont été mises à jour."
    },
    "data": {
      "type": "reservation_update",
      "reservationId": "789"
    },
    "android": {
      "priority": "high",
      "notification": {
        "channel_id": "rentoall_default"
      }
    }
  }
}
```

- **channel_id** : `rentoall_default` est le canal créé par l’app (Android 8+). Vous pouvez l’utiliser pour que la notification s’affiche correctement.
- Pour chaque utilisateur à notifier, récupérer son token `platform = 'android'` et envoyer un message par token.

---

## 4. Format du payload : iOS (APNs)

Utiliser le **token APNs** enregistré (celui que l’app envoie comme `pushToken` pour `platform: "ios"`).

### Prérequis

- **Certificat APNs** (ou **clé APNs**) configuré dans le compte Apple Developer (Identifiers → App ID → Push Notifications).
- Serveur qui envoie les requêtes à `api.sandbox.push.apple.com` (dev) ou `api.push.apple.com` (prod), avec le certificat ou la clé.

Vous pouvez aussi utiliser **Firebase** pour iOS : ajouter une app iOS dans le projet Firebase (Bundle ID `com.rentoall.app`), uploader la clé APNs. Ensuite FCM peut relayer vers APNs ; dans ce cas vous utilisez le même token enregistré par l’app (FCM le gère).

### Structure du payload APNs (custom data)

L’app lit les champs custom au clic. Format typique :

```json
{
  "aps": {
    "alert": {
      "title": "Nouvelle réservation",
      "body": "Un client a réservé votre place de parking."
    },
    "sound": "default",
    "badge": 1
  },
  "type": "new_reservation",
  "reservationId": "456"
}
```

Pour **réservation modifiée** :

```json
{
  "aps": {
    "alert": {
      "title": "Réservation modifiée",
      "body": "Les dates de votre réservation ont été mises à jour."
    },
    "sound": "default",
    "badge": 1
  },
  "type": "reservation_update",
  "reservationId": "789"
}
```

Les champs **type**, **reservationId**, **conversationId**, **placeId** doivent être au même niveau que **aps** (ou dans une clé `data` selon ce que lit l’app ; ici l’app Capacitor lit `event.notification.data` qui correspond en général aux champs custom racine).

---

## 5. Récap : étapes backend à faire

1. **Créer l’endpoint**  
   `POST /api/users/:userId/device-tokens`  
   Body : `{ "pushToken": string, "platform": "ios" | "android" }`  
   → Enregistrer ou mettre à jour en base (table `device_tokens` ou équivalent).

2. **Lors de la création d’une réservation**  
   Récupérer l’`owner_id` du bien (hôte).  
   Récupérer les tokens de cet utilisateur (`device_tokens`).  
   Pour chaque token Android : envoyer un message FCM avec `data.type = "new_reservation"`, `data.reservationId = <id>`.  
   Pour chaque token iOS : envoyer un message APNs avec les mêmes champs custom.

3. **Lors de la modification d’une réservation** (changement de dates, acceptation/refus de modification)  
   Notifier le **client** et/ou l’**hôte** selon votre règle métier.  
   Utiliser `data.type = "reservation_update"` (ou `reservation_modified`) et `data.reservationId = <id>`.

4. **Lors d’un changement de statut** (acceptée, refusée, annulée, etc.)  
   Notifier les concernés avec `data.type = "reservation_status"` et `data.reservationId = <id>`.

5. **Lors d’un nouveau message**  
   Notifier l’autre participant avec `data.type = "new_message"` et `data.conversationId = <id>`.

6. **Configuration Android**  
   Avoir un projet Firebase, une app Android `com.rentoall.app`, et une **clé de compte de service** pour appeler l’API FCM v1.

7. **Configuration iOS**  
   Avoir un **certificat APNs** (ou une clé APNs) pour l’App ID `com.rentoall.app`, et un serveur qui envoie les push à Apple (ou passer par Firebase pour iOS).

---

## 6. Référence des types et écrans ouverts (côté app)

| `data.type` | Écran ouvert au clic |
|-------------|----------------------|
| `new_reservation`, `reservation`, `booking` | `/reservations` ou `/reservations/{reservationId}` si `reservationId` présent |
| `reservation_status`, `reservation_update`, `reservation_modified` | Idem |
| `new_message`, `message` | `/messages` ou `/messages?conversationId=…` si `conversationId` présent |
| `place` | `/parking/{placeId}` ou `/host/my-places` si `placeId` présent |

Tout est documenté côté app dans **docs/NOTIFICATIONS.md**.

---

*Dernière mise à jour : mars 2025*
