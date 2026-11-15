import type { FieldDef, FieldValue, GroupeDynamo } from '../types';

/**
 * Dynamométrie manuelle (MicroFET, ActivForce…) : à partir des forces en newtons,
 * calcule le déficit entre les côtés, la force rapportée au poids et le ratio
 * entre groupes antagonistes, puis les compare aux normes du champ.
 */

export type Cote = 'd' | 'g';
export type Etat = 'ok' | 'bas' | 'haut';

export const SEUIL_DEFICIT = 10;

export const cleDynamo = (groupeId: string, cote: Cote) => `${groupeId}_${cote}`;

export interface ResultatGroupe {
  groupe: GroupeDynamo;
  force: Record<Cote, number | null>;
  /** Force rapportée au poids (N/kg), si le poids est connu */
  parKg: Record<Cote, number | null>;
  etat: Record<Cote, Etat | null>;
  /** Écart en % entre les côtés, rapporté au côté le plus fort */
  ecart: number | null;
  /** Côté déficitaire, si l'écart atteint le seuil */
  deficit: Cote | null;
}

export interface ResultatDynamo {
  groupes: ResultatGroupe[];
  ratio: { valeur: Record<Cote, number | null>; etat: Record<Cote, Etat | null> } | null;
}

const lire = (v: FieldValue | undefined): Record<string, number | null> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, number | null>) : {});

const nombreOuNull = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) ? n : null);

export function situer(valeur: number | null, min?: number, max?: number): Etat | null {
  if (valeur === null || (min === undefined && max === undefined)) return null;
  if (min !== undefined && valeur < min) return 'bas';
  if (max !== undefined && valeur > max) return 'haut';
  return 'ok';
}

export function analyserDynamo(field: FieldDef, v: FieldValue | undefined, poids?: number): ResultatDynamo {
  const valeurs = lire(v);
  const seuil = field.dynamo?.seuilDeficit ?? SEUIL_DEFICIT;
  const groupes = (field.dynamo?.groupes ?? []).map((groupe): ResultatGroupe => {
    const force = { d: nombreOuNull(valeurs[cleDynamo(groupe.id, 'd')]), g: nombreOuNull(valeurs[cleDynamo(groupe.id, 'g')]) };
    const parKg = {
      d: force.d !== null && poids ? force.d / poids : null,
      g: force.g !== null && poids ? force.g / poids : null,
    };
    const etat = { d: situer(parKg.d, groupe.normeMin, groupe.normeMax), g: situer(parKg.g, groupe.normeMin, groupe.normeMax) };
    let ecart: number | null = null;
    let deficit: Cote | null = null;
    if (force.d !== null && force.g !== null && Math.max(force.d, force.g) > 0) {
      ecart = Math.round((1 - Math.min(force.d, force.g) / Math.max(force.d, force.g)) * 100);
      if (ecart >= seuil) deficit = force.d < force.g ? 'd' : 'g';
    }
    return { groupe, force, parKg, etat, ecart, deficit };
  });

  const [a, b] = groupes;
  const r = field.dynamo?.ratio;
  let ratio: ResultatDynamo['ratio'] = null;
  if (r && a && b) {
    const calcul = (c: Cote) => {
      const x = a.force[c];
      const y = b.force[c];
      return x !== null && y !== null && y > 0 ? x / y : null;
    };
    const valeur = { d: calcul('d'), g: calcul('g') };
    if (valeur.d !== null || valeur.g !== null) ratio = { valeur, etat: { d: situer(valeur.d, r.normeMin, r.normeMax), g: situer(valeur.g, r.normeMin, r.normeMax) } };
  }
  return { groupes, ratio };
}

export const deux = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 2 });

export function texteNorme(min?: number, max?: number, unite = ''): string {
  const u = unite ? ` ${unite}` : '';
  if (min !== undefined && max !== undefined) return `norme ${deux(min)}-${deux(max)}${u}`;
  if (min !== undefined) return `norme ≥ ${deux(min)}${u}`;
  if (max !== undefined) return `norme ≤ ${deux(max)}${u}`;
  return '';
}

const COTE: Record<Cote, string> = { d: 'droite', g: 'gauche' };

/** Valeur des deux côtés : « 3,18 N/kg à droite et 3,61 à gauche ». */
function deuxCotes(v: Record<Cote, number | null>, unite = ''): string {
  const parties = (['d', 'g'] as Cote[]).filter((c) => v[c] !== null).map((c, i) => `${deux(v[c]!)}${i === 0 && unite ? ` ${unite}` : ''} à ${COTE[c]}`);
  return parties.join(' et ');
}

/** Texte du compte rendu, une ligne par groupe puis le ratio. */
export function texteDynamo(field: FieldDef, v: FieldValue | undefined, poids?: number): string {
  const r = analyserDynamo(field, v, poids);
  const lignes = r.groupes.flatMap((g) => {
    if (g.force.d === null && g.force.g === null) return [];
    const forces = (['d', 'g'] as Cote[])
      .filter((c) => g.force[c] !== null)
      .map((c) => `${c.toUpperCase()} ${deux(g.force[c]!)} N`)
      .join(', ');
    const parties = [forces];
    if (g.ecart !== null) parties.push(g.deficit ? `${g.ecart} % de déficit à ${COTE[g.deficit]}` : 'RAS');
    if (g.parKg.d !== null || g.parKg.g !== null) {
      const norme = texteNorme(g.groupe.normeMin, g.groupe.normeMax, 'N/kg');
      parties.push(`${deuxCotes(g.parKg, 'N/kg')}${norme ? ` (${norme})` : ''}`);
    }
    return [`${g.groupe.label} : ${parties.join(' — ')}`];
  });
  if (r.ratio && field.dynamo?.ratio) {
    const { label, normeMin, normeMax } = field.dynamo.ratio;
    const norme = texteNorme(normeMin, normeMax);
    lignes.push(`Ratio ${label} : ${deuxCotes(r.ratio.valeur)}${norme ? ` (${norme})` : ''}`);
  }
  if (lignes.length && !poids && r.groupes.some((g) => g.groupe.normeMin !== undefined || g.groupe.normeMax !== undefined)) {
    lignes.push('Poids du patient non renseigné : force rapportée au poids non calculée.');
  }
  return lignes.join('\n');
}
