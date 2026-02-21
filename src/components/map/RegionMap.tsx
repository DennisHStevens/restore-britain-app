/**
 * RegionMap — the centrepiece interactive map component.
 *
 * Renders all 12 UK regions as coloured, tappable polygons on a plain
 * sea-coloured background using MapLibre GL JS. No tile provider needed —
 * just GeoJSON polygons on a flat canvas.
 *
 * Features:
 * - Distinct muted colour per region via a match expression
 * - Tap/click to select a region (highlight + floating label)
 * - Smooth pinch-to-zoom and pan with inertia (MapLibre native)
 * - Bounded to the UK area with sensible zoom limits
 * - Exposes selected region via onRegionSelect callback for Phase 1.5
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

import {
  REGION_COLOURS,
  REGION_COLOURS_HIGHLIGHT,
  REGION_CENTROIDS,
  REGION_NAMES,
} from './regionColours';

interface RegionMapProps {
  /** Called when a region is tapped/clicked. Phase 1.5 will use this to open the bottom sheet. */
  onRegionSelect?: (regionId: string, regionName: string) => void;
}

/** Sea colour — soft blue background behind the land polygons */
const SEA_COLOUR = '#dbe9f4';

/** White borders between regions */
const BORDER_COLOUR = '#ffffff';
const BORDER_WIDTH = 1.5;
const BORDER_WIDTH_HIGHLIGHT = 3;

const MIN_ZOOM = 4.5;
const MAX_ZOOM = 8;

/**
 * Bounding box of all UK regions — used for fitBounds on initial load
 * so the map frames the entire UK regardless of viewport dimensions.
 * Covers from SW tip of Cornwall/Scilly to N tip of mainland Scotland.
 * Shetland and Orkney islands have been removed from the GeoJSON to
 * prevent the map skewing too far north-east on mobile viewports.
 */
const UK_BOUNDS: maplibregl.LngLatBoundsLike = [
  [-8.2, 49.9],  // Southwest corner (SW England + NI)
  [1.8, 59.2],   // Northeast corner (N Scotland mainland)
];

/**
 * Bounding box to prevent panning away from the UK entirely.
 * Generous enough to not feel restrictive, tight enough to keep
 * the map anchored to Britain.
 */
const MAX_BOUNDS: maplibregl.LngLatBoundsLike = [
  [-12, 49], // Southwest corner
  [3, 60],   // Northeast corner (tightened after Shetland/Orkney removal)
];

/**
 * Build a MapLibre match expression for region fill colours.
 * Falls back to a neutral grey for any unrecognised feature IDs.
 */
function buildColourExpression(
  colours: Record<string, string>
): maplibregl.ExpressionSpecification {
  const entries: (string | maplibregl.ExpressionSpecification)[] = ['match', ['get', 'id']];
  for (const [id, colour] of Object.entries(colours)) {
    entries.push(id, colour);
  }
  entries.push('#cccccc'); // fallback
  return entries as unknown as maplibregl.ExpressionSpecification;
}

export function RegionMap({ onRegionSelect }: RegionMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [labelInfo, setLabelInfo] = useState<{
    name: string;
    x: number;
    y: number;
  } | null>(null);

  /**
   * Select a region programmatically — used by the tap handler.
   * Updates highlight state and positions the label.
   */
  const selectRegion = useCallback(
    (regionId: string) => {
      const map = mapRef.current;
      if (!map) return;

      const name = REGION_NAMES[regionId];
      if (!name) return;

      setSelectedRegion(regionId);

      /* Notify parent (for Phase 1.5 bottom sheet) */
      onRegionSelect?.(regionId, name);

      /* Position floating label at the region's centroid projected to screen coords */
      const centroid = REGION_CENTROIDS[regionId];
      if (centroid) {
        const point = map.project(centroid);
        setLabelInfo({ name, x: point.x, y: point.y });
      }
    },
    [onRegionSelect]
  );

  /** Initialise the MapLibre map instance */
  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      /**
       * Tile-free map style: just a background colour (the "sea") and our
       * GeoJSON source. No tile provider, no network requests for map tiles.
       * This is all we need for a regional overview map.
       */
      style: {
        version: 8,
        sources: {},
        layers: [
          {
            id: 'sea-background',
            type: 'background',
            paint: { 'background-color': SEA_COLOUR },
          },
        ],
      },
      /**
       * Initial position is overridden by fitBounds below, but we need
       * a centre/zoom to construct the map. These are reasonable defaults
       * that will be immediately replaced.
       */
      center: [-3.5, 54.5],
      zoom: 5,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
      maxBounds: MAX_BOUNDS,
      /* Disable rotation — it's confusing for a choropleth map */
      bearingSnap: 0,
      pitchWithRotate: false,
      dragRotate: false,
      touchPitch: false,
      /* Disable the default MapLibre attribution control — we'll give
       * credit to ONS in the docs and a minimal attribution instead */
      attributionControl: false,
    });

    /* Disable keyboard rotation shortcuts */
    map.keyboard.disableRotation();

    /**
     * Fit the map to show all UK regions on initial load.
     * This adapts to any viewport size — phone portrait, desktop landscape,
     * tablet, etc. — so all 12 regions are always visible on first render.
     * Padding gives breathing room around the edges.
     */
    map.fitBounds(UK_BOUNDS, {
      padding: { top: 20, bottom: 20, left: 20, right: 20 },
      animate: false,
    });

    map.on('load', () => {
      /* Add the merged GeoJSON as a source */
      map.addSource('regions', {
        type: 'geojson',
        data: '/data/uk-regions.geojson',
        /* promoteId tells MapLibre which property to use as the feature ID
         * for feature-state operations (hover, selection, etc.) */
        promoteId: 'id',
      });

      /**
       * Region fill layer — each region gets a distinct colour.
       *
       * Opacity is 1.0 (fully opaque) by design. The muted/pastel appearance
       * comes from pre-blended colours in regionColours.ts, NOT from alpha.
       *
       * WHY: With fill-opacity < 1.0, WebGL alpha-composites each triangle
       * from the earcut triangulation individually. Where triangles share
       * edges or overlap by sub-pixel amounts (GPU float rounding), alpha
       * is applied twice, creating visible darker seams — the "diagonal
       * line" artefact that plagued Scotland and Wales. Fully opaque fills
       * eliminate this entirely. The pre-blended colours are mathematically
       * equivalent to the original colours at 0.85 opacity over the sea
       * background, so the visual result is identical.
       *
       * fill-antialias is also disabled to prevent any residual edge
       * rendering on internal triangulation seams.
       */
      map.addLayer({
        id: 'region-fills',
        type: 'fill',
        source: 'regions',
        paint: {
          'fill-color': buildColourExpression(REGION_COLOURS),
          'fill-opacity': 1.0,
          'fill-antialias': false,
        },
      });

      /* Region border layer — white lines between regions */
      map.addLayer({
        id: 'region-borders',
        type: 'line',
        source: 'regions',
        paint: {
          'line-color': BORDER_COLOUR,
          'line-width': BORDER_WIDTH,
        },
      });

      /* Highlighted region fill — sits above the base fill, initially hidden.
       * Same opaque approach as the base layer — pre-blended colours at 1.0. */
      map.addLayer({
        id: 'region-highlight-fill',
        type: 'fill',
        source: 'regions',
        paint: {
          'fill-color': buildColourExpression(REGION_COLOURS_HIGHLIGHT),
          'fill-opacity': 1.0,
          'fill-antialias': false,
        },
        filter: ['==', ['get', 'id'], ''],
      });

      /* Highlighted region border — thicker, sits above the base borders */
      map.addLayer({
        id: 'region-highlight-border',
        type: 'line',
        source: 'regions',
        paint: {
          'line-color': BORDER_COLOUR,
          'line-width': BORDER_WIDTH_HIGHLIGHT,
        },
        filter: ['==', ['get', 'id'], ''],
      });

      /* Pointer cursor on hover over regions */
      map.on('mouseenter', 'region-fills', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'region-fills', () => {
        map.getCanvas().style.cursor = '';
      });

      /* Tap/click handler — select the clicked region */
      map.on('click', 'region-fills', (e) => {
        if (!e.features || e.features.length === 0) return;

        const feature = e.features[0];
        const regionId = feature.properties?.id as string;
        if (!regionId) return;

        selectRegion(regionId);
      });

      /* Clicking the sea (not a region) deselects */
      map.on('click', (e) => {
        const features = map.queryRenderedFeatures(e.point, {
          layers: ['region-fills'],
        });
        if (features.length === 0) {
          setSelectedRegion(null);
          setLabelInfo(null);
        }
      });
    });

    /* Update label position when the map moves (pan/zoom) */
    map.on('move', () => {
      setSelectedRegion((current) => {
        if (!current) return null;
        const centroid = REGION_CENTROIDS[current];
        if (centroid) {
          const point = map.project(centroid);
          setLabelInfo({
            name: REGION_NAMES[current],
            x: point.x,
            y: point.y,
          });
        }
        return current;
      });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // selectRegion is stable via useCallback, safe to include
  }, [selectRegion]);

  /**
   * When selectedRegion changes, update the highlight layer filters
   * to show/hide the highlight for the correct region.
   */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const filterId = selectedRegion || '';

    if (map.getLayer('region-highlight-fill')) {
      map.setFilter('region-highlight-fill', [
        '==',
        ['get', 'id'],
        filterId,
      ]);
    }
    if (map.getLayer('region-highlight-border')) {
      map.setFilter('region-highlight-border', [
        '==',
        ['get', 'id'],
        filterId,
      ]);
    }
  }, [selectedRegion]);

  return (
    <div className="region-map-container" ref={containerRef}>
      {/* Floating region name label */}
      {labelInfo && (
        <div
          className="region-label"
          style={{
            left: labelInfo.x,
            top: labelInfo.y,
          }}
        >
          {labelInfo.name}
        </div>
      )}

      {/* Minimal ONS data attribution */}
      <div className="map-attribution">
        Contains OS data &copy; Crown copyright
      </div>
    </div>
  );
}
