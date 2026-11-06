import { FONDS, getFond, pointAncienSchema } from '../data/fonds';
import type { BodyMark, Dessin, FieldValue, Trait } from '../types';

export interface Sensation {
  id: string;
  label: string;
  couleur: string;
  /** Motif du trait, pour rester lisible en noir et blanc et pour les daltoniens. */
  motif?: number[];
  cotable: boolean;
}

export const SENSATIONS: Sensation[] = [
  { id: 'vive', label: 'Douleur vive', couleur: '#e03131', cotable: true },
  { id: 'sourde', label: 'Douleur sourde', couleur: '#f76707', motif: [3, 1.6], cotable: true },
  { id: 'brulure', label: 'Brûlure', couleur: '#c2255c', motif: [1, 1.8, 3, 1.8], cotable: true },
  { id: 'fourmillements', label: 'Fourmillements', couleur: '#2b8a3e', motif: [0.1, 1.9], cotable: true },
  { id: 'engourdissement', label: 'Engourdissement', couleur: '#1971c2', motif: [1.6, 1.6], cotable: true },
  { id: 'raideur', label: 'Raideur', couleur: '#7048e8', motif: [5, 1.6, 1, 1.6], cotable: true },
  { id: 'cicatrice', label: 'Cicatrice', couleur: '#343a40', cotable: false },
];

export const getSensation = (id: string) => SENSATIONS.find((s) => s.id === id) ?? SENSATIONS[0];

const ANCIENNES_SENSATIONS: Record<BodyMark['kind'], string> = {
  douleur: 'vive',
  raideur: 'raideur',
  paresthesie: 'fourmillements',
  cicatrice: 'cicatrice',
};

export const estDessin = (v: unknown): v is Dessin => typeof v === 'object' && v !== null && !Array.isArray(v) && Array.isArray((v as Dessin).traits);

const estAncienSchema = (v: unknown): v is BodyMark[] => Array.isArray(v) && v.length > 0 && typeof v[0] === 'object' && v[0] !== null && 'view' in v[0];

/** Lit la valeur d'un champ, y compris les points de l'ancien schéma. */
export function lireDessin(v: FieldValue | undefined): Dessin {
  if (estDessin(v)) return v;
  if (estAncienSchema(v)) {
    return {
      traits: v.map((m) => ({
        id: m.id,
        fond: 'corps',
        sensation: ANCIENNES_SENSATIONS[m.kind],
        outil: 'trait',
        epaisseur: 12,
        intensite: m.kind === 'cicatrice' ? null : m.intensite,
        points: pointAncienSchema(m.view, m.x, m.y),
      })),
    };
  }
  return { traits: [] };
}

/** Réduit les points trop proches d'un tracé, en gardant le dernier. */
export function simplifier(points: number[], ecartMin = 1.5): number[] {
  if (points.length <= 4) return points;
  const sortie = [points[0], points[1]];
  for (let i = 2; i < points.length - 2; i += 2) {
    if (Math.hypot(points[i] - sortie[sortie.length - 2], points[i + 1] - sortie[sortie.length - 1]) >= ecartMin) sortie.push(points[i], points[i + 1]);
  }
  sortie.push(points[points.length - 2], points[points.length - 1]);
  return sortie.map((v) => Math.round(v * 10) / 10);
}

/** Courbe douce passant par les milieux des segments. */
export function cheminTrait(points: number[], ferme = false): string {
  const [x0, y0] = points;
  if (points.length <= 2) return `M${x0} ${y0}l0.01 0`;
  let d = `M${x0} ${y0}`;
  for (let i = 2; i < points.length - 2; i += 2) {
    const mx = (points[i] + points[i + 2]) / 2;
    const my = (points[i + 1] + points[i + 3]) / 2;
    d += `Q${points[i]} ${points[i + 1]} ${Math.round(mx * 10) / 10} ${Math.round(my * 10) / 10}`;
  }
  d += `L${points[points.length - 2]} ${points[points.length - 1]}`;
  return ferme ? `${d}Z` : d;
}

function dansPolygone(x: number, y: number, p: number[]): boolean {
  let dedans = false;
  for (let i = 0, j = p.length - 2; i < p.length; j = i, i += 2) {
    if (p[i + 1] > y !== p[j + 1] > y && x < ((p[j] - p[i]) * (y - p[i + 1])) / (p[j + 1] - p[i + 1]) + p[i]) dedans = !dedans;
  }
  return dedans;
}

function distanceSegment(x: number, y: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const l = dx * dx + dy * dy;
  const t = l === 0 ? 0 : Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l));
  return Math.hypot(x - ax - t * dx, y - ay - t * dy);
}

/** Le point touche-t-il ce tracé, à la tolérance près ? */
export function toucheTrait(t: Trait, x: number, y: number, tolerance: number): boolean {
  if (t.outil === 'zone' && t.points.length >= 6 && dansPolygone(x, y, t.points)) return true;
  const portee = tolerance + t.epaisseur / 2;
  const p = t.points;
  if (p.length === 2) return Math.hypot(x - p[0], y - p[1]) <= portee;
  for (let i = 0; i < p.length - 2; i += 2) {
    if (distanceSegment(x, y, p[i], p[i + 1], p[i + 2], p[i + 3]) <= portee) return true;
  }
  return false;
}

export const opaciteTrait = (t: Pick<Trait, 'intensite'>) => (t.intensite === null ? 0.9 : 0.5 + (t.intensite / 10) * 0.5);

/** Attributs SVG d'un tracé. */
export function styleTrait(t: Pick<Trait, 'sensation' | 'outil' | 'epaisseur' | 'intensite'>) {
  const s = getSensation(t.sensation);
  const opacite = opaciteTrait(t);
  const zone = t.outil === 'zone';
  const largeur = zone ? 2.5 : t.epaisseur;
  return {
    stroke: s.couleur,
    strokeWidth: largeur,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeOpacity: zone ? 0.9 : opacite,
    strokeDasharray: s.motif?.map((m) => m * largeur).join(' '),
    fill: zone ? s.couleur : 'none',
    fillOpacity: zone ? opacite * 0.42 : undefined,
  };
}

/** Régions traversées par un tracé, de la plus touchée à la moins touchée. */
function zonesDuTrait(t: Trait): string[] {
  const fond = getFond(t.fond);
  const comptes = new Map<string, number>();
  for (let i = 0; i < t.points.length; i += 2) {
    const z = fond.zoneDe(t.points[i], t.points[i + 1]);
    if (z) comptes.set(z, (comptes.get(z) ?? 0) + 1);
  }
  const total = [...comptes.values()].reduce((s, n) => s + n, 0);
  return [...comptes.entries()]
    .filter(([, n]) => n / total >= 0.12)
    .sort((a, b) => b[1] - a[1])
    .map(([z]) => z);
}

export interface LigneResume {
  sensation: Sensation;
  zones: string[];
  intensiteMax: number | null;
  traits: number;
}

/** Synthèse d'un dessin par sensation, dans l'ordre de la légende. */
export function resumerDessin(d: Dessin): LigneResume[] {
  return SENSATIONS.flatMap((sensation) => {
    const traits = d.traits.filter((t) => t.sensation === sensation.id);
    if (!traits.length) return [];
    const intensites = traits.flatMap((t) => (t.intensite === null ? [] : [t.intensite]));
    return [
      {
        sensation,
        traits: traits.length,
        zones: [...new Set(traits.flatMap(zonesDuTrait))],
        intensiteMax: intensites.length ? Math.max(...intensites) : null,
      },
    ];
  });
}

export function texteDessin(d: Dessin): string {
  return resumerDessin(d)
    .map((l) => {
      const intensite = l.intensiteMax === null ? '' : ` ${l.intensiteMax}/10`;
      const zones = l.zones.length ? ` : ${l.zones.join(', ')}` : '';
      return `${l.sensation.label}${intensite}${zones}`;
    })
    .join(' ; ');
}

export const fondsUtilises = (d: Dessin) => FONDS.filter((f) => d.traits.some((t) => t.fond === f.id));
