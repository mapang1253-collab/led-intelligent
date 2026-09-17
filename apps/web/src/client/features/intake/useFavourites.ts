import { useCallback, useEffect, useState } from "react";
import type { AreaChoice } from "./AreaPicker.js";

/**
 * Places the reader marked as worth a look, kept in their own browser.
 *
 * What this deliberately is not: an account, a profile, or a history of results. The product's
 * anonymity and its 24-hour expiry are locked decisions (docs/project-overview.md §38), and no run
 * id, no analysis and no result of any kind is stored here — only which administrative areas someone
 * was interested in, which is a list they typed themselves and could rewrite from memory. It never
 * reaches the server, cannot be shared or exported, and clearing site data ends it.
 *
 * Reads and writes are guarded because private windows and blocked storage make both throw, and a
 * shortlist is not worth a blank screen. The count is capped so a runaway loop cannot fill a
 * reader's storage quota on their behalf.
 */

const KEY = "reis.favourites";
const LIMIT = 40;

/** Only what a row needs to render, so the list stays readable without a round trip. */
export interface Favourite {
  readonly subdistrict_id: string;
  readonly subdistrict_name_th: string;
  /* The whole chain, so choosing a saved place needs no lookup and works offline from the list. */
  readonly district_id: string;
  readonly district_name_th: string;
  readonly province_id: string;
  readonly province_name_th: string;
  readonly condominium_figures: number;
  readonly land_figures: number;
}

function read(): Favourite[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    if (!Array.isArray(parsed)) {
      return [];
    }
    // Written by an older version of this app, or by hand. Anything without an id is unusable.
    return parsed.filter(
      (entry): entry is Favourite =>
        typeof entry === "object" &&
        entry !== null &&
        typeof Reflect.get(entry, "subdistrict_id") === "string" &&
        typeof Reflect.get(entry, "district_id") === "string" &&
        typeof Reflect.get(entry, "province_id") === "string",
    );
  } catch {
    return [];
  }
}

function write(list: readonly Favourite[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, LIMIT)));
  } catch {
    // Out of quota, or storage blocked. The list still works for this session.
  }
}

export function toFavourite(choice: AreaChoice): Favourite {
  return {
    subdistrict_id: choice.subdistrict_id,
    subdistrict_name_th: choice.subdistrict_name_th,
    district_id: choice.district_id,
    district_name_th: choice.district_name_th,
    province_id: choice.province_id,
    province_name_th: choice.province_name_th,
    condominium_figures: choice.condominium_figures,
    land_figures: choice.land_figures,
  };
}

export function useFavourites() {
  const [list, setList] = useState<Favourite[]>(read);

  // Two tabs open on the same shortlist should not disagree about what is in it.
  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key === KEY) {
        setList(read());
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const toggle = useCallback((choice: AreaChoice) => {
    setList((current) => {
      const next = current.some((entry) => entry.subdistrict_id === choice.subdistrict_id)
        ? current.filter((entry) => entry.subdistrict_id !== choice.subdistrict_id)
        : [toFavourite(choice), ...current].slice(0, LIMIT);
      write(next);
      return next;
    });
  }, []);

  const has = useCallback(
    (id: string) => list.some((entry) => entry.subdistrict_id === id),
    [list],
  );

  return { list, toggle, has };
}
