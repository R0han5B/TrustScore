'use client';

import 'leaflet/dist/leaflet.css';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Shop } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation, Route, LocateFixed } from 'lucide-react';

type Coordinates = {
  lat: number;
  lon: number;
};

type ShopWithLocation = Shop & {
  coordinates?: Coordinates | null;
  distanceKm?: number | null;
};

type ShopDiscoveryMapProps = {
  shops: ShopWithLocation[];
  selectedShopId?: string | null;
  onSelectShop: (shop: ShopWithLocation) => void;
  onUserLocationChange?: (location: Coordinates | null) => void;
  onDistancesChange?: (distances: Record<string, number>) => void;
  locateSignal?: number;
  title?: string;
  subtitle?: string;
  mapHeightClassName?: string;
  showLocateButton?: boolean;
  showSelectedShopCard?: boolean;
};

type LeafletModule = typeof import('leaflet');

function shopAddress(shop: Shop) {
  return `${shop.name}, ${shop.address}, ${shop.city}, ${shop.pincode || ''}, India`;
}

function distanceKm(a: Coordinates, b: Coordinates) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRadians(b.lat - a.lat);
  const dLon = toRadians(b.lon - a.lon);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const haversine =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

async function geocodeShop(shop: Shop): Promise<Coordinates | null> {
  if (typeof shop.latitude === 'number' && typeof shop.longitude === 'number') {
    return { lat: shop.latitude, lon: shop.longitude };
  }

  const cacheKey = `shop-geocode:${shop.id}`;
  const cached = typeof window !== 'undefined' ? window.localStorage.getItem(cacheKey) : null;
  if (cached) {
    return JSON.parse(cached) as Coordinates;
  }

  const query = new URLSearchParams({
    q: shopAddress(shop),
    city: shop.city,
  });

  const response = await fetch(`/api/maps/geocode?${query.toString()}`);

  if (!response.ok) {
    throw new Error('Failed to geocode shop');
  }

  const result = (await response.json()) as {
    success: boolean;
    coordinates: Coordinates | null;
  };

  if (!result.coordinates) {
    return null;
  }

  const coordinates = result.coordinates;

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(cacheKey, JSON.stringify(coordinates));
  }

  return coordinates;
}

function buildGoogleDirectionsUrl(shop: ShopWithLocation, userLocation?: Coordinates | null) {
  const destination = shop.coordinates
    ? `${shop.coordinates.lat},${shop.coordinates.lon}`
    : encodeURIComponent(`${shop.address}, ${shop.city}`);

  const origin = userLocation ? `&origin=${userLocation.lat},${userLocation.lon}` : '';
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}${origin}&travelmode=driving`;
}

export function ShopDiscoveryMap({
  shops,
  selectedShopId,
  onSelectShop,
  onUserLocationChange,
  onDistancesChange,
  locateSignal = 0,
  title = 'Nearby Shops Map',
  subtitle = 'Leaflet map with OpenStreetMap tiles and geocoding',
  mapHeightClassName = 'h-[320px] lg:h-[540px]',
  showLocateButton = true,
  showSelectedShopCard = true,
}: ShopDiscoveryMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import('leaflet').Map | null>(null);
  const leafletRef = useRef<LeafletModule | null>(null);
  const markerLayerRef = useRef<import('leaflet').LayerGroup | null>(null);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [locatedShops, setLocatedShops] = useState<Record<string, Coordinates | null>>({});
  const [isFindingMe, setIsFindingMe] = useState(false);
  const publishedDistancesRef = useRef<string>('');

  const enrichedShops = useMemo(
    () =>
      shops.map((shop) => {
        const databaseCoordinates =
          typeof shop.latitude === 'number' && typeof shop.longitude === 'number'
            ? { lat: shop.latitude, lon: shop.longitude }
            : null;
        const coordinates = locatedShops[shop.id] ?? shop.coordinates ?? databaseCoordinates ?? null;
        const distance = userLocation && coordinates ? distanceKm(userLocation, coordinates) : null;
        return { ...shop, coordinates, distanceKm: distance };
      }),
    [shops, locatedShops, userLocation]
  );

  useEffect(() => {
    onUserLocationChange?.(userLocation);
  }, [userLocation, onUserLocationChange]);

  useEffect(() => {
    if (!onDistancesChange) return;

    const distances = enrichedShops.reduce<Record<string, number>>((acc, shop) => {
      if (typeof shop.distanceKm === 'number') {
        acc[shop.id] = shop.distanceKm;
      }
      return acc;
    }, {});

    const serialized = JSON.stringify(distances);
    if (serialized !== publishedDistancesRef.current) {
      publishedDistancesRef.current = serialized;
      onDistancesChange(distances);
    }
  }, [enrichedShops, onDistancesChange]);

  useEffect(() => {
    let cancelled = false;
    const missingShops = shops.filter((shop) => {
      if (typeof shop.latitude === 'number' && typeof shop.longitude === 'number') {
        return locatedShops[shop.id] === undefined;
      }
      return locatedShops[shop.id] === undefined;
    });

    if (!missingShops.length) {
      return;
    }

    const populateCoordinates = async () => {
      for (const shop of missingShops) {
        try {
          const coordinates = await geocodeShop(shop);
          if (!cancelled) {
            setLocatedShops((current) => ({ ...current, [shop.id]: coordinates }));
          }
        } catch (error) {
          console.error(`Failed to geocode ${shop.name}:`, error);
          if (!cancelled) {
            setLocatedShops((current) => ({ ...current, [shop.id]: null }));
          }
        }
      }
    };

    populateCoordinates();

    return () => {
      cancelled = true;
    };
  }, [locatedShops, shops]);

  useEffect(() => {
    let mounted = true;

    const createMap = async () => {
      if (!mapContainerRef.current || mapRef.current) return;

      const L = await import('leaflet');
      if (!mounted || !mapContainerRef.current) return;

      leafletRef.current = L;
      mapRef.current = L.map(mapContainerRef.current, {
        zoomControl: false,
        scrollWheelZoom: true,
      }).setView([19.076, 72.8777], 11);

      L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(mapRef.current);

      markerLayerRef.current = L.layerGroup().addTo(mapRef.current);
    };

    createMap();

    return () => {
      mounted = false;
      markerLayerRef.current?.clearLayers();
      markerLayerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      leafletRef.current = null;
    };
  }, []);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    const markerLayer = markerLayerRef.current;
    if (!L || !map || !markerLayer) return;

    markerLayer.clearLayers();

    const visibleShops = enrichedShops.filter((shop) => shop.coordinates);
    const bounds: Array<[number, number]> = [];

    for (const shop of visibleShops) {
      const isSelected = shop.id === selectedShopId;
      const marker = L.circleMarker([shop.coordinates!.lat, shop.coordinates!.lon], {
        radius: isSelected ? 10 : 7,
        weight: 2,
        color: isSelected ? '#0f172a' : '#1d4ed8',
        fillColor: isSelected ? '#0f172a' : '#60a5fa',
        fillOpacity: 0.95,
      });

      marker.on('click', () => onSelectShop(shop));

      const distanceLabel =
        typeof shop.distanceKm === 'number' ? `<p style="margin: 8px 0 0; color: #475569;">${shop.distanceKm.toFixed(1)} km away</p>` : '';

      marker.bindPopup(`
        <div style="min-width: 200px;">
          <div style="font-weight: 700; color: #0f172a; margin-bottom: 4px;">${shop.name}</div>
          <div style="color: #475569; margin-bottom: 8px;">${shop.city}</div>
          <div style="display: inline-block; padding: 4px 8px; background: #eff6ff; color: #1d4ed8; border-radius: 999px; font-size: 12px; font-weight: 600;">
            Trust ${Math.round(shop.trustScore)}
          </div>
          ${distanceLabel}
        </div>
      `);

      marker.addTo(markerLayer);
      bounds.push([shop.coordinates!.lat, shop.coordinates!.lon]);
    }

    if (userLocation) {
      const userMarker = L.circleMarker([userLocation.lat, userLocation.lon], {
        radius: 8,
        color: '#166534',
        fillColor: '#4ade80',
        fillOpacity: 1,
        weight: 2,
      });
      userMarker.bindPopup('You are here');
      userMarker.addTo(markerLayer);
      bounds.push([userLocation.lat, userLocation.lon]);
    }

    const selectedShop = visibleShops.find((shop) => shop.id === selectedShopId);
    if (selectedShop?.coordinates) {
      map.flyTo([selectedShop.coordinates.lat, selectedShop.coordinates.lon], 15, {
        duration: 0.75,
      });
      return;
    }

    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [32, 32] });
    } else if (bounds.length === 1) {
      map.setView(bounds[0], 14);
    }
  }, [enrichedShops, onSelectShop, selectedShopId, userLocation]);

  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) return;

    setIsFindingMe(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coordinates = {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        };
        setUserLocation(coordinates);
        mapRef.current?.flyTo([coordinates.lat, coordinates.lon], 13, { duration: 0.75 });
        setIsFindingMe(false);
      },
      (error) => {
        console.error('Failed to get current location:', error);
        setIsFindingMe(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  useEffect(() => {
    if (!locateSignal) return;
    handleLocateMe();
  }, [handleLocateMe, locateSignal]);

  const selectedShop = enrichedShops.find((shop) => shop.id === selectedShopId) || enrichedShops[0] || null;

  return (
    <div className="space-y-4">
      <CardShell>
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">{title}</p>
            <p className="text-xs text-slate-500">{subtitle}</p>
          </div>
          {showLocateButton ? (
            <Button variant="outline" size="sm" onClick={handleLocateMe} disabled={isFindingMe}>
              <LocateFixed className="mr-2 h-4 w-4" />
              {isFindingMe ? 'Locating...' : 'Near Me'}
            </Button>
          ) : null}
        </div>
        <div ref={mapContainerRef} className={`${mapHeightClassName} w-full bg-slate-100`} />
      </CardShell>

      {selectedShop && showSelectedShopCard ? (
        <CardShell className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-slate-900">{selectedShop.name}</h3>
                <Badge variant="secondary">{selectedShop.category}</Badge>
              </div>
              <p className="text-sm text-slate-600">{selectedShop.address}, {selectedShop.city}</p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  Trust score {Math.round(selectedShop.trustScore)}
                </span>
                <span>{selectedShop.reviewCount} reviews</span>
                {typeof selectedShop.distanceKm === 'number' ? <span>{selectedShop.distanceKm.toFixed(1)} km away</span> : null}
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" size="sm" onClick={() => onSelectShop(selectedShop)}>
                <Route className="mr-2 h-4 w-4" />
                Show Shop
              </Button>
              <Button
                size="sm"
                className="bg-gradient-to-r from-slate-800 to-black"
                onClick={() => window.open(buildGoogleDirectionsUrl(selectedShop, userLocation), '_blank', 'noopener,noreferrer')}
              >
                <Navigation className="mr-2 h-4 w-4" />
                Get Directions
              </Button>
            </div>
          </div>
        </CardShell>
      ) : null}
    </div>
  );
}

function CardShell({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>{children}</div>;
}
