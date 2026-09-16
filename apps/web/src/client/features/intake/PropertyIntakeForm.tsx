import { th } from "@reis/i18n";
import { ArrowRight, ChevronDown, Info, Plus } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { useCreateRun } from "../run/useAnalysisRun.js";
import { type AreaChoice, AreaPicker } from "./AreaPicker.js";
import { AreaSelect } from "./AreaSelect.js";
import { useDistricts, useProvinces, useSubdistricts } from "./useAdministrativeAreas.js";

/**
 * Progressive property intake (docs/project-overview.md §7). The minimum is province → district →
 * subdistrict; everything else is optional and only narrows the output scope.
 *
 * Choosing a parent clears its children, so an intake can never carry a subdistrict that does not
 * belong to the selected district. The server re-checks the chain against the reference table
 * regardless, because this form is not the only way to reach the API.
 */

interface SiteFields {
  road_width: string;
  water_body_width: string;
}

const EMPTY_SITE: SiteFields = { road_width: "", water_body_width: "" };

interface OptionalFields {
  address_line: string;
  title_deed_number: string;
  map_sheet: string;
  land_number: string;
  land_area_rai: string;
  land_area_ngan: string;
  land_area_wa: string;
}

const EMPTY_OPTIONAL: OptionalFields = {
  address_line: "",
  title_deed_number: "",
  map_sheet: "",
  land_number: "",
  land_area_rai: "",
  land_area_ngan: "",
  land_area_wa: "",
};

function OptionalTextField({
  label,
  value,
  placeholder,
  help,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  /** What this thing is, in words someone who has never opened a title deed can follow. */
  help?: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-medium text-sm">{label}</span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-card border border-border-strong bg-surface px-4 py-3 text-base text-ink placeholder:text-ink-muted"
      />
      {help && <span className="text-ink-muted text-xs leading-relaxed">{help}</span>}
    </label>
  );
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

export function PropertyIntakeForm() {
  const [provinceId, setProvinceId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [subdistrictId, setSubdistrictId] = useState("");
  /**
   * The place the reader picked by name, kept whole so the confirmation can show it without
   * refetching. Browsing the cascading lists instead leaves this null and fills the three ids.
   */
  const [picked, setPicked] = useState<AreaChoice | null>(null);
  const [optional, setOptional] = useState<OptionalFields>(EMPTY_OPTIONAL);
  const [showOptional, setShowOptional] = useState(false);
  const [showArea, setShowArea] = useState(false);
  const [site, setSite] = useState<SiteFields>(EMPTY_SITE);
  const [nearLargeWater, setNearLargeWater] = useState(false);
  const [showSite, setShowSite] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const navigate = useNavigate();
  const createRun = useCreateRun();
  const provinces = useProvinces();
  const districts = useDistricts(provinceId || undefined);
  const subdistricts = useSubdistricts(districtId || undefined);

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

  const hasPropertyDetail =
    optional.title_deed_number.trim() !== "" ||
    optional.map_sheet.trim() !== "" ||
    optional.land_number.trim() !== "" ||
    optional.address_line.trim() !== "";

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
    };

    createRun.mutate(intake, {
      // The intake travels in router state, never in storage: it is what a retry has to repeat,
      // and it lives exactly as long as this navigation does.
      onSuccess: (run) => navigate(`/runs/${run.run_id}`, { state: { intake } }),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="glass rounded-card p-6 md:p-8" noValidate>
      <h2 className="font-bold text-xl tracking-tight">{th.intake.heading}</h2>
      <p className="mt-2 text-ink-muted text-sm">{th.intake.description}</p>

      <div className="mt-6">
        <AreaPicker
          selected={picked}
          onPick={(choice) => {
            setPicked(choice);
            setProvinceId(choice.province_id);
            setDistrictId(choice.district_id);
            setSubdistrictId(choice.subdistrict_id);
            setErrors((current) => ({ ...current, subdistrict_id: "" }));
          }}
          onClear={() => {
            setPicked(null);
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

      <div className="mt-6">
        <button
          type="button"
          onClick={() => setShowSite((open) => !open)}
          aria-expanded={showSite}
          className="flex items-center gap-2 font-medium text-signature-text text-sm"
        >
          {showSite ? <ChevronDown size={16} /> : <Plus size={16} />}
          {th.intake.siteToggle}
        </button>

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

      <div className="mt-6">
        <button
          type="button"
          onClick={() => setShowArea((open) => !open)}
          aria-expanded={showArea}
          className="flex items-center gap-2 font-medium text-signature-text text-sm"
        >
          {showArea ? <ChevronDown size={16} /> : <Plus size={16} />}
          {th.intake.areaToggle}
        </button>

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

      <div className="mt-6">
        <button
          type="button"
          onClick={() => setShowOptional((open) => !open)}
          aria-expanded={showOptional}
          className="flex items-center gap-2 font-medium text-signature-text text-sm"
        >
          {showOptional ? <ChevronDown size={16} /> : <Plus size={16} />}
          {th.intake.optionalToggle}
        </button>

        {showOptional && (
          <div className="mt-4 rounded-card bg-surface-sunken p-5">
            <p className="mb-4 flex items-start gap-2 text-ink-muted text-sm">
              <Info size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
              {th.intake.optionalHelp}
            </p>
            {/* Said plainly: this asks for a document nobody carries, and today it buys little. */}
            <p className="-mt-2 mb-4 flex items-start gap-2 text-ink-muted text-xs leading-relaxed">
              <Info size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
              {th.intake.optionalHonesty}
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              <OptionalTextField
                label={th.intake.addressLabel}
                placeholder={th.intake.addressPlaceholder}
                value={optional.address_line}
                onChange={(v) => setOptional((o) => ({ ...o, address_line: v }))}
              />
              <OptionalTextField
                label={th.intake.titleDeedLabel}
                value={optional.title_deed_number}
                help={th.intake.titleDeedHelp}
                onChange={(v) => setOptional((o) => ({ ...o, title_deed_number: v }))}
              />
              <OptionalTextField
                label={th.intake.mapSheetLabel}
                placeholder={th.intake.mapSheetPlaceholder}
                help={th.intake.mapSheetHelp}
                value={optional.map_sheet}
                onChange={(v) => setOptional((o) => ({ ...o, map_sheet: v }))}
              />
              <OptionalTextField
                label={th.intake.landNumberLabel}
                help={th.intake.landNumberHelp}
                value={optional.land_number}
                onChange={(v) => setOptional((o) => ({ ...o, land_number: v }))}
              />
            </div>
          </div>
        )}
      </div>

      {/* Scope is set by the evidence available, so say up front what the answer can claim. */}
      <div
        className="mt-6 rounded-card p-4 text-sm"
        style={{
          backgroundColor: "var(--color-signature-wash)",
          color: "var(--color-signature-text)",
        }}
      >
        <p className="font-semibold">{th.intake.scopeNoticeTitle}</p>
        <p className="mt-1">
          {hasPropertyDetail ? th.intake.scopeNoticeProperty : th.intake.scopeNoticeArea}
        </p>
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
