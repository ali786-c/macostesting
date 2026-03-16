'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
// import Map, { Layer, Popup, Source, MapRef, MapLayerMouseEvent } from 'react-map-gl';
// import 'mapbox-gl/dist/mapbox-gl.css';

// Types temporaires pour éviter les erreurs de build (fichier non utilisé)
type MapRef = any;
type MapLayerMouseEvent = any;
const Map: any = ({ children, ...props }: any) => <div>{children}</div>;
const Layer: any = (props: any) => null;
const Popup: any = (props: any) => null;
const Source: any = ({ children, ...props }: any) => <>{children}</>;

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

/**
 * Mapbox-based properties map with clustering and popup.
 */
export default function PropertiesMapMapbox({
  properties,
  selectedPropertyId,
  onPropertyClick,
  onPropertyHover
}: PropertiesMapProps) {
  const mapRef = useRef<MapRef | null>(null);
  const [hoveredPropertyId, setHoveredPropertyId] = useState<number | null>(null);

  const [popup, setPopup] = useState<{
    id: number;
    lng: number;
    lat: number;
    title: string;
    address: string;
    price: number;
    status: Property['status'];
  } | null>(null);

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  const geojson = useMemo(() => {
    console.debug('[MAPBOX] geojson build - count=', properties?.length ?? 0);

    return {
      type: 'FeatureCollection' as const,
      features: (properties || []).map((p) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [p.lng, p.lat]
        },
        properties: {
          id: p.id,
          title: p.title,
          address: p.address,
          price: p.price,
          status: p.status,
          selected: selectedPropertyId === p.id ? 1 : 0,
          hovered: hoveredPropertyId === p.id ? 1 : 0
        }
      }))
    };
  }, [properties, selectedPropertyId, hoveredPropertyId]);

  const onMapLoad = useCallback(() => {
    console.debug('[MAPBOX] map loaded');
  }, []);

  /**
   * Handle click on map: expand cluster or show popup for point.
   */
  const onMapClick = useCallback(
    async (e: MapLayerMouseEvent) => {
      console.debug('[MAPBOX] map click - lngLat=', e.lngLat);

      const map = mapRef.current?.getMap();
      if (!map) return;

      const features = map.queryRenderedFeatures(e.point, {
        layers: ['clusters', 'unclustered-point']
      });

      if (!features?.length) {
        setPopup(null);
        return;
      }

      const feature = features[0];

      // Cluster clicked
      if (feature.layer.id === 'clusters') {
        const clusterId = feature.properties?.cluster_id;
        const source = map.getSource('properties') as any;

        console.debug('[MAPBOX] cluster click - clusterId=', clusterId);

        source.getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
          if (err) {
            console.debug('[MAPBOX] getClusterExpansionZoom error', err);
            return;
          }
          const [lng, lat] = (feature.geometry as any).coordinates;
          map.easeTo({ center: [lng, lat], zoom, duration: 350 });
        });

        return;
      }

      // Point clicked
      if (feature.layer.id === 'unclustered-point') {
        const id = Number(feature.properties?.id);
        const [lng, lat] = (feature.geometry as any).coordinates;

        console.debug('[MAPBOX] point click - id=', id);

        onPropertyClick?.(id);

        setPopup({
          id,
          lng,
          lat,
          title: String(feature.properties?.title ?? ''),
          address: String(feature.properties?.address ?? ''),
          price: Number(feature.properties?.price ?? 0),
          status: String(feature.properties?.status ?? 'available') as Property['status']
        });
      }
    },
    [onPropertyClick]
  );

  /**
   * Handle hover on points to highlight and sync with list.
   */
  const onMouseMove = useCallback(
    (e: MapLayerMouseEvent) => {
      const map = mapRef.current?.getMap();
      if (!map) return;

      const features = map.queryRenderedFeatures(e.point, {
        layers: ['unclustered-point']
      });

      if (features?.length) {
        const id = Number(features[0].properties?.id);
        map.getCanvas().style.cursor = 'pointer';
        if (hoveredPropertyId !== id) {
          setHoveredPropertyId(id);
          onPropertyHover?.(id);
        }
        return;
      }

      if (hoveredPropertyId !== null) {
        map.getCanvas().style.cursor = '';
        setHoveredPropertyId(null);
        onPropertyHover?.(null);
      }
    },
    [onPropertyHover, hoveredPropertyId]
  );

  const initialViewState = useMemo(() => {
    if (!properties?.length) {
      return { latitude: 48.8566, longitude: 2.3522, zoom: 5.8 };
    }
    const avgLat = properties.reduce((s, p) => s + p.lat, 0) / properties.length;
    const avgLng = properties.reduce((s, p) => s + p.lng, 0) / properties.length;
    return { latitude: avgLat, longitude: avgLng, zoom: 6.2 };
  }, [properties]);

  // Update popup when selectedPropertyId changes
  useEffect(() => {
    if (selectedPropertyId) {
      const property = properties.find(p => p.id === selectedPropertyId);
      if (property) {
        setPopup({
          id: property.id,
          lng: property.lng,
          lat: property.lat,
          title: property.title,
          address: property.address,
          price: property.price,
          status: property.status
        });
      }
    } else if (!selectedPropertyId && popup) {
      setPopup(null);
    }
  }, [selectedPropertyId, properties]);

  if (!token) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-slate-100 text-slate-600">
        <div className="text-center">
          <p className="text-sm font-medium">Missing NEXT_PUBLIC_MAPBOX_TOKEN</p>
          <p className="text-xs mt-2 opacity-75">Please configure your Mapbox token in .env.local</p>
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
    <div className="h-full w-full relative">
      <Map
        ref={mapRef}
        mapboxAccessToken={token}
        initialViewState={initialViewState}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        onLoad={onMapLoad}
        onClick={onMapClick}
        onMouseMove={onMouseMove}
        interactiveLayerIds={['clusters', 'unclustered-point']}
        attributionControl
        reuseMaps
      >
        <Source
          id="properties"
          type="geojson"
          data={geojson as any}
          cluster
          clusterRadius={50}
          clusterMaxZoom={14}
        >
          <Layer {...clusterLayer} />
          <Layer {...clusterCountLayer} />
          <Layer {...unclusteredPointLayer} />
          <Layer {...priceLabelLayer} />
        </Source>

        {popup && (
          <Popup
            longitude={popup.lng}
            latitude={popup.lat}
            anchor="bottom"
            closeOnClick={false}
            onClose={() => {
              console.debug('[MAPBOX] popup close - id=', popup.id);
              setPopup(null);
            }}
          >
            <div style={{ minWidth: 220, padding: '4px' }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, lineHeight: 1.4 }}>
                {popup.title}
              </div>
              <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 8 }}>
                {popup.address}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: '#10b981' }}>€{popup.price}/j</div>
                <div style={{ fontSize: 12, opacity: 0.75 }}>{statusLabel(popup.status)}</div>
              </div>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}

/**
 * Translate status to a UI label.
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
  id: 'clusters',
  type: 'circle',
  source: 'properties',
  filter: ['has', 'point_count'],
  paint: {
    'circle-color': '#10b981',
    'circle-radius': ['step', ['get', 'point_count'], 20, 50, 25, 200, 30],
    'circle-opacity': 0.85,
    'circle-stroke-width': 2,
    'circle-stroke-color': '#ffffff'
  }
};

// Cluster count label
const clusterCountLayer: any = {
  id: 'cluster-count',
  type: 'symbol',
  source: 'properties',
  filter: ['has', 'point_count'],
  layout: {
    'text-field': '{point_count_abbreviated}',
    'text-size': 12,
    'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold']
  },
  paint: {
    'text-color': '#ffffff'
  }
};

// Point bubble background
const unclusteredPointLayer: any = {
  id: 'unclustered-point',
  type: 'circle',
  source: 'properties',
  filter: ['!', ['has', 'point_count']],
  paint: {
    'circle-color': [
      'case',
      ['==', ['get', 'selected'], 1],
      '#059669',
      ['==', ['get', 'hovered'], 1],
      '#10b981',
      '#10b981'
    ],
    'circle-radius': [
      'case',
      ['==', ['get', 'selected'], 1],
      20,
      ['==', ['get', 'hovered'], 1],
      18,
      16
    ],
    'circle-opacity': 0.95,
    'circle-stroke-width': [
      'case',
      ['==', ['get', 'selected'], 1],
      3,
      ['==', ['get', 'hovered'], 1],
      2,
      1
    ],
    'circle-stroke-color': '#ffffff'
  }
};

// Price label on top of bubble
const priceLabelLayer: any = {
  id: 'price-label',
  type: 'symbol',
  source: 'properties',
  filter: ['!', ['has', 'point_count']],
  layout: {
    'text-field': ['concat', '€', ['to-string', ['get', 'price']]],
    'text-size': 11,
    'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold']
  },
  paint: {
    'text-color': '#ffffff'
  }
};
