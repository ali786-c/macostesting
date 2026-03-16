#!/bin/bash

echo "🧹 Nettoyage du cache Next.js..."

# Arrêter tous les processus Node.js liés à Next.js
pkill -f "next dev" || true
pkill -f "next start" || true

# Attendre un peu pour que les processus se terminent
sleep 2

# Supprimer le dossier .next
if [ -d ".next" ]; then
    echo "Suppression du dossier .next..."
    rm -rf .next
    echo "✅ Dossier .next supprimé"
else
    echo "⚠️  Le dossier .next n'existe pas"
fi

echo "✅ Nettoyage terminé ! Vous pouvez maintenant relancer 'npm run dev'"
