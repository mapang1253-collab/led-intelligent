import { th } from "@reis/i18n";
import { useQuery } from "@tanstack/react-query";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { LoaderCircle, MapPin, RotateCcw, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/**
 * The map the reader places their land on (docs/adr/0006).
 *
 * The pin exists because a distance needs a point. Three plots in one tambon sit at three
 * different distances from the same road, so "ห่างจากถนน 300 เมตร" was not a feature waiting to
 * be written — it was a question with no subject. The reader supplying the subject is the whole
 * mechanism.
 *
 * It is `USER_ASSERTED`, like road width, and the copy says so. The system does not check that
 * the pin is on the reader's land, cannot, and must never present it as a confirmed parcel: the
 * output scope stays AREA, because an assertion is not property evidence.
 *
 * Nothing is placed for the reader. Centring the map on an area is a convenience — a wrong centre
 * costs a pan — but dropping a pin at a subdistrict's midpoint and measuring from it would
 * manufacture a precise answer about an arbitrary point, which is exactly what ADR 0004 refused.
 * So the map opens with no marker, and the panel below it stays empty until the reader clicks.
 *
 * The search box is why this map is worth having at all. The first version had none: it opened on
 * the whole country unless an area had already been chosen, and even then left the reader zooming
 * around a district looking for their own plot. The owners removed the feature as useless and were
 * right to. Searching a road, a market or a temple and landing on it is the difference between a
 * map you can use and a picture of Thailand you have to drag.
 */

/** Roughly the whole country, for a reader who has picked no area yet. */
const THAILAND: L.LatLngBoundsExpression = [
  [5.6, 97.3],
  [20.5, 105.7],
];

const AREA_ZOOM = 12;

/** Leaflet ships its marker icons as separate files that a bundler will not find on its own. */
const PIN_ICON = L.divIcon({
  className: "",
  html: `<span style="display:block;width:18px;height:18px;border-radius:50%;
    background:var(--color-signature);border:3px solid #fff;
    box-shadow:0 1px 6px rgba(0,0,0,.45)"></span>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

export interface PinnedPoint {
  readonly latitude: number;
  readonly longitude: number;
}

export function LandPinMap({
  centre,
  value,
  onChange,
}: {
  /** Where to open, when an area has been chosen. Null opens on the whole country. */
  centre: PinnedPoint | null;
  value: PinnedPoint | null;
  onChange: (point: PinnedPoint | null) => void;
}) {
  const container = useRef<HTMLDivElement | null>(null);
  const map = useRef<L.Map | null>(null);
  const marker = useRef<L.Marker | null>(null);
  // Held in a ref so the click handler, bound once, always calls the current callback.
  const handler = useRef(onChange);
  handler.current = onChange;
  const [ready, setReady] = useState(false);
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");

  // One request per pause in typing. Nominatim is a shared public service, and the endpoint
  // caches per query for a month on top of this.
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(term.trim()), 400);
    return () => clearTimeout(timer);
  }, [term]);

  const places = useQuery({
    queryKey: ["place-search", debounced],
    enabled: debounced.length >= 3,
    staleTime: Number.POSITIVE_INFINITY,
    queryFn: async (): Promise<{ label: string; latitude: number; longitude: number }[]> => {
      const response = await fetch(`/api/v1/place-search?q=${encodeURIComponent(debounced)}`, {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) {
        return [];
      }
      return ((await response.json()) as { data: typeof places.data }).data ?? [];
    },
  });

  /** Jump the view without placing anything: finding a place is not asserting the land is there. */
  function flyTo(latitude: number, longitude: number) {
    map.current?.setView([latitude, longitude], 17);
    setTerm("");
    setDebounced("");
  }

  useEffect(() => {
    if (!container.current || map.current) {
      return;
    }
    const instance = L.map(container.current, { scrollWheelZoom: false }).fitBounds(THAILAND);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      // ODbL attribution, on the map itself, as the licence and the tile policy both require.
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(instance);

    instance.on("click", (event: L.LeafletMouseEvent) => {
      handler.current({ latitude: event.latlng.lat, longitude: event.latlng.lng });
    });

    map.current = instance;
    setReady(true);

    return () => {
      instance.remove();
      map.current = null;
      marker.current = null;
    };
  }, []);

  // Recentre when the reader picks a different area, but never while a pin is already placed —
  // moving the view out from under a marker the reader positioned themselves is disorienting.
  useEffect(() => {
    if (!ready || !map.current || !centre || value) {
      return;
    }
    map.current.setView([centre.latitude, centre.longitude], AREA_ZOOM);
  }, [ready, centre, value]);

  useEffect(() => {
    if (!ready || !map.current) {
      return;
    }
    if (!value) {
      marker.current?.remove();
      marker.current = null;
      return;
    }
    const position: L.LatLngExpression = [value.latitude, value.longitude];
    if (marker.current) {
      marker.current.setLatLng(position);
    } else {
      marker.current = L.marker(position, { icon: PIN_ICON, draggable: true }).addTo(map.current);
      marker.current.on("dragend", () => {
        const moved = marker.current?.getLatLng();
        if (moved) {
          handler.current({ latitude: moved.lat, longitude: moved.lng });
        }
      });
    }
  }, [ready, value]);

  return (
    <div>
      {/* Above the map, not floating on it: a control overlapping tiles is unreadable on a phone
          and fights the map's own zoom buttons. */}
      <label className="block">
        <span className="sr-only">{th.map.searchAria}</span>
        <span className="relative block">
          <Search
            size={16}
            aria-hidden="true"
            className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-3.5 text-ink-muted"
          />
          <input
            type="search"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder={th.map.searchPlaceholder}
            autoComplete="off"
            className="w-full rounded-card border border-border-strong bg-surface py-2.5 pr-4 pl-10 text-base"
          />
          {places.isFetching && (
            <LoaderCircle
              size={16}
              aria-hidden="true"
              className="-translate-y-1/2 absolute top-1/2 right-4 animate-spin text-ink-muted"
            />
          )}
        </span>
      </label>

      {debounced.length >= 3 && places.data && (
        <ul className="mb-2 rounded-card border border-border bg-surface">
          {places.data.length === 0 ? (
            <li className="px-3 py-2 text-ink-muted text-xs">{th.map.searchNoMatches}</li>
          ) : (
            places.data.map((place) => (
              <li key={`${place.latitude},${place.longitude}`}>
                <button
                  type="button"
                  onClick={() => flyTo(place.latitude, place.longitude)}
                  className="block w-full border-border border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-surface-sunken"
                >
                  {place.label}
                </button>
              </li>
            ))
          )}
        </ul>
      )}

      <div
        ref={container}
        className="rounded-card"
        style={{ height: 320, width: "100%", zIndex: 0, marginTop: 8 }}
        role="application"
        aria-label={th.map.ariaLabel}
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-start gap-2 text-ink-muted text-xs leading-relaxed">
          <MapPin size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
          {value
            ? `${th.map.pinned} ${value.latitude.toFixed(5)}, ${value.longitude.toFixed(5)}`
            : th.map.instruction}
        </p>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="inline-flex items-center gap-1.5 rounded-pill border border-border-strong px-3 py-1.5 font-medium text-xs"
          >
            <RotateCcw size={13} aria-hidden="true" />
            {th.map.clear}
          </button>
        )}
      </div>
    </div>
  );
}
