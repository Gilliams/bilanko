/**
 * Fonds de dessin du schéma corporel : tracés originaux, générés à partir de
 * listes de points lissées (Catmull-Rom), pour rester simples à ajuster.
 */

export type Point = [number, number];

export interface Forme {
  d: string;
  /** Épaisseur pour une forme tracée (doigts, orteils). Absent : forme pleine. */
  largeur?: number;
}

export interface Repere {
  x: number;
  y: number;
  texte: string;
  discret?: boolean;
}

export interface Fond {
  id: string;
  label: string;
  largeur: number;
  hauteur: number;
  formes: Forme[];
  details: string[];
  reperes: Repere[];
  /** Nom de la région sous un point, pour le compte rendu. */
  zoneDe: (x: number, y: number) => string | null;
}

/** Courbe lissée passant par tous les points. */
export function lisser(points: Point[], ferme = false): string {
  const n = points.length;
  const p = (i: number): Point => (ferme ? points[(i + n) % n] : points[Math.max(0, Math.min(n - 1, i))]);
  const r = (v: number) => Math.round(v * 10) / 10;
  let d = `M${r(points[0][0])} ${r(points[0][1])}`;
  const segments = ferme ? n : n - 1;
  for (let i = 0; i < segments; i++) {
    const [p0, p1, p2, p3] = [p(i - 1), p(i), p(i + 1), p(i + 2)];
    const c1: Point = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Point = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${r(c1[0])} ${r(c1[1])} ${r(c2[0])} ${r(c2[1])} ${r(p2[0])} ${r(p2[1])}`;
  }
  return ferme ? `${d}Z` : d;
}

/** Contour symétrique à partir d'une moitié, décrite du haut vers le bas. */
function symetrique(moitie: Point[], cx: number, dy: number): string {
  const droite = moitie.map(([x, y]): Point => [cx + x, y + dy]);
  const gauche = [...moitie]
    .reverse()
    .filter(([x]) => x !== 0)
    .map(([x, y]): Point => [cx - x, y + dy]);
  return lisser([...droite, ...gauche], true);
}

const decaler = (points: Point[], dx: number, dy: number, sx = 1, sy = sx) => points.map(([x, y]): Point => [x * sx + dx, y * sy + dy]);

/* ------------------------------------------------------------------ */
/* Corps entier                                                        */
/* ------------------------------------------------------------------ */

const CORPS: Point[] = [
  [0, 0], [13, 2], [22, 10], [25, 24], [23, 38], [17, 50], [13, 57], [13, 66],
  [22, 73], [38, 78], [52, 83], [62, 94], [66, 112], [69, 135], [74, 160], [79, 182],
  [84, 205], [90, 228], [95, 246], [101, 262], [103, 276], [99, 292], [92, 296], [87, 286],
  [84, 266], [78, 246], [71, 222], [65, 200], [60, 178], [55, 150], [50, 128],
  [49, 150], [46, 178], [43, 196], [46, 216], [52, 238], [54, 258], [53, 290],
  [50, 325], [46, 352], [43, 378], [45, 402], [44, 432], [39, 462], [35, 484], [38, 498],
  [44, 508], [40, 515], [24, 515], [15, 508], [14, 490], [15, 462], [14, 432], [13, 402],
  [13, 378], [11, 340], [7, 300], [3, 272], [0, 262],
];

const HAUT = 14;
const CENTRE_FACE = 130;
const CENTRE_DOS = 390;

function detailsCorps(cx: number, vue: 'face' | 'dos'): string[] {
  const y = (v: number) => v + HAUT;
  const miroir = (points: Point[]) => [lisser(decaler(points, cx, HAUT)), lisser(decaler(points, cx, HAUT, -1, 1))];
  const genoux = miroir([[16, 390], [28, 396], [40, 390]]);
  if (vue === 'face') {
    return [
      ...miroir([[6, 84], [24, 82], [44, 86]]),
      ...miroir([[10, 122], [24, 132], [40, 124]]),
      `M${cx - 1.5} ${y(208)}a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0`,
      ...miroir([[10, 262], [24, 250], [44, 232]]),
      ...genoux,
    ];
  }
  return [
    lisser(decaler([[0, 72], [0, 130], [0, 190], [0, 250]], cx, HAUT)),
    ...miroir([[14, 100], [28, 128], [38, 146]]),
    ...miroir([[4, 276], [24, 288], [46, 276]]),
    ...genoux,
  ];
}

const coteVu = (x: number, cx: number, vue: 'face' | 'dos') => ((x < cx) === (vue === 'face') ? 'droit' : 'gauche');

function zoneCorps(x: number, y: number): string | null {
  const vue = x < 260 ? 'face' : 'dos';
  const cx = vue === 'face' ? CENTRE_FACE : CENTRE_DOS;
  const dx = Math.abs(x - cx);
  const h = y - HAUT;
  const cote = coteVu(x, cx, vue);
  const fem = cote === 'droit' ? 'droite' : 'gauche';
  if (h < -6 || h > 525 || dx > 112) return null;
  if (h < 56) return vue === 'face' ? 'tête' : 'crâne';
  if (h < 76) return vue === 'face' ? 'cou' : 'nuque';
  const brasDist = 50 + (h - 128) * 0.12;
  if (h >= 128 && h < 300 && dx > brasDist) {
    if (h < 195) return `bras ${cote}`;
    if (h < 225) return `coude ${cote}`;
    if (h < 262) return `avant-bras ${cote}`;
    return `main ${fem}`;
  }
  if (h < 128 && dx > 44) return `épaule ${fem}`;
  if (h < 196) return vue === 'face' ? (h < 150 ? 'thorax' : 'abdomen') : h < 112 ? 'dos, région haute' : 'dos, région thoracique';
  if (h < 256) return vue === 'face' ? 'abdomen' : 'région lombaire';
  if (h < 296) return vue === 'face' ? `aine ${fem}` : `fesse ${fem}`;
  if (h < 372) return `cuisse ${fem}`;
  if (h < 408) return `genou ${cote}`;
  if (h < 484) return vue === 'face' ? `jambe ${fem}` : `mollet ${cote}`;
  return `pied ${cote}`;
}

const corps: Fond = {
  id: 'corps',
  label: 'Corps entier',
  largeur: 520,
  hauteur: 545,
  formes: [{ d: symetrique(CORPS, CENTRE_FACE, HAUT) }, { d: symetrique(CORPS, CENTRE_DOS, HAUT) }],
  details: [...detailsCorps(CENTRE_FACE, 'face'), ...detailsCorps(CENTRE_DOS, 'dos')],
  reperes: [
    { x: CENTRE_FACE, y: 541, texte: 'Face' },
    { x: CENTRE_DOS, y: 541, texte: 'Dos' },
    { x: 18, y: 20, texte: 'D', discret: true },
    { x: 242, y: 20, texte: 'G', discret: true },
    { x: 278, y: 20, texte: 'G', discret: true },
    { x: 502, y: 20, texte: 'D', discret: true },
  ],
  zoneDe: zoneCorps,
};

/* ------------------------------------------------------------------ */
/* Dos et rachis                                                       */
/* ------------------------------------------------------------------ */

const TRONC: Point[] = [
  [0, 0], [20, 2], [31, 14], [33, 30], [29, 50], [22, 64], [22, 80], [40, 92], [84, 104],
  [116, 120], [130, 150], [132, 190], [116, 210], [108, 250], [100, 300], [96, 340],
  [108, 390], [122, 440], [128, 490], [112, 530], [60, 546], [0, 540],
];

const NIVEAUX: { y: number; texte: string }[] = [
  { y: 92, texte: 'C7' },
  { y: 150, texte: 'T4' },
  { y: 232, texte: 'T8' },
  { y: 318, texte: 'T12' },
  { y: 412, texte: 'L4' },
  { y: 462, texte: 'S1' },
];

const CENTRE_TRONC = 200;

function zoneTronc(x: number, y: number): string | null {
  const cote = x < CENTRE_TRONC ? 'gauche' : 'droite';
  const lateral = Math.abs(x - CENTRE_TRONC) > 26;
  const suffixe = lateral ? ` ${cote}` : '';
  if (y < 92) return `région cervicale${suffixe}`;
  if (y < 318) return Math.abs(x - CENTRE_TRONC) > 80 ? `omoplate ${cote}` : `région thoracique${suffixe}`;
  if (y < 448) return `région lombaire${suffixe}`;
  return lateral ? `fesse ${cote}` : 'région sacrée';
}

const tronc: Fond = {
  id: 'tronc',
  label: 'Dos et rachis',
  largeur: 400,
  hauteur: 570,
  formes: [{ d: symetrique(TRONC, CENTRE_TRONC, 10) }],
  details: [
    `M${CENTRE_TRONC} 82V470`,
    lisser(decaler([[28, 130], [64, 196], [96, 214]], CENTRE_TRONC, 0)),
    lisser(decaler([[28, 130], [64, 196], [96, 214]], CENTRE_TRONC, 0, -1, 1)),
    lisser(decaler([[56, 420], [28, 470], [6, 480]], CENTRE_TRONC, 0)),
    lisser(decaler([[56, 420], [28, 470], [6, 480]], CENTRE_TRONC, 0, -1, 1)),
    ...NIVEAUX.map((n) => `M${CENTRE_TRONC - 6} ${n.y}H${CENTRE_TRONC + 6}`),
  ],
  reperes: [
    ...NIVEAUX.map((n) => ({ x: CENTRE_TRONC + 20, y: n.y + 4, texte: n.texte, discret: true })),
    { x: 18, y: 24, texte: 'G', discret: true },
    { x: 382, y: 24, texte: 'D', discret: true },
  ],
  zoneDe: zoneTronc,
};

/* ------------------------------------------------------------------ */
/* Tête et cou                                                         */
/* ------------------------------------------------------------------ */

const TETE_FACE: Point[] = [
  [0, 0], [40, 6], [66, 34], [74, 76], [73, 112], [78, 122], [72, 142], [64, 150],
  [56, 186], [38, 214], [16, 226], [0, 228],
];

const PROFIL: Point[] = [
  [108, 12], [66, 16], [34, 44], [24, 80], [22, 102], [8, 134], [20, 142], [18, 158], [24, 168],
  [20, 180], [26, 196], [46, 216], [76, 214], [86, 240], [86, 284], [160, 292], [168, 240],
  [172, 190], [198, 150], [204, 100], [188, 52], [150, 20],
];

const CENTRE_TETE = 130;
const DECALE_PROFIL = 280;

const tete: Fond = {
  id: 'tete',
  label: 'Tête et cou',
  largeur: 520,
  hauteur: 340,
  formes: [
    { d: symetrique(TETE_FACE, CENTRE_TETE, 20) },
    { d: `M${CENTRE_TETE - 34} 228L${CENTRE_TETE - 38} 300Q${CENTRE_TETE} 318 ${CENTRE_TETE + 38} 300L${CENTRE_TETE + 34} 228Z` },
    { d: lisser(decaler(PROFIL, DECALE_PROFIL, 14), true) },
  ],
  details: [
    lisser(decaler([[-44, 98], [-28, 90], [-12, 98]], CENTRE_TETE, 0)),
    lisser(decaler([[12, 98], [28, 90], [44, 98]], CENTRE_TETE, 0)),
    lisser(decaler([[-7, 150], [0, 158], [7, 150]], CENTRE_TETE, 0)),
    lisser(decaler([[-20, 192], [0, 198], [20, 192]], CENTRE_TETE, 0)),
    lisser(decaler([[134, 96], [120, 114], [128, 134], [142, 126]], DECALE_PROFIL, 14)),
    lisser(decaler([[40, 88], [54, 84], [66, 90]], DECALE_PROFIL, 14)),
  ],
  reperes: [
    { x: CENTRE_TETE, y: 334, texte: 'Face' },
    { x: DECALE_PROFIL + 110, y: 334, texte: 'Profil' },
    { x: 18, y: 20, texte: 'D', discret: true },
    { x: 242, y: 20, texte: 'G', discret: true },
  ],
  zoneDe: (x, y) => {
    if (y > 240) return 'cou';
    if (x < 260) return y < 80 ? 'front ou crâne' : y < 170 ? (Math.abs(x - CENTRE_TETE) > 40 ? `tempe ou joue ${x < CENTRE_TETE ? 'droite' : 'gauche'}` : 'visage') : 'mâchoire';
    return x > DECALE_PROFIL + 120 ? 'occiput' : 'face latérale de la tête';
  },
};

/* ------------------------------------------------------------------ */
/* Mains                                                               */
/* ------------------------------------------------------------------ */

const PAUME: Point[] = [[-56, 0], [-32, -10], [0, -14], [32, -10], [52, 0], [58, 50], [46, 100], [32, 128], [-28, 128], [-46, 100], [-60, 50]];

/** Une main, le pouce vers la droite quand `sens` vaut 1. */
function formesMain(cx: number, cy: number, sens: 1 | -1): Forme[] {
  const point = (x: number, y: number): Point => [cx + x * sens, cy + y];
  const ligne = (a: Point, b: Point) => `M${a[0]} ${a[1]}L${b[0]} ${b[1]}`;
  const doigts: [Point, Point, number][] = [
    [[-44, 6], [-58, -72], 21],
    [[-16, -4], [-20, -112], 23],
    [[12, -6], [14, -124], 24],
    [[40, 0], [50, -108], 23],
  ];
  return [
    { d: lisser(PAUME.map(([x, y]) => point(x, y)), true) },
    ...doigts.map(([a, b, largeur]) => ({ d: ligne(point(...a), point(...b)), largeur })),
    { d: lisser([point(40, 104), point(70, 76), point(92, 42), point(106, 4)]), largeur: 28 },
  ];
}

const plisMain = (cx: number, cy: number, sens: 1 | -1) => {
  const pt = (x: number, y: number): Point => [cx + x * sens, cy + y];
  return [lisser([pt(-52, 40), pt(-10, 46), pt(40, 16)]), lisser([pt(-46, 62), pt(0, 56), pt(26, 36)]), lisser([pt(30, 6), pt(6, 50), pt(2, 104)])];
};

const ongles = (cx: number, cy: number, sens: 1 | -1) =>
  ([[-58, -78], [-20, -118], [14, -130], [50, -114], [108, 0]] as Point[]).map(([x, y]) => `M${cx + (x - 6) * sens} ${cy + y}a6 7 0 0 ${sens > 0 ? 1 : 0} ${12 * sens} 0`);

function zoneMain(x: number, y: number, face: 'paume' | 'dos'): string | null {
  const nom = x < 260 ? 'main gauche' : 'main droite';
  if (y > 312) return `poignet, ${nom}`;
  return y < 170 ? `doigts, ${nom}` : `${face}, ${nom}`;
}

const HAUT_MAIN = 190;

const mainsPaume: Fond = {
  id: 'mains_paume',
  label: 'Mains, paume',
  largeur: 520,
  hauteur: 350,
  formes: [...formesMain(140, HAUT_MAIN, -1), ...formesMain(380, HAUT_MAIN, 1)],
  details: [...plisMain(140, HAUT_MAIN, -1), ...plisMain(380, HAUT_MAIN, 1)],
  reperes: [
    { x: 150, y: 342, texte: 'Main gauche' },
    { x: 370, y: 342, texte: 'Main droite' },
  ],
  zoneDe: (x, y) => zoneMain(x, y, 'paume'),
};

const mainsDos: Fond = {
  id: 'mains_dos',
  label: 'Mains, dos',
  largeur: 520,
  hauteur: 350,
  formes: [...formesMain(125, HAUT_MAIN, 1), ...formesMain(395, HAUT_MAIN, -1)],
  details: [...ongles(125, HAUT_MAIN, 1), ...ongles(395, HAUT_MAIN, -1)],
  reperes: [
    { x: 125, y: 342, texte: 'Main gauche' },
    { x: 395, y: 342, texte: 'Main droite' },
  ],
  zoneDe: (x, y) => zoneMain(x, y, 'dos'),
};

/* ------------------------------------------------------------------ */
/* Pieds                                                               */
/* ------------------------------------------------------------------ */

const PLANTE: Point[] = [
  [-46, 8], [-20, -2], [14, -6], [44, 8], [54, 44], [52, 88], [46, 136], [42, 188], [40, 240], [28, 280], [-2, 292], [-30, 280], [-36, 240], [-30, 190], [-44, 136], [-62, 80], [-58, 34],
];

function formesPied(cx: number, cy: number, sens: 1 | -1): Forme[] {
  const point = (x: number, y: number): Point => [cx + x * sens, cy + y];
  const orteils: [Point, number][] = [
    [[-40, -18], 30],
    [[-3, -26], 21],
    [[18, -22], 19],
    [[36, -14], 18],
    [[50, -2], 16],
  ];
  return [
    { d: lisser(PLANTE.map(([x, y]) => point(x, y)), true) },
    ...orteils.map(([[x, y], largeur]) => ({ d: `M${point(x, y + 18).join(' ')}L${point(x, y).join(' ')}`, largeur })),
  ];
}

const HAUT_PIED = 50;

function zonePied(y: number, droite: boolean): string | null {
  const nom = droite ? 'pied droit' : 'pied gauche';
  if (y < HAUT_PIED + 16) return `orteils, ${nom}`;
  if (y < HAUT_PIED + 120) return `avant-pied, ${nom}`;
  if (y < HAUT_PIED + 210) return `médio-pied, ${nom}`;
  return `talon, ${nom}`;
}

const pieds: Fond = {
  id: 'pieds',
  label: 'Pieds',
  largeur: 520,
  hauteur: 380,
  formes: [...formesPied(140, HAUT_PIED, -1), ...formesPied(380, HAUT_PIED, 1)],
  details: [],
  reperes: [
    { x: 140, y: 372, texte: 'Pied gauche, plante' },
    { x: 380, y: 372, texte: 'Pied droit, plante' },
  ],
  zoneDe: (x, y) => zonePied(y, x >= 260),
};

export const FONDS: Fond[] = [corps, tronc, tete, mainsPaume, mainsDos, pieds];

export const getFond = (id: string) => FONDS.find((f) => f.id === id) ?? corps;

/** Conversion d'un point de l'ancien schéma (vue de 100 × 100 %) vers le fond corps entier. */
export function pointAncienSchema(vue: 'face' | 'dos', x: number, y: number): Point {
  const echelle = 2.6;
  const cx = vue === 'face' ? CENTRE_FACE : CENTRE_DOS;
  return [cx + (x - 50) * echelle, HAUT + y * 2 * echelle];
}
