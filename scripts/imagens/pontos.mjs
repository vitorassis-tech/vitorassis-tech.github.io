// Pré-calcula os pontos de terra (para globo e mapa) a partir do Natural Earth (world-atlas, domínio público)
import { readFileSync, writeFileSync } from 'node:fs';
import { feature } from 'topojson-client';
import { geoContains } from 'd3-geo';
const topo = JSON.parse(readFileSync('node_modules/world-atlas/land-110m.json', 'utf8'));
const land = feature(topo, topo.objects.land);
function grade(passo) {
  const pts = [];
  for (let lat = -58; lat <= 82; lat += passo) {
    // espaçamento em longitude ajustado pela latitude, para densidade uniforme na esfera
    const pl = passo / Math.max(Math.cos((lat * Math.PI) / 180), 0.2);
    for (let lon = -180; lon < 180; lon += pl) if (geoContains(land, [lon, lat])) pts.push([+lon.toFixed(3), +lat.toFixed(3)]);
  }
  return pts;
}
const globo = grade(0.9);
writeFileSync('pontos-globo.json', JSON.stringify(globo));
// mapa plano: grade regular em lon/lat
const mapa = [];
for (let lat = -56; lat <= 80; lat += 1.15) for (let lon = -170; lon < 190; lon += 1.15) if (geoContains(land, [lon > 180 ? lon - 360 : lon, lat])) mapa.push([lon, lat]);
writeFileSync('pontos-mapa.json', JSON.stringify(mapa));
console.log('globo', globo.length, 'mapa', mapa.length);
