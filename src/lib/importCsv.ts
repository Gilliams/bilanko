import type { BilanTemplate, FieldValue } from '../types';
import { cleDynamo, type Cote } from './dynamo';

/**
 * Import d'un export CSV de dynamomètre (ActivForce, MicroFET…) vers les champs 'dynamo' d'un bilan.
 * Le format exact des exports n'étant pas documenté, la lecture est tolérante :
 * séparateur, colonnes, côté et unité sont détectés, et chaque correspondance proposée
 * reste modifiable avant de remplir le bilan.
 */

export const NEWTONS_PAR_KG = 9.80665;
export const NEWTONS_PAR_LB = 4.44822;

export type Unite = 'N' | 'kg' | 'lb';

export interface Mesure {
  /** Numéro de ligne dans le fichier (1 = en-tête) */
  ligne: number;
  test: string;
  cote: Cote | null;
  /** Force convertie en newtons */
  force: number;
  brut: number;
  unite: Unite;
  date?: string;
}

export interface LectureCsv {
  mesures: Mesure[];
  avertissements: string[];
  dates: string[];
}

export interface Cible {
  fieldId: string;
  groupeId: string;
  label: string;
}

/** Clé d'une cible dans une liste déroulante : « champ|groupe ». */
export const cleCible = (c: Pick<Cible, 'fieldId' | 'groupeId'>) => `${c.fieldId}|${c.groupeId}`;

export const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9°]+/g, ' ')
    .trim();

/** Découpe un CSV (guillemets compris) ; le séparateur est deviné sur la première ligne. */
export function lireLignes(texte: string): string[][] {
  const propre = texte.replace(/^﻿/, '');
  const premiere = propre.split(/\r?\n/, 1)[0] ?? '';
  const compte = (c: string) => premiere.split(c).length - 1;
  const sep = [';', '\t', ','].reduce((a, b) => (compte(b) > compte(a) ? b : a), ',');
  const lignes: string[][] = [];
  let ligne: string[] = [];
  let cellule = '';
  let guillemets = false;
  for (let i = 0; i < propre.length; i++) {
    const c = propre[i];
    if (guillemets) {
      if (c === '"' && propre[i + 1] === '"') {
        cellule += '"';
        i++;
      } else if (c === '"') guillemets = false;
      else cellule += c;
    } else if (c === '"') guillemets = true;
    else if (c === sep) {
      ligne.push(cellule.trim());
      cellule = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && propre[i + 1] === '\n') i++;
      ligne.push(cellule.trim());
      if (ligne.some((x) => x !== '')) lignes.push(ligne);
      ligne = [];
      cellule = '';
    } else cellule += c;
  }
  ligne.push(cellule.trim());
  if (ligne.some((x) => x !== '')) lignes.push(ligne);
  return lignes;
}

export function lireNombre(s: string | undefined): number | null {
  if (!s) return null;
  const m = s.replace(/\s/g, '').match(/-?\d+(?:[.,]\d+)?/);
  return m ? Number(m[0].replace(',', '.')) : null;
}

export function lireCote(s: string | undefined): Cote | null {
  if (!s) return null;
  const n = ` ${norm(s)} `;
  if (/ (right|droite?|dte|dr|r|d) /.test(n)) return 'd';
  if (/ (left|gauche|gche|l|g) /.test(n)) return 'g';
  return null;
}

/** Retire la mention du côté d'un nom de test (« Hip Abduction Left » → « Hip Abduction »). */
const sansCote = (s: string) => s.replace(/[\s\-_(]*\b(right|left|droite?|gauche|dte|gche)\b[)\s]*/gi, ' ').replace(/\s+/g, ' ').trim();

export function lireUnite(s: string | undefined): Unite | null {
  if (!s) return null;
  const n = ` ${norm(s)} `;
  if (/ (n|newtons?) /.test(n)) return 'N';
  if (/ (lbs?|lbf|pounds?|livres?) /.test(n)) return 'lb';
  if (/ (kg|kgf|kilos?) /.test(n)) return 'kg';
  return null;
}

export const enNewtons = (v: number, u: Unite) => (u === 'kg' ? v * NEWTONS_PAR_KG : u === 'lb' ? v * NEWTONS_PAR_LB : v);

const trouver = (entetes: string[], motifs: RegExp[], exclure?: RegExp) => entetes.findIndex((e) => motifs.some((m) => m.test(e)) && !(exclure && exclure.test(e)));

/**
 * Lit un CSV de dynamomètre. Deux formes sont reconnues :
 * une ligne par mesure (colonnes test, côté, force) ou une ligne par test
 * avec une colonne de force par côté (« Left peak force », « Force droite »…).
 */
export function lireCsvDynamo(texte: string): LectureCsv {
  const lignes = lireLignes(texte);
  const avertissements: string[] = [];
  if (lignes.length < 2) return { mesures: [], avertissements: ['Le fichier ne contient pas de données.'], dates: [] };

  const entetesBruts = lignes[0];
  const entetes = entetesBruts.map(norm);
  const colTest = trouver(entetes, [/\btest\b/, /muscle/, /mouvement/, /movement/, /exercise/, /exercice/, /name/, /nom/, /groupe/, /motion/, /action/], /client|patient|athlete|user|date|side|cote/);
  const colCote = trouver(entetes, [/\bside\b/, /\bcote\b/, /\blimb\b/, /lateralite/, /\bmembre\b/]);
  const colDate = trouver(entetes, [/\bdate\b/, /\btime\b/, /\bheure\b/, /timestamp/]);
  const estForce = [/force/, /peak/, /\bmax/, /\bpic\b/, /\bvalue\b/, /valeur/, /\bresult/, /resultat/, /\bnewtons?\b/, /\bn\b/, /\bkg\b/, /\blbs?\b/];
  const exclusForce = /time|temps|duree|angle|rfd|rate|date|moyenne|average|avg|mean|deficit|ratio|%|percent|asym|bodyweight|weight|poids/;
  const colsForce = entetes.map((e, i) => (estForce.some((m) => m.test(e)) && !exclusForce.test(e) ? i : -1)).filter((i) => i >= 0 && i !== colTest && i !== colCote);
  const colsParCote = colsForce.map((i) => ({ i, cote: lireCote(entetesBruts[i]) })).filter((x) => x.cote !== null);

  if (colTest < 0) avertissements.push('Colonne du test introuvable : la première colonne est utilisée.');
  const iTest = colTest < 0 ? 0 : colTest;
  if (!colsForce.length) return { mesures: [], avertissements: [...avertissements, 'Aucune colonne de force reconnue (force, peak, max, N, kg, lbs…).'], dates: [] };

  // Unité : d'abord dans l'en-tête de la colonne, sinon dans une colonne « unité », sinon newtons.
  const colUnite = trouver(entetes, [/\bunit/, /\bunite/]);
  let uniteSupposee = false;
  const uniteDe = (row: string[], col: number): Unite => {
    const u = lireUnite(entetesBruts[col]) ?? (colUnite >= 0 ? lireUnite(row[colUnite]) : null) ?? lireUnite(row[col]);
    if (!u) uniteSupposee = true;
    return u ?? 'N';
  };

  const mesures: Mesure[] = [];
  lignes.slice(1).forEach((row, k) => {
    const ligne = k + 2;
    const testBrut = row[iTest] ?? '';
    if (!testBrut) return;
    const date = colDate >= 0 ? row[colDate] || undefined : undefined;
    const pousser = (col: number, cote: Cote | null) => {
      const brut = lireNombre(row[col]);
      if (brut === null || brut <= 0) return;
      const unite = uniteDe(row, col);
      mesures.push({ ligne, test: sansCote(testBrut) || testBrut, cote, force: Math.round(enNewtons(brut, unite) * 10) / 10, brut, unite, date });
    };
    if (colsParCote.length >= 2) {
      colsParCote.forEach(({ i, cote }) => pousser(i, cote));
    } else {
      const cote = lireCote(colCote >= 0 ? row[colCote] : undefined) ?? lireCote(testBrut);
      pousser(colsForce[0], cote);
    }
  });

  if (uniteSupposee) avertissements.push('Unité non précisée dans le fichier : valeurs lues en newtons.');
  if (mesures.some((m) => m.cote === null)) avertissements.push('Côté non reconnu pour certaines lignes : choisissez-le avant de remplir.');
  const dates = [...new Set(mesures.map((m) => m.date).filter((d): d is string => Boolean(d)))];
  return { mesures, avertissements, dates };
}

/** Groupes musculaires des champs dynamomètre du modèle. */
export function ciblesDuModele(t: BilanTemplate): Cible[] {
  return t.sections.flatMap((s) =>
    s.fields
      .filter((f) => f.type === 'dynamo')
      .flatMap((f) => (f.dynamo?.groupes ?? []).map((g) => ({ fieldId: f.id, groupeId: g.id, label: f.dynamo!.groupes.length > 1 || g.label !== f.label ? `${f.label} — ${g.label}` : g.label }))),
  );
}

/* Vocabulaire français et anglais des tests usuels, par mouvement et par articulation. */
const MOUVEMENTS: [string, RegExp][] = [
  ['abd', /\babd|abduct/],
  ['add', /\badd(?!itional)|adduct/],
  ['ri', /\bri\b|\bir\b|rotation interne|rotateurs? internes?|internal rot|medial rot/],
  ['re', /\bre\b|\ber\b|rotation externe|rotateurs? externes?|external rot|lateral rot/],
  ['inv', /\binv|invert/],
  ['ev', /\bev\b|\beve?rs|evert/],
  ['quadri', /quadri|knee ext|extension (du |de )?genou|extenseurs? (du |de )?genou/],
  ['ij', /ischio|hamstring|knee flex|flexion (du |de )?genou|flechisseurs? (du |de )?genou|\bij\b/],
  ['ext', /\bext|extens/],
  ['flech', /\bflex|flech/],
];

const ARTICULATIONS: [string, RegExp][] = [
  ['hanche', /hanche|\bhip\b/],
  ['genou', /genou|knee|quadri|ischio|hamstring|\bij\b/],
  ['cheville', /cheville|ankle|invers|evers|\binv|\bev\b/],
  ['epaule', /epaule|shoulder/],
  ['coude', /coude|elbow/],
  ['poignet', /poignet|wrist|grip|prehension/],
];

const mouvementDe = (s: string) => MOUVEMENTS.find(([, r]) => r.test(s))?.[0];
const articulationDe = (s: string) => ARTICULATIONS.find(([, r]) => r.test(s))?.[0];

/** Cible la plus probable pour un nom de test, ou null. */
export function associer(test: string, cibles: Cible[]): Cible | null {
  const t = norm(test);
  const mvt = mouvementDe(t);
  const art = articulationDe(t);
  let meilleure: { c: Cible; score: number } | null = null;
  for (const c of cibles) {
    const groupe = norm(`${c.groupeId} ${c.label.split('—').pop()}`);
    const champ = norm(c.label);
    let score = 0;
    if (norm(c.label) === t || norm(c.label.split('—').pop() ?? '') === t) score += 10;
    const mvtCible = mouvementDe(groupe);
    if (mvt && mvtCible === mvt) score += 4;
    else if (mvt && mvtCible) score -= 3;
    const artCible = articulationDe(champ);
    if (art && artCible === art) score += 2;
    else if (art && artCible && art !== artCible) score -= 4;
    const mots = new Set(t.split(' ').filter((m) => m.length > 3));
    score += champ.split(' ').filter((m) => mots.has(m)).length;
    if (score > 2 && (!meilleure || score > meilleure.score)) meilleure = { c, score };
  }
  return meilleure?.c ?? null;
}

export interface Affectation {
  mesure: Mesure;
  /** cleCible() de la cible choisie, ou '' pour ignorer la ligne */
  cible: string;
  cote: Cote | null;
}

export const affectationsInitiales = (mesures: Mesure[], cibles: Cible[]): Affectation[] =>
  mesures.map((m) => {
    const c = associer(m.test, cibles);
    return { mesure: m, cible: c ? cleCible(c) : '', cote: m.cote };
  });

/**
 * Valeurs du bilan après import. Plusieurs essais pour un même muscle et un même côté :
 * le meilleur est retenu (force maximale, comme le pic du dynamomètre).
 */
export function appliquerImport(values: Record<string, FieldValue>, affectations: Affectation[]): { values: Record<string, FieldValue>; remplis: number } {
  const meilleurs = new Map<string, { fieldId: string; cle: string; force: number }>();
  for (const a of affectations) {
    if (!a.cible || !a.cote) continue;
    const [fieldId, groupeId] = a.cible.split('|');
    const cle = cleDynamo(groupeId, a.cote);
    const k = `${fieldId}|${cle}`;
    const actuel = meilleurs.get(k);
    if (!actuel || a.mesure.force > actuel.force) meilleurs.set(k, { fieldId, cle, force: a.mesure.force });
  }
  const suivant = { ...values };
  for (const { fieldId, cle, force } of meilleurs.values()) {
    const courant = suivant[fieldId];
    const base = courant && typeof courant === 'object' && !Array.isArray(courant) ? (courant as Record<string, number>) : {};
    suivant[fieldId] = { ...base, [cle]: force };
  }
  return { values: suivant, remplis: meilleurs.size };
}
