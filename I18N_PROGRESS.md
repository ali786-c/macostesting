# Progression Internationalisation (i18n)

## Système en place
- ✅ `LanguageContext` avec support FR/EN
- ✅ Fonction `t(key, params?)` avec support des paramètres
- ✅ Hook `useLanguage()` disponible

## Pages en cours

### ✅ Parking Detail Page (`parking/[id]/page.tsx`)
**Statut**: En cours (partiellement fait)
- ✅ Import `useLanguage` ajouté
- ✅ Type labels (Parking, Stockage, Cave)
- ✅ Boutons favoris/partage
- ✅ Périodes (Heure, Jour, Semaine, Mois)
- ✅ Caractéristiques
- ✅ Vérifications hôte
- ✅ Avis et tri
- ⏳ Reste à faire: Dates, Réservation, Total, Frais, etc.

### ⏳ Header Navigation (`header-navigation.tsx`)
**Statut**: À faire

### ⏳ Search Parkings (`search-parkings/page.tsx`)
**Statut**: À faire

### ⏳ Landing Page (`page.tsx`)
**Statut**: À faire

### ⏳ Autres pages
**Statut**: À faire

## Traductions ajoutées

### Parking
- parking.addToFavorites
- parking.removeFromFavorites
- parking.share
- parking.copyLink
- parking.shareEmail
- parking.shareWhatsApp
- parking.shareInstagram
- parking.urlCopied
- parking.newListing
- parking.reviews / parking.review
- parking.type.parking / storage / cellar
- parking.period.hour / day / week / month
- parking.minDuration
- parking.hours / hoursPlural
- parking.days / daysPlural
- parking.characteristics
- parking.compareSimilar
- parking.hostVerification
- parking.identityVerified
- parking.addressVerified
- parking.photosCertified
- parking.similarSpaces
- parking.reviewsTitle
- parking.sort.best / worst / recent / oldest
- parking.beFirst
- parking.loading
- parking.notFound

### Search
- search.title
- search.noResults
- search.tryOtherCriteria
- search.loading
- search.filters
- search.advancedFilters
- search.clearFilters
- search.type.parking / storage / cellar / all
- search.priceRange
- search.instantBooking
- search.freeCancellation
- search.noDeposit
- search.map / list
- search.sortBy
- search.sort.priceAsc / priceDesc / rating / distance
- search.resultsCount / resultsCountPlural

### Header
- header.search / searching
- header.city
- header.searchCity
- header.noCityFound
- header.loadingCities
- header.dates
- header.type
- header.advancedFilters
- header.mode.client / host
- header.messages
- header.favorites
- header.dashboard
- header.settings
- header.logout
- header.login
- header.signup

### Landing
- landing.findInSeconds
- landing.solveNow
- landing.findDescription
- landing.maxSecurity
- landing.peaceOfMind
- landing.securityDescription
- landing.immediateAccess
- landing.noMoreWaiting
- landing.accessDescription
- landing.saveUpTo
- landing.keepMoney
- landing.saveDescription
- landing.search / book / enjoy
- landing.step1 / step2 / step3

## Prochaines étapes

1. ✅ Étendre les traductions dans LanguageContext
2. 🔄 Remplacer textes dans parking/[id]/page.tsx (en cours)
3. ⏳ Remplacer textes dans header-navigation.tsx
4. ⏳ Remplacer textes dans search-parkings/page.tsx
5. ⏳ Remplacer textes dans page.tsx (landing)
6. ⏳ Remplacer textes dans toutes les autres pages

## Notes
- Utiliser `t('key')` pour les textes simples
- Utiliser `t('key', { param: value })` pour les textes avec paramètres
- Tous les textes doivent être en clés, aucun texte hardcodé
