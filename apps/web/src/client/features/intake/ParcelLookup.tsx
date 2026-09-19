import { th } from "@reis/i18n";
import { useQuery } from "@tanstack/react-query";
import { Info, LoaderCircle, Search, TriangleAlert } from "lucide-react";
import { useState } from "react";
import type { PinnedPoint } from "./LandPinMap.js";

/**
 * Looking a parcel up by ระวาง and เลขที่ดิน (docs/adr/0007).
 *
 * This is the thing the owners asked for repeatedly and that kept coming back "not possible". It
 * is possible — for five provinces, because those are the only ones the Land Department publishes
 * openly. That limit is the first thing this panel says, before the inputs, so a reader in ชลบุรี
 * learns it in one line instead of by typing a correct deed and being told nothing was found.
 *
 * A hit fills the land area and offers the pin; it never submits anything. And it establishes
 * where a parcel is, not whose it is — ownership is not in this data, and the panel says that too,
 * because a screen that resolves your deed number feels like it knows more about you than it does.
 *
 * Still not a deed-number search. เลขที่ดิน is the number inside a ระวาง; เลขที่โฉนด is the number
 * on the document and is not published. The label says เลขที่ดิน and the help text says which is
 * which, since the two are confused constantly and are printed side by side on the same page.
 */

interface Parcel {
  land_no: string;
  map_sheet: string;
  province_name_th: string | null;
  district_name_th: string | null;
  subdistrict_name_th: string | null;
  area_sqm: string | null;
  latitude: number | null;
  longitude: number | null;
  province_id: string | null;
  district_id: string | null;
  subdistrict_id: string | null;
}

interface Coverage {
  province_code: string;
  province_name_th: string;
  parcels: number;
  published_by: string;
  licence: string;
}

/** 1 ตารางวา = 4 ตารางเมตร (ประมวลกฎหมายที่ดิน). */
function areaInThaiUnits(sqm: number): { rai: number; ngan: number; wa: number; totalWa: number } {
  const totalWa = sqm / 4;
  const rai = Math.floor(totalWa / 400);
  const ngan = Math.floor((totalWa - rai * 400) / 100);
  return { rai, ngan, wa: totalWa - rai * 400 - ngan * 100, totalWa };
}

export function ParcelLookup({
  onFound,
}: {
  /**
   * Called when the reader accepts a hit: the administrative area, the pin, and the size.
   *
   * The ids matter most. Without them the form asked where the land was immediately after being
   * told exactly where it was, which is the duplication readers complained about loudest.
   */
  onFound: (found: {
    provinceId: string | null;
    districtId: string | null;
    subdistrictId: string | null;
    point: PinnedPoint | null;
    rai: string;
    ngan: string;
    wa: string;
  }) => void;
}) {
  const [mapSheet, setMapSheet] = useState("");
  const [landNo, setLandNo] = useState("");
  const [submitted, setSubmitted] = useState<{ mapSheet: string; landNo: string } | null>(null);

  const coverage = useQuery({
    queryKey: ["parcel-coverage"],
    staleTime: Number.POSITIVE_INFINITY,
    queryFn: async (): Promise<Coverage[]> => {
      const response = await fetch("/api/v1/parcels/coverage", {
        headers: { Accept: "application/json" },
      });
      return response.ok ? ((await response.json()) as { data: Coverage[] }).data : [];
    },
  });

  const lookup = useQuery({
    queryKey: ["parcel", submitted?.mapSheet, submitted?.landNo],
    enabled: submitted !== null,
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
    queryFn: async (): Promise<Parcel | null> => {
      const response = await fetch(
        `/api/v1/parcels/search?map_sheet=${encodeURIComponent(submitted?.mapSheet ?? "")}&land_no=${encodeURIComponent(submitted?.landNo ?? "")}`,
        { headers: { Accept: "application/json" } },
      );
      if (!response.ok) {
        throw new Error(`parcel lookup failed: ${response.status}`);
      }
      return ((await response.json()) as { data: Parcel | null }).data;
    },
  });

  const covered = (coverage.data ?? []).filter((c) => c.parcels > 0);
  const parcel = lookup.data ?? null;
  const area = parcel?.area_sqm ? areaInThaiUnits(Number(parcel.area_sqm)) : null;

  return (
    <div className="mt-6 rounded-card bg-surface-sunken p-5">
      <p className="font-semibold text-sm">{th.parcel.heading}</p>

      {/* The coverage limit, before the inputs. A reader outside these provinces should not have
          to type a correct deed number to discover we hold nothing for them. */}
      <p className="mt-1.5 flex items-start gap-2 text-ink-muted text-xs leading-relaxed">
        <Info size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
        {covered.length > 0
          ? th.parcel.coverage.replace(
              "{provinces}",
              covered
                .map((c) => `${c.province_name_th} (${c.parcels.toLocaleString("th-TH")})`)
                .join(" · "),
            )
          : th.parcel.coverageLoading}
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="font-medium text-sm">{th.parcel.mapSheetLabel}</span>
          <input
            type="text"
            value={mapSheet}
            onChange={(event) => setMapSheet(event.target.value)}
            placeholder={th.parcel.mapSheetPlaceholder}
            className="mt-1 w-full rounded-card border border-border-strong bg-surface px-3 py-2.5 text-base"
          />
          <span className="mt-1 block text-ink-muted text-xs leading-relaxed">
            {th.parcel.mapSheetHelp}
          </span>
        </label>
        <label className="block">
          <span className="font-medium text-sm">{th.parcel.landNoLabel}</span>
          <input
            type="text"
            inputMode="numeric"
            value={landNo}
            onChange={(event) => setLandNo(event.target.value)}
            className="mt-1 w-full rounded-card border border-border-strong bg-surface px-3 py-2.5 text-base"
          />
          <span className="mt-1 block text-ink-muted text-xs leading-relaxed">
            {th.parcel.landNoHelp}
          </span>
        </label>
      </div>

      <button
        type="button"
        disabled={mapSheet.trim() === "" || landNo.trim() === ""}
        onClick={() => setSubmitted({ mapSheet: mapSheet.trim(), landNo: landNo.trim() })}
        className="mt-3 inline-flex items-center gap-1.5 rounded-pill px-5 py-2 font-semibold text-sm disabled:opacity-50"
        style={{ backgroundColor: "var(--color-signature)", color: "var(--color-signature-on)" }}
      >
        {lookup.isFetching ? (
          <LoaderCircle size={15} className="animate-spin" aria-hidden="true" />
        ) : (
          <Search size={15} aria-hidden="true" />
        )}
        {th.parcel.lookup}
      </button>

      {submitted && !lookup.isFetching && parcel === null && !lookup.isError && (
        <p
          className="mt-3 flex items-start gap-2 text-xs leading-relaxed"
          style={{ color: "var(--color-partial)" }}
        >
          <TriangleAlert size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
          {th.parcel.notFound}
        </p>
      )}
      {lookup.isError && (
        <p className="mt-3 text-xs" style={{ color: "var(--color-partial)" }}>
          {th.parcel.failed}
        </p>
      )}

      {parcel && (
        <div className="mt-4 rounded-card border border-border-strong bg-surface p-4">
          <p className="font-semibold text-sm">{th.parcel.found}</p>
          <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-ink-muted text-xs">{th.parcel.foundWhere}</dt>
              <dd className="font-medium">
                {[parcel.subdistrict_name_th, parcel.district_name_th, parcel.province_name_th]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-ink-muted text-xs">{th.parcel.foundArea}</dt>
              <dd className="font-medium tabular-nums">
                {area
                  ? `${area.rai} ไร่ ${area.ngan} งาน ${area.wa.toLocaleString("th-TH", { maximumFractionDigits: 1 })} ตร.ว.`
                  : "—"}
              </dd>
            </div>
          </dl>

          <button
            type="button"
            onClick={() =>
              onFound({
                provinceId: parcel.province_id,
                districtId: parcel.district_id,
                subdistrictId: parcel.subdistrict_id,
                point:
                  parcel.latitude !== null && parcel.longitude !== null
                    ? { latitude: parcel.latitude, longitude: parcel.longitude }
                    : null,
                rai: area ? String(area.rai) : "",
                ngan: area ? String(area.ngan) : "",
                wa: area ? area.wa.toFixed(2) : "",
              })
            }
            className="mt-3 inline-flex items-center gap-1.5 rounded-pill border border-border-strong px-4 py-2 font-medium text-sm"
            style={{ color: "var(--color-signature-text)" }}
          >
            {th.parcel.use}
          </button>

          {/* What a hit does and does not mean. A screen that resolves someone's deed number feels
              like it knows more about them than it does. */}
          <p className="mt-2.5 flex items-start gap-2 text-ink-muted text-xs leading-relaxed">
            <Info size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
            {th.parcel.notOwnership}
          </p>
          <p className="mt-1 text-ink-muted text-xs">
            {th.parcel.source.replace("{publisher}", covered[0]?.published_by ?? "กรมที่ดิน")}
          </p>
        </div>
      )}
    </div>
  );
}
