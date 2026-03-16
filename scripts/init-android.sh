#!/usr/bin/env bash
# Init Android — aligné sur le document de référence Capacitor.
# Build web, ajoute la plateforme Android si absente, sync.
set -e
cd "$(dirname "$0")/.."

echo "[init-android] Vérification Node/npm..."
command -v node >/dev/null 2>&1 || { echo "Node.js requis."; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "npm requis."; exit 1; }

echo "[init-android] Build web (Next export statique -> out/)..."
npm run build:capacitor

if [ ! -d "android" ]; then
  echo "[init-android] Dossier android/ absent -> npx cap add android"
  npx cap add android
fi

echo "[init-android] Sync out/ -> android/..."
npx cap sync android

echo "[init-android] Terminé. Prochaines étapes:"
echo "  - Ouvrir Android Studio: npm run cap:open (ou npx cap open android)"
echo "  - APK debug: npm run android:debug"
echo "  - Installer sur appareil: npm run android:install"
