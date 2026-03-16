# Search – drawer liste sur iOS

## Comportement actuel

- La barre de liste (drawer) utilise **uniquement le scroll natif** : aucun `preventDefault` sur le touch dans la zone scrollable, pour rester stable sur iOS.
- Le **pull-to-refresh** est limité par `overscroll-behavior: none` sur `html`/`body` et `contain` sur le conteneur de la liste.
- **Ouvrir/fermer le drawer** : scroll vers le haut dans la liste → ouverture ; scroll tout en haut → fermeture. On peut aussi utiliser la poignée (handle) pour faire glisser.

## Si la page se recharge encore au défilement (iOS)

Certains WebView iOS ignorent `overscroll-behavior` et déclenchent quand même un refresh. Dans ce cas, il faut **désactiver le bounce** côté natif :

1. Ouvrir le projet iOS dans Xcode (`ios/App/App.xcworkspace`).
2. Repérer où le `WKWebView` / `CAPBridgeViewController` est configuré (dans le SDK Capacitor ou dans votre code).
3. Après le chargement du WebView, exécuter par exemple :
   - `webView.scrollView.bounces = false`
   - `webView.scrollView.alwaysBounceVertical = false`

Cela empêche le rebond et le pull-to-refresh natif. Si vous utilisez un plugin ou un `AppDelegate` personnalisé, ce réglage peut être ajouté au moment où le bridge Capacitor est prêt.
