import type { Activite, Bilan, BilanTemplate, FieldDef, FieldValue, Patient, TestValeur } from '../types';
import { age, formatDate, nomBilan } from './store';
import { evaluer, type Contexte } from './formule';
import { estDessin, lireDessin, texteDessin } from './dessin';
import { ficheDuChamp } from '../data/catalogue';

export const estTestValeur = (v: FieldValue | undefined): v is TestValeur => Boolean(v) && typeof v === 'object' && !Array.isArray(v) && 'resultat' in (v as object);

export const estActivites = (v: FieldValue | undefined): v is Activite[] =>
  Array.isArray(v) && v.length > 0 && typeof v[0] === 'object' && v[0] !== null && 'activite' in (v[0] as object);

const nombre = (n: number, decimales = 1) => n.toLocaleString('fr-FR', { maximumFractionDigits: decimales });

const avecUnite = (n: number, unit?: string, decimales = 1) => `${nombre(n, decimales)}${unit ? (unit === '°' ? '°' : ` ${unit}`) : ''}`;

/** Applique le gabarit et la plage d'interprétation d'une valeur chiffrée. */
function interpreter(field: FieldDef, v: number, texte: string): string {
  const base = field.format !== undefined ? field.format.replace('{v}', nombre(v, field.decimales ?? 2)) : texte;
  const plage = field.plages?.find((p) => v <= p.jusqua);
  return [base, plage?.label].filter(Boolean).join(' — ');
}

/** Moyenne des activités cotées, ou null si aucune note. */
export function moyenneActivites(v: FieldValue | undefined): number | null {
  if (!estActivites(v)) return null;
  const notes = v.map((a) => a.note).filter((n): n is number => typeof n === 'number');
  return notes.length ? notes.reduce((s, n) => s + n, 0) / notes.length : null;
}

/** Critères présents et nombre de critères renseignés d'un champ 'criteres'. */
export function criteresPresents(field: FieldDef, v: FieldValue | undefined): { presents: string[]; repondus: number; seuilAtteint: boolean } {
  const reponses = (v && typeof v === 'object' && !Array.isArray(v) ? v : {}) as Record<string, unknown>;
  const options = field.options ?? [];
  const presents = options.filter((o) => reponses[o] === true);
  const repondus = options.filter((o) => typeof reponses[o] === 'boolean').length;
  return { presents, repondus, seuilAtteint: field.seuil !== undefined && presents.length >= field.seuil };
}

/**
 * Valeurs utilisables par une formule de calcul : chaque champ chiffré est disponible
 * sous son identifiant et sous celui de sa fiche (ex. « sorensen »), qu'il vienne du modèle ou de la bibliothèque.
 */
export function contexteCalcul(template: BilanTemplate, values: Record<string, FieldValue>): Contexte {
  const contexte: Contexte = {};
  for (const f of template.sections.flatMap((s) => s.fields)) {
    const v = values[f.id];
    if (typeof v !== 'number') continue;
    contexte[f.id] = v;
    const fiche = ficheDuChamp(f);
    if (fiche && contexte[fiche.id] === undefined) contexte[fiche.id] = v;
  }
  return contexte;
}

/** Résultat d'un champ 'calcul', ou null tant que ses données manquent. */
export function valeurCalculee(field: FieldDef, template: BilanTemplate, values: Record<string, FieldValue>): number | null {
  if (!field.formule?.trim()) return null;
  try {
    const r = evaluer(field.formule, contexteCalcul(template, values));
    return r !== null && Number.isFinite(r) ? r : null;
  } catch {
    return null;
  }
}

/** Une valeur est-elle renseignée ? */
export function isFilled(v: FieldValue | undefined): boolean {
  if (v === null || v === undefined || v === '') return false;
  if (Array.isArray(v)) return estActivites(v) ? v.some((a) => a.activite.trim() !== '' || a.note !== null) : v.length > 0;
  if (estDessin(v)) return v.traits.length > 0;
  if (estTestValeur(v)) return Boolean(v.resultat || v.observation?.trim());
  if (typeof v === 'object') return Object.values(v).some((x) => x !== null && x !== undefined);
  return true;
}

/** Le champ est-il affiché, compte tenu de sa condition éventuelle ? */
export function isVisible(field: FieldDef, values: Record<string, FieldValue>): boolean {
  const c = field.visibleIf;
  if (!c) return true;
  const v = values[c.field];
  if (c.in) return Array.isArray(v) ? v.some((x) => c.in!.includes(x as string)) : c.in.includes(v as string | boolean);
  return isFilled(v) && v !== false;
}

export function scoreTotal(field: FieldDef, v: FieldValue | undefined): { total: number; max: number; complete: boolean } {
  const items = field.items ?? [];
  const answers = (v && typeof v === 'object' && !Array.isArray(v) ? v : {}) as Record<string, number>;
  const max = items.reduce((s, i) => s + Math.max(...i.options.map((o) => o.points)), 0);
  const total = items.reduce((s, i) => s + (answers[i.id] ?? 0), 0);
  const complete = items.every((i) => answers[i.id] !== undefined);
  return { total, max, complete };
}

/** Calcule les résultats déclaratifs d'un score et leur interprétation. */
export function scoreResultats(field: FieldDef, v: FieldValue | undefined): string[] {
  const { total, max } = scoreTotal(field, v);
  const answers = (v && typeof v === 'object' && !Array.isArray(v) ? v : {}) as Record<string, number>;
  const contexte: Contexte = { total, max };
  (field.items ?? []).forEach((i) => (contexte[i.id] = answers[i.id] ?? null));
  return (field.resultats ?? []).flatMap((r) => {
    const valeur = evaluer(r.formule, contexte);
    if (valeur === null) return [];
    const arrondi = Math.round(valeur);
    const plage = r.plages?.find((p) => arrondi <= p.jusqua);
    return [[r.format?.replace('{v}', String(arrondi)), plage?.label].filter(Boolean).join(' — ')];
  });
}

/** Formate une valeur de champ en texte lisible. */
export function formatValue(field: FieldDef, v: FieldValue | undefined): string {
  if (!isFilled(v)) return '';
  switch (field.type) {
    case 'boolean':
      return v ? 'oui' : 'non';
    case 'eva':
      return `${v}/10`;
    case 'number':
    case 'calcul': {
      if (typeof v !== 'number') return field.type === 'number' ? String(v) : '';
      const texte = field.type === 'number' ? `${v}${field.unit ? (field.unit === '°' ? '°' : ` ${field.unit}`) : ''}` : avecUnite(v, field.unit, field.decimales ?? 2);
      return interpreter(field, v, texte);
    }
    case 'test': {
      if (!estTestValeur(v)) return String(v);
      return [v.resultat, v.observation?.trim()].filter(Boolean).join(' — ');
    }
    case 'criteres': {
      const total = field.options?.length ?? 0;
      const { presents, repondus, seuilAtteint } = criteresPresents(field, v);
      let texte = presents.length ? `${presents.length}/${total} : ${presents.join(', ')}` : `aucun sur ${repondus} recherché${repondus > 1 ? 's' : ''}`;
      if (presents.length && repondus < total) texte += ` (${total - repondus} non recherché${total - repondus > 1 ? 's' : ''})`;
      if (field.seuil !== undefined) texte += seuilAtteint ? ` — ${field.seuilLabel || 'seuil atteint'}` : ` — seuil de ${field.seuil} non atteint`;
      return texte;
    }
    case 'bilateral': {
      const { g, d } = v as Record<string, number | null>;
      const cotes = [typeof g === 'number' ? `G ${avecUnite(g, field.unit)}` : '', typeof d === 'number' ? `D ${avecUnite(d, field.unit)}` : ''].filter(Boolean);
      const ecart = typeof g === 'number' && typeof d === 'number' && Math.max(g, d) > 0 ? Math.round((1 - Math.min(g, d) / Math.max(g, d)) * 100) : 0;
      return `${cotes.join(' · ')}${ecart > 0 ? ` (écart ${ecart} %)` : ''}`;
    }
    case 'activites': {
      if (!estActivites(v)) return '';
      const lignes = v.filter((a) => a.activite.trim() || a.note !== null).map((a) => `${a.activite.trim() || 'Activité'} ${a.note ?? '—'}/10`);
      const m = moyenneActivites(v);
      return `${lignes.join(' ; ')}${m !== null ? ` — moyenne ${nombre(m)}/10` : ''}`;
    }
    case 'multiselect':
      return (v as string[]).join(', ');
    case 'bodychart':
      return texteDessin(lireDessin(v));
    case 'score': {
      const { total, max, complete } = scoreTotal(field, v);
      const interp = scoreResultats(field, v).join(' ; ');
      return `${total}/${max}${interp ? ` (${interp})` : ''}${complete ? '' : ' — incomplet'}`;
    }
    default:
      return String(v);
  }
}

export interface SyntheseSection {
  title: string;
  lines: { label: string; value: string; long: boolean; fieldId: string }[];
}

export interface Synthese {
  titre: string;
  entete: string[];
  sections: SyntheseSection[];
  completude: number; // 0-100
  alertes: string[];
}

/**
 * Génère le compte rendu du bilan à partir des valeurs saisies :
 * seuls les champs renseignés apparaissent.
 */
export function genererSynthese(bilan: Bilan, template: BilanTemplate, patient: Patient): Synthese {
  let total = 0;
  let filled = 0;
  const sections: SyntheseSection[] = [];
  const alertes: string[] = [];

  for (const s of template.sections) {
    const lines: SyntheseSection['lines'] = [];
    for (const f of s.fields) {
      if (f.inSynthese === false || !isVisible(f, bilan.values)) continue;
      if (f.type === 'calcul') {
        const r = valeurCalculee(f, template, bilan.values);
        if (r !== null) lines.push({ label: f.reportLabel ?? f.label, value: formatValue(f, r), long: false, fieldId: f.id });
        continue;
      }
      if (f.type === 'criteres' && f.alerte) {
        const { presents, seuilAtteint } = criteresPresents(f, bilan.values[f.id]);
        if (seuilAtteint) alertes.push(`${f.reportLabel ?? f.label} : ${presents.join(', ')} — ${f.alerte}`);
      }
      total++;
      const v = bilan.values[f.id];
      if (!isFilled(v)) continue;
      filled++;
      lines.push({ label: f.reportLabel ?? f.label, value: formatValue(f, v), long: f.type === 'textarea' || f.type === 'bodychart' || f.type === 'activites', fieldId: f.id });
    }
    if (lines.length) sections.push({ title: s.title, lines });
  }

  const rouges = bilan.values['drapeaux_rouges'];
  if (Array.isArray(rouges) && rouges.length) {
    alertes.push(`Drapeau(x) rouge(s) : ${(rouges as string[]).join(', ')} — avis médical recommandé.`);
  }
  const tug = bilan.values['tug'];
  if (typeof tug === 'number' && tug > 13.5) alertes.push(`TUG à ${tug} s : risque de chute accru.`);
  const spo2 = bilan.values['tm6_spo2_min'];
  if (typeof spo2 === 'number' && spo2 < 88) alertes.push(`Désaturation à l’effort (SpO₂ min ${spo2} %).`);

  const sexe = patient.sexe === 'F' ? 'Mme' : patient.sexe === 'M' ? 'M.' : '';
  const entete = [
    `${sexe} ${patient.prenom} ${patient.nom.toUpperCase()}, ${age(patient.dateNaissance)} ans${patient.profession ? `, ${patient.profession}` : ''}`.trim(),
    `${nomBilan(bilan)} du ${formatDate(bilan.date)} — modèle « ${template.nom} »`,
  ];
  if (patient.medecinPrescripteur) entete.push(`Médecin prescripteur : ${patient.medecinPrescripteur}`);
  if (bilan.prescription) entete.push(`Prescription : ${bilan.prescription}${bilan.nbSeancesPrescrites ? ` (${bilan.nbSeancesPrescrites} séances)` : ''}`);

  return {
    titre: `Bilan diagnostic kinésithérapique — ${template.nom}`,
    entete,
    sections,
    completude: total ? Math.round((filled / total) * 100) : 0,
    alertes,
  };
}

/** Compare deux bilans du même modèle : champs numériques ayant évolué. */
export function evolutions(prev: Bilan, curr: Bilan, template: BilanTemplate): { label: string; avant: string; apres: string; delta: number }[] {
  const out: { label: string; avant: string; apres: string; delta: number }[] = [];
  for (const f of template.sections.flatMap((s) => s.fields)) {
    if (!isVisible(f, prev.values) || !isVisible(f, curr.values)) continue;
    const label = f.reportLabel ?? f.label;
    if (f.type === 'calcul' || f.type === 'activites') {
      const lire = (b: Bilan) => (f.type === 'calcul' ? valeurCalculee(f, template, b.values) : moyenneActivites(b.values[f.id]));
      const a = lire(prev);
      const b = lire(curr);
      if (a !== null && b !== null && a !== b) {
        const afficher = (n: number) => (f.type === 'calcul' ? formatValue(f, n) : `moyenne ${nombre(n)}/10`);
        out.push({ label, avant: afficher(a), apres: afficher(b), delta: b - a });
      }
      continue;
    }
    if (f.type === 'number' || f.type === 'eva') {
      const a = prev.values[f.id];
      const b = curr.values[f.id];
      if (typeof a === 'number' && typeof b === 'number' && a !== b) {
        out.push({ label, avant: formatValue(f, a), apres: formatValue(f, b), delta: b - a });
      }
    } else if (f.type === 'score') {
      const a = prev.values[f.id];
      const b = curr.values[f.id];
      if (isFilled(a) && isFilled(b)) {
        const ta = scoreTotal(f, a).total;
        const tb = scoreTotal(f, b).total;
        if (ta !== tb) out.push({ label, avant: formatValue(f, a), apres: formatValue(f, b), delta: tb - ta });
      }
    }
  }
  return out;
}
