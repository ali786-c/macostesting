import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.rentoall.app",
  appName: "Rentoall",
  webDir: "out",
  server: {
    androidScheme: "https",
    // iOS: utilise https://localhost au lieu de capacitor://localhost pour éviter les blocages CORS
    // (MapTiler tiles, RSC prefetch, etc.) - le back doit autoriser https://localhost
    iosScheme: "https",
    allowNavigation: [
      "rentoall.onrender.com",
      "https://rentoall.onrender.com",
      "api.maptiler.com",
      "*.maptiler.com",
    ],
    // Option 1 — App charge le site en ligne (recommandé) : décommentez et mettez l’URL de prod.
    // url: 'https://votre-domaine.com',
    // Option 2 — En dev : charger le serveur Next local (remplacer par l’IP de votre machine).
    // url: 'http://192.168.1.xx:3000',
    // cleartext: true,
  },
  android: {
    // false : tout le trafic en HTTPS uniquement (requis par Google Play en production)
    allowMixedContent: false,
  },
  ios: {
    contentInset: "automatic",
  },
  plugins: {
    // Utiliser le HTTP natif pour éviter les blocages Network Error (CORS, ATS) sur iOS/Android
    CapacitorHttp: {
      enabled: true,
    },
    SplashScreen: {
      launchShowDuration: 2500, // ms - affiche le splash au moins 2,5 s au démarrage
      launchAutoHide: true,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    // Android : laisser le front gérer le bouton retour (navigation historique)
    App: {
      disableBackButtonHandler: true,
    },
  },
};

export default config;
