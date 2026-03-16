# Configuration des Variables d'Environnement

Ce document explique comment configurer les variables d'environnement pour que l'application utilise automatiquement la bonne URL d'API selon l'environnement (local ou production Vercel).

## 🎯 Objectif

- **En développement local** : L'application utilise `http://localhost:8080/api`
- **En production (Vercel)** : L'application utilise `https://rentoall.onrender.com/api`

## 📝 Configuration Locale

### 1. Créer le fichier `.env.local`

À la racine du projet, créez un fichier `.env.local` avec le contenu suivant :

```env
# Configuration pour le développement local
NEXT_PUBLIC_API_URL=http://localhost:8080/api
```

**Note :** Ce fichier est automatiquement ignoré par git (défini dans `.gitignore`), donc vos configurations locales ne seront pas commitées.

### 2. Vérifier que le fichier existe

Le fichier `.env.local` devrait être présent à la racine du projet. Si vous ne l'avez pas encore créé, vous pouvez le créer manuellement ou utiliser :

```bash
echo "NEXT_PUBLIC_API_URL=http://localhost:8080/api" > .env.local
```

## 🚀 Configuration Vercel (Production)

### Méthode 1 : Via le Dashboard Vercel (Recommandé)

1. Allez sur [Vercel Dashboard](https://vercel.com/dashboard)
2. Sélectionnez votre projet
3. Allez dans **Settings** > **Environment Variables**
4. Ajoutez la variable suivante :
   - **Name** : `NEXT_PUBLIC_API_URL`
   - **Value** : `https://rentoall.onrender.com/api`
   - **Environment** : Sélectionnez **Production** (et éventuellement **Preview** si vous voulez aussi l'utiliser pour les previews)

5. Cliquez sur **Save**
6. Redéployez votre application pour que les changements prennent effet

### Méthode 2 : Via Vercel CLI

```bash
vercel env add NEXT_PUBLIC_API_URL production
# Entrez la valeur : https://rentoall.onrender.com/api
```

## 🔍 Comment ça fonctionne

Le code dans `src/services/api.ts` utilise la fonction `getBaseURL()` qui :

1. Vérifie si `NEXT_PUBLIC_API_URL` est définie dans les variables d'environnement
2. Si oui, utilise cette URL
3. Si non, utilise `http://localhost:8080/api` par défaut

```typescript
const getBaseURL = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  return "http://localhost:8080/api";
};
```

## ✅ Vérification

### En local

1. Démarrez votre serveur de développement :
   ```bash
   npm run dev
   ```

2. Ouvrez la console du navigateur (F12)
3. Vous devriez voir un log : `🔧 [API CONFIG] Utilisation de NEXT_PUBLIC_API_URL: http://localhost:8080/api`

### En production (Vercel)

1. Déployez votre application sur Vercel
2. Ouvrez la console du navigateur sur votre site déployé
3. Vous devriez voir un log : `🔧 [API CONFIG] Utilisation de NEXT_PUBLIC_API_URL: https://rentoall.onrender.com/api`

## 🔧 Dépannage

### L'application utilise toujours localhost en production

- Vérifiez que la variable `NEXT_PUBLIC_API_URL` est bien configurée dans Vercel
- Assurez-vous que le préfixe `NEXT_PUBLIC_` est présent (requis pour que Next.js expose la variable au client)
- Redéployez l'application après avoir ajouté/modifié la variable

### L'application ne trouve pas l'API en local

- Vérifiez que le fichier `.env.local` existe à la racine du projet
- Vérifiez que le backend Spring Boot tourne sur `http://localhost:8080`
- Redémarrez le serveur de développement Next.js après avoir créé/modifié `.env.local`

## 📚 Fichiers concernés

- `src/services/api.ts` : Configuration principale de l'API
- `.env.local` : Variables d'environnement locales (non commitées)
- `.env.production.example` : Exemple de configuration pour la production

## 🎉 Avantages

- ✅ Pas besoin de changer le code à chaque fois que vous changez d'environnement
- ✅ Configuration séparée pour chaque environnement
- ✅ Sécurisé : les fichiers `.env.local` ne sont pas commités
- ✅ Facile à configurer sur Vercel via le dashboard
