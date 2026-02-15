"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

import {
  DOCTRINAL_REGIONS,
  DEFAULT_MAP_CENTER,
  type DoctrinalRegion,
  type SubRegion,
  type GeoCoordinates,
} from "@/app/(app)/identity/create/_core/geography";

// Mapbox access token — set NEXT_PUBLIC_MAPBOX_TOKEN in .env.local
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

mapboxgl.accessToken = MAPBOX_TOKEN;

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface GeoMapProps {
  className?: string;
  initialCenter?: GeoCoordinates;
  initialZoom?: number;
  showRegionLayers?: boolean;
  showSubRegions?: boolean;
  interactive?: boolean;
  onRegionClick?: (region: DoctrinalRegion) => void;
  onSubRegionClick?: (subRegion: SubRegion, parentRegion: DoctrinalRegion) => void;
  onLocationSelect?: (coords: GeoCoordinates, placeName?: string) => void;
  selectedRegionId?: string;
  selectedSubRegionId?: string;
  selectionMode?: "Region" | "point" | "none";
  height?: string;
}

interface RegionGeoJSON {
  type: "Feature";
  properties: {
    id: string;
    name: string;
    nameRu: string;
    status: string;
    color: string;
  };
  geometry: {
    type: "Polygon";
    coordinates: number[][][];
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GENERATION GEOJSON ИЗ BOUNDS (упрощённые прямоугольники)
// Replace with real data in production GeoJSON borders regions
// ─────────────────────────────────────────────────────────────────────────────

function boundsToPolygon(bounds: {
  north: number;
  south: number;
  east: number;
  west: number;
}): number[][] {
  return [
    [bounds.west, bounds.south],
    [bounds.east, bounds.south],
    [bounds.east, bounds.north],
    [bounds.west, bounds.north],
    [bounds.west, bounds.south], // close the polygon
  ];
}

function regionToGeoJSON(region: DoctrinalRegion): RegionGeoJSON {
  return {
    type: "Feature",
    properties: {
      id: region.id,
      name: region.name,
      nameRu: region.nameRu,
      status: region.status,
      color: region.color,
    },
    geometry: {
      type: "Polygon",
      coordinates: [boundsToPolygon(region.bounds)],
    },
  };
}

function subRegionToGeoJSON(
  subRegion: SubRegion,
  parentColor: string
): RegionGeoJSON {
  return {
    type: "Feature",
    properties: {
      id: subRegion.id,
      name: subRegion.name,
      nameRu: subRegion.nameRu,
      status: "subRegion",
      color: parentColor,
    },
    geometry: {
      type: "Polygon",
      coordinates: [boundsToPolygon(subRegion.bounds)],
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function GeoMap({
  className = "",
  initialCenter = DEFAULT_MAP_CENTER,
  initialZoom = 3,
  showRegionLayers = true,
  showSubRegions = false,
  interactive = true,
  onRegionClick,
  onSubRegionClick,
  onLocationSelect,
  selectedRegionId,
  selectedSubRegionId,
  selectionMode = "none",
  height = "500px",
}: GeoMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);

  // Инициализация карты
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      // Исgenderьзуем тёмный стиль for соresponseствия дизайну
      style: "mapbox://styles/mapbox/dark-v11",
      center: [initialCenter.lng, initialCenter.lat],
      zoom: initialZoom,
      interactive,
      attributionControl: false,
    });

    map.current.addControl(
      new mapboxgl.NavigationControl({ showCompass: true }),
      "top-right"
    );

    map.current.addControl(
      new mapboxgl.AttributionControl({ compact: true }),
      "bottom-right"
    );

    map.current.on("load", () => {
      setMapLoaded(true);
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [initialCenter.lat, initialCenter.lng, initialZoom, interactive]);

  // Добавление слоёin regions
  useEffect(() => {
    if (!map.current || !mapLoaded || !showRegionLayers) return;

    const mapInstance = map.current;

    // Создаём GeoJSON for all regions
    const regionsGeoJSON: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: DOCTRINAL_REGIONS.map(regionToGeoJSON) as GeoJSON.Feature[],
    };

    // Adding source данных
    if (!mapInstance.getSource("regions")) {
      mapInstance.addSource("regions", {
        type: "geojson",
        data: regionsGeoJSON,
      });

      // Слой заливки regions
      mapInstance.addLayer({
        id: "regions-fill",
        type: "fill",
        source: "regions",
        paint: {
          "fill-color": ["get", "color"],
          "fill-opacity": [
            "case",
            ["==", ["get", "id"], selectedRegionId || ""],
            0.5,
            ["==", ["get", "id"], hoveredRegion || ""],
            0.35,
            0.2,
          ],
        },
      });

      // Слой границ regions
      mapInstance.addLayer({
        id: "regions-border",
        type: "line",
        source: "regions",
        paint: {
          "line-color": ["get", "color"],
          "line-width": [
            "case",
            ["==", ["get", "id"], selectedRegionId || ""],
            3,
            1.5,
          ],
          "line-opacity": 0.8,
        },
      });

      // Слой названий regions
      mapInstance.addLayer({
        id: "regions-labels",
        type: "symbol",
        source: "regions",
        layout: {
          "text-field": ["get", "nameRu"],
          "text-size": 14,
          "text-anchor": "center",
          "text-allow-overlap": false,
        },
        paint: {
          "text-color": "#ffffff",
          "text-halo-color": "#000000",
          "text-halo-width": 1.5,
        },
      });
    }

    // Handlers событий for regions
    mapInstance.on("mouseenter", "regions-fill", () => {
      mapInstance.getCanvas().style.cursor = "pointer";
    });

    mapInstance.on("mouseleave", "regions-fill", () => {
      mapInstance.getCanvas().style.cursor = "";
      setHoveredRegion(null);
    });

    mapInstance.on("mousemove", "regions-fill", (e) => {
      if (e.features && e.features[0]) {
        const id = e.features[0].properties?.id;
        if (id !== hoveredRegion) {
          setHoveredRegion(id);
        }
      }
    });

    mapInstance.on("click", "regions-fill", (e) => {
      if (e.features && e.features[0] && onRegionClick) {
        const id = e.features[0].properties?.id;
        const region = DOCTRINAL_REGIONS.find((r) => r.id === id);
        if (region) {
          onRegionClick(region);
        }
      }
    });
  }, [mapLoaded, showRegionLayers, selectedRegionId, hoveredRegion, onRegionClick]);

  // Добавление подregions Сибири
  useEffect(() => {
    if (!map.current || !mapLoaded || !showSubRegions) return;

    const mapInstance = map.current;
    const siberia = DOCTRINAL_REGIONS.find((r) => r.id === "siberia");

    if (!siberia?.subRegions) return;

    const subRegionsGeoJSON: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: siberia.subRegions.map((sr) =>
        subRegionToGeoJSON(sr, siberia.color)
      ) as GeoJSON.Feature[],
    };

    if (!mapInstance.getSource("subregions")) {
      mapInstance.addSource("subregions", {
        type: "geojson",
        data: subRegionsGeoJSON,
      });

      mapInstance.addLayer({
        id: "subregions-fill",
        type: "fill",
        source: "subregions",
        paint: {
          "fill-color": ["get", "color"],
          "fill-opacity": [
            "case",
            ["==", ["get", "id"], selectedSubRegionId || ""],
            0.6,
            0.15,
          ],
        },
      });

      mapInstance.addLayer({
        id: "subregions-border",
        type: "line",
        source: "subregions",
        paint: {
          "line-color": ["get", "color"],
          "line-width": 1,
          "line-dasharray": [2, 2],
          "line-opacity": 0.6,
        },
      });

      mapInstance.addLayer({
        id: "subregions-labels",
        type: "symbol",
        source: "subregions",
        layout: {
          "text-field": ["get", "nameRu"],
          "text-size": 11,
          "text-anchor": "center",
        },
        paint: {
          "text-color": "#a1a1aa",
          "text-halo-color": "#000000",
          "text-halo-width": 1,
        },
        minzoom: 4,
      });

      // Клики по подthe region ofм
      mapInstance.on("click", "subregions-fill", (e) => {
        if (e.features && e.features[0] && onSubRegionClick) {
          const id = e.features[0].properties?.id;
          const subRegion = siberia.subRegions?.find((sr) => sr.id === id);
          if (subRegion) {
            onSubRegionClick(subRegion, siberia);
          }
        }
      });
    }
  }, [mapLoaded, showSubRegions, selectedSubRegionId, onSubRegionClick]);

  // Режим выбора тpoints на карте
  useEffect(() => {
    if (!map.current || !mapLoaded || selectionMode !== "point") return;

    const mapInstance = map.current;

    const handleClick = async (e: mapboxgl.MapMouseEvent) => {
      const coords: GeoCoordinates = {
        lat: e.lngLat.lat,
        lng: e.lngLat.lng,
      };

      // Удаляем previous маркер
      if (marker.current) {
        marker.current.remove();
      }

      // Adding new маркер
      marker.current = new mapboxgl.Marker({
        color: "#D4AF37", // gold
      })
        .setLngLat([coords.lng, coords.lat])
        .addTo(mapInstance);

      // Пытаемся genderучить название места через Mapbox Geocoding API
      let placeName: string | undefined;
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${coords.lng},${coords.lat}.json?access_token=${MAPBOX_TOKEN}&language=ru`
        );
        const data = await response.json();
        if (data.features && data.features.length > 0) {
          placeName = data.features[0].place_name;
        }
      } catch (error) {
        console.warn("Geocoding failed:", error);
      }

      if (onLocationSelect) {
        onLocationSelect(coords, placeName);
      }
    };

    mapInstance.on("click", handleClick);
    mapInstance.getCanvas().style.cursor = "crosshair";

    return () => {
      mapInstance.off("click", handleClick);
      mapInstance.getCanvas().style.cursor = "";
    };
  }, [mapLoaded, selectionMode, onLocationSelect]);

  // Обновление стилей при изменении выбранного the region of
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const mapInstance = map.current;

    if (mapInstance.getLayer("regions-fill")) {
      mapInstance.setPaintProperty("regions-fill", "fill-opacity", [
        "case",
        ["==", ["get", "id"], selectedRegionId || ""],
        0.5,
        ["==", ["get", "id"], hoveredRegion || ""],
        0.35,
        0.2,
      ]);

      mapInstance.setPaintProperty("regions-border", "line-width", [
        "case",
        ["==", ["get", "id"], selectedRegionId || ""],
        3,
        1.5,
      ]);
    }
  }, [mapLoaded, selectedRegionId, hoveredRegion]);

  // Перелёт к regionу
  const flyToRegion = useCallback(
    (regionId: string) => {
      if (!map.current || !mapLoaded) return;

      const region = DOCTRINAL_REGIONS.find((r) => r.id === regionId);
      if (!region) return;

      map.current.flyTo({
        center: [region.coordinates.lng, region.coordinates.lat],
        zoom: regionId === "siberia" ? 3 : 5,
        duration: 1500,
      });
    },
    [mapLoaded]
  );

  // Экdisputeтируем flyToRegion через ref if нужно
  useEffect(() => {
    if (selectedRegionId) {
      flyToRegion(selectedRegionId);
    }
  }, [selectedRegionId, flyToRegion]);

  return (
    <div className={`relative ${className}`} style={{ height }}>
      <div
        ref={mapContainer}
        className="absolute inset-0 rounded-xl overflow-hidden"
        style={{ height: "100%" }}
      />

      {/* Легенда */}
      {showRegionLayers && (
        <div className="absolute bottom-4 left-4 glass-panel rounded-lg p-3 text-xs space-y-1.5 max-w-[200px]">
          <div className="text-zinc-400 font-medium mb-2">Regionы responseственности</div>
          {DOCTRINAL_REGIONS.slice(0, 5).map((region) => (
            <div key={region.id} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: region.color, opacity: 0.6 }}
              />
              <span className="text-zinc-300">{region.nameRu}</span>
            </div>
          ))}
        </div>
      )}

      {/* Индикатор загрузки */}
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/80 rounded-xl">
          <div className="text-zinc-400">Loading map...</div>
        </div>
      )}
    </div>
  );
}

export default GeoMap;
