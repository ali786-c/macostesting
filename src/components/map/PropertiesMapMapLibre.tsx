'use client';

import React, { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, forwardRef } from 'react';
import { useRouter } from 'next/navigation';
import { safePush } from '@/lib/capacitor';
import { MapPin } from 'lucide-react';
import Map, { Layer, Popup, Source, MapRef, MapLayerMouseEvent } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

export interface PropertiesMapMapLibreRef {
  goToMyPosition: (forceFresh?: boolean) => void;
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
  image?: string;
}

interface PropertiesMapProps {
  properties: Property[];
  selectedPropertyId?: number;
  onPropertyClick?: (id: number) => void;
  onPropertyHover?: (id: number | null) => void;
  center?: { lat: number; lng: number; zoom?: number };
  /** Désactive la géolocalisation automatique et le bouton "Ma position" (ex: page fiche bien) */
  showUserLocation?: boolean;
  /** Ne pas centrer sur la position utilisateur au chargement (ex: recherche par ville en cours) */
  skipGeolocationOnLoad?: boolean;
  /** Appelé quand l'utilisateur a déplacé la carte (drag/zoom) — permet d'afficher "Rechercher dans cette zone" */
  onMapMoveEnd?: (center: { lat: number; lng: number }) => void;
}

type PopupState = {
  id: number;
  lng: number;
  lat: number;
  title: string;
  address: string;
  price: number;
  status: Property['status'];
  placeId: number;
  image?: string;
};

const SOURCE_ID = 'properties';
const LAYER_CLUSTERS = 'clusters';
const LAYER_CLUSTER_COUNT = 'cluster-count';
const LAYER_POINT_BG = 'point-bg';
const LAYER_POINT_LABEL = 'point-label';

/**
 * MapLibre properties map with clustering, price pins and popup.
 */
const PropertiesMapMapLibre = forwardRef<PropertiesMapMapLibreRef, PropertiesMapProps>(function PropertiesMapMapLibre({
  properties,
  selectedPropertyId,
  onPropertyClick,
  onPropertyHover,
  center,
  showUserLocation = true,
  skipGeolocationOnLoad = false,
  onMapMoveEnd,
}, ref) {
  const router = useRouter();
  const mapRef = useRef<MapRef | null>(null);

  const [popup, setPopup] = useState<PopupState | null>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [currentZoom, setCurrentZoom] = useState<number>(12);
  const [isLocating, setIsLocating] = useState(false);
  const [geolocError, setGeolocError] = useState<string | null>(null);

  const mapTilerKey = process.env.NEXT_PUBLIC_MAPTILER_KEY || process.env.VITE_MAPTILER_KEY;
  const styleUrl = process.env.NEXT_PUBLIC_MAP_STYLE_URL ||
    (mapTilerKey
      ? `https://api.maptiler.com/maps/streets-v2/style.json?key=${mapTilerKey}`
      : 'https://demotiles.maplibre.org/style.json');

  // Handler pour suivre le zoom et notifier le centre après un déplacement de la carte
  const handleMoveEnd = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (map) {
      setCurrentZoom(map.getZoom());
      const mapCenter = map.getCenter();
      if (mapCenter && onMapMoveEnd) {
        onMapMoveEnd({ lat: mapCenter.lat, lng: mapCenter.lng });
      }
    }
  }, [onMapMoveEnd]);

  const geojson = useMemo(() => {
    console.debug('[MAP] build geojson - count=', properties?.length ?? 0);

    return {
      type: 'FeatureCollection' as const,
      features: (properties || []).map((p) => ({
        type: 'Feature' as const,
        id: p.id,
        geometry: {
          type: 'Point' as const,
          coordinates: [p.lng, p.lat]
        },
        properties: {
          id: p.id,
          title: p.title,
          address: p.address,
          price: p.price,
          status: p.status
        }
      }))
    };
  }, [properties]);

  const initialViewState = useMemo(() => {
    // Si un centre personnalisé est fourni, l'utiliser en priorité
    if (center) {
      return {
        latitude: center.lat,
        longitude: center.lng,
        zoom: center.zoom || 12
      };
    }

    // Sinon, calculer le centre basé sur les propriétés
    if (!properties?.length) {
      return { latitude: 48.8566, longitude: 2.3522, zoom: 5.8 };
    }
    const avgLat = properties.reduce((s, p) => s + p.lat, 0) / properties.length;
    const avgLng = properties.reduce((s, p) => s + p.lng, 0) / properties.length;
    return { latitude: avgLat, longitude: avgLng, zoom: 6.2 };
  }, [properties, center]);

  // État pour suivre si la carte est chargée
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  // Recentrer la carte quand le centre change OU quand la carte se charge avec un centre déjà défini
  // ✅ PRIORITÉ: Ce useEffect prend la priorité sur la géolocalisation si center est fourni
  // ✅ FIX: Utiliser les valeurs primitives dans les dépendances pour garantir la détection des changements
  useEffect(() => {
    console.log('🗺️ [MAP] ========================================');
    console.log('🗺️ [MAP] useEffect déclenché - Vérification du zoom (PRIORITÉ sur géoloc)');
    console.log('🗺️ [MAP] center:', center);
    console.log('🗺️ [MAP] center?.lat:', center?.lat);
    console.log('🗺️ [MAP] center?.lng:', center?.lng);
    console.log('🗺️ [MAP] center?.zoom:', center?.zoom);
    console.log('🗺️ [MAP] isMapLoaded:', isMapLoaded);
    console.log('🗺️ [MAP] mapRef.current:', !!mapRef.current);

    if (!center || !isMapLoaded || !mapRef.current) {
      if (!center) {
        console.log('🗺️ [MAP] Pas de centre fourni, géolocalisation ou centre par défaut sera utilisé');
      } else if (!isMapLoaded) {
        console.log('🗺️ [MAP] Carte pas encore chargée, zoom sera effectué après le chargement');
      } else if (!mapRef.current) {
        console.log('🗺️ [MAP] mapRef.current n\'est pas encore disponible');
      }
      console.log('🗺️ [MAP] ========================================');
      return;
    }

    const map = mapRef.current.getMap();
    if (!map) {
      console.log('🗺️ [MAP] map instance n\'est pas encore disponible');
      console.log('🗺️ [MAP] ========================================');
      return;
    }

    // ✅ PRIORITÉ: Zoom sur la ville sélectionnée (écrase la géolocalisation si elle était active)
    console.log('🗺️ [MAP] ⚡⚡⚡ Zoom automatique sur la ville sélectionnée (PRIORITÉ)');
    console.log('🗺️ [MAP] Position cible:', { lat: center.lat, lng: center.lng, zoom: center.zoom || 13 });

    // Utiliser flyTo pour un zoom fluide - c'est le seul mécanisme valide pour les updates
    map.flyTo({
      center: [center.lng, center.lat],
      zoom: center.zoom || 13,
      duration: 1200,
      essential: true // Force l'animation même si l'utilisateur interagit avec la carte
    });

    console.log('🗺️ [MAP] ✅ flyTo appelé avec succès - La ville sélectionnée a la priorité');
    console.log('🗺️ [MAP] ========================================');
  }, [center?.lat, center?.lng, center?.zoom, isMapLoaded]); // ✅ FIX: Dépendances primitives pour garantir la détection

  const setFeatureHoverState = useCallback((id: number | null) => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    if (hoveredId != null) {
      try {
        map.setFeatureState({ source: SOURCE_ID, id: hoveredId }, { hover: false });
      } catch (e) {
        // Ignore if feature not found
      }
    }

    if (id != null) {
      try {
        map.setFeatureState({ source: SOURCE_ID, id }, { hover: true });
      } catch (e) {
        // Ignore if feature not found
      }
    }
  }, [hoveredId]);

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    const prevSelectedId = popup?.id;
    if (prevSelectedId != null && prevSelectedId !== selectedPropertyId) {
      try {
        map.setFeatureState({ source: SOURCE_ID, id: prevSelectedId }, { selected: false });
      } catch (e) {
        // Ignore
      }
    }

    if (selectedPropertyId != null) {
      try {
        map.setFeatureState({ source: SOURCE_ID, id: selectedPropertyId }, { selected: true });
      } catch (e) {
        // Ignore
      }
    }
  }, [selectedPropertyId, popup?.id]);

  // Référence pour le marker de géolocalisation
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);

  // Fonction pour centrer sur la position utilisateur - utilisée au chargement ET par le bouton "Ma position"
  // Sur mobile web : forceFresh = true au clic sur le bouton pour demander la position (affiche la demande de permission si besoin)
  const goToMyPosition = useCallback((forceFresh?: boolean) => {
    const map = mapRef.current?.getMap();
    if (!map || !('geolocation' in navigator)) return;

    setGeolocError(null);
    setIsLocating(true);
    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: forceFresh ? 0 : 60_000, // Au clic bouton : toujours demander la position (prompt permission). Au chargement : accepter cache 1 min.
    };
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setIsLocating(false);
        setGeolocError(null);

        const runFlyTo = () => {
          map.flyTo({ center: [lng, lat], zoom: 13, duration: 1200, essential: true });
          if (userMarkerRef.current) userMarkerRef.current.remove();
          const userMarker = new maplibregl.Marker({ color: '#10b981', scale: 1.2 })
            .setLngLat([lng, lat])
            .addTo(map);
          userMarkerRef.current = userMarker;
        };
        if (typeof requestAnimationFrame !== 'undefined') {
          requestAnimationFrame(runFlyTo);
        } else {
          runFlyTo();
        }
      },
      (err) => {
        setIsLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGeolocError('localisation_refusée');
        } else {
          setGeolocError('localisation_indisponible');
        }
        setTimeout(() => setGeolocError(null), 5000);
      },
      options
    );
  }, []);

  useImperativeHandle(ref, () => ({
    goToMyPosition
  }), [goToMyPosition]);

  const onMapLoad = useCallback(() => {
    console.log('🗺️ [MAP] ========================================');
    console.log('🗺️ [MAP] ⚡⚡⚡ CARTE CHARGÉE ⚡⚡⚡');
    const map = mapRef.current?.getMap();
    if (!map) return;

    setIsMapLoaded(true); // Marquer la carte comme chargée pour permettre le zoom automatique

    // Ajouter les contrôles de navigation (zoom + rotation)
    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    // Géolocalisation uniquement quand showUserLocation est true ET qu'aucun centre n'est fourni
    // Si un centre (ville sélectionnée) est fourni, priorité à la ville - pas de géoloc au chargement
    if (!showUserLocation) {
      console.log('🗺️ [MAP] Mode fiche bien: pas de géolocalisation utilisateur');
      console.log('🗺️ [MAP] ========================================');
      return;
    }

    if (skipGeolocationOnLoad || (center?.lat != null && center?.lng != null)) {
      console.log('🗺️ [MAP] Recherche par ville active ou centre fourni, pas de géolocalisation au chargement');
      console.log('🗺️ [MAP] ========================================');
      return;
    }

    if (!('geolocation' in navigator)) {
      console.warn('🗺️ [MAP] ⚠️ Géolocalisation non supportée par le navigateur');
      console.log('🗺️ [MAP] ========================================');
      return;
    }

    console.log('🗺️ [MAP] 📍 Pas de centre: demande de géolocalisation au chargement...');
    goToMyPosition();
  }, [goToMyPosition, showUserLocation, skipGeolocationOnLoad, center?.lat, center?.lng]);

  // Cleanup: supprimer le marker de géolocalisation au démontage
  useEffect(() => {
    return () => {
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
    };
  }, []);

  const closePopup = useCallback(() => {
    if (popup) {
      console.debug('[MAP] popup close - id=', popup.id);
    }
    setPopup(null);
  }, [popup]);

  /**
   * Expand clusters or open popup for unclustered points.
   */
  const onMapClick = useCallback(
    (e: MapLayerMouseEvent) => {
      const map = mapRef.current?.getMap();
      if (!map) return;

      const features = map.queryRenderedFeatures(e.point, {
        layers: [LAYER_CLUSTERS, LAYER_POINT_BG, LAYER_POINT_LABEL]
      });

      if (!features?.length) {
        closePopup();
        return;
      }

      const f = features[0];

      // Cluster click: zoom in
      if (f.layer.id === LAYER_CLUSTERS || f.layer.id === LAYER_CLUSTER_COUNT) {
        const clusterId = f.properties?.cluster_id;
        const source = map.getSource(SOURCE_ID) as any;

        console.debug('[MAP] cluster click - clusterId=', clusterId);

        const [lng, lat] = (f.geometry as any).coordinates;

        // Zoom maximum (18) directement sur le cluster pour un zoom à 100%
        const targetZoom = 18;

        console.debug('[MAP] Zooming to cluster with maximum zoom:', {
          clusterId,
          center: [lng, lat],
          zoom: targetZoom
        });

        map.easeTo({
          center: [lng, lat],
          zoom: targetZoom, // Zoom maximum (18) pour un zoom à 100%
          duration: 600 // Animation fluide de 600ms
        });

        return;
      }

      // Point click: open popup and zoom (peut être cliqué via le label aussi)
      if (f.layer.id === LAYER_POINT_BG || f.layer.id === LAYER_POINT_LABEL) {
        const id = Number(f.properties?.id);
        const [lng, lat] = (f.geometry as any).coordinates;

        console.debug('[MAP] point click - id=', id, 'coordinates:', [lng, lat]);

        // Trouver la propriété correspondante
        const property = properties.find(p => p.id === id);

        if (!property) {
          console.warn('[MAP] Property not found for id:', id);
          return;
        }

        // Navigation vers la fiche du bien — safePush sur Capacitor (routes dynamiques), router.push sinon
        const path = `/parking/${property.placeId}/`;
        safePush(router, path);

        // Afficher le popup IMMÉDIATEMENT avant le zoom pour qu'il soit visible
        console.debug('[MAP] Setting popup IMMEDIATELY for property:', property);
        setPopup({
          id: property.id,
          lng: property.lng,
          lat: property.lat,
          title: property.title,
          address: property.address,
          price: property.price,
          status: property.status,
          placeId: property.placeId,
          image: property.image
        });

        // Zoom maximum (18) pour un zoom à 100% sur le bien
        const targetZoom = 18;

        console.debug('[MAP] Zooming to:', {
          center: [lng, lat],
          zoom: targetZoom,
          currentZoom: map.getZoom()
        });

        // Zoom direct sur le pin cliqué avec un zoom maximum
        map.easeTo({
          center: [lng, lat],
          zoom: targetZoom, // Zoom à 100% (niveau 18)
          duration: 600 // Animation fluide de 600ms
        });

        // Appeler le callback de clic
        onPropertyClick?.(id);
      }
    },
    [closePopup, onPropertyClick, properties]
  );

  /**
   * Hover detection on unclustered points and clusters.
   */
  const onMouseMove = useCallback(
    (e: MapLayerMouseEvent) => {
      const map = mapRef.current?.getMap();
      if (!map) return;

      // Vérifier les clusters ET les points individuels
      const features = map.queryRenderedFeatures(e.point, {
        layers: [LAYER_CLUSTERS, LAYER_POINT_BG, LAYER_POINT_LABEL]
      });

      if (features?.length) {
        // Toujours afficher le curseur pointer sur les clusters et les points
        map.getCanvas().style.cursor = 'pointer';

        // Si c'est un point individuel (pas un cluster)
        const pointFeature = features.find(f => f.layer.id === LAYER_POINT_BG || f.layer.id === LAYER_POINT_LABEL);
        if (pointFeature) {
          const id = Number(pointFeature.properties?.id);
          if (id && id !== hoveredId) {
            console.debug('[MAP] hover - id=', id);
            setFeatureHoverState(id);
            setHoveredId(id);
            onPropertyHover?.(id);
          }
        } else {
          // C'est un cluster, pas besoin de hover state
          if (hoveredId != null) {
            setFeatureHoverState(null);
            setHoveredId(null);
            onPropertyHover?.(null);
          }
        }
        return;
      }

      map.getCanvas().style.cursor = '';

      if (hoveredId != null) {
        console.debug('[MAP] hover out');
        setFeatureHoverState(null);
        setHoveredId(null);
        onPropertyHover?.(null);
      }
    },
    [hoveredId, onPropertyHover, setFeatureHoverState]
  );

  useEffect(() => {
    if (hoveredId != null) {
      const map = mapRef.current?.getMap();
      if (map) {
        try {
          map.setFeatureState({ source: SOURCE_ID, id: hoveredId }, { hover: false });
        } catch (e) {
          // Ignore
        }
      }
      setHoveredId(null);
      onPropertyHover?.(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geojson]);

  // Update popup when selectedPropertyId changes externally
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    if (selectedPropertyId) {
      const property = properties.find(p => p.id === selectedPropertyId);
      if (property) {
        // Vérifier si le popup est déjà configuré pour cette propriété pour éviter les mises à jour inutiles
        if (popup?.id === selectedPropertyId) {
          return; // Le popup est déjà configuré pour cette propriété
        }

        // Zoom maximum (18) sur le bien sélectionné pour un zoom à 100%
        const targetZoom = 18;

        console.debug('[MAP] Selected property changed, zooming to:', {
          propertyId: selectedPropertyId,
          center: [property.lng, property.lat],
          zoom: targetZoom
        });

        map.easeTo({
          center: [property.lng, property.lat],
          zoom: targetZoom, // Zoom à 100% (niveau 18)
          duration: 600 // Animation fluide de 600ms
        });

        setPopup({
          id: property.id,
          lng: property.lng,
          lat: property.lat,
          title: property.title,
          address: property.address,
          price: property.price,
          status: property.status,
          placeId: property.placeId,
          image: property.image
        });
      }
    } else if (!selectedPropertyId && popup) {
      setPopup(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPropertyId, properties]);

  if (!styleUrl) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-slate-100 text-slate-700">
        <div className="text-center">
          <p className="text-sm font-medium">Missing NEXT_PUBLIC_MAP_STYLE_URL</p>
          <p className="text-xs mt-2 opacity-75">Please configure your map style URL in .env.local</p>
        </div>
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-slate-100">
        <div className="text-center text-slate-500">
          <p className="text-sm">Aucun espace à afficher</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative map-container-mobile">
      {/* Bouton position — icône seule, compact */}
      {showUserLocation && isMapLoaded && 'geolocation' in navigator && (
        <button
          type="button"
          onClick={() => goToMyPosition(true)}
          disabled={isLocating}
          className="absolute top-3 right-3 z-[1000] flex items-center justify-center p-2.5 min-w-[44px] min-h-[44px] bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200/80 hover:bg-white hover:border-emerald-300 active:scale-95 transition-all cursor-pointer touch-manipulation disabled:opacity-60 disabled:cursor-not-allowed sm:top-20 sm:rounded-lg sm:shadow-md"
          aria-label="Centrer sur ma position"
          title="Ma position"
        >
          {isLocating ? (
            <span className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin shrink-0" />
          ) : (
            <MapPin className="w-5 h-5 text-emerald-600 shrink-0" />
          )}
        </button>
      )}
      {geolocError && (
        <div
          className="absolute top-[calc(0.75rem+44px+6px)] right-3 z-[999] max-w-[220px] px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs shadow sm:top-[calc(5rem+44px+6px)]"
          role="alert"
        >
          {geolocError === 'localisation_refusée'
            ? 'Activez la localisation dans les paramètres du navigateur pour utiliser « Ma position ».'
            : 'Position indisponible. Vérifiez que la localisation est activée.'}
        </div>
      )}
      <Map
        ref={mapRef}
        mapLib={maplibregl as any}
        mapStyle={styleUrl}
        initialViewState={initialViewState}
        onLoad={onMapLoad}
        onClick={onMapClick}
        onMouseMove={onMouseMove}
        onZoom={handleMoveEnd}
        onMoveEnd={handleMoveEnd}
        interactiveLayerIds={[LAYER_CLUSTERS, LAYER_CLUSTER_COUNT, LAYER_POINT_BG, LAYER_POINT_LABEL]}
        attributionControl={{}}
        reuseMaps
      >
        <Source
          id={SOURCE_ID}
          type="geojson"
          data={geojson as any}
          cluster
          clusterRadius={50}
          clusterMaxZoom={14}
          clusterProperties={{
            sum_price: ['+', ['get', 'price']]
          }}
        >
          <Layer {...clusterLayer} />
          <Layer {...clusterCountLayer} />
          <Layer {...pointBgLayer} />
          <Layer {...pointLabelLayer} />
        </Source>

        {popup && (
          <Popup
            longitude={popup.lng}
            latitude={popup.lat}
            anchor="bottom"
            closeOnClick={false}
            onClose={closePopup}
            maxWidth="320px"
            closeButton={true}
            className="map-popup"
            style={{
              zIndex: 1000
            }}
          >
            <div
              onClick={(e) => {
                e.stopPropagation();
                safePush(router, `/parking/${popup.placeId}/`);
              }}
              style={{
                display: 'block',
                textDecoration: 'none',
                color: 'inherit',
                cursor: 'pointer'
              }}
            >
              <div style={{
                minWidth: 280,
                padding: 0,
                borderRadius: '12px',
                overflow: 'hidden',
                backgroundColor: 'white',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
              }}>
                <div style={{
                  display: 'flex',
                  gap: 12,
                  padding: 12
                }}>
                  {/* Contenu texte */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontWeight: 700,
                      fontSize: 14,
                      marginBottom: 6,
                      lineHeight: 1.4,
                      color: '#1e293b',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical'
                    }}>
                      {popup.title}
                    </div>
                    <div style={{
                      fontSize: 12,
                      color: '#64748b',
                      marginBottom: 8,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {popup.address}
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 12,
                      alignItems: 'center'
                    }}>
                      <div style={{
                        fontWeight: 800,
                        fontSize: 15,
                        color: '#10b981'
                      }}>
                        €{popup.price}/j
                      </div>
                      <div style={{
                        fontSize: 11,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        backgroundColor: popup.status === 'available' ? '#d1fae5' : '#fee2e2',
                        color: popup.status === 'available' ? '#065f46' : '#991b1b'
                      }}>
                        {statusLabel(popup.status)}
                      </div>
                    </div>
                  </div>

                  {/* Photo à droite */}
                  {popup.image && (
                    <div style={{
                      width: 80,
                      height: 80,
                      borderRadius: '8px',
                      overflow: 'hidden',
                      flexShrink: 0,
                      backgroundColor: '#f1f5f9'
                    }}>
                      <img
                        src={popup.image}
                        alt={popup.title}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
});

PropertiesMapMapLibre.displayName = 'PropertiesMapMapLibre';

export default PropertiesMapMapLibre;

/**
 * Translate status to UI label.
 */
function statusLabel(status: Property['status']): string {
  switch (status) {
    case 'available':
      return 'Disponible';
    case 'reserved':
      return 'Réservé';
    case 'unavailable':
      return 'Indisponible';
    default:
      return 'Disponible';
  }
}

// Cluster circles
const clusterLayer: any = {
  id: LAYER_CLUSTERS,
  type: 'circle',
  source: SOURCE_ID,
  filter: ['has', 'point_count'],
  paint: {
    'circle-color': '#10b981',
    'circle-radius': ['step', ['get', 'point_count'], 20, 50, 25, 200, 30],
    'circle-opacity': 0.85,
    'circle-stroke-width': 2,
    'circle-stroke-color': '#ffffff'
  }
};

// Cluster count label - Afficher le prix moyen au lieu du nombre
const clusterCountLayer: any = {
  id: LAYER_CLUSTER_COUNT,
  type: 'symbol',
  source: SOURCE_ID,
  filter: ['has', 'point_count'],
  layout: {
    'text-field': [
      'concat',
      '€',
      ['to-string', [
        'round',
        ['/', ['get', 'sum_price'], ['get', 'point_count']]
      ]]
    ],
    'text-size': 11,
    'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold']
  },
  paint: {
    'text-color': '#ffffff'
  }
};

// Price pin background circle
const pointBgLayer: any = {
  id: LAYER_POINT_BG,
  type: 'circle',
  source: SOURCE_ID,
  filter: ['!', ['has', 'point_count']],
  paint: {
    'circle-color': [
      'case',
      ['boolean', ['feature-state', 'selected'], false],
      '#059669',
      ['boolean', ['feature-state', 'hover'], false],
      '#10b981',
      '#10b981'
    ],
    'circle-radius': [
      'case',
      ['boolean', ['feature-state', 'selected'], false],
      20,
      ['boolean', ['feature-state', 'hover'], false],
      18,
      16
    ],
    'circle-opacity': 0.95,
    'circle-stroke-width': [
      'case',
      ['boolean', ['feature-state', 'selected'], false],
      3,
      ['boolean', ['feature-state', 'hover'], false],
      2,
      1
    ],
    'circle-stroke-color': '#ffffff'
  }
};

// Price label on top of bubble
const pointLabelLayer: any = {
  id: LAYER_POINT_LABEL,
  type: 'symbol',
  source: SOURCE_ID,
  filter: ['!', ['has', 'point_count']],
  layout: {
    'text-field': ['concat', '€', ['to-string', ['get', 'price']]],
    'text-size': 11,
    'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
    'text-offset': [0, 0],
    'text-anchor': 'center'
  },
  paint: {
    'text-color': '#ffffff'
  }
};
