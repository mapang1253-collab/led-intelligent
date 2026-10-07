import L from "leaflet";

/**
 * DPT's own rendering of the city plan, as tiles (docs/adr/0008).
 *
 * Their ArcGIS service draws an arbitrary extent rather than a tile pyramid, so each tile is
 * requested as the image for its own bounding box in Web Mercator metres. The alternative was to
 * fetch the polygons and colour them here, which would have meant re-implementing a ministerial
 * regulation's symbology — and being wrong about it somewhere no one would notice.
 *
 * Shared by the two maps that draw it: the one the reader places a pin on, and the read-only one
 * beside the result. One copy, so a fix to the projection arithmetic cannot reach only one of them.
 */

const ZONING_TILE_ROOT = "https://dptgis.dpt.go.th/arcgis/rest/services/dds2";

const ZoningTiles = L.TileLayer.extend({
  getTileUrl(this: L.TileLayer & { _map: L.Map }, coords: L.Coords) {
    const size = this.getTileSize();
    const nw = this._map.unproject(coords.scaleBy(size), coords.z);
    const se = this._map.unproject(coords.add(new L.Point(1, 1)).scaleBy(size), coords.z);
    const min = L.CRS.EPSG3857.project(se);
    const max = L.CRS.EPSG3857.project(nw);
    return `${ZONING_TILE_ROOT}/PLLU${(this.options as { provinceCode: string }).provinceCode}/MapServer/export?bbox=${min.x},${min.y},${max.x},${max.y}&bboxSR=3857&imageSR=3857&size=256,256&format=png32&transparent=true&f=image`;
  },
});

/** The overlay for one province's plan. Translucent, because what is under it still matters. */
export function zoningTileLayer(provinceCode: string): L.TileLayer {
  return new (
    ZoningTiles as unknown as new (
      url: string,
      options: L.TileLayerOptions & { provinceCode: string },
    ) => L.TileLayer
  )("", {
    provinceCode,
    opacity: 0.55,
    maxZoom: 19,
    attribution: "กรมโยธาธิการและผังเมือง",
  });
}
