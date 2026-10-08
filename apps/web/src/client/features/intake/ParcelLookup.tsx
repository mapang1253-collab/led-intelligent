import { th } from "@reis/i18n";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Info, LoaderCircle, Search, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { FilterableSelect } from "../run/FilterableSelect.js";
import type { PinnedPoint } from "./LandPinMap.js";

/**
 * Looking a parcel up by ระวาง and เลขที่ดิน (docs/adr/0007, docs/adr/0009).
 *
 * This is the thing the owners asked for repeatedly and that kept coming back "not possible". It is
 * possible for 58 provinces, from two publishers: the Land Department's open shapefiles, held in
 * the database for the one province that fits in it, and กรมโยธาธิการและผังเมือง's republished
 * cadastre, searched live for 57 more. The reader picks their province first — the data is held per
 * province, and choosing is also what lets the screen say "that province is not published" instead
 * of letting an empty result imply the deed number is wrong.
 *
 * A hit fills the land area, the administrative area and the pin; it never submits anything. And it
 * establishes where a parcel is, not whose it is — ownership is in neither source, and the panel
 * says so, because a screen that resolves your deed number feels like it knows more about you than
 * it does.
 *
 * Still not a deed-number search. เลขที่ดิน is the number inside a ระวาง; เลขที่โฉนด is the number on
 * the document and is not published. The label says เลขที่ดิน and the help text says which is which,
 * since the two are confused constantly and are printed on the same page of the same deed.
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
  /** Only the live lookup reports this; a stored parcel is one row by construction. */
  match_count?: number;
}

interface StoredCoverage {
  province_code: string;
  province_name_th: string;
  parcels: number;
  published_by: string;
  licence: string;
}

interface LiveCoverage {
  province_code: string;
  province_name_th: string;
  province_id: string;
}

interface CoverageResponse {
  data: StoredCoverage[];
  /** Optional: an older deployment's response carried only `data`. */
  live?: LiveCoverage[];
}

interface SearchResponse {
  data: Parcel | null;
  source: "DOL_STORED" | "DPT_LIVE" | null;
  /** Absent on a stored hit, where coverage is implied by the hit itself. */
  covered?: boolean;
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
  const [provinceCode, setProvinceCode] = useState("");
  const [mapSheet, setMapSheet] = useState("");
  const [landNo, setLandNo] = useState("");
  const [submitted, setSubmitted] = useState<{
    provinceCode: string;
    mapSheet: string;
    landNo: string;
  } | null>(null);

  const coverage = useQuery({
    queryKey: ["parcel-coverage", 2],
    staleTime: Number.POSITIVE_INFINITY,
    queryFn: async (): Promise<CoverageResponse> => {
      const response = await fetch("/api/v1/parcels/coverage", {
        headers: { Accept: "application/json" },
      });
      return response.ok ? ((await response.json()) as CoverageResponse) : { data: [], live: [] };
    },
  });

  const lookup = useQuery({
    queryKey: ["parcel", submitted?.provinceCode, submitted?.mapSheet, submitted?.landNo],
    enabled: submitted !== null,
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
    queryFn: async (): Promise<SearchResponse> => {
      const response = await fetch(
        `/api/v1/parcels/search?map_sheet=${encodeURIComponent(submitted?.mapSheet ?? "")}&land_no=${encodeURIComponent(submitted?.landNo ?? "")}&province_code=${encodeURIComponent(submitted?.provinceCode ?? "")}`,
        { headers: { Accept: "application/json" } },
      );
      if (!response.ok) {
        throw new Error(`parcel lookup failed: ${response.status}`);
      }
      return (await response.json()) as SearchResponse;
    },
  });

  const stored = (coverage.data?.data ?? []).filter((province) => province.parcels > 0);
  const live = coverage.data?.live ?? [];
  const searchable = stored.length + live.length;
  const parcel = lookup.data?.data ?? null;
  const area = parcel?.area_sqm ? areaInThaiUnits(Number(parcel.area_sqm)) : null;
  const matches = parcel?.match_count ?? 1;
  const covered =
    stored.some((p) => p.province_code === provinceCode) ||
    live.some((p) => p.province_code === provinceCode);

  return (
    <div className="mt-6 rounded-card bg-surface-sunken p-5">
      <p className="font-semibold text-sm">{th.parcel.heading}</p>

      {/* How far the search reaches, before the inputs. A reader in a province nobody publishes
          should learn it in one line, not by typing a correct deed number and being told nothing. */}
      <p className="mt-1.5 flex items-start gap-2 text-ink-muted text-xs leading-relaxed">
        <Info size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
        {searchable > 0
          ? th.parcel.coverage.replace("{count}", searchable.toLocaleString("th-TH"))
          : th.parcel.coverageLoading}
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div>
          {/* Grouped by publisher, because which one answers changes what the answer is worth: a
              stored parcel is the Land Department's own row, a live one is a copy of it. And
              filterable, because 58 provinces is a long way to scroll to reach one. */}
          <FilterableSelect
            label={th.parcel.provinceLabel}
            value={provinceCode}
            onChange={setProvinceCode}
            placeholder={th.parcel.provincePlaceholder}
            selectClassName="mt-1.5 w-full rounded-card border border-border-strong bg-surface px-3 py-2.5 text-base"
            options={[
              ...stored.map((province) => ({
                value: province.province_code,
                label: province.province_name_th,
                group: th.parcel.provinceGroupStored,
              })),
              ...[...live]
                .sort((a, b) => a.province_name_th.localeCompare(b.province_name_th, "th-TH"))
                .map((province) => ({
                  value: province.province_code,
                  label: province.province_name_th,
                  group: th.parcel.provinceGroupLive,
                })),
            ]}
          />
          <span className="mt-1 block text-ink-muted text-xs leading-relaxed">
            {th.parcel.provinceHelp}
          </span>
        </div>
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
        disabled={provinceCode === "" || mapSheet.trim() === "" || landNo.trim() === ""}
        onClick={() =>
          setSubmitted({ provinceCode, mapSheet: mapSheet.trim(), landNo: landNo.trim() })
        }
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

      {/* Three empty answers, three different sentences. The province is not published; the number
          is not in a province that is; or the lookup itself did not complete. */}
      {submitted && !lookup.isFetching && parcel === null && !lookup.isError && (
        <p
          className="mt-3 flex items-start gap-2 text-xs leading-relaxed"
          style={{ color: "var(--color-partial)" }}
        >
          <TriangleAlert size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
          {lookup.data?.covered === false ? th.parcel.provinceNotCovered : th.parcel.notFound}
        </p>
      )}
      {lookup.isError && (
        <div className="mt-3">
          <p className="text-xs leading-relaxed" style={{ color: "var(--color-partial)" }}>
            {th.parcel.failed}
          </p>
          <button
            type="button"
            onClick={() => lookup.refetch()}
            className="mt-2 rounded-pill border border-border-strong px-3 py-1.5 font-medium text-xs"
          >
            {th.parcel.retry}
          </button>
        </div>
      )}

      {parcel && (
        <div className="mt-4 rounded-card border border-border-strong bg-surface p-4">
          <p className="font-semibold text-sm">{th.parcel.found}</p>

          {matches > 1 && (
            <p
              className="mt-1.5 flex items-start gap-2 text-xs leading-relaxed"
              style={{ color: "var(--color-partial)" }}
            >
              <TriangleAlert size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
              {th.parcel.multipleMatches.replace("{count}", matches.toLocaleString("th-TH"))}
            </p>
          )}

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
              <dt className="text-ink-muted text-xs">
                {lookup.data?.source === "DPT_LIVE" ? th.parcel.foundAreaLive : th.parcel.foundArea}
              </dt>
              <dd className="font-medium tabular-nums">
                {area
                  ? `${area.rai} ไร่ ${area.ngan} งาน ${area.wa.toLocaleString("th-TH", { maximumFractionDigits: 1 })} ตร.ว.`
                  : "—"}
              </dd>
            </div>
          </dl>

          {/* Said rather than left as a dash: some provinces publish the outline without the area,
              and a few publish it without the ตำบล, and both look like a bug otherwise. */}
          {area === null && (
            <p className="mt-1.5 text-ink-muted text-xs leading-relaxed">{th.parcel.noArea}</p>
          )}
          {parcel.subdistrict_name_th === null && (
            <p className="mt-1.5 text-ink-muted text-xs leading-relaxed">{th.parcel.noNames}</p>
          )}

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
            {lookup.data?.source === "DPT_LIVE" ? th.parcel.sourceLive : th.parcel.sourceStored}
          </p>
        </div>
      )}

      {/* The route out for readers this box cannot serve: a deed number instead of a เลขที่ดิน, a
          province neither publisher opens, or a reader who wants to see the parcel drawn. LandsMaps
          answers all three and hands back the two numbers above, so this is a round trip. */}
      <details className="mt-4" open={provinceCode !== "" && !covered}>
        <summary className="cursor-pointer font-medium text-signature-text text-sm">
          {th.parcel.fallbackHeading}
        </summary>
        <p className="mt-1.5 text-ink-muted text-xs leading-relaxed">{th.parcel.fallbackBody}</p>
        <a
          href="https://landsmaps.dol.go.th/"
          target="_blank"
          rel="noreferrer noopener"
          className="mt-2.5 inline-flex items-center gap-1.5 rounded-pill border border-border-strong px-4 py-2 font-medium text-sm"
          style={{ color: "var(--color-signature-text)" }}
        >
          <ExternalLink size={14} aria-hidden="true" />
          {th.parcel.fallbackLink}
        </a>
        <p className="mt-1.5 text-ink-muted text-xs">{th.parcel.fallbackNote}</p>
      </details>
    </div>
  );
}
