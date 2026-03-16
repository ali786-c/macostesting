# Configuration native Capacitor (iOS & Android)

Ce document décrit les entrées à configurer dans les projets natifs **ios/** et **android/** (Xcode, Android Studio) pour que l’app Rentoall soit conforme et prête pour TestFlight / Play Store.

---

## 1. iOS — Info.plist (Xcode)

### Usage descriptions (obligatoires pour chaque permission)

À ajouter dans **Info.plist** (ou via Xcode → Target → Info) :

| Clé | Exemple de valeur |
|-----|--------------------|
| `NSPhotoLibraryUsageDescription` | Rentoall a besoin d’accéder à vos photos pour ajouter des images à vos annonces. |
| `NSCameraUsageDescription` | Rentoall a besoin d’accéder à la caméra pour prendre des photos. |
| `NSLocationWhenInUseUsageDescription` | Rentoall utilise votre position pour afficher les annonces à proximité. |

Sans ces textes, l’app peut être refusée à la review App Store.

### Associated Domains (Universal Links)

Pour que les liens de retour paiement (Stripe) et les deep links rouvrent l’app :

1. Xcode → **Signing & Capabilities** → **+ Capability** → **Associated Domains**.
2. Ajouter une entrée du type : `applinks:rentoall.fr` (adapter au domaine utilisé pour `NEXT_PUBLIC_APP_URL`).
3. Sur le serveur (domaine), héberger le fichier **apple-app-site-association** (sans extension) comme indiqué dans la doc Apple / Stripe.

---

## 2. Android — AndroidManifest.xml

### Permissions

Ne déclarer que les permissions réellement utilisées (galerie, caméra, localisation, etc.). Exemple :

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
```

### App Links (retour paiement / deep links)

Dans `<activity>` principale, ajouter des **intent-filters** pour le domaine de retour (ex. `https://rentoall.fr`) afin que les liens ouvrent l’app et que `CapacitorAppUrlListener` puisse naviguer vers la bonne route.

### Réseau en production

En **release**, utiliser `usesCleartextTraffic="false"` (pas de HTTP en prod). En dev, `true` peut être nécessaire si vous testez contre un backend en HTTP.

---

## 3. Données sensibles / persistantes

**Règle** : pour toute donnée sensible ou importante pour la session (auth, préférences utilisateur, etc.), utiliser l’abstraction **`src/lib/storage.ts`** (`getItem`, `setItem`, `removeItem`). En Capacitor, ces clés sont aussi écrites dans `@capacitor/preferences`, ce qui limite la purge iOS et garde la session après fermeture de l’app.

Ne pas stocker de secrets backend côté client ; utiliser uniquement les variables `NEXT_PUBLIC_*` documentées dans `.env.example`.

---

## 4. Références

- **État et reste à faire** : `docs/CAPACITOR-ETAT-ET-RESTE-A-FAIRE.md`
- **Guide principal** : `docs/CAPACITOR-GUIDE-COMPLET.md`
- **Checklist QA** : `docs/qa-capacitor.md`
- **Vérification complète (code + natif)** : `docs/VERIFICATION-MOBILE-IOS-ANDROID.md`
