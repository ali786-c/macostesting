# Modifier le splash screen dans Xcode (iOS)

Le splash screen (écran de démarrage) s'affiche au lancement de l'app, avant le chargement du contenu web. Voici comment le modifier.

---

## Étapes dans Xcode

### 1. Ouvrir le projet

```bash
npx cap open ios
```

(ou `npm run mobile:ios` pour build + sync + ouvrir Xcode)

### 2. Localiser le splash dans Xcode

Dans le navigateur de gauche (Project Navigator) :

**App** → **App** → **Assets.xcassets** → **Splash.imageset**

### 3. Remplacer les images

- Faire glisser tes nouvelles images (logo, fond, etc.) dans le dossier **Splash.imageset**.
- **Format recommandé** : PNG 2732×2732 px (image carrée pour tous les écrans).
- Fichiers existants à remplacer :
  - `LaunchScreen_Universal_2732x2732.png` (1x)
  - `LaunchScreen_Universal_2732x2732 1.png` (2x)
  - `LaunchScreen_Universal_2732x2732 2.png` (3x)

Tu peux aussi supprimer les anciennes et glisser une seule image « universal » : Xcode proposera de générer les variantes.

### 4. Ajuster le storyboard (optionnel)

- Ouvrir **App** → **Base.lproj** → **LaunchScreen.storyboard**.
- L'écran utilise l'image nommée **"Splash"** en plein écran (`scaleAspectFill`).
- Tu peux modifier le mode d'affichage (Aspect Fit, Aspect Fill, etc.) ou ajouter un fond de couleur.

### 5. Configurer la durée d'affichage

Dans `capacitor.config.ts` :

```ts
plugins: {
  SplashScreen: {
    launchShowDuration: 2000,  // ms (0 = masquer dès que l'app est prête)
    launchAutoHide: true,
  },
}
```

- `launchShowDuration: 0` → le splash disparaît dès que le contenu web est prêt.
- `launchShowDuration: 2000` → le splash reste affiché au moins 2 secondes.

---

## Emplacement des fichiers

```
ios/App/App/Assets.xcassets/Splash.imageset/
├── Contents.json
├── LaunchScreen_Universal_2732x2732.png
├── LaunchScreen_Universal_2732x2732 1.png
└── LaunchScreen_Universal_2732x2732 2.png
```

Tu peux aussi modifier les fichiers directement dans le Finder, puis relancer Xcode.
