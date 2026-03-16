# Paiement Stripe embarqué - Modifications backend requises

**Objectif** : Sur mobile (Capacitor iOS/Android), le paiement doit rester dans l'app (pas de redirection vers une page externe).

## Modifications backend

### 1. Endpoint `/checkout-session` (création de réservation)

- Accepter le paramètre optionnel `uiMode: "embedded" | "hosted"` dans le body.
- Quand `uiMode === "embedded"` :
  - Créer la Checkout Session Stripe avec `ui_mode: 'embedded'` (au lieu de `hosted`).
  - Utiliser `return_url` (et non `success_url`/`cancel_url`) : `return_url: successUrl`.
  - Retourner `{ clientSecret: session.client_secret, sessionId }` au lieu de `{ url, sessionId }`.
- Quand `uiMode === "hosted"` ou absent : comportement actuel (retourner `url`).

### 2. Endpoint `/reservations/{id}/create-update-checkout` (paiement supplément)

- Accepter le paramètre optionnel `uiMode=embedded` en query string.
- **Accepter le paramètre `amountInEuros`** (recommandé pour le bon montant) :
  - en **query string** : `?amountInEuros=12.50`
  - et/ou en **body JSON** : `{ "amountInEuros": 12.50, "amountInCents": 1250 }`
- Le frontend envoie aussi **`amountInCents`** dans le body (montant en centimes = `amountInEuros * 100`), directement utilisable pour l’API Stripe.
- **Pour la session Stripe** : utiliser **`amountInCents`** (ou `amountInEuros * 100`) comme montant à charger. Ne pas utiliser la différence de prix brute (hostAmount / priceDifference) stockée sur la réservation, sinon Stripe affiche un montant sans les frais de service.
- Même logique : si `uiMode=embedded`, créer avec `ui_mode: 'embedded'`, `return_url`, et retourner `clientSecret`.

## Frontend

Déjà implémenté. Le frontend envoie `uiMode: 'embedded'` sur Capacitor et affiche le Stripe Embedded Checkout en modal. Si le backend ne supporte pas encore, fallback : ouverture dans le navigateur in-app (Capacitor Browser).

## Variable d'environnement frontend

`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` : clé publique Stripe (pk_test_... ou pk_live_...) pour le paiement embarqué.
