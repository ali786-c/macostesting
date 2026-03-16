import { PARKING_LISTINGS } from '@/data/parkingListings';

// Types pour les données minimales des carrousels
interface CarouselSpace {
  id: number;
  image: string;
  type: 'parking' | 'storage' | 'cellar';
  title: string;
  location: string;
  priceHourly?: number;
  priceDaily: number;
  priceWeekly?: number;
  priceMonthly: number;
  rating: string;
}

// Données des carrousels (Miami/Marseille)
const miamiCarouselSpaces: CarouselSpace[] = [
  {
    id: 9,
    image: "https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=800",
    type: 'parking',
    title: "Parking couvert · Marseille Vieux-Port",
    location: "Marseille 1er",
    priceHourly: 4,
    priceDaily: 18,
    priceMonthly: 320,
    rating: "4,9",
  },
  {
    id: 10,
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800",
    type: 'storage',
    title: "Box stockage 12m² · Marseille Centre",
    location: "Marseille 6ème",
    priceDaily: 10,
    priceMonthly: 180,
    rating: "4,8",
  },
  {
    id: 11,
    image: "https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=800",
    type: 'cellar',
    title: "Cave sécurisée 5m² · Marseille",
    location: "Marseille 5ème",
    priceDaily: 5,
    priceMonthly: 90,
    rating: "4,7",
  },
  {
    id: 12,
    image: "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800",
    type: 'parking',
    title: "Garage privé · Marseille Préfecture",
    location: "Marseille 8ème",
    priceHourly: 3,
    priceDaily: 14,
    priceMonthly: 250,
    rating: "4,9",
  },
  {
    id: 13,
    image: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800",
    type: 'storage',
    title: "Box stockage 8m² · Marseille",
    location: "Marseille 9ème",
    priceDaily: 8,
    priceMonthly: 145,
    rating: "4,8",
  },
  {
    id: 14,
    image: "https://images.unsplash.com/photo-1574552850131-cc374ee8f7b0?w=800",
    type: 'parking',
    title: "Place parking · Marseille Notre-Dame",
    location: "Marseille 7ème",
    priceHourly: 3.5,
    priceDaily: 16,
    priceMonthly: 280,
    rating: "5,0",
  },
  {
    id: 15,
    image: "https://images.unsplash.com/photo-1600585154363-67eb9e2e2099?w=800",
    type: 'cellar',
    title: "Cave 7m² · Marseille Castellane",
    location: "Marseille 6ème",
    priceDaily: 6,
    priceMonthly: 105,
    rating: "4,8",
  },
  {
    id: 16,
    image: "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800",
    type: 'storage',
    title: "Box stockage 15m² · Marseille",
    location: "Marseille 10ème",
    priceDaily: 12,
    priceMonthly: 220,
    rating: "4,7",
  },
];

// Données des autres carrousels (Lyon, Toulouse, Nice, Nantes, Strasbourg, Montpellier, Lille)
const orlandoCarouselSpaces: CarouselSpace[] = [
  { id: 17, image: "https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=800", type: 'parking', title: "Parking sécurisé · Lyon Bellecour", location: "Lyon 2ème", priceHourly: 3.5, priceDaily: 16, priceMonthly: 290, rating: "4,9" },
  { id: 18, image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800", type: 'storage', title: "Box stockage 18m² · Lyon", location: "Lyon 7ème", priceDaily: 14, priceMonthly: 250, rating: "4,8" },
  { id: 19, image: "https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=800", type: 'cellar', title: "Cave 9m² · Lyon Part-Dieu", location: "Lyon 3ème", priceDaily: 7, priceMonthly: 120, rating: "4,7" },
  { id: 20, image: "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800", type: 'parking', title: "Garage · Lyon Croix-Rousse", location: "Lyon 4ème", priceHourly: 4, priceDaily: 17, priceMonthly: 310, rating: "5,0" },
  { id: 21, image: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800", type: 'storage', title: "Box stockage 14m² · Lyon", location: "Lyon 8ème", priceDaily: 11, priceMonthly: 200, rating: "4,8" },
  { id: 22, image: "https://images.unsplash.com/photo-1574552850131-cc374ee8f7b0?w=800", type: 'parking', title: "Place parking · Lyon Perrache", location: "Lyon 2ème", priceHourly: 3, priceDaily: 14, priceMonthly: 260, rating: "4,6" },
  { id: 23, image: "https://images.unsplash.com/photo-1600585154363-67eb9e2e2099?w=800", type: 'cellar', title: "Cave sécurisée 10m² · Lyon", location: "Lyon 6ème", priceDaily: 8, priceMonthly: 140, rating: "4,9" },
  { id: 24, image: "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800", type: 'storage', title: "Box stockage 22m² · Lyon", location: "Lyon 9ème", priceDaily: 16, priceMonthly: 300, rating: "4,7" },
];

const gatlinburgCarouselSpaces: CarouselSpace[] = [
  { id: 25, image: "https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=800", type: 'parking', title: "Parking couvert · Toulouse Capitole", location: "Toulouse Centre", priceHourly: 3, priceDaily: 13, priceMonthly: 240, rating: "4,8" },
  { id: 26, image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800", type: 'storage', title: "Box stockage 16m² · Toulouse", location: "Toulouse Minimes", priceDaily: 13, priceMonthly: 230, rating: "4,9" },
  { id: 27, image: "https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=800", type: 'cellar', title: "Cave 7m² · Toulouse Saint-Cyprien", location: "Toulouse Ouest", priceDaily: 6, priceMonthly: 105, rating: "4,7" },
  { id: 28, image: "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800", type: 'parking', title: "Garage privé · Toulouse Rangueil", location: "Toulouse Sud", priceHourly: 3.5, priceDaily: 15, priceMonthly: 275, rating: "4,9" },
  { id: 29, image: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800", type: 'storage', title: "Box stockage 11m² · Toulouse", location: "Toulouse Compans", priceDaily: 9, priceMonthly: 170, rating: "4,6" },
  { id: 30, image: "https://images.unsplash.com/photo-1574552850131-cc374ee8f7b0?w=800", type: 'parking', title: "Place parking · Toulouse Jeanne d'Arc", location: "Toulouse Centre", priceHourly: 2.5, priceDaily: 12, priceMonthly: 220, rating: "4,8" },
  { id: 31, image: "https://images.unsplash.com/photo-1600585154363-67eb9e2e2099?w=800", type: 'cellar', title: "Cave 8m² · Toulouse Esquirol", location: "Toulouse 1er", priceDaily: 7, priceMonthly: 125, rating: "5,0" },
  { id: 32, image: "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800", type: 'storage', title: "Box stockage 20m² · Toulouse", location: "Toulouse Borderouge", priceDaily: 15, priceMonthly: 280, rating: "4,7" },
];

const nashvilleCarouselSpaces: CarouselSpace[] = [
  { id: 33, image: "https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=800", type: 'parking', title: "Parking sécurisé · Nice Garibaldi", location: "Nice Centre", priceHourly: 5, priceDaily: 22, priceMonthly: 400, rating: "5,0" },
  { id: 34, image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800", type: 'storage', title: "Box stockage 13m² · Nice", location: "Nice Libération", priceDaily: 12, priceMonthly: 210, rating: "4,8" },
  { id: 35, image: "https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=800", type: 'cellar', title: "Cave 6m² · Nice Riquier", location: "Nice Est", priceDaily: 6, priceMonthly: 110, rating: "4,7" },
  { id: 36, image: "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800", type: 'parking', title: "Garage · Nice Musiciens", location: "Nice Centre", priceHourly: 4.5, priceDaily: 20, priceMonthly: 370, rating: "4,9" },
  { id: 37, image: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800", type: 'storage', title: "Box stockage 17m² · Nice", location: "Nice Pasteur", priceDaily: 14, priceMonthly: 260, rating: "4,8" },
  { id: 38, image: "https://images.unsplash.com/photo-1574552850131-cc374ee8f7b0?w=800", type: 'parking', title: "Place parking · Nice Jean Médecin", location: "Nice 1er", priceHourly: 5.5, priceDaily: 24, priceMonthly: 440, rating: "4,9" },
  { id: 39, image: "https://images.unsplash.com/photo-1600585154363-67eb9e2e2099?w=800", type: 'cellar', title: "Cave 9m² · Nice Port", location: "Nice Vieux-Nice", priceDaily: 8, priceMonthly: 145, rating: "5,0" },
  { id: 40, image: "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800", type: 'storage', title: "Box stockage 25m² · Nice", location: "Nice Arenas", priceDaily: 18, priceMonthly: 330, rating: "4,7" },
];

const newyorkCarouselSpaces: CarouselSpace[] = [
  { id: 41, image: "https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=800", type: 'parking', title: "Parking couvert · Nantes Commerce", location: "Nantes Centre", priceHourly: 2.5, priceDaily: 11, priceMonthly: 200, rating: "4,8" },
  { id: 42, image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800", type: 'storage', title: "Box stockage 12m² · Nantes", location: "Nantes Malakoff", priceDaily: 10, priceMonthly: 180, rating: "4,9" },
  { id: 43, image: "https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=800", type: 'cellar', title: "Cave 6m² · Nantes Bouffay", location: "Nantes Vieux", priceDaily: 5, priceMonthly: 95, rating: "4,7" },
  { id: 44, image: "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800", type: 'parking', title: "Garage · Nantes Graslin", location: "Nantes 1er", priceHourly: 3, priceDaily: 13, priceMonthly: 240, rating: "4,9" },
  { id: 45, image: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800", type: 'storage', title: "Box stockage 14m² · Nantes", location: "Nantes Doulon", priceDaily: 11, priceMonthly: 195, rating: "4,8" },
  { id: 46, image: "https://images.unsplash.com/photo-1574552850131-cc374ee8f7b0?w=800", type: 'parking', title: "Place parking · Nantes République", location: "Nantes Centre", priceHourly: 2.8, priceDaily: 12, priceMonthly: 220, rating: "5,0" },
  { id: 47, image: "https://images.unsplash.com/photo-1600585154363-67eb9e2e2099?w=800", type: 'cellar', title: "Cave 8m² · Nantes Decré", location: "Nantes 2ème", priceDaily: 6, priceMonthly: 110, rating: "4,8" },
  { id: 48, image: "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800", type: 'storage', title: "Box stockage 19m² · Nantes", location: "Nantes Bottière", priceDaily: 14, priceMonthly: 260, rating: "4,7" },
];

const savannahCarouselSpaces: CarouselSpace[] = [
  { id: 49, image: "https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=800", type: 'parking', title: "Parking sécurisé · Strasbourg Cathédrale", location: "Strasbourg Centre", priceHourly: 3.5, priceDaily: 15, priceMonthly: 270, rating: "4,9" },
  { id: 50, image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800", type: 'storage', title: "Box stockage 16m² · Strasbourg", location: "Strasbourg Neudorf", priceDaily: 13, priceMonthly: 240, rating: "4,8" },
  { id: 51, image: "https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=800", type: 'cellar', title: "Cave 7m² · Strasbourg Krutenau", location: "Strasbourg Est", priceDaily: 6, priceMonthly: 110, rating: "4,7" },
  { id: 52, image: "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800", type: 'parking', title: "Garage · Strasbourg Esplanade", location: "Strasbourg Centre", priceHourly: 4, priceDaily: 17, priceMonthly: 300, rating: "5,0" },
  { id: 53, image: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800", type: 'storage', title: "Box stockage 14m² · Strasbourg", location: "Strasbourg Meinau", priceDaily: 11, priceMonthly: 200, rating: "4,8" },
  { id: 54, image: "https://images.unsplash.com/photo-1574552850131-cc374ee8f7b0?w=800", type: 'parking', title: "Place parking · Strasbourg Kléber", location: "Strasbourg 1er", priceHourly: 4.5, priceDaily: 19, priceMonthly: 350, rating: "4,9" },
  { id: 55, image: "https://images.unsplash.com/photo-1600585154363-67eb9e2e2099?w=800", type: 'cellar', title: "Cave 8m² · Strasbourg Petite France", location: "Strasbourg Vieux", priceDaily: 7, priceMonthly: 125, rating: "5,0" },
  { id: 56, image: "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800", type: 'storage', title: "Box stockage 21m² · Strasbourg", location: "Strasbourg Robertsau", priceDaily: 16, priceMonthly: 290, rating: "4,7" },
];

const panamacitybeachCarouselSpaces: CarouselSpace[] = [
  { id: 57, image: "https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=800", type: 'parking', title: "Parking couvert · Montpellier Antigone", location: "Montpellier Centre", priceHourly: 3, priceDaily: 14, priceMonthly: 250, rating: "4,8" },
  { id: 58, image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800", type: 'storage', title: "Box stockage 15m² · Montpellier", location: "Montpellier Port Marianne", priceDaily: 12, priceMonthly: 220, rating: "4,9" },
  { id: 59, image: "https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=800", type: 'cellar', title: "Cave 6m² · Montpellier Ecusson", location: "Montpellier Vieux", priceDaily: 5, priceMonthly: 100, rating: "4,7" },
  { id: 60, image: "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800", type: 'parking', title: "Garage · Montpellier Comédie", location: "Montpellier 1er", priceHourly: 3.5, priceDaily: 16, priceMonthly: 280, rating: "4,9" },
  { id: 61, image: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800", type: 'storage', title: "Box stockage 13m² · Montpellier", location: "Montpellier Ovalie", priceDaily: 10, priceMonthly: 185, rating: "4,8" },
  { id: 62, image: "https://images.unsplash.com/photo-1574552850131-cc374ee8f7b0?w=800", type: 'parking', title: "Place parking · Montpellier Peyrou", location: "Montpellier Centre", priceHourly: 2.8, priceDaily: 13, priceMonthly: 230, rating: "5,0" },
  { id: 63, image: "https://images.unsplash.com/photo-1600585154363-67eb9e2e2099?w=800", type: 'cellar', title: "Cave 9m² · Montpellier Arceaux", location: "Montpellier Nord", priceDaily: 7, priceMonthly: 130, rating: "4,8" },
  { id: 64, image: "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800", type: 'storage', title: "Box stockage 20m² · Montpellier", location: "Montpellier Hôpitaux", priceDaily: 15, priceMonthly: 275, rating: "4,7" },
];

const pigeonforgeCarouselSpaces: CarouselSpace[] = [
  { id: 65, image: "https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=800", type: 'parking', title: "Parking sécurisé · Lille Grand Place", location: "Lille Centre", priceHourly: 3.5, priceDaily: 15, priceMonthly: 280, rating: "4,9" },
  { id: 66, image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800", type: 'storage', title: "Box stockage 17m² · Lille", location: "Lille Wazemmes", priceDaily: 13, priceMonthly: 240, rating: "4,8" },
  { id: 67, image: "https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=800", type: 'cellar', title: "Cave 7m² · Lille Vieux-Lille", location: "Lille Nord", priceDaily: 6, priceMonthly: 110, rating: "4,7" },
  { id: 68, image: "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800", type: 'parking', title: "Garage · Lille République", location: "Lille 1er", priceHourly: 4, priceDaily: 17, priceMonthly: 310, rating: "5,0" },
  { id: 69, image: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800", type: 'storage', title: "Box stockage 14m² · Lille", location: "Lille Moulins", priceDaily: 11, priceMonthly: 200, rating: "4,8" },
  { id: 70, image: "https://images.unsplash.com/photo-1574552850131-cc374ee8f7b0?w=800", type: 'parking', title: "Place parking · Lille Flandres", location: "Lille Centre", priceHourly: 3.8, priceDaily: 16, priceMonthly: 290, rating: "4,9" },
  { id: 71, image: "https://images.unsplash.com/photo-1600585154363-67eb9e2e2099?w=800", type: 'cellar', title: "Cave 8m² · Lille Solférino", location: "Lille Sud", priceDaily: 7, priceMonthly: 125, rating: "5,0" },
  { id: 72, image: "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800", type: 'storage', title: "Box stockage 22m² · Lille", location: "Lille Vauban", priceDaily: 16, priceMonthly: 295, rating: "4,7" },
];

// Fonction pour convertir un CarouselSpace en format compatible avec PARKING_LISTINGS
function convertCarouselSpaceToFullListing(space: CarouselSpace): typeof PARKING_LISTINGS[0] {
  // Extraire la ville depuis le location
  const cityMatch = space.location.match(/^([^0-9]+)/);
  const city = cityMatch ? cityMatch[1].trim() : space.location;
  
  return {
    id: space.id,
    type: space.type,
    title: space.title,
    location: space.location,
    city: city,
    address: `${space.location}, France`,
    priceHourly: space.priceHourly,
    priceDaily: space.priceDaily,
    priceWeekly: space.priceWeekly || Math.round(space.priceDaily * 5),
    priceMonthly: space.priceMonthly,
    rating: space.rating,
    reviewsCount: Math.floor(Math.random() * 50) + 20, // Générer un nombre aléatoire de reviews
    image: space.image,
    images: [space.image, space.image, space.image], // Utiliser la même image pour toutes
    description: `${space.title}. Espace ${space.type === 'parking' ? 'de stationnement' : space.type === 'storage' ? 'de stockage' : 'de cave'} sécurisé et bien situé.`,
    features: [
      'Accès 24h/24',
      'Sécurisé',
      space.type === 'parking' ? 'Couvert' : 'Sec et ventilé',
      'Éclairage',
      'Surveillance'
    ],
    dimensions: {
      length: space.type === 'parking' ? '5m' : space.type === 'storage' ? '4m' : '3m',
      width: space.type === 'parking' ? '2.5m' : space.type === 'storage' ? '2.5m' : '2m',
      height: space.type === 'cellar' ? '2.2m' : '2.5m'
    },
    host: {
      name: 'Hôte Rentoall',
      joinedDate: '2023',
      avatar: 'https://i.pravatar.cc/150?img=' + (space.id % 10 + 1),
      isSuperhost: parseFloat(space.rating) >= 4.8
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
  };
}

// Agréger toutes les données
const allCarouselSpaces = [
  ...miamiCarouselSpaces,
  ...orlandoCarouselSpaces,
  ...gatlinburgCarouselSpaces,
  ...nashvilleCarouselSpaces,
  ...newyorkCarouselSpaces,
  ...savannahCarouselSpaces,
  ...panamacitybeachCarouselSpaces,
  ...pigeonforgeCarouselSpaces,
];

// Convertir les carrousels en format complet
const convertedCarouselListings = allCarouselSpaces.map(convertCarouselSpaceToFullListing);

// Exporter toutes les annonces (PARKING_LISTINGS + carrousels)
export const ALL_PARKING_LISTINGS = [...PARKING_LISTINGS, ...convertedCarouselListings];

// Fonction utilitaire pour trouver une annonce par ID
export function getParkingById(id: number | string): typeof PARKING_LISTINGS[0] | undefined {
  const idNum = typeof id === 'string' ? parseInt(id, 10) : id;
  return ALL_PARKING_LISTINGS.find(p => p.id === idNum);
}

