'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
// import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

// Fix pour les icônes Leaflet par défaut (problème connu avec Next.js)
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  });
}

export interface Property {
  id: number;
  title: string;
  lat: number;
  lng: number;
  price: number;
  address: string;
  status: 'available' | 'unavailable' | 'reserved';
  placeId: number;
}

interface PropertiesMapProps {
  properties: Property[];
  selectedPropertyId?: number;
  onPropertyClick?: (id: number) => void;
  onPropertyHover?: (id: number | null) => void;
}

// Composant pour ajuster la vue de la carte
function MapViewUpdater({ properties, selectedPropertyId }: { properties: Property[]; selectedPropertyId?: number }) {
  const map = useMap();

  useEffect(() => {
    if (properties.length === 0) return;

    if (selectedPropertyId) {
      // Centrer sur la propriété sélectionnée
      const selectedProperty = properties.find(p => p.id === selectedPropertyId);
      if (selectedProperty) {
        map.setView([selectedProperty.lat, selectedProperty.lng], 15, { animate: true, duration: 0.5 });
      }
    } else {
      // Fit bounds sur toutes les propriétés
      const bounds = properties.map((property) => {
        return [property.lat, property.lng] as [number, number];
      });
      
      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
      }
    }
  }, [properties, selectedPropertyId, map]);

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

// Composant pour ouvrir le popup du marker sélectionné
function MarkerPopupOpener({ properties, selectedPropertyId }: { properties: Property[]; selectedPropertyId?: number }) {
  const map = useMap();

  useEffect(() => {
    if (!selectedPropertyId) return;

    const selectedProperty = properties.find(p => p.id === selectedPropertyId);
    if (!selectedProperty) return;

    // Trouver le marker correspondant et ouvrir son popup
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        const latlng = layer.getLatLng();
        // Vérifier si c'est le marker sélectionné (comparaison des coordonnées)
        if (Math.abs(latlng.lat - selectedProperty.lat) < 0.0001 && 
            Math.abs(latlng.lng - selectedProperty.lng) < 0.0001) {
          layer.openPopup();
        }
      }
    });
  }, [selectedPropertyId, properties, map]);

  return null;
}

export default function PropertiesMap({ properties, selectedPropertyId, onPropertyClick, onPropertyHover }: PropertiesMapProps) {
  const [hoveredPropertyId, setHoveredPropertyId] = useState<number | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    setIsMounted(true);

    return () => {
      // --- Ensure Leaflet instance is destroyed once ---
      if (mapRef.current) {
        try {
          // Debug log
          // eslint-disable-next-line no-console
          console.debug('[MAP] Removing map instance');
          mapRef.current.remove();
        } catch (e) {
          // eslint-disable-next-line no-console
          console.debug('[MAP] Map remove ignored', e);
        } finally {
          mapRef.current = null;
        }
      }
    };
  }, []);

  const center: [number, number] = useMemo(() => {
    if (properties.length === 0) return [48.8566, 2.3522];
    const avgLat = properties.reduce((sum, p) => sum + p.lat, 0) / properties.length;
    const avgLng = properties.reduce((sum, p) => sum + p.lng, 0) / properties.length;
    return [avgLat, avgLng];
  }, [properties]);

  const handleMarkerMouseOver = (propertyId: number) => {
    setHoveredPropertyId(propertyId);
    onPropertyHover?.(propertyId);
  };

  const handleMarkerMouseOut = () => {
    setHoveredPropertyId(null);
    onPropertyHover?.(null);
  };

  if (!isMounted) {
    return (
      <div className="h-full bg-slate-100 flex items-center justify-center">
        <div className="text-center text-slate-500">
          <p className="text-sm">Chargement de la carte...</p>
        </div>
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="h-full bg-slate-100 flex items-center justify-center">
        <div className="text-center text-slate-500">
          <p className="text-sm">Aucun espace à afficher</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative">
      <MapContainer
        center={center}
        zoom={6}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapViewUpdater properties={properties} selectedPropertyId={selectedPropertyId} />

        {/* <MarkerClusterGroup
          chunkedLoading
          disableClusteringAtZoom={15}
          maxClusterRadius={50}
        > */}
          {properties.map((property) => {
            const isActive = selectedPropertyId === property.id || hoveredPropertyId === property.id;
            
            return (
              <React.Fragment key={property.id}>
                <Marker
                  position={[property.lat, property.lng]}
                  icon={createPriceMarker(property.price, isActive)}
                  eventHandlers={{
                    click: () => {
                      onPropertyClick?.(property.id);
                    },
                    mouseover: () => {
                      handleMarkerMouseOver(property.id);
                    },
                    mouseout: () => {
                      handleMarkerMouseOut();
                    },
                  }}
                >
                  <Popup>
                    <div style={{ padding: '8px', minWidth: '200px' }}>
                      <h3 style={{ fontWeight: 600, fontSize: '14px', color: '#1e293b', marginBottom: '4px', lineHeight: 1.4 }}>
                        {property.title}
                      </h3>
                      <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>{property.address}</p>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#10b981' }}>
                          €{property.price}/j
                        </span>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>
                          {property.status === 'available' ? 'Disponible' : property.status === 'reserved' ? 'Réservé' : 'Indisponible'}
                        </span>
                      </div>
                    </div>
                  </Popup>
                </Marker>
                {/* {selectedPropertyId === property.id && (
                  <MarkerPopupController propertyId={property.id} selectedPropertyId={selectedPropertyId} />
                )} */}
              </React.Fragment>
            );
          })}
        {/* </MarkerClusterGroup> */}
      </MapContainer>
    </div>
  );
}
