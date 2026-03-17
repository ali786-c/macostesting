'use client';

import React, { useEffect, useRef, useState } from 'react';
import Map, { MapRef, NavigationControl } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { locationsAPI, LocationSearchResult } from '@/services/api';

interface LocationSearchWithMapProps {
  onCitySelect?: (city: LocationSearchResult) => void;
  initialCity?: string;
  mapHeight?: number;
  mapWidth?: number;
  showMarker?: boolean;
}

/**
 * Fonction réutilisable pour zoomer sur une ville
 */
function flyToCity(map: maplibregl.Map, { latitude, longitude }: { latitude: number; longitude: number }) {
  console.log('🗺️ [MAP] ========================================');
  console.log('🗺️ [MAP] ⚡⚡⚡ flyToCity APPELÉ ⚡⚡⚡');
  console.log('🗺️ [MAP] Coordonnées reçues:', { latitude, longitude });
  console.log('🗺️ [MAP] Centre calculé:', [longitude, latitude]);
  console.log('🗺️ [MAP] État actuel de la carte:');
  console.log('🗺️ [MAP] - Center actuel:', map.getCenter());
  console.log('🗺️ [MAP] - Zoom actuel:', map.getZoom());
  console.log('🗺️ [MAP] - Bounds actuel:', map.getBounds());
  console.log('🗺️ [MAP] ========================================');

  try {
    map.flyTo({
      center: [longitude, latitude], // MapLibre = [lng, lat]
      zoom: 13, // zoom pour une ville
      duration: 1200,
      essential: true,
    });

    console.log('✅ [MAP] flyTo appelé avec succès');
    console.log('✅ [MAP] La carte devrait maintenant zoomer sur:', { latitude, longitude });

    // Vérifier après un court délai
    setTimeout(() => {
      console.log('🗺️ [MAP] État de la carte après flyTo:');
      console.log('🗺️ [MAP] - Center:', map.getCenter());
      console.log('🗺️ [MAP] - Zoom:', map.getZoom());
    }, 100);
  } catch (error) {
    console.error('❌ [MAP] Erreur lors de l\'appel à flyTo:', error);
  }
}

/**
 * Fonction pour afficher/mettre à jour un marker sur la carte
 */
function setCityMarker(
  map: maplibregl.Map,
  markerRef: React.MutableRefObject<maplibregl.Marker | null>,
  { latitude, longitude }: { latitude: number; longitude: number }
) {
  console.log('📍 [MARKER] ========================================');
  console.log('📍 [MARKER] ⚡⚡⚡ setCityMarker APPELÉ ⚡⚡⚡');
  console.log('📍 [MARKER] Coordonnées:', { latitude, longitude });
  console.log('📍 [MARKER] Marker précédent existe?', markerRef.current !== null);

  if (markerRef.current) {
    console.log('📍 [MARKER] Suppression du marker précédent');
    markerRef.current.remove();
  }

  try {
    markerRef.current = new maplibregl.Marker()
      .setLngLat([longitude, latitude])
      .addTo(map);
    console.log('✅ [MARKER] Nouveau marker ajouté avec succès à:', [longitude, latitude]);
  } catch (error) {
    console.error('❌ [MARKER] Erreur lors de l\'ajout du marker:', error);
  }
  console.log('📍 [MARKER] ========================================');
}

/**
 * Composant de recherche de villes avec carte interactive
 */
export default function LocationSearchWithMap({
  onCitySelect,
  initialCity = '',
  mapHeight = 450,
  mapWidth = 700,
  showMarker = true,
}: LocationSearchWithMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapRef | null>(null);
  const cityMarkerRef = useRef<maplibregl.Marker | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  const [query, setQuery] = useState(initialCity);
  const [results, setResults] = useState<LocationSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Initialisation de la carte
  useEffect(() => {
    // La carte sera initialisée par le composant Map de react-map-gl
    return () => {
      // Nettoyage du marker si nécessaire
      if (cityMarkerRef.current) {
        cityMarkerRef.current.remove();
        cityMarkerRef.current = null;
      }
    };
  }, []);

  // Recherche avec debounce
  useEffect(() => {
    if (!query || query.length < 3) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);

    const timeoutId = setTimeout(async () => {
      try {
        const data = await locationsAPI.searchCities(query);
        if (!controller.signal.aborted) {
          setResults(data);
          setIsLoading(false);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('Erreur lors de la recherche de villes:', error);
          setResults([]);
          setIsLoading(false);
        }
      }
    }, 250);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
      setIsLoading(false);
    };
  }, [query]);

  // Handler de sélection de ville
  const onSelectCity = (city: LocationSearchResult) => {
    console.log('🏙️ [CITY SELECT] ========================================');
    console.log('🏙️ [CITY SELECT] ⚡⚡⚡ CLIC SUR UNE VILLE ⚡⚡⚡');
    console.log('🏙️ [CITY SELECT] Ville sélectionnée:', {
      cityName: city.cityName,
      postalCode: city.postalCode,
      id: city.id,
      fullCity: city
    });
    console.log('🏙️ [CITY SELECT] ========================================');

    // 1) Mettre la valeur dans le champ (comme Airbnb)
    const displayText = `${city.cityName} (${city.postalCode})`;
    console.log('🏙️ [CITY SELECT] Mise à jour du champ input avec:', displayText);
    setQuery(displayText);
    setResults([]);
    console.log('🏙️ [CITY SELECT] Dropdown fermée');

    // 2) Vérifier que latitude/longitude sont disponibles
    const latitude = city.latitude ?? city.lat;
    const longitude = city.longitude ?? city.lng;

    console.log('🏙️ [CITY SELECT] Extraction des coordonnées:');
    console.log('🏙️ [CITY SELECT] - city.latitude:', city.latitude);
    console.log('🏙️ [CITY SELECT] - city.lat:', city.lat);
    console.log('🏙️ [CITY SELECT] - city.longitude:', city.longitude);
    console.log('🏙️ [CITY SELECT] - city.lng:', city.lng);
    console.log('🏙️ [CITY SELECT] - latitude finale:', latitude);
    console.log('🏙️ [CITY SELECT] - longitude finale:', longitude);

    if (latitude == null || longitude == null) {
      console.warn('⚠️ [CITY SELECT] Coordonnées manquantes pour la ville sélectionnée:', city);
      console.warn('⚠️ [CITY SELECT] Impossible de zoomer sur la carte');
      return;
    }

    // 3) Zoomer sur la carte
    console.log('🗺️ [CITY SELECT] Récupération de l\'instance de la carte...');
    console.log('🗺️ [CITY SELECT] - isMapLoaded:', isMapLoaded);
    console.log('🗺️ [CITY SELECT] - mapRef.current existe?', mapRef.current !== null);

    const map = mapRef.current?.getMap();
    console.log('🗺️ [CITY SELECT] - map existe?', map !== null && map !== undefined);

    if (!map) {
      console.error('❌ [CITY SELECT] La carte n\'est pas encore initialisée');
      console.error('❌ [CITY SELECT] mapRef.current:', mapRef.current);
      console.error('❌ [CITY SELECT] isMapLoaded:', isMapLoaded);
      console.error('❌ [CITY SELECT] Impossible de zoomer - la carte n\'est pas prête');
      console.error('❌ [CITY SELECT] Attendez que la carte soit chargée avant de sélectionner une ville');
      return;
    }

    if (!isMapLoaded) {
      console.warn('⚠️ [CITY SELECT] La carte n\'est pas encore chargée (isMapLoaded = false)');
      console.warn('⚠️ [CITY SELECT] Tentative de zoom quand même...');
    }

    console.log('✅ [CITY SELECT] Carte trouvée, appel de flyToCity...');
    console.log('✅ [CITY SELECT] Coordonnées à utiliser:', { latitude, longitude });
    flyToCity(map, { latitude, longitude });

    // 4) Marker optionnel
    if (showMarker) {
      console.log('📍 [CITY SELECT] Ajout du marker (showMarker = true)');
      setCityMarker(map, cityMarkerRef, { latitude, longitude });
    } else {
      console.log('📍 [CITY SELECT] Marker désactivé (showMarker = false)');
    }

    // 5) Callback optionnel
    if (onCitySelect) {
      console.log('🔄 [CITY SELECT] Appel du callback onCitySelect');
      onCitySelect(city);
    }

    console.log('🏙️ [CITY SELECT] ========================================');
  };

  // Configuration de la carte MapTiler/MapLibre
  const mapTilerKey = process.env.NEXT_PUBLIC_MAPTILER_KEY || process.env.VITE_MAPTILER_KEY;
  const styleUrl = process.env.NEXT_PUBLIC_MAP_STYLE_URL ||
    (mapTilerKey
      ? `https://api.maptiler.com/maps/streets-v2/style.json?key=${mapTilerKey}`
      : 'https://api.maptiler.com/maps/streets-v2/style.json?key=get_your_own_key');

  return (
    <div className="flex gap-4 flex-col md:flex-row">
      {/* Champ de recherche avec dropdown */}
      <div className="relative flex-1">
        <input
          className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tape une ville…"
        />

        {/* Dropdown des résultats */}
        {results.length > 0 && (
          <div className="absolute z-10 mt-1 w-full rounded border bg-white shadow-lg max-h-60 overflow-y-auto">
            {results.map((r) => {
              const lat = r.latitude ?? r.lat;
              const lng = r.longitude ?? r.lng;
              const hasCoordinates = lat != null && lng != null;

              return (
                <button
                  key={`${r.postalCode}-${r.cityName}-${r.id}`}
                  className={`block w-full text-left px-3 py-2 hover:bg-gray-100 transition-colors ${!hasCoordinates ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  onClick={() => {
                    console.log('🖱️ [CLICK] ========================================');
                    console.log('🖱️ [CLICK] Clic sur le bouton ville:', r.cityName);
                    console.log('🖱️ [CLICK] Coordonnées disponibles?', hasCoordinates);
                    console.log('🖱️ [CLICK] Ville complète:', r);
                    if (hasCoordinates) {
                      console.log('🖱️ [CLICK] Appel de onSelectCity...');
                      onSelectCity(r);
                    } else {
                      console.warn('⚠️ [CLICK] Clic ignoré - coordonnées non disponibles');
                    }
                    console.log('🖱️ [CLICK] ========================================');
                  }}
                  type="button"
                  disabled={!hasCoordinates}
                  title={!hasCoordinates ? 'Coordonnées non disponibles' : ''}
                >
                  <div className="font-medium">{r.cityName}</div>
                  <div className="text-sm text-gray-500">{r.postalCode}</div>
                </button>
              );
            })}
          </div>
        )}

        {/* Indicateur de chargement */}
        {isLoading && query.length >= 3 && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
          </div>
        )}
      </div>

      {/* Carte */}
      <div ref={mapContainerRef} style={{ width: mapWidth, height: mapHeight }} className="rounded-lg overflow-hidden border">
        {!styleUrl ? (
          <div className="h-full w-full flex items-center justify-center bg-slate-100 text-slate-600">
            <div className="text-center">
              <p className="text-sm font-medium">Missing NEXT_PUBLIC_MAP_STYLE_URL</p>
              <p className="text-xs mt-2 opacity-75">Please configure your MapTiler style URL in .env.local</p>
            </div>
          </div>
        ) : (
          <Map
            ref={mapRef}
            mapLib={maplibregl as any}
            mapStyle={styleUrl}
            initialViewState={{
              longitude: 2.3522, // Paris par défaut
              latitude: 48.8566,
              zoom: 5,
            }}
            onLoad={() => {
              console.log('🗺️ [MAP] ========================================');
              console.log('🗺️ [MAP] ✅✅✅ CARTE CHARGÉE ✅✅✅');
              console.log('🗺️ [MAP] mapRef.current:', mapRef.current);
              setIsMapLoaded(true);
              if (mapRef.current) {
                const map = mapRef.current.getMap();
                console.log('🗺️ [MAP] Instance de la carte:', map);
                console.log('🗺️ [MAP] Center initial:', map.getCenter());
                console.log('🗺️ [MAP] Zoom initial:', map.getZoom());
                console.log('🗺️ [MAP] La carte est maintenant prête pour les interactions');
              }
              console.log('🗺️ [MAP] ========================================');
            }}
            onError={(error) => {
              console.error('❌ [MAP] Erreur lors du chargement de la carte:', error);
            }}
            attributionControl={{}}
            reuseMaps
          >
            <NavigationControl position="top-right" />
          </Map>
        )}
      </div>
    </div>
  );
}
