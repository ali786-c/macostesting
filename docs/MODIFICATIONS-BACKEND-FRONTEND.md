# 📋 Document des modifications Backend / Frontend à partir de maintenant

> **Objectif** : Récapituler toutes les informations et modifications à appliquer sur le backend et le frontend. Ce document sert de référence pour les évolutions à partir de maintenant.

**Dernière mise à jour** : Février 2026

---

## 0. Bugs critiques corrigés / à corriger

### 0.1 ✅ CORRIGÉ : Caractéristique VOLUME invalide pour PARKING

**Problème** : Lors de la modification d'une annonce parking (ex. passage au tarif horaire), le message "Caractéristique VOLUME invalide pour le type de bien PARKING" bloquait toute sauvegarde.

**Cause** : Le frontend calculait et envoyait VOLUME pour tous les types de biens, alors que le backend rejette VOLUME et SURFACE pour les PARKING.

**Correction appliquée** (frontend) :
- `src/app/host/my-places/[id]/page.tsx` : exclusion de VOLUME et SURFACE lors de l'envoi des caractéristiques pour PARKING
- Ne plus calculer VOLUME automatiquement pour les PARKING
- Filtrer VOLUME/SURFACE au chargement des caractéristiques pour PARKING

---

### 0.2 ⚠️ CRITIQUE – À CORRIGER : Réservation visible pour l'hôte malgré échec de paiement

**Problème** : Quand un client tente une réservation et que le paiement CB échoue (ex. carte test 4242... refusée) :
- ✅ Côté client : la réservation n'est pas confirmée (correct)
- ❌ Côté hôte : la réservation apparaît dans le planning / calendrier

**Risque** : L'hôte pourrait être rémunéré pour des réservations non payées par le client.

**Flux actuel** :
1. Frontend crée la réservation (statut PENDING) **avant** le paiement
2. Redirection vers Stripe Checkout
3. Si paiement échoue → la réservation reste PENDING en base
4. Le calendrier hôte affiche les réservations PENDING

**Ce que le frontend fait déjà** :
- **Retour arrière depuis Stripe** : quand l'utilisateur arrive sur la page Stripe et fait "retour" (sans payer), Stripe redirige vers `cancel_url` = `/payment/cancel?orderId={reservationId}`. La page `/payment/cancel` appelle **immédiatement** `POST /reservations/{id}/cancel` pour supprimer/annuler la réservation. Donc la résa est bien annulée dans ce cas dès que l'utilisateur revient.

**Ce que le backend doit faire** :

| Priorité | Action | Détail |
|----------|--------|--------|
| **1** | Webhook Stripe : annuler en cas d'échec | Sur `payment_intent.payment_failed` ou `checkout.session.expired`, **annuler la réservation** liée (récupérer l’ID via `metadata.orderId` ou `client_reference_id` selon ce qui est envoyé à la création de la session Stripe) en appelant la même logique que `POST /reservations/{id}/cancel`. |
| **2** | Filtrer les réservations hôte | Ne montrer à l'hôte que les réservations avec statut CONFIRMED (payées). Ou introduire un statut `PAYMENT_PENDING` invisible pour l'hôte |
| **3** | Alternative : créer la resa au paiement | Créer la réservation uniquement dans le webhook Stripe `checkout.session.completed` (nécessite refonte du flux) |

**Webhook Stripe à implémenter côté backend** :
- **Événements** : `checkout.session.expired`, `payment_intent.payment_failed`
- **Action** : pour chaque événement, récupérer l’ID de réservation (ex. `session.metadata.orderId` ou équivalent), puis **annuler la réservation** (même effet que `POST /reservations/{id}/cancel`) pour libérer le créneau et ne plus l’afficher à l’hôte.
- Ainsi : **retour arrière** = annulation via la page cancel (front) ; **payment failed / session expirée** = annulation via webhook (back). Les deux doivent aboutir à la suppression/annulation de la résa.

---

## 1. Création d’annonce – Parking

### 1.1 Type d’accès

**À ajouter** : option **"Accès libre"** dans le champ Type d’accès.

| Clé API    | Champ            | Options actuelles                                                                 | Modification |
|-----------|------------------|-----------------------------------------------------------------------------------|--------------|
| `ACCESS_TYPE` | Type d'accès | Accueil, Boite à clef, Code, Smartphone, Badge, Télécommande, Clé, Digicode | **Ajouter « Accès libre »** en première option |

**Emplacements à mettre à jour** :
- `src/app/host/create/page.tsx` – `CHARACTERISTIC_MAPPING` et `PARKING_CHARACTERISTICS`
- `src/components/sections/AdvancedFilters.tsx` – `CHARACTERISTIC_MAPPING`
- `src/app/search-parkings/page.tsx` – `CHARACTERISTIC_MAPPING`
- `src/app/host/my-places/[id]/page.tsx` – mapping des caractéristiques

**Backend** : Vérifier que l’API accepte la valeur `"Accès libre"` pour `ACCESS_TYPE`.

---

### 1.2 Types de véhicules acceptés

**Objectif** : Permettre de sélectionner tous les types et ajouter une option **"Tous"** dans le dropdown.

| Clé API      | Champ                         | Options actuelles                    | Modification |
|-------------|-------------------------------|--------------------------------------|--------------|
| `VEHICLE_TYPE` | Types de véhicules acceptés | Moto, Voiture, Camion, Caravane, Camping car | **Multi-sélection + bouton "Tous"** dans le dropdown |

**Comportement attendu** :
- Multi-sélection possible (plusieurs types)
- Option "Tous" : sélectionne tous les types en un clic
- Interface : dropdown avec checkboxes ou équivalent
- Valeur envoyée : liste des types sélectionnés (format à définir avec le backend, ex. `"Voiture,Moto,Camion"` ou tableau)

**Emplacements concernés** :
- `src/app/host/create/page.tsx` – formulaire de création parking
- `src/app/host/my-places/[id]/page.tsx` – formulaire d’édition
- `src/components/sections/AdvancedFilters.tsx` – filtres de recherche
- `src/app/search-parkings/page.tsx` – filtres de recherche

---

## 2. Création d’annonce – Box (Stockage)

### 2.1 Calcul dynamique Surface et Volume

**Problème** : Surface et volume ne sont pas recalculés à chaque modification des dimensions.  
Exemple : 4 m de large × 5 m de long = **20 m²**, mais l’interface peut afficher 28 m².

**Formules** :
- **Surface (m²)** = Longueur × Largeur  
- **Volume (m³)** = Longueur × Largeur × Hauteur max

**Comportement attendu** :
- Recalcul **automatique** à chaque modification de LENGTH, WIDTH ou MAX_HEIGHT
- Mise à jour **systématique** (pas seulement quand les champs sont vides)
- Les champs Surface et Volume peuvent rester en lecture seule ou être synchronisés automatiquement

**Correction appliquée** (frontend) :
- `src/app/host/create/page.tsx` : calcul dynamique à chaque changement de LENGTH, WIDTH, MAX_HEIGHT
- `src/app/host/my-places/[id]/page.tsx` : idem + ajout du calcul de surface (manquait)

---

### 2.2 ✅ CORRIGÉ : Champ Étage (LEVEL) – Box et Cave

**Problème** : Champ texte libre, pas adapté pour une saisie cohérente.

**Comportement attendu** :
- **Uniquement des valeurs sélectionnables** (dropdown), pas de texte libre
- Options : **de -10 à 0** et **de 0 à +10**
- Format : liste numérique en dropdown

**Correction appliquée** (frontend) :
- `CHARACTERISTIC_MAPPING` : `LEVEL` en `type: 'select'` avec options -10 à +10
- `PARKING_CHARACTERISTICS` et `STORAGE_CHARACTERISTICS` : idem
- `src/app/host/my-places/[id]/page.tsx`
- `src/components/sections/AdvancedFilters.tsx`

**Backend** : Vérifier que l’API accepte des valeurs numériques (ex. `"-1"`, `"0"`, `"2"`) pour `LEVEL`.

---

## 3. Tableau de bord hôte

### 3.1 Affichage en cas de champs vides (pas de réservation)

**Problème** : Quand il n’y a aucune réservation en cours, la section "Évolution mensuelle" affiche une zone blanche / graphique vide sans message.

**Comportement attendu** :
- Afficher un **état vide** explicite avec un message du type :  
  *"Aucune donnée à afficher pour le moment"* ou *"Vous n’avez pas encore de réservations"*
- Éventuellement une icône ou illustration
- Ne pas laisser une zone blanche sans explication

**Implémentation** :
- Fichier : `src/app/home/page.tsx`
- Section : "Évolution mensuelle" – composant `MonthlyChart`
- Détecter si `monthlyData` est vide ou si toutes les valeurs (réservations + revenus) sont à 0
- Si oui : afficher un bloc placeholder au lieu du graphique
- Sinon : afficher le graphique comme aujourd’hui

**Condition suggérée** :
```javascript
const hasData = monthlyData.some(d => d.reservations > 0 || d.revenue > 0);
```
Afficher le graphique uniquement si `hasData === true`, sinon afficher le placeholder.

---

## 4. Recherche géographique – Page search-parkings

### 4.1 ✅ IMPLÉMENTÉ : Recherche par rayon (comportement type Airbnb)

**Problème** : En sélectionnant une ville (ex. Beauvais), les biens proches (ex. Tillé, à l’aéroport) ne s’affichaient pas, car la recherche se faisait uniquement par correspondance exacte du nom de ville.

**Solution** : Recherche géographique par rayon de 50 km autour des coordonnées de la ville sélectionnée.

| Paramètre | Rôle | Valeur par défaut |
|-----------|------|-------------------|
| `lat` | Latitude du centre (ville sélectionnée) | - |
| `lng` | Longitude du centre | - |
| `radius` | Rayon de recherche en kilomètres | **50 km** |
| `city` | Nom de ville (fallback si pas de coords) | - |

**Comportement frontend (implémenté)** :
1. Quand une ville est sélectionnée, géocodage pour obtenir lat/lng
2. L’API est appelée avec `lat`, `lng`, `radius=50` pour récupérer les biens dans un rayon de 50 km
3. La carte se centre sur la ville avec un zoom ≈ 10 (vue ~50 km)
4. Pas de filtre client par nom de ville lorsque la recherche est géographique (les biens retournés par l’API sont ceux visibles)

**Fichiers modifiés** :
- `src/app/search-parkings/page.tsx` – logique loadPlaces, mapCenter (zoom 10), filtre city, searchKey
- `src/components/sections/header-navigation.tsx` – buildSearchParams avec radius=50 par défaut

**Backend – Exigence** : L’API de recherche des places doit accepter et traiter correctement les paramètres `lat`, `lng` et `radius` (en km). La recherche doit retourner les biens dont les coordonnées sont dans le rayon défini, et non seulement ceux dont la ville correspond au texte.

---

## 5. Synthèse des modifications par zone

| Zone                    | Modification                              | Priorité | Statut      |
|-------------------------|-------------------------------------------|----------|-------------|
| Recherche géographique  | lat/lng/radius=50 pour biens les plus proches | Haute | ✅ Frontend |
| Type d’accès (Parking)  | Ajouter "Accès libre"                     | Haute    | -           |
| Types de véhicules      | Multi-sélection + bouton "Tous"           | Haute    | -           |
| Box – Surface/Volume    | Calcul dynamique à chaque changement      | Haute    | ✅ Frontend |
| Box/Cave – Étage        | Dropdown -10 à +10 (pas de texte libre)   | Moyenne  | ✅ Frontend |
| Dashboard – Évolution   | État vide quand pas de réservations       | Haute    | -           |

---

## 6. Endpoints backend existants / à adapter

### Recherche de places (search / GET places)

Le frontend envoie désormais systématiquement `lat`, `lng` et `radius` (en km) lors d'une recherche par ville. L'API doit retourner les biens dont les coordonnées sont dans le rayon donné.

| Paramètre | Type   | Description                    |
|-----------|--------|--------------------------------|
| `lat`     | number | Latitude du centre de recherche |
| `lng`     | number | Longitude du centre            |
| `radius`  | number | Rayon en kilomètres (ex. 50)   |

**Priorité** : Si `lat` et `lng` sont fournis, la recherche géographique prime sur la recherche textuelle par ville.

---

### Caractéristiques (CreatePlacePayload)

Les caractéristiques sont envoyées sous la forme :

```json
"characteristics": [
  { "name": "ACCESS_TYPE", "value": "Accès libre" },
  { "name": "VEHICLE_TYPE", "value": "Voiture,Moto" },
  { "name": "LEVEL", "value": "-1" },
  { "name": "SURFACE", "value": "20.00" },
  { "name": "VOLUME", "value": "40.00" }
]
```

À valider côté backend :
- `ACCESS_TYPE` : acceptation de `"Accès libre"`
- `VEHICLE_TYPE` : format multi-valeurs (ex. `"Voiture,Moto,Camion"` ou équivalent)
- `LEVEL` : acceptation de valeurs numériques entre -10 et +10

---

## 7. Référence des fichiers concernés

| Fichier                                      | Modifications prévues                    |
|---------------------------------------------|------------------------------------------|
| `src/app/host/create/page.tsx`              | ACCESS_TYPE, VEHICLE_TYPE, LEVEL, Surface/Volume |
| `src/app/host/my-places/[id]/page.tsx`      | ACCESS_TYPE, VEHICLE_TYPE, LEVEL, Surface/Volume |
| `src/components/sections/AdvancedFilters.tsx` | ACCESS_TYPE, VEHICLE_TYPE, LEVEL         |
| `src/app/search-parkings/page.tsx`          | ACCESS_TYPE, VEHICLE_TYPE, recherche géo (lat/lng/radius) |
| `src/app/home/page.tsx`                     | État vide "Évolution mensuelle"          |

---

## 8. Historique des mises à jour

| Date       | Modification                            |
|-----------|-----------------------------------------|
| Mars 2026 | Création du document, premières spécifications |
| Mars 2026 | Correction VOLUME invalide pour PARKING (frontend) |
| Mars 2026 | Doc bug critique : réservation visible hôte malgré échec paiement |
| Fév. 2026 | Recherche géographique (lat/lng/radius=50) – biens les plus proches type Airbnb |
| Fév. 2026 | Box : calcul dynamique Surface/Volume à chaque changement dimensions |
| Fév. 2026 | Box/Cave : champ Étage en dropdown -10 à +10 (plus de champ texte libre) |
