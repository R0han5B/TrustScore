'use client';

import 'leaflet/dist/leaflet.css';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MapPin, Loader2 } from 'lucide-react';
import type { NominatimSuggestion } from '@/lib/geocoding';

type LocationValue = {
  address: string;
  city: string;
  pincode: string;
  latitude?: number | null;
  longitude?: number | null;
};

type LocationPickerProps = {
  id: string;
  value: LocationValue;
  onChange: (nextValue: LocationValue) => void;
  placeholder?: string;
};

type ReverseGeocodeResponse = {
  success: boolean;
  displayName?: string | null;
  street?: string | null;
  city?: string | null;
  pincode?: string | null;
};

const DEFAULT_CENTER: [number, number] = [20.5937, 78.9629];

function createPickerIcon(L: typeof import('leaflet')) {
  const svg = encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="34" height="46" viewBox="0 0 34 46" fill="none">
      <path d="M17 1C8.2 1 1 8.2 1 17c0 12 16 28 16 28s16-16 16-28C33 8.2 25.8 1 17 1Z" fill="#0F172A" stroke="white" stroke-width="2"/>
      <circle cx="17" cy="17" r="6" fill="white"/>
    </svg>
  `);

  return L.icon({
    iconUrl: `data:image/svg+xml;charset=UTF-8,${svg}`,
    iconSize: [34, 46],
    iconAnchor: [17, 44],
    popupAnchor: [0, -40],
  });
}

function buildAddressFromSuggestion(suggestion: NominatimSuggestion) {
  const street =
    suggestion.address.house_number && suggestion.address.road
      ? `${suggestion.address.house_number} ${suggestion.address.road}`
      : suggestion.address.road ||
        suggestion.address.pedestrian ||
        suggestion.address.footway ||
        suggestion.address.neighbourhood ||
        suggestion.address.suburb;

  return street || suggestion.displayName;
}

function formatSuggestionSecondaryLine(suggestion: NominatimSuggestion) {
  const parts = [
    suggestion.address.city ||
      suggestion.address.town ||
      suggestion.address.village ||
      suggestion.address.county,
    suggestion.address.postcode,
  ].filter(Boolean);

  return parts.join(' • ');
}

export function LocationPicker({
  id,
  value,
  onChange,
  placeholder = 'Search your shop address',
}: LocationPickerProps) {
  const [query, setQuery] = useState(value.address);
  const [suggestions, setSuggestions] = useState<NominatimSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import('leaflet').Map | null>(null);
  const markerRef = useRef<import('leaflet').Marker | null>(null);
  const leafletRef = useRef<typeof import('leaflet') | null>(null);
  const ignoreQueryEffectRef = useRef(false);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const lat = typeof value.latitude === 'number' ? value.latitude : null;
  const lon = typeof value.longitude === 'number' ? value.longitude : null;
  const hasCoordinates = lat !== null && lon !== null;
  const previewText = useMemo(() => {
    if (!hasCoordinates) return null;
    return `${lat!.toFixed(5)}, ${lon!.toFixed(5)}`;
  }, [hasCoordinates, lat, lon]);

  const invalidateMapSize = () => {
    const map = mapRef.current;
    if (!map) return;
    window.requestAnimationFrame(() => {
      map.invalidateSize(false);
    });
  };

  const updatePositionFromMap = async (nextLat: number, nextLon: number) => {
    setIsReverseGeocoding(true);
    try {
      const response = await fetch(
        `/api/maps/reverse-geocode?lat=${encodeURIComponent(String(nextLat))}&lon=${encodeURIComponent(String(nextLon))}`
      );
      const data = (await response.json()) as ReverseGeocodeResponse;

      if (!response.ok || !data.success) {
        throw new Error('Failed to reverse geocode location');
      }

      const currentValue = valueRef.current;
      ignoreQueryEffectRef.current = true;
      onChangeRef.current({
        ...currentValue,
        address: data.street || data.displayName || currentValue.address,
        city: data.city || currentValue.city,
        pincode: data.pincode || currentValue.pincode,
        latitude: nextLat,
        longitude: nextLon,
      });
      setQuery(data.street || data.displayName || currentValue.address);
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      onChangeRef.current({
        ...valueRef.current,
        latitude: nextLat,
        longitude: nextLon,
      });
    } finally {
      setIsReverseGeocoding(false);
    }
  };

  useEffect(() => {
    valueRef.current = value;
    onChangeRef.current = onChange;
  }, [onChange, value]);

  useEffect(() => {
    if (ignoreQueryEffectRef.current) {
      ignoreQueryEffectRef.current = false;
      return;
    }
    setQuery(value.address);
  }, [value.address]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsSuggestionsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    let isCancelled = false;

    if (query.trim().length < 3) {
      setSuggestions([]);
      setIsSuggestionsOpen(false);
      setIsSearching(false);
      setSearchError(null);
      return;
    }

    const timeout = window.setTimeout(async () => {
      setIsSearching(true);
      setSearchError(null);

      try {
        const response = await fetch(`/api/maps/search?q=${encodeURIComponent(query.trim())}`);
        const data = (await response.json()) as { success: boolean; suggestions?: NominatimSuggestion[]; error?: string };

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to search locations');
        }

        if (!isCancelled) {
          setSuggestions(data.suggestions || []);
          setIsSuggestionsOpen(true);
        }
      } catch (error) {
        if (!isCancelled) {
          setSuggestions([]);
          setIsSuggestionsOpen(true);
          setSearchError(error instanceof Error ? error.message : 'Failed to search locations');
        }
      } finally {
        if (!isCancelled) {
          setIsSearching(false);
        }
      }
    }, 300);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeout);
    };
  }, [query]);

  useEffect(() => {
    let mounted = true;

    const createMap = async () => {
      if (!mapContainerRef.current || mapRef.current) return;

      const L = await import('leaflet');
      if (!mounted || !mapContainerRef.current) return;

      leafletRef.current = L;
      mapRef.current = L.map(mapContainerRef.current, {
        zoomControl: false,
        scrollWheelZoom: false,
      }).setView(hasCoordinates ? [lat!, lon!] : DEFAULT_CENTER, hasCoordinates ? 15 : 4);

      L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(mapRef.current);

      mapRef.current.on('click', (event) => {
        invalidateMapSize();
        const nextLat = event.latlng.lat;
        const nextLon = event.latlng.lng;

        if (markerRef.current) {
          markerRef.current.setLatLng([nextLat, nextLon]);
        } else {
          markerRef.current = L.marker([nextLat, nextLon], {
            draggable: true,
            icon: createPickerIcon(L),
          }).addTo(mapRef.current!);
          markerRef.current.on('dragend', async () => {
            const marker = markerRef.current;
            if (!marker) return;
            const nextPosition = marker.getLatLng();
            await updatePositionFromMap(nextPosition.lat, nextPosition.lng);
          });
        }

        void updatePositionFromMap(nextLat, nextLon);
      });
    };

    createMap();

    return () => {
      mounted = false;
      markerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      leafletRef.current = null;
    };
  }, [hasCoordinates, lat, lon]);

  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      invalidateMapSize();
    });

    resizeObserver.observe(container);

    const scrollParent = container.closest('[data-slot="dialog-content"]');
    const handleScroll = () => invalidateMapSize();
    scrollParent?.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });

    const timer = window.setTimeout(() => invalidateMapSize(), 120);

    return () => {
      resizeObserver.disconnect();
      scrollParent?.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;

    if (!L || !map) return;

    if (!hasCoordinates) {
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
        markerRef.current = null;
      }
      map.setView(DEFAULT_CENTER, 4);
      return;
    }

    const nextLatLng: [number, number] = [lat!, lon!];

    if (!markerRef.current) {
      markerRef.current = L.marker(nextLatLng, {
        draggable: true,
        icon: createPickerIcon(L),
      }).addTo(map);
      markerRef.current.on('dragend', async () => {
        const marker = markerRef.current;
        if (!marker) return;

        const nextPosition = marker.getLatLng();
        await updatePositionFromMap(nextPosition.lat, nextPosition.lng);
      });
    } else {
      markerRef.current.setLatLng(nextLatLng);
    }

    map.setView(nextLatLng, 15);
    invalidateMapSize();
  }, [hasCoordinates, lat, lon]);

  const handleAddressInputChange = (nextAddress: string) => {
    ignoreQueryEffectRef.current = true;
    setQuery(nextAddress);
    setSearchError(null);
    onChange({
      ...value,
      address: nextAddress,
      latitude: nextAddress.trim() === value.address.trim() ? value.latitude ?? null : null,
      longitude: nextAddress.trim() === value.address.trim() ? value.longitude ?? null : null,
    });
  };

  const handleSuggestionSelect = (suggestion: NominatimSuggestion) => {
    const nextAddress = buildAddressFromSuggestion(suggestion);
    const nextCity =
      suggestion.address.city ||
      suggestion.address.town ||
      suggestion.address.village ||
      suggestion.address.county ||
      value.city;
    const nextPincode = suggestion.address.postcode || value.pincode;

    ignoreQueryEffectRef.current = true;
    setQuery(nextAddress);
    setSuggestions([]);
    setIsSuggestionsOpen(false);
    setSearchError(null);

    onChange({
      ...value,
      address: nextAddress,
      city: nextCity,
      pincode: nextPincode,
      latitude: suggestion.lat,
      longitude: suggestion.lon,
    });
  };

  return (
    <div className="space-y-3">
      <div ref={wrapperRef} className="relative space-y-2">
        <Input
          id={id}
          value={query}
          placeholder={placeholder}
          autoComplete="off"
          onFocus={() => {
            if (suggestions.length || searchError) {
              setIsSuggestionsOpen(true);
            }
          }}
          onChange={(event) => handleAddressInputChange(event.target.value)}
        />

        {(isSuggestionsOpen || isSearching) && (query.trim().length >= 3) ? (
          <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
            {isSearching ? (
              <div className="flex items-center gap-2 px-3 py-3 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching locations...
              </div>
            ) : null}

            {!isSearching && searchError ? (
              <div className="px-3 py-3 text-sm text-red-600">{searchError}</div>
            ) : null}

            {!isSearching && !searchError && !suggestions.length ? (
              <div className="px-3 py-3 text-sm text-slate-500">No matching locations found.</div>
            ) : null}

            {!isSearching && suggestions.length ? (
              <div className="max-h-72 overflow-y-auto py-1">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.placeId}
                    type="button"
                    className="flex w-full items-start gap-3 px-3 py-3 text-left transition hover:bg-slate-50"
                    onClick={() => handleSuggestionSelect(suggestion)}
                  >
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-900">{buildAddressFromSuggestion(suggestion)}</div>
                      <div className="mt-1 text-xs leading-5 text-slate-500">{suggestion.displayName}</div>
                      {formatSuggestionSecondaryLine(suggestion) ? (
                        <div className="mt-2 text-[11px] text-slate-400">{formatSuggestionSecondaryLine(suggestion)}</div>
                      ) : null}
                    </div>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">Location preview</p>
            <p className="text-xs text-slate-500">Pick a suggestion, then drag the pin if you need to fine-tune the exact spot.</p>
          </div>
          {previewText ? <Badge variant="secondary">{previewText}</Badge> : null}
        </div>
        <div ref={mapContainerRef} className="h-56 w-full bg-slate-100" />
        <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
          <span>{hasCoordinates ? 'The saved location follows the pin position.' : 'Select a suggestion to place the map pin.'}</span>
          {isReverseGeocoding ? (
            <span className="inline-flex items-center gap-2 text-slate-600">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Updating address...
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
