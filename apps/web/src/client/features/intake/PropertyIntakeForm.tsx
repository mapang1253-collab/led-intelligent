import { th } from "@reis/i18n";
import { ArrowRight, ChevronDown, Info, MapPin, Maximize2, Plus, Ruler } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { useCreateRun } from "../run/useAnalysisRun.js";
import { type AreaChoice, AreaPicker } from "./AreaPicker.js";
import { AreaSelect } from "./AreaSelect.js";
import { LandPinMap, type PinnedPoint } from "./LandPinMap.js";
import { ParcelLookup } from "./ParcelLookup.js";
import { ProximityPanel } from "./ProximityPanel.js";
import { ZoningPanel } from "./ZoningPanel.js";
import {
  useAreaChoice,
  useDistricts,
  useProvinces,
  useSubdistricts,
} from "./useAdministrativeAreas.js";
import { useAreaCentre } from "./useAreaCentre.js";

/**
 * Progressive property intake (docs/project-overview.md §7). The minimum is province → district →
 * subdistrict; everything else is optional and only narrows the output scope.
 *
 * Choosing a parent clears its children, so an intake can never carry a subdistrict that does not
 * belong to the selected district. The server re-checks the chain against the reference table
 * regardless, because this form is not the only way to reach the API.
 *
 * A result screen can send the reader back here to supply a site fact it could not settle, and the
 * intake it produced travels with that navigation. Re-picking the province, district and
 * subdistrict in order to type one road width is the kind of small tax that stops people from
 * finishing, so the form reopens on the same place with the same answers and the site panel already
 * open. Nothing arrives from storage — only from the navigation that asked for it.
 */

interface SiteFields {
  road_width: string;
  water_body_width: string;
}

/**
 * The land area, which the valuation calculator on the result page reads.
 *
 * Deed number, ระวาง, เลขที่ดิน and street address used to sit alongside these. They are gone: the
 * product cannot resolve a parcel from any of them, so they only ever set a `requested_scope` that
 * the permitted scope refused. `propertyIntakeSchema` still accepts them, because the API is not
 * this form — the form simply stopped asking for what it could not use.
 */
interface OptionalFields {
  land_area_rai: string;
  land_area_ngan: string;
  land_area_wa: string;
}

/** 1 ไร่ = 4 งาน = 400 ตารางวา, 1 ตารางวา = 4 ตารางเมตร (ประมวลกฎหมายที่ดิน). */
function areaSummaryTh(rai: string, ngan: string, wa: string): string | null {
  const squareWa = (Number(rai) || 0) * 400 + (Number(ngan) || 0) * 100 + (Number(wa) || 0);
  if (!Number.isFinite(squareWa) || squareWa <= 0) {
    return null;
  }
  const format = (value: number) => value.toLocaleString("th-TH", { maximumFractionDigits: 2 });
  return `${th.intake.areaConversion} ${format(squareWa)} ${th.valuation.wa} (${format(squareWa * 4)} ตร.ม.)`;
}

/** A value from the carried intake as a form string. Numbers and strings both arrive as-is. */
const asField = (value: unknown): string =>
  typeof value === "number" || typeof value === "string" ? String(value) : "";

export function PropertyIntakeForm() {
  const location = useLocation();
  // Read once, on mount. A later render must not reset fields the reader is in the middle of typing.
  const [prefill] = useState<Record<string, unknown>>(
    () => (location.state as { intake?: Record<string, unknown> } | null)?.intake ?? {},
  );

  const [provinceId, setProvinceId] = useState(() => asField(prefill.province_id));
  const [districtId, setDistrictId] = useState(() => asField(prefill.district_id));
  const [subdistrictId, setSubdistrictId] = useState(() => asField(prefill.subdistrict_id));
  /**
   * The place the reader picked by name, kept whole so the confirmation can show it without
   * refetching. Browsing the cascading lists instead leaves this null and fills the three ids.
   */
  const [picked, setPicked] = useState<AreaChoice | null>(null);
  /** Set when the reader presses "change", so a carried-in area does not reappear after clearing. */
  const [areaCleared, setAreaCleared] = useState(false);
  const [optional, setOptional] = useState<OptionalFields>(() => ({
    land_area_rai: asField(prefill.land_area_rai),
    land_area_ngan: asField(prefill.land_area_ngan),
    land_area_wa: asField(prefill.land_area_wa),
  }));
  const [site, setSite] = useState<SiteFields>(() => ({
    road_width: asField(prefill.road_width),
    water_body_width: asField(prefill.water_body_width),
  }));
  const [nearLargeWater, setNearLargeWater] = useState(
    () => prefill.near_large_water_body === true,
  );
  // A returning reader was sent here to fill in a site fact, so that panel starts open. The others
  // open only if they already hold something, so nothing carried over is hidden behind a toggle.
  const [showSite, setShowSite] = useState(() => Object.keys(prefill).length > 0);
  const [showArea, setShowArea] = useState(
    () =>
      asField(prefill.land_area_rai) !== "" ||
      asField(prefill.land_area_ngan) !== "" ||
      asField(prefill.land_area_wa) !== "",
  );
  /**
   * Where the reader says the land is. Never set by the app — see LandPinMap on why placing it
   * automatically would manufacture a precise answer about an arbitrary point.
   */
  const [pin, setPin] = useState<PinnedPoint | null>(() => {
    const lat = Number(prefill.latitude);
    const lon = Number(prefill.longitude);
    return Number.isFinite(lat) && Number.isFinite(lon) ? { latitude: lat, longitude: lon } : null;
  });
  /** Which way the reader is answering "where": the area lists, or a parcel number. */
  const [locateMode, setLocateMode] = useState<"area" | "parcel">("area");
  /** The map is folded by default; a parcel hit opens it, because it has something to show. */
  const [showMap, setShowMap] = useState(() => Number.isFinite(Number(prefill.latitude)));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const navigate = useNavigate();
  /**
   * The run to open, once this screen's own history entry has been stamped with the intake.
   *
   * Two navigations in one handler would race — the replace that records the form and the push
   * that leaves it — so the push waits for the replace to commit.
   */
  const [startedRun, setStartedRun] = useState<string | null>(null);
  useEffect(() => {
    if (startedRun) {
      navigate(`/runs/${startedRun}`, { state: { intake: lastIntake.current } });
    }
  }, [startedRun, navigate]);
  /** What was submitted, for the navigation that happens a render later. */
  const lastIntake = useRef<Record<string, unknown>>({});
  const createRun = useCreateRun();
  const provinces = useProvinces();
  /**
   * The two-digit province code DPT keys its city plans by (docs/adr/0008). Taken from the area
   * the reader already chose rather than from the pin: the pin can land across a boundary, and a
   * neighbouring province's plan shown under their own land would be worse than none.
   */
  const zoningProvinceCode =
    provinces.data
      ?.find((province) => province.id === provinceId)
      ?.code.toString()
      .padStart(2, "0") ?? null;
  const districts = useDistricts(provinceId || undefined);
  const subdistricts = useSubdistricts(districtId || undefined);

  /**
   * The carried-in area, as the picker's confirmation needs it.
   *
   * Fetched rather than reconstructed from the three ids: the confirmation prints how many figures
   * the area holds, and inventing zeros there would put "ไม่มีข้อมูลทรัพย์สิน" under a place the
   * reader has just seen a land price for.
   */
  const carriedArea = useAreaChoice(areaCleared ? undefined : asField(prefill.subdistrict_id));
  const selectedArea = picked ?? (areaCleared ? null : (carriedArea.data ?? null));
  const areaCentre = useAreaCentre(subdistrictId || undefined).data ?? null;

  // Selecting a parent invalidates its children.
  function selectProvince(id: string) {
    setProvinceId(id);
    setDistrictId("");
    setSubdistrictId("");
  }
  function selectDistrict(id: string) {
    setDistrictId(id);
    setSubdistrictId("");
  }

  const areaSummary = areaSummaryTh(
    optional.land_area_rai,
    optional.land_area_ngan,
    optional.land_area_wa,
  );

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!provinceId) nextErrors.province_id = th.validation.provinceRequired;
    if (!districtId) nextErrors.district_id = th.validation.districtRequired;
    if (!subdistrictId) nextErrors.subdistrict_id = th.validation.subdistrictRequired;
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    // Optional fields are omitted when blank rather than sent as empty strings: an absent fact is
    // not the same as a fact asserted to be empty.
    const optionalPayload = Object.fromEntries(
      Object.entries(optional).filter(([, v]) => v.trim() !== ""),
    );
    // Site facts follow the same rule: a measurement not taken is absent, never zero.
    const sitePayload = Object.fromEntries(Object.entries(site).filter(([, v]) => v.trim() !== ""));

    const intake = {
      province_id: provinceId,
      district_id: districtId,
      subdistrict_id: subdistrictId,
      ...optionalPayload,
      ...sitePayload,
      ...(nearLargeWater ? { near_large_water_body: true } : {}),
      // Carried so a retry, or a trip back to this form from a result, keeps the pin.
      ...(pin ? { latitude: pin.latitude, longitude: pin.longitude } : {}),
    };

    lastIntake.current = intake;
    createRun.mutate(intake, {
      /**
       * The intake travels in router state, never in storage: it is what a retry has to repeat,
       * and it lives exactly as long as these history entries do.
       *
       * It is written onto *this* screen's entry as well as the run's, and that is the whole point
       * of the two steps. The browser's Back button does not re-run this form — it restores the
       * entry the reader arrived from, and that entry was stamped before they had filled anything
       * in. So Back landed on a blank first screen: the area gone, the pin gone, and with the pin
       * the map, the city-plan colours and the key they had been reading. Stamping the entry first
       * is what makes Back return the screen they left.
       */
      onSuccess: (run) => {
        navigate(".", { replace: true, state: { intake } });
        setStartedRun(run.run_id);
      },
    });
  }

  return (
    <form onSubmit={handleSubmit} className="glass rounded-card p-6 md:p-8" noValidate>
      <h2 className="font-bold text-xl tracking-tight">{th.intake.heading}</h2>
      <p className="mt-2 text-ink-muted text-sm">{th.intake.description}</p>

      {/*
        Step one: where, asked once.

        The form grew three ways to answer that question — pick an area, look a parcel up, drop a
        pin — sitting one under another with nothing saying they were alternatives. Readers filled
        in all three. They are now two labelled choices, and a successful parcel lookup fills the
        area itself, so the question is answered once however it is reached.
      */}
      <section className="mt-6">
        <h3 className="font-semibold text-sm">{th.intake.stepOne}</h3>

        <div className="mt-2 inline-flex rounded-pill bg-surface-sunken p-1">
          {(
            [
              ["area", th.intake.modeArea],
              ["parcel", th.intake.modeParcel],
            ] as const
          ).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              onClick={() => setLocateMode(mode)}
              aria-pressed={locateMode === mode}
              className="rounded-pill px-4 py-1.5 font-medium text-sm"
              style={
                locateMode === mode
                  ? {
                      backgroundColor: "var(--color-signature)",
                      color: "var(--color-signature-on)",
                    }
                  : { color: "var(--color-ink-muted)" }
              }
            >
              {label}
            </button>
          ))}
        </div>

        {locateMode === "parcel" && (
          <ParcelLookup
            onFound={(found) => {
              // The lookup knows the area, so the reader is not asked for it again.
              if (found.provinceId && found.districtId && found.subdistrictId) {
                setProvinceId(found.provinceId);
                setDistrictId(found.districtId);
                setSubdistrictId(found.subdistrictId);
                setPicked(null);
                setAreaCleared(false);
                setErrors((current) => ({ ...current, subdistrict_id: "" }));
              }
              if (found.point) {
                setPin(found.point);
                setShowMap(true);
              }
              setOptional((current) => ({
                ...current,
                land_area_rai: found.rai,
                land_area_ngan: found.ngan,
                land_area_wa: found.wa,
              }));
              setShowArea(true);
            }}
          />
        )}

        {/* Shown in both modes: in area mode it is the picker, and after a parcel hit it is the
            confirmation of what the lookup filled in, which the reader can still change. */}
        <div className={locateMode === "parcel" ? "mt-4" : "mt-3"}>
          <AreaPicker
            selected={selectedArea}
            onPick={(choice) => {
              setPicked(choice);
              setAreaCleared(false);
              setProvinceId(choice.province_id);
              setDistrictId(choice.district_id);
              setSubdistrictId(choice.subdistrict_id);
              setErrors((current) => ({ ...current, subdistrict_id: "" }));
            }}
            onClear={() => {
              setPicked(null);
              setAreaCleared(true);
              setProvinceId("");
              setDistrictId("");
              setSubdistrictId("");
            }}
            {...(errors.subdistrict_id ? { errorMessage: errors.subdistrict_id } : {})}
            fallback={
              <div className="grid gap-4 md:grid-cols-3">
                <AreaSelect
                  label={th.intake.provinceLabel}
                  placeholder={th.intake.provincePlaceholder}
                  options={provinces.data}
                  value={provinceId}
                  onChange={selectProvince}
                  isLoading={provinces.isLoading}
                  isError={provinces.isError}
                  onRetry={() => provinces.refetch()}
                  errorMessage={errors.province_id}
                />

                <AreaSelect
                  label={th.intake.districtLabel}
                  placeholder={th.intake.districtPlaceholder}
                  disabledHint={th.intake.districtDisabledHint}
                  options={districts.data}
                  value={districtId}
                  onChange={selectDistrict}
                  disabled={!provinceId}
                  isLoading={districts.isLoading && Boolean(provinceId)}
                  isError={districts.isError}
                  onRetry={() => districts.refetch()}
                  errorMessage={errors.district_id}
                />

                <AreaSelect
                  label={th.intake.subdistrictLabel}
                  placeholder={th.intake.subdistrictPlaceholder}
                  disabledHint={th.intake.subdistrictDisabledHint}
                  options={subdistricts.data}
                  value={subdistrictId}
                  onChange={setSubdistrictId}
                  disabled={!districtId}
                  isLoading={subdistricts.isLoading && Boolean(districtId)}
                  isError={subdistricts.isError}
                  onRetry={() => subdistricts.refetch()}
                  errorMessage={errors.subdistrict_id}
                />
              </div>
            }
          />
        </div>
      </section>

      {/* Step two: everything optional, said so in the heading rather than three times over. */}
      <section className="mt-8 border-border border-t pt-6">
        <h3 className="font-semibold text-sm">{th.intake.stepTwo}</h3>
        <p className="mt-1 text-ink-muted text-xs leading-relaxed">{th.intake.stepTwoNote}</p>

        {/* The three optional subjects as one row, each saying what it is for.
            They were three toggles stacked down the page with nothing but their own names, so a
            reader had to open each one to find out whether it was worth opening. The panels still
            open full width underneath, because a map squeezed into a third of the page is not a
            map. */}
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {(
            [
              [
                showSite,
                setShowSite,
                th.intake.siteToggle,
                th.intake.siteCardHint,
                Ruler,
                site.road_width !== "" || site.water_body_width !== "" || nearLargeWater,
              ],
              [
                showArea,
                setShowArea,
                th.intake.areaToggle,
                th.intake.areaCardHint,
                Maximize2,
                Object.values(optional).some((value) => value !== ""),
              ],
              [showMap, setShowMap, th.map.heading, th.intake.mapCardHint, MapPin, pin !== null],
            ] as const
          ).map(([open, setOpen, label, hint, Icon, filled]) => (
            <button
              key={label}
              type="button"
              onClick={() => setOpen((current) => !current)}
              aria-expanded={open}
              className="rounded-card border p-4 text-left transition-colors"
              style={{
                borderColor: open ? "var(--color-signature)" : "var(--color-border-strong)",
                backgroundColor: open ? "var(--color-signature-wash)" : "transparent",
              }}
            >
              <span className="flex items-center gap-2 font-semibold text-sm">
                <Icon size={15} className="shrink-0" aria-hidden="true" />
                {label}
                {open ? (
                  <ChevronDown size={15} className="ml-auto shrink-0" aria-hidden="true" />
                ) : (
                  <Plus size={15} className="ml-auto shrink-0" aria-hidden="true" />
                )}
              </span>
              <span className="mt-1 block text-ink-muted text-xs leading-relaxed">{hint}</span>
              {filled && (
                <span className="mt-1.5 block font-medium text-signature-text text-xs">
                  {th.intake.cardFilled}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {showSite && (
            <div className="mt-4 rounded-card bg-surface-sunken p-5">
              <p className="mb-4 flex items-start gap-2 text-ink-muted text-sm">
                <Info size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
                {th.intake.siteHelp}
              </p>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className="font-medium text-sm">{th.intake.roadWidthLabel}</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    value={site.road_width}
                    onChange={(e) => setSite((s) => ({ ...s, road_width: e.target.value }))}
                    className="rounded-card border border-border-strong bg-surface px-4 py-3 text-base text-ink"
                  />
                  <span className="text-ink-muted text-xs">{th.intake.roadWidthHelp}</span>
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="font-medium text-sm">{th.intake.waterWidthLabel}</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    value={site.water_body_width}
                    onChange={(e) => setSite((s) => ({ ...s, water_body_width: e.target.value }))}
                    className="rounded-card border border-border-strong bg-surface px-4 py-3 text-base text-ink"
                  />
                  <span className="text-ink-muted text-xs">{th.intake.waterWidthHelp}</span>
                </label>
              </div>

              <label className="mt-4 flex items-center gap-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={nearLargeWater}
                  onChange={(e) => setNearLargeWater(e.target.checked)}
                  className="size-4 accent-[var(--color-signature)]"
                />
                {th.intake.nearLargeWaterLabel}
              </label>
            </div>
          )}
        </div>

        <div className="mt-4">
          {showArea && (
            <div className="mt-4 rounded-card bg-surface-sunken p-5">
              <p className="mb-4 flex items-start gap-2 text-ink-muted text-sm">
                <Info size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
                {th.intake.areaHelp}
              </p>
              <fieldset>
                <legend className="mb-1.5 font-medium text-sm">{th.intake.landAreaLabel}</legend>
                <div className="grid grid-cols-3 gap-3">
                  {(
                    [
                      ["land_area_rai", th.intake.raiUnit],
                      ["land_area_ngan", th.intake.nganUnit],
                      ["land_area_wa", th.intake.waUnit],
                    ] as const
                  ).map(([key, unit]) => (
                    <label key={key} className="flex flex-col gap-1">
                      <span className="text-ink-muted text-xs">{unit}</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="any"
                        value={optional[key]}
                        onChange={(e) => setOptional((o) => ({ ...o, [key]: e.target.value }))}
                        className="rounded-card border border-border-strong bg-surface px-3 py-2.5 text-base text-ink"
                      />
                    </label>
                  ))}
                </div>
              </fieldset>
              {/* The statutory conversion, shown as it is typed, so the number is checkable. */}
              {areaSummary && <p className="mt-2 text-ink-muted text-sm">{areaSummary}</p>}
            </div>
          )}
        </div>

        {/* The map folds away too. It is the heaviest thing on the page and most readers never
            need it: a parcel lookup places the pin for them, and an area-level run needs none. */}
        <div className="mt-4">
          {showMap && (
            <div className="mt-4 rounded-card bg-surface-sunken p-5">
              <p className="mb-3 text-ink-muted text-xs leading-relaxed">{th.map.intro}</p>
              <LandPinMap
                centre={areaCentre}
                value={pin}
                onChange={setPin}
                zoningProvinceCode={zoningProvinceCode}
              />
              {pin && (
                <>
                  <p className="mt-2 flex items-start gap-2 text-ink-muted text-xs leading-relaxed">
                    <Info size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
                    {th.map.assertedNote}
                  </p>
                  <ZoningPanel point={pin} provinceCode={zoningProvinceCode} />
                  <ProximityPanel point={pin} />
                </>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Scope is set by the evidence available, so say up front what the answer can claim. */}
      <div
        className="mt-8 rounded-card p-4 text-sm"
        style={{
          backgroundColor: "var(--color-signature-wash)",
          color: "var(--color-signature-text)",
        }}
      >
        <p className="font-semibold">{th.intake.scopeNoticeTitle}</p>
        <p className="mt-1">{th.intake.scopeNoticeArea}</p>
      </div>

      {createRun.isError && <p className="mt-4 text-fail text-sm">{th.error.generic}</p>}

      <button
        type="submit"
        disabled={createRun.isPending}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-pill px-7 py-3.5 font-bold text-base text-white disabled:opacity-60 md:w-auto"
        style={{
          background:
            "linear-gradient(120deg, var(--grad-deep-from), var(--grad-deep-via), var(--grad-deep-to))",
        }}
      >
        {createRun.isPending ? th.intake.submitting : th.intake.submit}
        <ArrowRight size={18} strokeWidth={2.5} aria-hidden="true" />
      </button>
    </form>
  );
}
