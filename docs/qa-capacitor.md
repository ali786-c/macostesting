# Checklist QA Capacitor — iOS & Android

À exécuter sur **devices réels** (ou simulateur + émulateur) avant soumission TestFlight / Play Internal Testing.

> **Contexte** : ce qui est fait côté code et ce qu’il reste à faire (config native, env) : **`docs/CAPACITOR-ETAT-ET-RESTE-A-FAIRE.md`**.

---

## 1) Prérequis

- [ ] Build Capacitor réussi : `npm run build:capacitor && npx cap sync`
- [ ] Projets ios/ et android/ présents et ouverts au moins une fois (Xcode / Android Studio)
- [ ] Variable `NEXT_PUBLIC_APP_URL` (ou équivalent) configurée pour la prod si test return URLs

---

## 2) Tests devices

### iOS

- [ ] Lancement à froid : app s’ouvre, pas de crash
- [ ] Lancement depuis une route profonde (si supporté par le chargement initial)
- [ ] Passage en arrière-plan puis retour : pas de crash, session conservée
- [ ] Rotation écran (si autorisée) : pas de layout cassé
- [ ] Safe area : contenu pas sous encoche / barre d’accueil

### Android

- [ ] Lancement à froid : app s’ouvre, pas de crash
- [ ] Bouton retour matériel : retour à l’écran précédent (navigation), pas de fermeture aléatoire
- [ ] Passage en arrière-plan puis retour : pas de crash, session conservée
- [ ] Barre de statut / navigation : pas de chevauchement

---

## 3) Parcours core (obligatoire)

Cocher chaque étape après test réussi.

1. [ ] **Login** — Connexion (email/mot de passe ou OAuth si dispo)
2. [ ] **Home** — Accès à la page d’accueil après login
3. [ ] **Search** — Recherche (ex. parkings), résultats affichés
4. [ ] **Détail** — Ouverture d’une fiche (ex. parking/[id])
5. [ ] **Réservation / Paiement** — Création réservation + redirection Stripe (si dispo)
6. [ ] **Success / Cancel** — Retour depuis Stripe vers l’app (success puis cancel) → bonne page, pas d’écran blanc
7. [ ] **Réservations** — Liste des réservations accessible
8. [ ] **Paramètres** — Accès paramètres / compte
9. [ ] **Logout** — Déconnexion, retour accueil ou login

**Parcours minimal** : Login → Home → Search → Détail → (Réservation/Paiement) → Réservations → Settings → Logout.

---

## 4) Offline

- [ ] Couper le réseau (mode avion ou WiFi off)
- [ ] Écran / bandeau « Pas de connexion » (ou équivalent) affiché
- [ ] Bouton « Réessayer » ou équivalent : au retour du réseau, rechargement ou retry OK
- [ ] Réactiver le réseau : l’app reprend un comportement normal

---

## 5) Paiements

- [ ] Création d’une réservation avec paiement (Stripe Checkout) sur **device**
- [ ] **Success** : après paiement réussi, redirection vers l’app (ex. `/payment/success` ou page réservations) sans rester bloqué dans le navigateur
- [ ] **Cancel** : après annulation sur Stripe, retour dans l’app (ex. `/payment/cancel` ou détail parking)
- [ ] Stripe Connect (parametres / payouts) : return URL rouvre bien l’app sur la page parametres si configuré

---

## 6) Uploads / Fichiers

- [ ] **iOS** : depuis une page avec `<input type="file">` (ex. host/my-places, parametres, influenceur-settings), sélection photo ou fichier → upload ou prévisualisation OK
- [ ] **Android** : idem
- [ ] Pas de crash à l’ouverture du sélecteur de fichiers / galerie
- [ ] Si permission demandée (photo/camera), le message affiché est clair (à vérifier après ajout des usage descriptions)

---

## 7) Deep links (si configurés)

- [ ] Envoyer un lien (ex. `https://rentoall.fr/parking/123` ou `https://rentoall.fr/payment/success?...`) par email ou SMS
- [ ] Ouvrir le lien sur le device : l’app s’ouvre (pas le navigateur) et affiche la bonne page ou écran
- [ ] Tester aussi un lien vers une route protégée (ex. après login) si applicable

---

## 8) Session / stockage

- [ ] Après login, fermer l’app (kill) puis rouvrir : l’utilisateur reste connecté (token restauré)
- [ ] Après logout, rouvrir l’app : écran login ou accueil non connecté

---

## 9) Récap

- **Parcours core** : tous les points 1–9 cochés
- **Offline** : au moins affichage + retry
- **Paiements** : success + cancel testés sur device
- **Uploads** : au moins un flux (photo ou fichier) OK sur iOS et Android
- **Deep links** : OK si Universal Links / App Links sont en place

En cas d’échec sur un point, noter device, OS, étape et message d’erreur pour correction avant soumission.
