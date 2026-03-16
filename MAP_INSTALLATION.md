# Installation de la carte Leaflet

## Packages à installer

Exécutez la commande suivante pour installer les dépendances nécessaires :

```bash
npm install leaflet react-leaflet leaflet.markercluster @types/leaflet @types/leaflet.markercluster
```

## Fonctionnalités implémentées

✅ **Carte interactive Leaflet** avec tuiles OpenStreetMap (gratuit, pas de clé API)
✅ **Markers personnalisés** avec prix (bulles style Airbnb)
✅ **Clustering** automatique quand zoom faible (via leaflet.markercluster)
✅ **Synchronisation carte ↔ liste** :
   - Hover sur une card → highlight marker + popup
   - Click sur un marker → focus/scroll sur la card correspondante
✅ **Client-only** : composant chargé dynamiquement (SSR: false)
✅ **Styles CSS** : markers prix avec états actif/hover

## Structure des fichiers

- `src/components/map/MapClient.tsx` : Composant principal de la carte Leaflet
- `src/components/map/index.tsx` : Export dynamique (SSR: false)
- `src/app/globals.css` : Styles CSS pour Leaflet et les markers prix
- `src/app/search-parkings/page.tsx` : Page de recherche avec intégration de la carte

## Utilisation

La carte est automatiquement intégrée sur la page `/search-parkings`. Elle affiche :
- Tous les listings avec leurs prix
- Clustering automatique quand plusieurs markers sont proches
- Synchronisation avec la liste des résultats

## Coordonnées géographiques

Actuellement, les coordonnées sont basées sur la ville du listing avec un petit offset pour éviter la superposition. 

**TODO** : Pour une précision maximale, il faudrait :
1. Ajouter `lat` et `lng` dans `PlaceDTO` côté backend
2. Ou utiliser un service de geocoding (ex: Nominatim d'OpenStreetMap) pour convertir les adresses en coordonnées

## Notes techniques

- Le composant est chargé dynamiquement pour éviter les erreurs SSR
- Les styles CSS Leaflet sont importés dans `MapClient.tsx`
- Le clustering est désactivé au zoom 15+ pour afficher tous les markers individuellement
- Le scroll wheel zoom est désactivé par défaut (style Airbnb)
