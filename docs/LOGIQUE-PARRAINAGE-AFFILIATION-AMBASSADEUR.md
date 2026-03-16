# Logique Parrainage, Affiliation et Ambassadeur

Ce document décrit toute la logique frontend (et les contrats API) mis en place pour le **parrainage**, l’**affiliation** et les **ambassadeurs**, afin de pouvoir la refaire ou la répliquer.

---

## 1. Vue d’ensemble des trois niveaux

| Niveau | Description | Récompenses |
|--------|-------------|-------------|
| **Parrainage** | Code unique par utilisateur (ex. JODO-1234). Les amis s’inscrivent avec ce code → deviennent **filleuls**. | Bons 5 € à chaque palier de 200 € d’achats du filleul (parrain + filleul). Pas de crédit à l’inscription. |
| **Affiliation** | Jusqu’à 20 codes personnalisés par utilisateur (ex. PROMO2026). Les inscrits avec un de ces codes → **affiliés**. | 1 % de commission sur chaque réservation payée par un affilié + mêmes bons 5 € / 200 €. |
| **Ambassadeur** | Rôle attribué par la plateforme. Recrute des **affiliateurs** (parrains) et touche une part sur les réservations générées par leurs affiliés. | Si parrain sous ambassadeur : 0,5 % parrain + 0,5 % ambassadeur. Sinon parrain seul : 1 %. |

La logique de **qui est parrain / affilié / ambassadeur** et le calcul des commissions sont côté **backend**. Le frontend se contente d’appeler les APIs et d’afficher les données.

---

## 2. APIs utilisées (`src/services/api.ts`)

### 2.1 Objet `referralsAPI`

Toutes les URLs sont construites avec `getBaseURLWithoutV1()` (sans `/v1`). Token : `Authorization: Bearer ${storage.getItem("authToken")}`.

| Méthode | HTTP | Endpoint | Description |
|---------|------|----------|-------------|
| `getMyReferrals(userId)` | GET | `/users/{userId}/referrals` | Liste des **filleuls** (UserDTO[]). |
| `getMyAffiliates(userId)` | GET | `/users/{userId}/affiliates` | Liste des **affiliés** (UserDTO[]). |
| `getAffiliationCodes(userId)` | GET | `/users/{userId}/affiliation-codes` | Codes d’affiliation de l’utilisateur (AffiliationCodeDTO[]). |
| `createAffiliationCode(userId, code, description)` | POST | `/users/{userId}/affiliation-codes?code=XXX&description=YYY` | Créer un code d’affiliation. |
| `deleteAffiliationCode(userId, codeId)` | DELETE | `/users/{userId}/affiliation-codes/{codeId}` | Supprimer un code. |
| `getAffiliationTransactions(userId)` | GET | `/users/{userId}/affiliation-transactions` | Historique des transactions d’affiliation. |
| `generateReferralCode(userId)` | POST | `/users/{userId}/generate-referral-code` | Générer le code de parrainage (backend). |
| `getReferralInfo(userId)` | GET | `/users/{userId}/referral-info` | `referralCode` + `creditBalance` (solde). |
| `getDiscountBonuses(userId)` | GET | `/users/{userId}/discount-bonuses` | Bons de réduction (5 €, parrainage/affiliation). |
| `getAffiliationSummary(userId)` | GET | `/users/{userId}/affiliation-summary` | Résumé : `referralCode`, `affiliationCodes`, `walletBalance`. |
| `getAffiliationStats(userId)` | GET | `/users/{userId}/affiliation-stats` | Stats complètes (voir DTO ci‑dessous). |

### 2.2 Inscription avec code (parrainage / affiliation)

- **Endpoint** : `POST /users/register` (via `authAPI.signup()`).
- **Payload** : `RegisterPayload` avec champs optionnels :
  - `appliedReferralCode?: string` — code de parrainage système (ex. JODO-1234).
  - `appliedAffiliationCode?: string` — code d’affiliation personnalisé (ex. PROMO2026).

En front, on envoie **le même code** dans les deux champs quand l’utilisateur saisit un code à l’inscription ; le backend décide si c’est un code parrainage ou affiliation (ex. selon le format).

### 2.3 Profil utilisateur (GET /users/{userId})

Via `rentoallUsersAPI.getProfile(userId)`. Champs utilisés pour parrainage/affiliation :

- `referralCode` — code de parrainage de l’utilisateur.
- `affiliationCodes` — liste des codes d’affiliation (AffiliationCodeDTO[]).
- `totalEarnedReferralAmount` — montant total gagné en bons (historique).
- `pendingReferralAmount` — bons utilisables (non utilisés, non expirés).

---

## 3. Types / DTOs

```ts
// Code d'affiliation
interface AffiliationCodeDTO {
  id: number;
  code: string;
  description: string;
  userId: number;
}

// Bon de réduction (parrainage / palier 200 €)
interface DiscountBonusDTO {
  id?: number;
  userId?: number;
  amount?: number;
  expiresAt?: string | null;
  used?: boolean;
  usedAt?: string | null;
  usedInReservationId?: number | null;
  reason?: string;        // PARRAINAGE_PREMIERE_RESA, ACHAT_VOLUME_200, AFFILIATION...
  uniqueCode?: string;
  createdAt?: string;
}

// Résumé affiliation + parrainage
interface AffiliationSummaryDTO {
  referralCode: string;
  affiliationCodes: AffiliationCodeDTO[];
  walletBalance: number;
}

// Stats complètes
interface AffiliationStatsDTO {
  referralCode: string;
  totalReferrals: number;
  totalAffiliates: number;
  totalEarnings: number;
  referralEarnings: number;   // gains parrainage (bons)
  commissionEarnings: number;  // gains affiliation (1 %)
  affiliationCodes: AffiliationCodeDTO[];
}
```

`UserDTO` (filleuls/affiliés) utilise notamment : `id`, `firstName`, `lastName`, `email`, `createdAt`, `cumulativePurchaseVolume`.

---

## 4. Pages et composants

### 4.1 Page principale : `/host/referrals` (`src/app/host/referrals/page.tsx`)

- **Titre** : « Parrainages & Affiliations ».
- **Chargement des données** (au mount, `userId` dans `localStorage`) :
  - `rentoallUsersAPI.getProfile(userId)` → code parrainage, `affiliationCodes`, `totalEarnedReferralAmount`, `pendingReferralAmount`.
  - `referralsAPI.getMyReferrals(userId)` → liste des filleuls.
  - `referralsAPI.getMyAffiliates(userId)` → liste des affiliés.
  - `referralsAPI.getAffiliationStats(userId)` → stats.
  - `referralsAPI.getDiscountBonuses(userId)` → bons cadeaux.

- **Lien de parrainage** :  
  `{origin}/auth/signup?ref={referralCode}`  
  (ex. `https://rentoall.fr/auth/signup?ref=JODO-1234`).

- **Onglets** :
  1. **Parrainages** — liste des filleuls, recherche, colonnes (nom, email, date, montant dépensé).
  2. **Affiliés** — liste des affiliés + liste des codes d’affiliation (création / suppression, max 20 codes).
  3. **Bons cadeaux** — liste des `DiscountBonusDTO` (montant, raison, code, utilisé/expiré, date d’expiration).
  4. **Comment ça marche** — texte explicatif Parrainage vs Affiliation vs Ambassadeur (voir section 6).

- **Création de code d’affiliation** :
  - Code généré côté front : `AFF` + 6 caractères aléatoires (ex. `AFFXXXXXX`).
  - Saisie d’une description (modale), puis `referralsAPI.createAffiliationCode(userId, code, description)`.
  - Après création : mise à jour de la liste des codes et des stats.

- **Suppression** : `referralsAPI.deleteAffiliationCode(userId, codeId)` puis rafraîchissement des stats.

- **Partage** : boutons Email et WhatsApp avec message incluant le code et le lien d’inscription.

### 4.2 Redirection `/parrainage` → `/host/referrals`

- **Fichier** : `src/app/parrainage/page.tsx`.
- **Comportement** : `router.replace('/host/referrals')` au chargement. Aucune autre logique.

### 4.3 Inscription avec code (`src/app/auth/signup/page.tsx`)

- **Paramètre URL** : `ref` (ex. `/auth/signup?ref=JODO-1234`).
- **Effet** : au chargement, `searchParams.get('ref')` est lu et mis dans le state `formData.referralCode` (en majuscules).
- **Champ formulaire** : champ optionnel « Code de parrainage ou d’affiliation », valeur `formData.referralCode`, placeholder / aide via i18n (`signup.referralCode`, `signup.referralCodePlaceholder`, `signup.referralCodeHelp`).
- **Envoi** : dans le payload d’inscription (`RegisterPayload`) :
  - si `formData.referralCode` est renseigné :  
    `appliedReferralCode: formData.referralCode.trim()` et  
    `appliedAffiliationCode: formData.referralCode.trim()`.  
  Le backend détermine si c’est parrainage ou affiliation.

### 4.4 Page Bons cadeaux (`src/app/bons-cadeaux/page.tsx`)

- Affiche les bons de réduction via `referralsAPI.getDiscountBonuses(userId)`.
- Réutilise le type `DiscountBonusDTO` et les libellés de raison (parrainage, affiliation, etc.).

### 4.5 Paramètres (`src/app/parametres/page.tsx`)

- Charge `referralsAPI.getAffiliationSummary(userId)` pour afficher le code de parrainage et le solde.
- Liens vers « Parrainages & Affiliations » : `href="/host/referrals"` (et `handleCapacitorLinkClick` pour le mobile).
- Mention des commissions (parrainage, etc.) et IBAN/BIC pour les affiliateurs/ambassadeurs.

### 4.6 Navigation

- **Header / menu** : entrée « Parrainages & Affiliations » → `/host/referrals` (clé i18n `nav.referrals`).
- **Header.tsx** : lien « Parrainage » → `/host/referrals`.

### 4.7 Composant `ReferralSystem.tsx`

- **Fichier** : `src/components/ReferralSystem.tsx`.
- **Statut** : non utilisé dans l’app actuelle ; la page `/host/referrals` appelle directement l’API.  
  Si tu refais la logique ailleurs, tu peux t’en inspirer pour l’UI (code, partage, liste de filleuls) en branchant `referralsAPI`.

---

## 5. Règles métier affichées (côté front)

- **Parrainage**  
  - Un code unique par utilisateur.  
  - Bons 5 € pour le parrain et le filleul à chaque palier de 200 € d’achats cumulés du filleul.  
  - Pas de crédit à l’inscription (0 €).  
  - Bons valables 1 an.

- **Affiliation**  
  - Jusqu’à 20 codes personnalisés.  
  - Commission 1 % sur chaque réservation payée par un affilié, créditée sur le solde (après confirmation Stripe).  
  - Même bonus 5 € / 200 € que le parrainage (pour l’affilié et l’affiliateur).

- **Ambassadeur**  
  - Rôle attribué par la plateforme.  
  - Recrute des affiliateurs (parrains) ; commission sur les réservations générées par leurs affiliés.  
  - Si le parrain est sous un ambassadeur : 0,5 % parrain + 0,5 % ambassadeur.  
  - Sinon (parrain seul) : 1 % pour le parrain.  
  - L’ambassadeur peut voir la liste de ses affiliateurs et les gains 0,5 % dans l’historique.

La **détection** « parrain vs affilié » et « parrain sous ambassadeur ou non » est côté backend ; le front n’a pas de règle de calcul supplémentaire.

---

## 6. Libellés et textes « Comment ça marche »

Les textes détaillés (parrainage, affiliation, ambassadeur, étapes, exemples, récap) sont dans `src/app/host/referrals/page.tsx`, onglet « Comment ça marche ». Points à conserver si tu refais la page :

- Deux blocs : **Parrainage** (code unique, bons 5 € / 200 €) et **Affiliation** (20 codes, 1 % + bons 5 € / 200 €).
- Bloc **Ambassadeurs** (rôle plateforme, partage 0,5 % / 0,5 % si parrain sous ambassadeur).
- Étapes : 1) Partager le code 2) Ils s’inscrivent 3) Vous gagnez (parrainage vs affiliation).
- Récompenses en détail (parrainage, affiliation, ambassadeur).
- Exemples concrets (parrainage 450 € → 2 bons ; affiliation 80 € → 0,80 € + bons si paliers).
- Récap : validité des bons 1 an, solde pour les commissions, pas de limite de nombre de filleuls/affiliés.

---

## 7. i18n (extraits)

- `signup.referralCode` : « Code de parrainage ou d'affiliation (optionnel) ».
- `signup.referralCodePlaceholder` : « Entrez votre code de parrainage ou d'affiliation ».
- `signup.referralCodeHelp` : « Ce code peut être un code de parrainage personnel ou un code d'affiliation d'entreprise ».
- `nav.referrals` : « Parrainages & Affiliations » (FR) / « Referrals & Affiliations » (EN).
- Bons cadeaux : `bonsCadeaux.emptyText`, `bonsCadeaux.reasonDefault`, `bonsCadeaux.reasonFirstResa`, etc.

---

## 8. Checklist pour tout refaire

1. **API**  
   - Réimplémenter `referralsAPI` avec les mêmes endpoints et DTOs (`AffiliationCodeDTO`, `AffiliationStatsDTO`, `DiscountBonusDTO`, `AffiliationSummaryDTO`).  
   - Inscription : `RegisterPayload` avec `appliedReferralCode` et `appliedAffiliationCode`.  
   - Profil : `referralCode`, `affiliationCodes`, `totalEarnedReferralAmount`, `pendingReferralAmount`.

2. **Page principale**  
   - Une page type « Parrainages & Affiliations » qui charge profil + referrals + affiliates + stats + discount bonuses.  
   - Afficher code et lien `{origin}/auth/signup?ref={referralCode}`.  
   - Onglets : Parrainages (filleuls), Affiliés (liste + codes, création/suppression), Bons cadeaux, Comment ça marche.

3. **Inscription**  
   - Lire `ref` dans l’URL et préremplir le champ code.  
   - Envoyer le code dans `appliedReferralCode` et `appliedAffiliationCode` (même valeur).

4. **Navigation**  
   - Lien « Parrainages & Affiliations » vers cette page (header, paramètres).  
   - Optionnel : route `/parrainage` qui redirige vers la page principale.

5. **Paramètres / Bons**  
   - Afficher code + solde (via `getAffiliationSummary` ou profil).  
   - Page bons cadeaux avec `getDiscountBonuses` et libellés des raisons.

6. **Ambassadeur**  
   - Côté front : uniquement textes explicatifs et affichage des stats/listes fournies par le backend.  
   - Pas de logique de calcul ou de rôle ambassadeur dans le front ; tout est géré par l’API.

---

## 9. Fichiers à modifier / recréer

| Fichier | Rôle |
|---------|------|
| `src/services/api.ts` | `referralsAPI`, types (AffiliationCodeDTO, AffiliationStatsDTO, DiscountBonusDTO, AffiliationSummaryDTO), RegisterPayload (appliedReferralCode, appliedAffiliationCode). |
| `src/app/host/referrals/page.tsx` | Page principale Parrainages & Affiliations (données, onglets, création/suppression de codes, partage). |
| `src/app/parrainage/page.tsx` | Redirection vers `/host/referrals`. |
| `src/app/auth/signup/page.tsx` | Lecture de `ref`, champ code, envoi dans le payload d’inscription. |
| `src/app/bons-cadeaux/page.tsx` | Liste des bons (`getDiscountBonuses`). |
| `src/app/parametres/page.tsx` | Résumé parrainage/affiliation, lien vers `/host/referrals`. |
| `src/components/sections/header-navigation.tsx` | Lien « Parrainages & Affiliations » → `/host/referrals`. |
| `src/components/Header.tsx` | Lien Parrainage → `/host/referrals`. |
| `src/contexts/LanguageContext.tsx` (ou autre i18n) | Clés signup.referralCode*, nav.referrals, bonsCadeaux.*. |
| `docs/api-callbacks-documentation.md` | Documentation des payloads et DTOs (RegisterPayload, AffiliationCodeDTO, etc.). |

Le composant `ReferralSystem.tsx` est optionnel ; la logique réelle est dans la page `/host/referrals` et les appels `referralsAPI`.

---

*Document généré à partir du code du projet easypark (Rentoall).*
