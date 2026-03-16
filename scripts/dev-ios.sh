#!/usr/bin/env bash
# Dev iOS — aligné sur le document de référence Capacitor.
# Build web, sync ios, ouvre Xcode.
# Pour recharger le contenu sans rebuilder à chaque fois, utiliser server.url dans capacitor.config.ts
# vers votre serveur Next (ex. http://IP:3000) avec cleartext: true.
set -e
cd "$(dirname "$0")/.."

echo "[dev-ios] Build web (Next export statique -> out/)..."
npm run build:capacitor

echo "[dev-ios] Sync out/ -> ios/..."
npx cap sync ios

echo "[dev-ios] Ouverture de Xcode..."
npx cap open ios

echo "[dev-ios] Terminé. Pour live reload: configurer server.url dans capacitor.config.ts vers le serveur Next."
