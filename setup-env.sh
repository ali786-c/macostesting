#!/bin/bash

# Script pour créer les fichiers d'environnement

echo "🔧 Configuration des variables d'environnement..."

# Créer .env.local pour le développement local
if [ ! -f .env.local ]; then
    cat > .env.local << 'EOF'
# Configuration pour le développement local
# Ce fichier est ignoré par git (.gitignore)
# URL de l'API backend pour le développement local
NEXT_PUBLIC_API_URL=http://localhost:8080/api
EOF
    echo "✅ Fichier .env.local créé avec succès"
else
    echo "⚠️  Le fichier .env.local existe déjà"
fi

# Créer .env.production.example comme exemple
if [ ! -f .env.production.example ]; then
    cat > .env.production.example << 'EOF'
# Configuration pour la production (Vercel)
# Ce fichier est un exemple - les variables d'environnement doivent être configurées dans le dashboard Vercel
# Allez sur https://vercel.com/dashboard > Votre projet > Settings > Environment Variables

# URL de l'API backend pour la production
NEXT_PUBLIC_API_URL=https://rentoall.onrender.com/api
EOF
    echo "✅ Fichier .env.production.example créé avec succès"
else
    echo "⚠️  Le fichier .env.production.example existe déjà"
fi

echo ""
echo "📝 Configuration terminée !"
echo ""
echo "Pour le développement local :"
echo "  - Le fichier .env.local est maintenant configuré avec http://localhost:8080/api"
echo ""
echo "Pour Vercel (production) :"
echo "  - Allez sur https://vercel.com/dashboard > Votre projet > Settings > Environment Variables"
echo "  - Ajoutez NEXT_PUBLIC_API_URL avec la valeur : https://rentoall.onrender.com/api"
echo "  - Sélectionnez 'Production' comme environnement"
echo "  - Redéployez votre application"
echo ""
