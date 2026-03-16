# Analyse des performances - Appels API

## Problèmes identifiés

### 1. ⚠️ Double appel de `placesAPI.getById` dans `/parking/[id]/page.tsx`

**Localisation**: Lignes 372-406 et 409-417

**Problème**:
- Le `useEffect` ligne 372 charge le place initialement avec `placesAPI.getById(placeId)` (dépend de `[id]`)
- Le `useEffect` ligne 409 appelle `refreshCalendarData()` qui fait aussi `placesAPI.getById(placeId)` (dépend de `[searchParams, place, id, router]`)
- Si `paymentReturn=true` est dans les searchParams ET que `place` existe, cela peut créer un double appel presque simultané

**Impact**: 
- Appel API redondant
- Charge serveur inutile
- Latence supplémentaire

**Solution proposée**: 
- Utiliser un flag pour éviter le double appel
- Ne dépendre que de `searchParams` dans le useEffect de paymentReturn
- Ajouter une vérification pour éviter l'appel si les données sont déjà à jour

---

### 2. ⚠️ Reviews rechargées inutilement

**Localisation**: Ligne 420-494

**Problème**:
- Le `useEffect` dépend de `[id, place]`
- Quand `place` change (après le chargement initial), les reviews sont rechargées alors qu'elles ne dépendent que de `id`

**Impact**:
- Appel API inutile quand `place` change
- Les reviews ne changent pas selon les données du place

**Solution proposée**:
- Changer la dépendance de `[id, place]` à `[id]` uniquement
- Les reviews ne dépendent que de l'ID du place, pas de ses autres propriétés

---

### 3. ⚠️ Favorites rechargées inutilement

**Localisation**: Ligne 218-240

**Problème**:
- Le `useEffect` dépend de `place` (toute l'objet)
- Quand `place` change (mise à jour des disponibilités, etc.), les favorites sont rechargées alors qu'elles ne dépendent que de `place.id`

**Impact**:
- Appel API inutile à chaque changement de `place`
- Les favorites ne changent pas selon les autres propriétés du place

**Solution proposée**:
- Changer la dépendance de `[place]` à `[place?.id]` uniquement
- Les favorites ne dépendent que de l'ID du place

---

### 4. ⚠️ `refreshCalendarData` peut être appelé plusieurs fois

**Localisation**: Ligne 409-417

**Problème**:
- Le `useEffect` dépend de `[searchParams, place, id, router]`
- Si `place` change pour une raison quelconque, cela peut déclencher `refreshCalendarData` même si `paymentReturn` n'est pas présent

**Impact**:
- Appel API inutile si `place` change sans `paymentReturn`

**Solution proposée**:
- Ne dépendre que de `searchParams` et vérifier explicitement `paymentReturn`
- Utiliser un ref pour éviter les appels multiples

---

## Optimisations proposées

### Optimisation 1: Réduire les dépendances des useEffect

**Fichier**: `src/app/parking/[id]/page.tsx`

1. **Reviews**: Changer `[id, place]` → `[id]`
2. **Favorites**: Changer `[place]` → `[place?.id]`
3. **Payment return**: Ne dépendre que de `searchParams` et utiliser un ref pour éviter les doubles appels

### Optimisation 2: Ajouter un cache/mémoire pour éviter les appels redondants

- Utiliser un ref pour tracker si les données ont déjà été chargées
- Implémenter un système de debounce pour `refreshCalendarData`

### Optimisation 3: Optimiser `refreshCalendarData`

- Ajouter une vérification pour éviter l'appel si les données sont récentes
- Utiliser un flag pour éviter les appels simultanés

---

## Bénéfices attendus

- **Réduction des appels API**: ~30-50% de réduction selon les scénarios
- **Amélioration des performances**: Temps de chargement réduit
- **Réduction de la charge serveur**: Moins de requêtes inutiles
- **Meilleure expérience utilisateur**: Chargement plus rapide
