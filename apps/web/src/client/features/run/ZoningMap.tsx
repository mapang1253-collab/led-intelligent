import { th } from "@reis/i18n";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Info, Layers } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { PinnedPoint } from "../intake/LandPinMap.js";
import { planNotPublished, useZoning } from "../intake/useZoning.js";
import { zoningTileLayer } from "../intake/zoningTiles.js";

/**
 * The plot and the colours of the plan around it, beside the result (docs/adr/0008).
 *
 * The concepts tab already quoted the ข้อกำหนด and the ข้อห้าม for the zone under the pin, and the
 * owners' complaint was that it reads as law with no place attached: a zone name and a wall of
 * clauses, about somewhere. The colours answer a different question from the words — what is next
 * to this land, how far the zone reaches, whether the plot sits in the middle of it or on a
 * boundary — and that question was only answerable on the form that produced the run, which the
 * reader has left by the time they are reading the result.
 *
 * Read-only, and that is the point. The pin cannot be moved and no click places anything: the run
 * has already been made from this point, and letting the map change it here would offer a reader a
 * correction that silently does not apply to the analysis under it. The overlay is on from the
 * start, unlike on the form, because showing it is the whole reason this map exists.
 */

/** Close enough to see the plot and the zone boundaries around it, not just the district. */
const PLOT_ZOOM = 17;

const PIN_ICON = L.divIcon({
  className: "",
  html: `<span style="display:block;width:18px;height:18px;border-radius:50%;
    background:var(--color-signature);border:3px solid #fff;
    box-shadow:0 1px 6px rgba(0,0,0,.45)"></span>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

export function ZoningMap({
  point,
  provinceCode,
}: {
  point: PinnedPoint | null;
  /** Two digits. Null means no plan can be drawn, and the map is not worth the tiles. */
  provinceCode: string | null;
}) {
  const container = useRef<HTMLDivElement | null>(null);
  const map = useRef<L.Map | null>(null);
  const overlay = useRef<L.TileLayer | null>(null);
  const [ready, setReady] = useState(false);
  const [showZoning, setShowZoning] = useState(true);

  /**
   * The coordinates, not the object holding them.
   *
   * The caller builds the point inline from the run's intake, so it is a new object on every
   * render — and this page re-renders on every poll while the run is still working. With the
   * object as the dependency, the cleanup below tore the map down and built it again several times
   * a second: tiles reloading, the view snapping back, and a stream of requests to two tile servers
   * for a map nobody had touched.
   */
  const latitude = point?.latitude ?? null;
  const longitude = point?.longitude ?? null;

  /* Shares the panel's lookup below, so this costs no extra request. */
  const noPlan = planNotPublished(useZoning(point, provinceCode));

  useEffect(() => {
    if (!container.current || map.current || latitude === null || longitude === null) {
      return;
    }
    const instance = L.map(container.current, {
      // A result page scrolls, and a map that eats the wheel traps the reader inside it.
      scrollWheelZoom: false,
    }).setView([latitude, longitude], PLOT_ZOOM);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      // ODbL attribution, on the map itself, as the licence and the tile policy both require.
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(instance);

    L.marker([latitude, longitude], { icon: PIN_ICON }).addTo(instance);

    map.current = instance;
    setReady(true);

    return () => {
      instance.remove();
      map.current = null;
      overlay.current = null;
      setReady(false);
    };
  }, [latitude, longitude]);

  // Rebuilt rather than toggled: a layer left behind from another province would draw that
  // province's plan over this one.
  useEffect(() => {
    if (!ready || !map.current) {
      return;
    }
    overlay.current?.remove();
    overlay.current = null;
    if (!showZoning || !provinceCode || noPlan) {
      return;
    }
    const layer = zoningTileLayer(provinceCode);
    layer.addTo(map.current);
    overlay.current = layer;
  }, [ready, showZoning, provinceCode, noPlan]);

  if (!point || !provinceCode) {
    return null;
  }

  return (
    <div className="mt-4 rounded-card bg-surface-sunken p-4">
      <h3 className="flex items-center gap-2 font-semibold text-sm">
        <Layers size={15} aria-hidden="true" />
        {th.zoningMap.heading}
      </h3>
      <p className="mt-1 text-ink-muted text-xs leading-relaxed">{th.zoningMap.description}</p>

      <div
        ref={container}
        className="mt-2 rounded-card"
        style={{ height: 300, width: "100%", zIndex: 0 }}
        role="application"
        aria-label={th.zoningMap.ariaLabel}
      />

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {noPlan ? (
          <p className="text-ink-muted text-xs leading-relaxed">{th.zoningMap.noLayer}</p>
        ) : (
          <button
            type="button"
            onClick={() => setShowZoning((on) => !on)}
            className="inline-flex items-center gap-1.5 rounded-pill border border-border-strong px-3 py-1.5 font-medium text-xs"
          >
            <Layers size={13} aria-hidden="true" />
            {showZoning ? th.zoningMap.hideOverlay : th.zoningMap.showOverlay}
          </button>
        )}
      </div>

      {/* The pin is the reader's own assertion, here as everywhere else. A map drawn around it
          makes it look surveyed, and it is not. */}
      <p className="mt-2 flex items-start gap-2 text-ink-muted text-xs leading-relaxed">
        <Info size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
        {th.zoningMap.pinIsAsserted}
      </p>
    </div>
  );
}
