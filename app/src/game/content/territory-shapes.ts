import { cityNotes } from './atlas';
import { regionIds, type RegionId } from './world';
type Point = [number, number];
/** Voronoi cells clipped in SVG to each historical coastline. Every city owns a real map area. */
export function territoryShapes(region: RegionId) {
  const cities = cityNotes(region);
  return cities.map(city => {
    let polygon: Point[] = [[0, 0], [1440, 0], [1440, 850], [0, 850]];
    for (const other of cities) {
      if (other.name === city.name) continue;
      const a = 2 * (other.x - city.x), b = 2 * (other.y - city.y);
      const limit = other.x ** 2 + other.y ** 2 - city.x ** 2 - city.y ** 2;
      const value = (p: Point) => a * p[0] + b * p[1] - limit;
      const next: Point[] = [];
      for (let i = 0; i < polygon.length; i++) {
        const from = polygon[i], to = polygon[(i + 1) % polygon.length];
        const v = value(from), w = value(to);
        if (v <= 0) next.push(from);
        if ((v <= 0) !== (w <= 0)) {
          const fraction = v / (v - w);
          next.push([from[0] + (to[0] - from[0]) * fraction, from[1] + (to[1] - from[1]) * fraction]);
        }
      }
      polygon = next;
    }
    return { name: city.name, points: polygon.map(point => point.join(',')).join(' ') };
  });
}
export const territories = Object.fromEntries(regionIds.map(id => [id, territoryShapes(id)])) as Record<RegionId, ReturnType<typeof territoryShapes>>;
