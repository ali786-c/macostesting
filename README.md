# Rentoall

Rentoall est une plateforme de location d'espaces de stationnement, de stockage et de caves entre particuliers. La plateforme permet aux propriétaires de mettre en location leurs espaces disponibles et aux locataires de trouver et réserver des espaces selon leurs besoins.

## 🚀 Fonctionnalités

### Pour les Clients
- **Recherche avancée** : Recherche d'espaces par ville, type, dates et caractéristiques
- **Réservations** : Réservation d'espaces à l'heure, à la journée, à la semaine ou au mois
- **Favoris** : Sauvegarde des espaces favoris pour un accès rapide
- **Gestion des réservations** : Suivi et gestion de toutes les réservations
- **Avis et évaluations** : Système d'avis pour partager son expérience

### Pour les Hôtes
- **Gestion des annonces** : Création et modification d'annonces avec photos, tarifs et disponibilités
- **Calendrier de disponibilité** : Gestion des périodes de disponibilité et des réservations
- **Tableau de bord** : Vue d'ensemble des statistiques et des réservations récentes
- **Tarification flexible** : Définition de tarifs horaires, journaliers, hebdomadaires et mensuels
- **Gestion des photos** : Upload et gestion de jusqu'à 5 photos par annonce

### Fonctionnalités générales
- **Double mode** : Basculement entre mode client et mode hôte
- **Authentification** : Connexion locale et via Google OAuth2
- **Interface responsive** : Design adapté pour mobile, tablette et desktop
- **Recherche en temps réel** : Filtres dynamiques et recherche instantanée

## 🛠️ Technologies

- **Framework** : Next.js 16 (App Router)
- **Langage** : TypeScript
- **Styling** : Tailwind CSS
- **Icons** : Lucide React
- **HTTP Client** : Axios
- **State Management** : React Context API
- **Routing** : Next.js Navigation

## 📋 Prérequis

- Node.js 18+ 
- npm, yarn, pnpm ou bun
- Backend API Rentoall (Spring Boot)

## 🚀 Installation

1. **Cloner le repository**
```bash
git clone <repository-url>
cd easypark
```

2. **Installer les dépendances**
```bash
npm install
# ou
yarn install
# ou
pnpm install
```

3. **Configurer les variables d'environnement**

L'application est configurée pour utiliser automatiquement la bonne URL d'API selon l'environnement :
- **En développement local** : `http://localhost:8080/api`
- **En production (Vercel)** : `https://rentoall.onrender.com/api`

### Configuration automatique (recommandé)

Exécutez le script de configuration :

```bash
./setup-env.sh
```

Ce script créera automatiquement le fichier `.env.local` avec la configuration pour le développement local.

### Configuration manuelle

#### Pour le développement local

Créer un fichier `.env.local` à la racine du projet :

```env
# Configuration pour le développement local
NEXT_PUBLIC_API_URL=http://localhost:8080/api

# Clé API Google Maps pour l'autocomplétion d'adresse (optionnel)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=votre_cle_api_google_maps
```

#### Pour Vercel (production)

1. Allez sur [Vercel Dashboard](https://vercel.com/dashboard)
2. Sélectionnez votre projet
3. Allez dans **Settings** > **Environment Variables**
4. Ajoutez la variable :
   - **Name** : `NEXT_PUBLIC_API_URL`
   - **Value** : `https://rentoall.onrender.com/api`
   - **Environment** : Sélectionnez **Production**
5. Redéployez votre application

**Note:** Si vous ne créez pas de fichier `.env.local`, l'application utilisera `http://localhost:8080/api` par défaut en développement local. Pour la production sur Vercel, vous devez configurer la variable d'environnement dans le dashboard Vercel.

📖 Pour plus de détails, consultez le fichier [ENV_SETUP.md](./ENV_SETUP.md)

**Configuration Google Maps API :**

Pour activer l'autocomplétion d'adresse sur la page de création d'annonce (`/host/create`), vous devez :

1. Créer un projet sur [Google Cloud Console](https://console.cloud.google.com/)
2. Activer l'API "Places API" pour votre projet
3. Créer une clé API et la restreindre à "Places API" pour la sécurité
4. Ajouter la clé dans votre fichier `.env.local` comme `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

Sans cette clé, le champ d'adresse fonctionnera normalement mais sans autocomplétion Google Places.

4. **Lancer le serveur de développement**
```bash
npm run dev
# ou
yarn dev
# ou
pnpm dev
```

5. **Ouvrir l'application**

Ouvrir [http://localhost:3000](http://localhost:3000) dans votre navigateur.

## 📁 Structure du projet

```
easypark/
├── src/
│   ├── app/                    # Pages Next.js (App Router)
│   │   ├── auth/              # Pages d'authentification
│   │   ├── home/              # Page d'accueil
│   │   ├── parking/           # Pages de détails des biens
│   │   ├── reservations/      # Pages de gestion des réservations
│   │   ├── favoris/           # Page des favoris
│   │   ├── host/              # Pages pour les hôtes
│   │   └── ...
│   ├── components/            # Composants React réutilisables
│   │   ├── sections/         # Sections de page
│   │   └── ui/               # Composants UI
│   ├── contexts/              # Contextes React
│   ├── services/              # Services API
│   │   └── api.ts            # Client API centralisé
│   └── lib/                   # Utilitaires
├── public/                     # Fichiers statiques
└── ...
```

## 🔌 API Backend

L'application se connecte à une API backend Spring Boot. Les endpoints principaux incluent :

### Authentification
- `POST /api/auth/login` - Connexion locale
- `POST /api/auth/register` - Inscription
- `GET /api/auth/oauth2/success` - Callback OAuth2 Google

### Utilisateurs
- `GET /api/users/{id}` - Profil utilisateur
- `PUT /api/users/{id}` - Mise à jour du profil
- `GET /api/users/{userId}/places` - Biens de l'utilisateur
- `GET /api/users/{userId}/favorites` - Favoris de l'utilisateur

### Biens (Places)
- `GET /api/places/search` - Recherche de biens
- `POST /api/places` - Création d'un bien
- `PUT /api/places/{id}` - Modification d'un bien
- `GET /api/places/{id}/calendar` - Calendrier de disponibilité

### Réservations
- `POST /api/reservations` - Création d'une réservation
- `GET /api/reservations/client/{clientId}` - Réservations du client
- `GET /api/reservations/{id}` - Détails d'une réservation
- `POST /api/reservations/{id}/cancel` - Annulation d'une réservation

### Avis
- `GET /api/reviews/place/{placeId}` - Avis d'un bien
- `POST /api/reviews` - Ajout d'un avis

## 🎨 Modes utilisateur

L'application supporte deux modes pour chaque utilisateur :

### Mode Client
- Accès à la recherche et à la navigation
- Réservation d'espaces
- Gestion des favoris
- Consultation des réservations

### Mode Hôte
- Tableau de bord avec statistiques
- Gestion des annonces
- Calendrier de disponibilité
- Suivi des réservations reçues

Le basculement entre les modes se fait via le bouton dans le header.

## 🔐 Authentification

L'application supporte deux méthodes d'authentification :

1. **Authentification locale** : Email et mot de passe
2. **OAuth2 Google** : Connexion via Google

Les tokens d'authentification sont stockés dans le `localStorage` du navigateur.

## 📱 Responsive Design

L'application est entièrement responsive et optimisée pour :
- **Mobile** : < 640px
- **Tablette** : 640px - 1024px
- **Desktop** : > 1024px

## 🚀 Build et Déploiement

### Build de production
```bash
npm run build
```

### Démarrage en production
```bash
npm start
```

### Déploiement sur Vercel

Le moyen le plus simple de déployer l'application est d'utiliser [Vercel](https://vercel.com) :

1. Connecter votre repository GitHub à Vercel
2. Configurer les variables d'environnement
3. Déployer automatiquement

Consulter la [documentation de déploiement Next.js](https://nextjs.org/docs/app/building-your-application/deploying) pour plus de détails.

## 🧪 Développement

### Commandes disponibles

```bash
# Développement
npm run dev

# Build de production
npm run build

# Démarrage en production
npm start

# Linting
npm run lint
```

## 📝 Notes importantes

- L'application utilise le `localStorage` pour la persistance des données utilisateur
- Le mode utilisateur (client/hôte) est sauvegardé dans le `localStorage`
- Les appels API sont centralisés dans `src/services/api.ts`
- L'URL de base de l'API peut être configurée via `NEXT_PUBLIC_API_URL`

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.

## 📄 Licence

Ce projet est propriétaire. Tous droits réservés.

---

**Rentoall** - Location d'espaces entre particuliers
