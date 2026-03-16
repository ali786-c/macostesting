export const PARKING_LISTINGS = [
  {
    id: 1,
    type: 'parking',
    title: 'Place de parking couverte - Paris 15ème',
    location: 'Paris 15ème',
    city: 'Paris',
    address: '45 Rue de la Convention, 75015 Paris',
    priceHourly: 3.5,
    priceDaily: 15,
    priceWeekly: 80,
    priceMonthly: 280,
    rating: '4,9',
    reviewsCount: 47,
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
    images: [
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
      'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800',
      'https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=800'
    ],
    description: 'Place de parking sécurisée dans un parking souterrain. Accès 24h/24, 7j/7. Idéale pour voiture citadine ou berline. Hauteur sous plafond 2m.',
    features: [
      'Accès 24h/24',
      'Parking sécurisé',
      'Couvert',
      'Éclairage LED',
      'Surveillance vidéo',
      'Badge d\'accès'
    ],
    dimensions: {
      length: '5m',
      width: '2.5m',
      height: '2m'
    },
    host: {
      name: 'Marie Dupont',
      joinedDate: 'Janvier 2023',
      avatar: 'https://i.pravatar.cc/150?img=1',
      isSuperhost: true
    },
    availability: {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: true,
      sunday: true
    }
  },
  {
    id: 2,
    type: 'storage',
    title: 'Box de stockage 10m² - Lyon 3ème',
    location: 'Lyon 3ème',
    city: 'Lyon',
    address: '12 Avenue Lacassagne, 69003 Lyon',
    priceDaily: 8,
    priceWeekly: 45,
    priceMonthly: 150,
    rating: '4,8',
    reviewsCount: 42,
    image: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800',
    images: [
      'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800',
      'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800'
    ],
    description: 'Box de stockage sécurisé de 10m². Parfait pour entreposer meubles, cartons, équipements sportifs. Accès facile avec chariot. Sec et bien ventilé.',
    features: [
      'Accès 7j/7',
      'Sécurisé',
      'Sec et ventilé',
      'Chariot disponible',
      'Assurance incluse',
      'Étagères fournies'
    ],
    dimensions: {
      length: '4m',
      width: '2.5m',
      height: '2.5m'
    },
    host: {
      name: 'Céline',
      joinedDate: '1 an',
      avatar: 'https://i.pravatar.cc/150?img=12',
      isSuperhost: true
    },
    availability: {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: true,
      sunday: true
    }
  },
  {
    id: 3,
    type: 'cellar',
    title: 'Cave sécurisée 6m² - Bordeaux Centre',
    location: 'Bordeaux Centre',
    city: 'Bordeaux',
    address: '23 Rue Sainte-Catherine, 33000 Bordeaux',
    priceDaily: 5,
    priceWeekly: 30,
    priceMonthly: 95,
    rating: '4,7',
    reviewsCount: 28,
    image: 'https://images.unsplash.com/photo-1600585154363-67eb9e2e2099?w=800',
    images: [
      'https://images.unsplash.com/photo-1600585154363-67eb9e2e2099?w=800',
      'https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=800',
      'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800'
    ],
    description: 'Cave privative sécurisée idéale pour entreposage de vin, vélos, ou affaires personnelles. Température stable toute l\'année. Accès individuel sécurisé.',
    features: [
      'Température stable',
      'Accès sécurisé',
      'Sec',
      'Éclairage automatique',
      'Porte renforcée',
      'Assurance disponible'
    ],
    dimensions: {
      length: '3m',
      width: '2m',
      height: '2.2m'
    },
    host: {
      name: 'Sophie Bernard',
      joinedDate: 'Juillet 2023',
      avatar: 'https://i.pravatar.cc/150?img=5',
      isSuperhost: false
    },
    availability: {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: false,
      friday: true,
      saturday: true,
      sunday: true
    }
  },
  {
    id: 4,
    type: 'parking',
    title: 'Parking extérieur - Marseille 8ème',
    location: 'Marseille 8ème',
    city: 'Marseille',
    address: '78 Avenue du Prado, 13008 Marseille',
    priceHourly: 2.5,
    priceDaily: 12,
    priceWeekly: 70,
    priceMonthly: 200,
    rating: '4,6',
    reviewsCount: 35,
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
    images: [
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
      'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800'
    ],
    description: 'Parking extérieur sécurisé proche de la plage. Idéal pour stationnement longue durée.',
    features: [
      'Accès 24h/24',
      'Sécurisé',
      'Extérieur',
      'Éclairage',
      'Surveillance'
    ],
    dimensions: {
      length: '5m',
      width: '2.5m',
      height: 'N/A'
    },
    host: {
      name: 'Jean Martin',
      joinedDate: 'Mars 2023',
      avatar: 'https://i.pravatar.cc/150?img=3',
      isSuperhost: false
    },
    availability: {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: true,
      sunday: true
    }
  },
  {
    id: 5,
    type: 'storage',
    title: 'Box stockage 15m² - Toulouse',
    location: 'Toulouse Centre',
    city: 'Toulouse',
    address: '34 Rue Alsace Lorraine, 31000 Toulouse',
    priceDaily: 12,
    priceWeekly: 65,
    priceMonthly: 220,
    rating: '4,9',
    reviewsCount: 56,
    image: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800',
    images: [
      'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800'
    ],
    description: 'Grand box de stockage sécurisé. Parfait pour entreposer le contenu d\'un appartement complet.',
    features: [
      'Accès 7j/7',
      'Sécurisé',
      'Sec et ventilé',
      'Grande capacité',
      'Assurance incluse'
    ],
    dimensions: {
      length: '5m',
      width: '3m',
      height: '2.5m'
    },
    host: {
      name: 'Paul Dubois',
      joinedDate: 'Février 2023',
      avatar: 'https://i.pravatar.cc/150?img=8',
      isSuperhost: true
    },
    availability: {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: true,
      sunday: true
    }
  },
  {
    id: 6,
    type: 'parking',
    title: 'Garage privé - Nice Centre',
    location: 'Nice Centre',
    city: 'Nice',
    address: '15 Avenue Jean Médecin, 06000 Nice',
    priceHourly: 4,
    priceDaily: 18,
    priceWeekly: 100,
    priceMonthly: 350,
    rating: '5,0',
    reviewsCount: 62,
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
    images: [
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
      'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800'
    ],
    description: 'Garage privé sécurisé en plein centre de Nice. Parking premium pour véhicule haut de gamme.',
    features: [
      'Accès 24h/24',
      'Garage fermé',
      'Sécurité maximale',
      'Éclairage LED',
      'Badge électronique'
    ],
    dimensions: {
      length: '6m',
      width: '3m',
      height: '2.2m'
    },
    host: {
      name: 'Christine Leroy',
      joinedDate: 'Décembre 2022',
      avatar: 'https://i.pravatar.cc/150?img=9',
      isSuperhost: true
    },
    availability: {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: true,
      sunday: true
    }
  },
  {
    id: 7,
    type: 'cellar',
    title: 'Cave 8m² - Nantes',
    location: 'Nantes Centre',
    city: 'Nantes',
    address: '29 Rue Crébillon, 44000 Nantes',
    priceDaily: 6,
    priceWeekly: 35,
    priceMonthly: 110,
    rating: '4,8',
    reviewsCount: 31,
    image: 'https://images.unsplash.com/photo-1600585154363-67eb9e2e2099?w=800',
    images: [
      'https://images.unsplash.com/photo-1600585154363-67eb9e2e2099?w=800',
      'https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=800'
    ],
    description: 'Cave privative spacieuse et sécurisée. Idéale pour stockage vin ou matériel.',
    features: [
      'Température stable',
      'Accès sécurisé',
      'Sec',
      'Éclairage automatique',
      'Porte renforcée'
    ],
    dimensions: {
      length: '4m',
      width: '2m',
      height: '2.2m'
    },
    host: {
      name: 'Thomas Petit',
      joinedDate: 'Mai 2023',
      avatar: 'https://i.pravatar.cc/150?img=7',
      isSuperhost: false
    },
    availability: {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: true,
      sunday: true
    }
  },
  {
    id: 8,
    type: 'storage',
    title: 'Box stockage 20m² - Strasbourg',
    location: 'Strasbourg',
    city: 'Strasbourg',
    address: '56 Rue du Faubourg de Pierre, 67000 Strasbourg',
    priceDaily: 15,
    priceWeekly: 85,
    priceMonthly: 280,
    rating: '4,7',
    reviewsCount: 44,
    image: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800',
    images: [
      'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800'
    ],
    description: 'Grand box de stockage très spacieux. Parfait pour entreprises ou particuliers avec beaucoup de matériel.',
    features: [
      'Accès 7j/7',
      'Très sécurisé',
      'Sec et ventilé',
      'Très grande capacité',
      'Assurance incluse',
      'Chariot disponible'
    ],
    dimensions: {
      length: '5m',
      width: '4m',
      height: '2.8m'
    },
    host: {
      name: 'Isabelle Roux',
      joinedDate: 'Août 2022',
      avatar: 'https://i.pravatar.cc/150?img=10',
      isSuperhost: true
    },
    availability: {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: true,
      sunday: true
    }
  },
  {
    id: 9,
    type: 'parking',
    title: 'Parking souterrain - Paris 11ème',
    location: 'Paris 11ème',
    city: 'Paris',
    address: '28 Rue de la Roquette, 75011 Paris',
    priceHourly: 4,
    priceDaily: 16,
    priceWeekly: 85,
    priceMonthly: 300,
    rating: '4,8',
    reviewsCount: 38,
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
    images: [
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
      'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800'
    ],
    description: 'Parking souterrain sécurisé avec accès badge. Idéal pour stationnement longue durée.',
    features: ['Accès 24h/24', 'Parking souterrain', 'Sécurisé', 'Éclairage LED', 'Badge d\'accès'],
    dimensions: { length: '5m', width: '2.5m', height: '2m' },
    host: { name: 'Pierre Moreau', joinedDate: 'Avril 2023', avatar: 'https://i.pravatar.cc/150?img=11', isSuperhost: true },
    availability: { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: true }
  },
  {
    id: 10,
    type: 'storage',
    title: 'Box stockage 12m² - Paris 19ème',
    location: 'Paris 19ème',
    city: 'Paris',
    address: '45 Avenue Jean Jaurès, 75019 Paris',
    priceDaily: 9,
    priceWeekly: 50,
    priceMonthly: 170,
    rating: '4,9',
    reviewsCount: 52,
    image: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800',
    images: [
      'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800',
      'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800'
    ],
    description: 'Box de stockage sécurisé de 12m². Parfait pour déménagement ou stockage longue durée.',
    features: ['Accès 7j/7', 'Sécurisé', 'Sec et ventilé', 'Chariot disponible', 'Assurance incluse'],
    dimensions: { length: '4m', width: '3m', height: '2.5m' },
    host: { name: 'Julie Martin', joinedDate: 'Juin 2023', avatar: 'https://i.pravatar.cc/150?img=13', isSuperhost: true },
    availability: { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: true }
  },
  {
    id: 11,
    type: 'cellar',
    title: 'Cave 7m² - Paris 20ème',
    location: 'Paris 20ème',
    city: 'Paris',
    address: '12 Rue de Belleville, 75020 Paris',
    priceDaily: 6,
    priceWeekly: 35,
    priceMonthly: 100,
    rating: '4,7',
    reviewsCount: 29,
    image: 'https://images.unsplash.com/photo-1600585154363-67eb9e2e2099?w=800',
    images: [
      'https://images.unsplash.com/photo-1600585154363-67eb9e2e2099?w=800',
      'https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=800'
    ],
    description: 'Cave privative sécurisée. Température constante, idéale pour vin et affaires personnelles.',
    features: ['Température stable', 'Accès sécurisé', 'Sec', 'Éclairage automatique', 'Porte renforcée'],
    dimensions: { length: '3.5m', width: '2m', height: '2.2m' },
    host: { name: 'Marc Lefebvre', joinedDate: 'Septembre 2023', avatar: 'https://i.pravatar.cc/150?img=14', isSuperhost: false },
    availability: { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: true }
  },
  {
    id: 12,
    type: 'parking',
    title: 'Garage privé - Lyon 1er',
    location: 'Lyon 1er',
    city: 'Lyon',
    address: '18 Rue de la République, 69001 Lyon',
    priceHourly: 3.5,
    priceDaily: 15,
    priceWeekly: 80,
    priceMonthly: 290,
    rating: '4,9',
    reviewsCount: 45,
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
    images: [
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
      'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800'
    ],
    description: 'Garage privé en centre-ville. Sécurisé et facile d\'accès.',
    features: ['Accès 24h/24', 'Garage fermé', 'Sécurité maximale', 'Éclairage LED', 'Badge électronique'],
    dimensions: { length: '5.5m', width: '2.8m', height: '2.2m' },
    host: { name: 'Laure Dubois', joinedDate: 'Janvier 2023', avatar: 'https://i.pravatar.cc/150?img=15', isSuperhost: true },
    availability: { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: true }
  },
  {
    id: 13,
    type: 'storage',
    title: 'Box stockage 18m² - Lyon 6ème',
    location: 'Lyon 6ème',
    city: 'Lyon',
    address: '32 Cours Franklin Roosevelt, 69006 Lyon',
    priceDaily: 14,
    priceWeekly: 75,
    priceMonthly: 250,
    rating: '4,8',
    reviewsCount: 41,
    image: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800',
    images: [
      'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800',
      'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800'
    ],
    description: 'Grand box de stockage de 18m². Parfait pour stockage professionnel ou personnel.',
    features: ['Accès 7j/7', 'Sécurisé', 'Sec et ventilé', 'Grande capacité', 'Assurance incluse', 'Chariot disponible'],
    dimensions: { length: '6m', width: '3m', height: '2.5m' },
    host: { name: 'Antoine Bernard', joinedDate: 'Février 2023', avatar: 'https://i.pravatar.cc/150?img=16', isSuperhost: true },
    availability: { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: true }
  },
  {
    id: 14,
    type: 'cellar',
    title: 'Cave 9m² - Lyon 3ème',
    location: 'Lyon 3ème',
    city: 'Lyon',
    address: '25 Rue Garibaldi, 69003 Lyon',
    priceDaily: 7,
    priceWeekly: 40,
    priceMonthly: 120,
    rating: '4,8',
    reviewsCount: 33,
    image: 'https://images.unsplash.com/photo-1600585154363-67eb9e2e2099?w=800',
    images: [
      'https://images.unsplash.com/photo-1600585154363-67eb9e2e2099?w=800',
      'https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=800'
    ],
    description: 'Cave spacieuse et sécurisée. Idéale pour collection de vin ou stockage.',
    features: ['Température stable', 'Accès sécurisé', 'Sec', 'Éclairage automatique', 'Porte renforcée', 'Ventilation'],
    dimensions: { length: '4.5m', width: '2m', height: '2.2m' },
    host: { name: 'Camille Rousseau', joinedDate: 'Mars 2023', avatar: 'https://i.pravatar.cc/150?img=17', isSuperhost: false },
    availability: { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: true }
  },
  {
    id: 15,
    type: 'parking',
    title: 'Parking couvert - Marseille 6ème',
    location: 'Marseille 6ème',
    city: 'Marseille',
    address: '55 Rue de Rome, 13006 Marseille',
    priceHourly: 3,
    priceDaily: 14,
    priceWeekly: 75,
    priceMonthly: 260,
    rating: '4,7',
    reviewsCount: 36,
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
    images: [
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
      'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800'
    ],
    description: 'Parking couvert sécurisé. Protection contre les intempéries.',
    features: ['Accès 24h/24', 'Parking couvert', 'Sécurisé', 'Éclairage', 'Surveillance vidéo'],
    dimensions: { length: '5m', width: '2.5m', height: '2m' },
    host: { name: 'Nicolas Blanc', joinedDate: 'Mai 2023', avatar: 'https://i.pravatar.cc/150?img=18', isSuperhost: false },
    availability: { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: true }
  },
  {
    id: 16,
    type: 'storage',
    title: 'Box stockage 14m² - Marseille 8ème',
    location: 'Marseille 8ème',
    city: 'Marseille',
    address: '88 Boulevard Michelet, 13008 Marseille',
    priceDaily: 11,
    priceWeekly: 60,
    priceMonthly: 200,
    rating: '4,9',
    reviewsCount: 48,
    image: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800',
    images: [
      'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800',
      'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800'
    ],
    description: 'Box de stockage moderne et sécurisé. Accès facile et pratique.',
    features: ['Accès 7j/7', 'Sécurisé', 'Sec et ventilé', 'Chariot disponible', 'Assurance incluse'],
    dimensions: { length: '4.5m', width: '3m', height: '2.5m' },
    host: { name: 'Sandra Petit', joinedDate: 'Juillet 2023', avatar: 'https://i.pravatar.cc/150?img=19', isSuperhost: true },
    availability: { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: true }
  },
  {
    id: 17,
    type: 'cellar',
    title: 'Cave 8m² - Marseille 1er',
    location: 'Marseille 1er',
    city: 'Marseille',
    address: '15 Rue de la République, 13001 Marseille',
    priceDaily: 6,
    priceWeekly: 35,
    priceMonthly: 105,
    rating: '4,6',
    reviewsCount: 27,
    image: 'https://images.unsplash.com/photo-1600585154363-67eb9e2e2099?w=800',
    images: [
      'https://images.unsplash.com/photo-1600585154363-67eb9e2e2099?w=800',
      'https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=800'
    ],
    description: 'Cave privative en centre-ville. Parfaite pour stockage.',
    features: ['Température stable', 'Accès sécurisé', 'Sec', 'Éclairage automatique', 'Porte renforcée'],
    dimensions: { length: '4m', width: '2m', height: '2.2m' },
    host: { name: 'François Lemoine', joinedDate: 'Août 2023', avatar: 'https://i.pravatar.cc/150?img=20', isSuperhost: false },
    availability: { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: true }
  },
  {
    id: 18,
    type: 'parking',
    title: 'Place parking - Toulouse Centre',
    location: 'Toulouse Centre',
    city: 'Toulouse',
    address: '42 Rue Alsace Lorraine, 31000 Toulouse',
    priceHourly: 2.5,
    priceDaily: 12,
    priceWeekly: 65,
    priceMonthly: 230,
    rating: '4,8',
    reviewsCount: 39,
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
    images: [
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
      'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800'
    ],
    description: 'Place de parking en centre-ville. Accès facile et sécurisé.',
    features: ['Accès 24h/24', 'Sécurisé', 'Éclairage', 'Surveillance'],
    dimensions: { length: '5m', width: '2.5m', height: 'N/A' },
    host: { name: 'Émilie Garcia', joinedDate: 'Octobre 2023', avatar: 'https://i.pravatar.cc/150?img=21', isSuperhost: true },
    availability: { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: true }
  },
  {
    id: 19,
    type: 'storage',
    title: 'Box stockage 16m² - Toulouse',
    location: 'Toulouse Capitole',
    city: 'Toulouse',
    address: '18 Place du Capitole, 31000 Toulouse',
    priceDaily: 13,
    priceWeekly: 70,
    priceMonthly: 240,
    rating: '4,9',
    reviewsCount: 50,
    image: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800',
    images: [
      'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800',
      'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800'
    ],
    description: 'Box de stockage spacieux et sécurisé. Idéal pour stockage longue durée.',
    features: ['Accès 7j/7', 'Sécurisé', 'Sec et ventilé', 'Grande capacité', 'Assurance incluse'],
    dimensions: { length: '5.5m', width: '3m', height: '2.5m' },
    host: { name: 'Julien Martinez', joinedDate: 'Novembre 2023', avatar: 'https://i.pravatar.cc/150?img=22', isSuperhost: true },
    availability: { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: true }
  },
  {
    id: 20,
    type: 'cellar',
    title: 'Cave 6m² - Toulouse',
    location: 'Toulouse Saint-Cyprien',
    city: 'Toulouse',
    address: '28 Rue de Metz, 31300 Toulouse',
    priceDaily: 5,
    priceWeekly: 30,
    priceMonthly: 95,
    rating: '4,7',
    reviewsCount: 25,
    image: 'https://images.unsplash.com/photo-1600585154363-67eb9e2e2099?w=800',
    images: [
      'https://images.unsplash.com/photo-1600585154363-67eb9e2e2099?w=800',
      'https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=800'
    ],
    description: 'Cave privative sécurisée. Température constante.',
    features: ['Température stable', 'Accès sécurisé', 'Sec', 'Éclairage automatique'],
    dimensions: { length: '3m', width: '2m', height: '2.2m' },
    host: { name: 'Claire Durand', joinedDate: 'Décembre 2023', avatar: 'https://i.pravatar.cc/150?img=23', isSuperhost: false },
    availability: { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: true }
  },
  {
    id: 21,
    type: 'parking',
    title: 'Garage privé - Nice 1er',
    location: 'Nice 1er',
    city: 'Nice',
    address: '22 Avenue Jean Médecin, 06000 Nice',
    priceHourly: 4.5,
    priceDaily: 20,
    priceWeekly: 110,
    priceMonthly: 380,
    rating: '5,0',
    reviewsCount: 58,
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
    images: [
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
      'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800'
    ],
    description: 'Garage privé premium en centre-ville. Sécurité maximale.',
    features: ['Accès 24h/24', 'Garage fermé', 'Sécurité maximale', 'Éclairage LED', 'Badge électronique', 'Surveillance'],
    dimensions: { length: '6m', width: '3m', height: '2.2m' },
    host: { name: 'Patricia Moreau', joinedDate: 'Janvier 2023', avatar: 'https://i.pravatar.cc/150?img=24', isSuperhost: true },
    availability: { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: true }
  },
  {
    id: 22,
    type: 'storage',
    title: 'Box stockage 20m² - Nice',
    location: 'Nice Libération',
    city: 'Nice',
    address: '35 Boulevard Jean Jaurès, 06300 Nice',
    priceDaily: 15,
    priceWeekly: 80,
    priceMonthly: 280,
    rating: '4,8',
    reviewsCount: 43,
    image: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800',
    images: [
      'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800',
      'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800'
    ],
    description: 'Grand box de stockage de 20m². Parfait pour stockage professionnel.',
    features: ['Accès 7j/7', 'Très sécurisé', 'Sec et ventilé', 'Très grande capacité', 'Assurance incluse', 'Chariot disponible'],
    dimensions: { length: '6m', width: '3.5m', height: '2.8m' },
    host: { name: 'Michel Lambert', joinedDate: 'Février 2023', avatar: 'https://i.pravatar.cc/150?img=25', isSuperhost: true },
    availability: { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: true }
  },
  {
    id: 23,
    type: 'cellar',
    title: 'Cave 10m² - Nice',
    location: 'Nice Vieux-Nice',
    city: 'Nice',
    address: '12 Rue de la Préfecture, 06300 Nice',
    priceDaily: 8,
    priceWeekly: 45,
    priceMonthly: 140,
    rating: '4,9',
    reviewsCount: 37,
    image: 'https://images.unsplash.com/photo-1600585154363-67eb9e2e2099?w=800',
    images: [
      'https://images.unsplash.com/photo-1600585154363-67eb9e2e2099?w=800',
      'https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=800'
    ],
    description: 'Cave spacieuse et sécurisée. Idéale pour collection de vin.',
    features: ['Température stable', 'Accès sécurisé', 'Sec', 'Éclairage automatique', 'Porte renforcée', 'Ventilation'],
    dimensions: { length: '5m', width: '2m', height: '2.2m' },
    host: { name: 'Sylvie Roux', joinedDate: 'Mars 2023', avatar: 'https://i.pravatar.cc/150?img=26', isSuperhost: true },
    availability: { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: true }
  },
  {
    id: 24,
    type: 'parking',
    title: 'Parking sécurisé - Nantes Centre',
    location: 'Nantes Centre',
    city: 'Nantes',
    address: '18 Rue Crébillon, 44000 Nantes',
    priceHourly: 2.5,
    priceDaily: 11,
    priceWeekly: 60,
    priceMonthly: 210,
    rating: '4,8',
    reviewsCount: 40,
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
    images: [
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
      'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800'
    ],
    description: 'Parking sécurisé en centre-ville. Accès facile.',
    features: ['Accès 24h/24', 'Parking sécurisé', 'Éclairage', 'Surveillance vidéo'],
    dimensions: { length: '5m', width: '2.5m', height: '2m' },
    host: { name: 'David Simon', joinedDate: 'Avril 2023', avatar: 'https://i.pravatar.cc/150?img=27', isSuperhost: false },
    availability: { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: true }
  },
  {
    id: 25,
    type: 'storage',
    title: 'Box stockage 13m² - Nantes',
    location: 'Nantes Malakoff',
    city: 'Nantes',
    address: '25 Boulevard de la Prairie au Duc, 44200 Nantes',
    priceDaily: 10,
    priceWeekly: 55,
    priceMonthly: 190,
    rating: '4,9',
    reviewsCount: 46,
    image: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800',
    images: [
      'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800',
      'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800'
    ],
    description: 'Box de stockage moderne. Parfait pour stockage personnel ou professionnel.',
    features: ['Accès 7j/7', 'Sécurisé', 'Sec et ventilé', 'Chariot disponible', 'Assurance incluse'],
    dimensions: { length: '4.5m', width: '3m', height: '2.5m' },
    host: { name: 'Valérie Girard', joinedDate: 'Mai 2023', avatar: 'https://i.pravatar.cc/150?img=28', isSuperhost: true },
    availability: { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: true }
  },
  {
    id: 26,
    type: 'cellar',
    title: 'Cave 7m² - Nantes',
    location: 'Nantes Bouffay',
    city: 'Nantes',
    address: '8 Rue Kervégan, 44000 Nantes',
    priceDaily: 6,
    priceWeekly: 35,
    priceMonthly: 110,
    rating: '4,7',
    reviewsCount: 30,
    image: 'https://images.unsplash.com/photo-1600585154363-67eb9e2e2099?w=800',
    images: [
      'https://images.unsplash.com/photo-1600585154363-67eb9e2e2099?w=800',
      'https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=800'
    ],
    description: 'Cave privative sécurisée. Température constante.',
    features: ['Température stable', 'Accès sécurisé', 'Sec', 'Éclairage automatique', 'Porte renforcée'],
    dimensions: { length: '3.5m', width: '2m', height: '2.2m' },
    host: { name: 'Olivier Mercier', joinedDate: 'Juin 2023', avatar: 'https://i.pravatar.cc/150?img=29', isSuperhost: false },
    availability: { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: true }
  },
  {
    id: 27,
    type: 'parking',
    title: 'Parking couvert - Strasbourg',
    location: 'Strasbourg Centre',
    city: 'Strasbourg',
    address: '22 Place Kléber, 67000 Strasbourg',
    priceHourly: 3.5,
    priceDaily: 15,
    priceWeekly: 80,
    priceMonthly: 290,
    rating: '4,9',
    reviewsCount: 49,
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
    images: [
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
      'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800'
    ],
    description: 'Parking couvert sécurisé en centre-ville. Protection complète.',
    features: ['Accès 24h/24', 'Parking couvert', 'Sécurisé', 'Éclairage LED', 'Surveillance vidéo'],
    dimensions: { length: '5m', width: '2.5m', height: '2m' },
    host: { name: 'Catherine Weber', joinedDate: 'Juillet 2023', avatar: 'https://i.pravatar.cc/150?img=30', isSuperhost: true },
    availability: { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: true }
  },
  {
    id: 28,
    type: 'storage',
    title: 'Box stockage 17m² - Strasbourg',
    location: 'Strasbourg Neudorf',
    city: 'Strasbourg',
    address: '45 Avenue des Vosges, 67000 Strasbourg',
    priceDaily: 13,
    priceWeekly: 70,
    priceMonthly: 245,
    rating: '4,8',
    reviewsCount: 42,
    image: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800',
    images: [
      'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800',
      'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800'
    ],
    description: 'Box de stockage spacieux. Idéal pour stockage longue durée.',
    features: ['Accès 7j/7', 'Sécurisé', 'Sec et ventilé', 'Grande capacité', 'Assurance incluse'],
    dimensions: { length: '5.5m', width: '3m', height: '2.5m' },
    host: { name: 'Philippe Klein', joinedDate: 'Août 2023', avatar: 'https://i.pravatar.cc/150?img=31', isSuperhost: true },
    availability: { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: true }
  }
];

export type ParkingListing = typeof PARKING_LISTINGS[0];
