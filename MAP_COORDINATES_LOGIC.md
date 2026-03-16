# Logique d'Affichage des Biens sur la Carte

## 📍 Comment les pins sont créés sur la carte

### 1. Conversion des Places en Propriétés pour la Carte

**Fichier**: `src/app/search-parkings/page.tsx` (lignes 1205-1271)

La fonction `mapProperties` convertit chaque bien (`PlaceDTO`) en propriété pour la carte (`Property`).

### 2. Récupération des Coordonnées

La logique suit cet ordre de priorité :

1. **Coordonnées du backend** (priorité haute)
   - Cherche dans `place.latitude` ou `place.lat`
   - Cherche dans `place.longitude` ou `place.lng`
   - Convertit en nombre si ce sont des strings

2. **Coordonnées de la ville** (fallback)
   - Si pas de coordonnées dans le backend, utilise `CITY_COORDINATES[listing.city]`
   - Liste des villes disponibles dans `CITY_COORDINATES` (lignes 1147-1201)

3. **Paris par défaut** (dernier recours)
   - Si la ville n'est pas dans `CITY_COORDINATES`, utilise les coordonnées de Paris

### 3. Structure PlaceDTO

**Fichier**: `src/services/api.ts` (ligne 5024)

```typescript
export interface PlaceDTO {
  id: number;
  type: 'PARKING' | 'CAVE' | 'STORAGE_SPACE';
  address: string;
  city: string;
  // ... autres champs
  [key: string]: unknown; // Permet des champs supplémentaires comme latitude/longitude
}
```

**⚠️ IMPORTANT**: `PlaceDTO` n'a pas de champs `latitude`/`longitude` définis explicitement, mais le backend peut les renvoyer via `[key: string]: unknown`.

### 3.1. Champs de Coordonnées Recherchés

Le code cherche les coordonnées dans cet ordre :
1. `place.latitude` ou `place.lat`
2. `place.longitude` ou `place.lng`
3. `place.coordinates.lat` ou `place.coordinates.lng`
4. `place.location.latitude` ou `place.location.longitude`
5. `place.location.lat` ou `place.location.lng`

Si aucun de ces champs n'est trouvé, le code utilise les coordonnées de la ville.

### 4. Problèmes Potentiels

#### Problème 1: Coordonnées manquantes dans le backend
- **Symptôme**: Tous les biens d'une ville apparaissent au même endroit (coordonnées de la ville)
- **Cause**: Le backend ne renvoie pas `latitude`/`longitude` ou `lat`/`lng`
- **Solution**: Vérifier que le backend renvoie bien ces champs

#### Problème 2: Ville non dans CITY_COORDINATES
- **Symptôme**: Tous les biens d'une ville apparaissent à Paris
- **Cause**: La ville n'est pas dans la liste `CITY_COORDINATES`
- **Solution**: Ajouter la ville à `CITY_COORDINATES` dans `search-parkings/page.tsx`

#### Problème 3: Noms de champs différents
- **Symptôme**: Les coordonnées ne sont pas récupérées même si elles existent
- **Cause**: Le backend utilise un autre nom de champ (ex: `coordinates.lat`, `location.latitude`)
- **Solution**: Adapter le code pour chercher dans ces champs

### 5. Logs de Débogage

Le code inclut déjà des logs pour vérifier :
- Nombre de biens chargés
- Nombre de biens filtrés
- Nombre de biens sur la carte
- Biens manquants sur la carte

**Console**: Chercher les logs `🗺️ [MAP]` dans la console du navigateur.

### 6. Vérification

Pour vérifier pourquoi un bien n'apparaît pas :

1. **Ouvrir la console du navigateur**
2. **Chercher les logs** `🗺️ [MAP]`
3. **Vérifier**:
   - Le bien est-il dans `places` ?
   - Le bien est-il dans `filteredListings` ?
   - Le bien est-il dans `sortedListings` ?
   - Le bien est-il dans `mapProperties` ?
   - Quelles sont les coordonnées utilisées ?

4. **Vérifier les coordonnées du backend**:
   ```javascript
   // Dans la console
   const place = places.find(p => p.id === VOTRE_ID);
   console.log('Coordonnées:', {
     latitude: place?.latitude,
     lat: place?.lat,
     longitude: place?.longitude,
     lng: place?.lng,
     city: place?.city
   });
   ```

### 7. Solution Recommandée

Pour que les nouveaux biens apparaissent correctement :

1. **Vérifier que le backend renvoie les coordonnées** dans la réponse API
2. **Vérifier les noms de champs** utilisés par le backend
3. **Ajouter la ville à CITY_COORDINATES** si nécessaire
4. **Vérifier les logs** dans la console pour identifier le problème
