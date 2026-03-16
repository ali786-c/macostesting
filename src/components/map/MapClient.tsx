'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';

// Fix pour les icônes Leaflet par défaut (problème connu avec Next.js)
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  });
}

interface Listing {
  id: number;
  title: string;
  location: string;
  city: string;
  address: string;
  priceDaily: number;
  priceHourly?: number;
  priceMonthly: number;
  type: 'parking' | 'storage' | 'cellar';
  image: string;
  lat?: number;
  lng?: number;
}

interface MapClientProps {
  listings: Listing[];
  selectedListingId?: number;
  onListingClick?: (listingId: number) => void;
  onListingHover?: (listingId: number | null) => void;
}

// Coordonnées approximatives pour les villes françaises
const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  'Paris': { lat: 48.8566, lng: 2.3522 },
  'Lyon': { lat: 45.7640, lng: 4.8357 },
  'Marseille': { lat: 43.2965, lng: 5.3698 },
  'Toulouse': { lat: 43.6047, lng: 1.4442 },
  'Nice': { lat: 43.7102, lng: 7.2620 },
  'Nantes': { lat: 47.2184, lng: -1.5536 },
  'Strasbourg': { lat: 48.5734, lng: 7.7521 },
  'Montpellier': { lat: 43.6108, lng: 3.8767 },
  'Bordeaux': { lat: 44.8378, lng: -0.5792 },
  'Lille': { lat: 50.6292, lng: 3.0573 },
  'Rennes': { lat: 48.1173, lng: -1.6778 },
  'Reims': { lat: 49.2583, lng: 4.0317 },
  'Le Havre': { lat: 49.4944, lng: 0.1079 },
  'Saint-Étienne': { lat: 45.4397, lng: 4.3872 },
  'Toulon': { lat: 43.1242, lng: 5.9280 },
  'Grenoble': { lat: 45.1885, lng: 5.7245 },
  'Dijon': { lat: 47.3220, lng: 5.0415 },
  'Angers': { lat: 47.4739, lng: -0.5517 },
  'Nîmes': { lat: 43.8367, lng: 4.3601 },
  'Villeurbanne': { lat: 45.7719, lng: 4.8902 },
  'Saint-Denis': { lat: 48.9356, lng: 2.3539 },
  'Le Mans': { lat: 48.0061, lng: 0.1996 },
  'Aix-en-Provence': { lat: 43.5297, lng: 5.4474 },
  'Clermont-Ferrand': { lat: 45.7772, lng: 3.0870 },
  'Brest': { lat: 48.3904, lng: -4.4861 },
  'Tours': { lat: 47.3941, lng: 0.6848 },
  'Limoges': { lat: 45.8354, lng: 1.2622 },
  'Amiens': { lat: 49.8942, lng: 2.2957 },
  'Perpignan': { lat: 42.6887, lng: 2.8947 },
  'Metz': { lat: 49.1193, lng: 6.1757 },
  'Besançon': { lat: 47.2378, lng: 6.0241 },
};

// Fonction pour obtenir les coordonnées d'un listing
const getListingCoordinates = (listing: Listing, index: number): { lat: number; lng: number } => {
  // Si le listing a déjà des coordonnées, les utiliser
  if (listing.lat && listing.lng) {
    return { lat: listing.lat, lng: listing.lng };
  }

  // Sinon, utiliser les coordonnées de la ville avec un petit offset
  const baseCoords = CITY_COORDINATES[listing.city] || CITY_COORDINATES['Paris'];
  const offset = 0.01;
  const angle = (index * 137.5) % 360; // Angle d'or pour une distribution uniforme
  const radius = (index % 3) * offset;
  
  return {
    lat: baseCoords.lat + radius * Math.cos(angle * Math.PI / 180),
    lng: baseCoords.lng + radius * Math.sin(angle * Math.PI / 180),
  };
};

// Composant pour capturer l'instance de la carte et gérer l'initialisation
function MapInstanceHandler({ onMapReady }: { onMapReady: (map: L.Map) => void }) {
  const map = useMap();

  useEffect(() => {
    if (map) {
      onMapReady(map);
    }
  }, [map, onMapReady]);

  return null;
}

// Composant pour ajuster la vue de la carte
function MapViewUpdater({ listings, selectedListingId }: { listings: Listing[]; selectedListingId?: number }) {
  const map = useMap();

  useEffect(() => {
    if (listings.length === 0) return;

    if (selectedListingId) {
      // Centrer sur le listing sélectionné
      const selectedListing = listings.find(l => l.id === selectedListingId);
      if (selectedListing) {
        const coords = getListingCoordinates(selectedListing, listings.indexOf(selectedListing));
        map.setView([coords.lat, coords.lng], 15, { animate: true, duration: 0.5 });
      }
    } else {
      // Fit bounds sur tous les listings
      const bounds = listings.map((listing, index) => {
        const coords = getListingCoordinates(listing, index);
        return [coords.lat, coords.lng] as [number, number];
      });
      
      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
      }
    }
  }, [listings, selectedListingId, map]);

  return null;
}

// Composant pour gérer les markers avec clustering
function MarkersGroup({
  listings,
  selectedListingId,
  hoveredListingId,
  onListingClick,
  onMarkerMouseOver,
  onMarkerMouseOut,
  markerRefs,
}: {
  listings: Listing[];
  selectedListingId?: number;
  hoveredListingId: number | null;
  onListingClick?: (listingId: number) => void;
  onMarkerMouseOver: (listingId: number) => void;
  onMarkerMouseOut: () => void;
  markerRefs: React.MutableRefObject<Record<number, L.Marker>>;
}) {
  const map = useMap();
  const clusterGroupRef = useRef<any>(null);

  useEffect(() => {
    if (!map) return;

    // Créer le groupe de clusters (leaflet.markercluster ajoute L.markerClusterGroup)
    const clusterGroup = (L as any).markerClusterGroup({
      chunkedLoading: true,
      disableClusteringAtZoom: 15,
      maxClusterRadius: 50,
    });

    // Créer les markers
    listings.forEach((listing, index) => {
      const coords = getListingCoordinates(listing, index);
      const price = listing.priceDaily || listing.priceHourly || listing.priceMonthly || 0;
      const isActive = selectedListingId === listing.id || hoveredListingId === listing.id;

      const marker = L.marker([coords.lat, coords.lng], {
        icon: createPriceMarker(price, isActive),
      });

      // Ajouter le popup
      const popupContent = `
        <div style="padding: 8px; min-width: 200px;">
          <h3 style="font-weight: 600; font-size: 14px; color: #1e293b; margin-bottom: 4px; line-height: 1.4;">
            ${listing.title}
          </h3>
          <p style="font-size: 12px; color: #64748b; margin-bottom: 8px;">${listing.location}</p>
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <span style="font-size: 14px; font-weight: 700; color: #10b981;">
              €${price}/${listing.priceHourly ? 'h' : 'j'}
            </span>
            <span style="font-size: 12px; color: #64748b;">
              ${listing.type === 'parking' ? 'Parking' : listing.type === 'storage' ? 'Box' : 'Cave et Divers'}
            </span>
          </div>
        </div>
      `;
      marker.bindPopup(popupContent);

      // Gérer les événements
      marker.on('click', () => {
        onListingClick?.(listing.id);
      });

      marker.on('mouseover', () => {
        onMarkerMouseOver(listing.id);
        // Mettre à jour l'icône pour le hover
        const newPrice = listing.priceDaily || listing.priceHourly || listing.priceMonthly || 0;
        marker.setIcon(createPriceMarker(newPrice, true));
      });

      marker.on('mouseout', () => {
        onMarkerMouseOut();
        // Remettre l'icône normale
        const newPrice = listing.priceDaily || listing.priceHourly || listing.priceMonthly || 0;
        const isSelected = selectedListingId === listing.id;
        marker.setIcon(createPriceMarker(newPrice, isSelected));
      });

      // Stocker la référence
      markerRefs.current[listing.id] = marker;

      // Ajouter au cluster
      clusterGroup.addLayer(marker);
    });

    // Ajouter le cluster à la carte
    clusterGroup.addTo(map);
    clusterGroupRef.current = clusterGroup;

    // Nettoyer à la destruction
    return () => {
      if (clusterGroupRef.current) {
        map.removeLayer(clusterGroupRef.current);
        clusterGroupRef.current = null;
      }
    };
  }, [map, listings, selectedListingId, hoveredListingId, onListingClick, onMarkerMouseOver, onMarkerMouseOut, markerRefs]);

  // Mettre à jour les icônes quand selectedListingId ou hoveredListingId change
  useEffect(() => {
    if (!clusterGroupRef.current) return;

    listings.forEach((listing, index) => {
      const marker = markerRefs.current[listing.id];
      if (marker) {
        const price = listing.priceDaily || listing.priceHourly || listing.priceMonthly || 0;
        const isActive = selectedListingId === listing.id || hoveredListingId === listing.id;
        marker.setIcon(createPriceMarker(price, isActive));
      }
    });
  }, [listings, selectedListingId, hoveredListingId, markerRefs]);

  return null;
}

// Créer un marker personnalisé avec le prix
const createPriceMarker = (price: number, isActive: boolean = false) => {
  return L.divIcon({
    className: 'price-marker',
    html: `
      <div class="price-pin ${isActive ? 'price-pin--active' : ''}">
        <span class="price-pin-text">€${price}</span>
      </div>
    `,
    iconSize: [60, 30],
    iconAnchor: [30, 30],
    popupAnchor: [0, -30],
  });
};

export default function MapClient({ listings, selectedListingId, onListingClick, onListingHover }: MapClientProps) {
  const [hoveredListingId, setHoveredListingId] = useState<number | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const markerRefs = useRef<Record<number, L.Marker>>({});
  const mapInstanceRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const previousMapKeyRef = useRef<string>('');
  const isInitializingRef = useRef<boolean>(false);

  // S'assurer que le composant est monté côté client
  useEffect(() => {
    setIsMounted(true);
    return () => {
      // Nettoyer l'instance de la carte lors du démontage
      if (mapInstanceRef.current) {
        try {
          // Vérifier si le conteneur existe encore
          const container = mapInstanceRef.current.getContainer();
          if (container && container.parentNode) {
            mapInstanceRef.current.remove();
          }
        } catch (e) {
          // Ignorer les erreurs si la carte est déjà supprimée
          console.warn('Erreur lors du nettoyage de la carte:', e);
        }
        mapInstanceRef.current = null;
      }
      // Nettoyer les markers
      Object.values(markerRefs.current).forEach(marker => {
        try {
          if (marker) {
            // Vérifier si le marker est toujours attaché à une carte
            const map = (marker as any)._map;
            if (map) {
              marker.remove();
            }
          }
        } catch (e) {
          // Ignorer les erreurs
        }
      });
      markerRefs.current = {};
      previousMapKeyRef.current = '';
      isInitializingRef.current = false;
    };
  }, []);

  // Calculer le centre de la carte
  const center: [number, number] = listings.length > 0
    ? (() => {
        const coords = listings.map((listing, index) => getListingCoordinates(listing, index));
        const avgLat = coords.reduce((sum, c) => sum + c.lat, 0) / coords.length;
        const avgLng = coords.reduce((sum, c) => sum + c.lng, 0) / coords.length;
        return [avgLat, avgLng];
      })()
    : [48.8566, 2.3522]; // Paris par défaut

  // Gérer le hover sur les markers
  const handleMarkerMouseOver = (listingId: number) => {
    setHoveredListingId(listingId);
    onListingHover?.(listingId);
  };

  const handleMarkerMouseOut = () => {
    setHoveredListingId(null);
    onListingHover?.(null);
  };

  // Ouvrir le popup du marker sélectionné
  useEffect(() => {
    if (selectedListingId && markerRefs.current[selectedListingId]) {
      markerRefs.current[selectedListingId].openPopup();
    }
  }, [selectedListingId]);

  // Générer une clé unique basée sur les listings pour éviter les réinitialisations
  const computedMapKey = useMemo(() => {
    return `map-${listings.map(l => l.id).join('-')}-${listings.length}`;
  }, [listings]);

  // Nettoyer la carte quand la clé change
  useEffect(() => {
    if (previousMapKeyRef.current && previousMapKeyRef.current !== computedMapKey && mapInstanceRef.current) {
      try {
        // Nettoyer complètement la carte
        const container = mapInstanceRef.current.getContainer();
        if (container) {
          mapInstanceRef.current.remove();
          // Supprimer les traces Leaflet du conteneur
          if ((container as any)._leaflet_id) {
            delete (container as any)._leaflet_id;
          }
        }
      } catch (e) {
        console.warn('Erreur lors du nettoyage de la carte:', e);
      }
      mapInstanceRef.current = null;
      isInitializingRef.current = false;
      
      // Nettoyer les markers
      Object.values(markerRefs.current).forEach(marker => {
        try {
          if (marker) {
            // Vérifier si le marker est toujours attaché à une carte
            const map = (marker as any)._map;
            if (map) {
              marker.remove();
            }
          }
        } catch (e) {
          // Ignorer les erreurs
        }
      });
      markerRefs.current = {};
    }
    
    // Mettre à jour la référence de la clé précédente
    previousMapKeyRef.current = computedMapKey;
  }, [computedMapKey]);

  // ID unique pour le conteneur de la carte
  const mapContainerId = `map-container-${computedMapKey}`;

  // Vérifier si le conteneur a déjà une carte initialisée avant de rendre
  useEffect(() => {
    if (containerRef.current) {
      const container = containerRef.current;
      // Si le conteneur a déjà une référence Leaflet, nettoyer
      if ((container as any)._leaflet_id) {
        try {
          // Essayer de trouver et supprimer l'instance existante
          const existingMap = (L as any).map._instances?.find((m: L.Map) => 
            m.getContainer() === container
          );
          if (existingMap) {
            existingMap.remove();
          }
          delete (container as any)._leaflet_id;
        } catch (e) {
          console.warn('Erreur lors du nettoyage préventif:', e);
        }
      }
    }
  }, [computedMapKey]);

  if (!isMounted || !computedMapKey) {
    return (
      <div className="h-full bg-slate-100 flex items-center justify-center">
        <div className="text-center text-slate-500">
          <p className="text-sm">Chargement de la carte...</p>
        </div>
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="h-full bg-slate-100 flex items-center justify-center">
        <div className="text-center text-slate-500">
          <p className="text-sm">Aucun espace à afficher</p>
        </div>
      </div>
    );
  }


  return (
    <div 
      ref={containerRef}
      className="h-full w-full relative" 
      id={mapContainerId}
    >
      <MapContainer
        key={computedMapKey}
        center={center}
        zoom={6}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
        className="z-0"
      >
        <MapInstanceHandler 
          onMapReady={(mapInstance) => {
            // Vérifier si le conteneur a déjà une carte initialisée
            const container = mapInstance.getContainer();
            
            // Si le conteneur a déjà une référence Leaflet différente, nettoyer d'abord
            if (container && (container as any)._leaflet_id) {
              const existingLeafletId = (container as any)._leaflet_id;
              const currentLeafletId = (mapInstance as any)._leaflet_id;
              
              // Si l'ID est différent, c'est qu'une autre instance existe
              if (existingLeafletId !== currentLeafletId) {
                console.warn('⚠️ [MAP] Conteneur déjà initialisé avec une autre instance, nettoyage...');
                try {
                  // Essayer de trouver et supprimer l'ancienne instance
                  const existingMap = (L as any).map._instances?.find((m: L.Map) => {
                    const mContainer = m.getContainer();
                    return mContainer === container && (m as any)._leaflet_id === existingLeafletId;
                  });
                  
                  if (existingMap && existingMap !== mapInstance) {
                    existingMap.remove();
                  }
                  
                  // Nettoyer la référence Leaflet du conteneur
                  delete (container as any)._leaflet_id;
                } catch (e) {
                  console.warn('Erreur lors du nettoyage du conteneur:', e);
                }
              }
            }
            
            // Éviter les doubles initialisations
            if (isInitializingRef.current && mapInstanceRef.current && mapInstanceRef.current !== mapInstance) {
              console.warn('⚠️ [MAP] Tentative de double initialisation détectée, nettoyage...');
              try {
                const oldContainer = mapInstanceRef.current.getContainer();
                mapInstanceRef.current.remove();
                if (oldContainer && (oldContainer as any)._leaflet_id) {
                  delete (oldContainer as any)._leaflet_id;
                }
              } catch (e) {
                console.warn('Erreur lors du nettoyage de l\'ancienne carte:', e);
              }
            }
            
            // Stocker la nouvelle instance
            mapInstanceRef.current = mapInstance;
            isInitializingRef.current = true;
            
            // Réinitialiser le flag après un court délai
            setTimeout(() => {
              isInitializingRef.current = false;
            }, 100);
          }}
        />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapViewUpdater listings={listings} selectedListingId={selectedListingId} />

        <MarkersGroup
          listings={listings}
          selectedListingId={selectedListingId}
          hoveredListingId={hoveredListingId}
          onListingClick={onListingClick}
          onMarkerMouseOver={handleMarkerMouseOver}
          onMarkerMouseOut={handleMarkerMouseOut}
          markerRefs={markerRefs}
        />
      </MapContainer>
    </div>
  );
}
