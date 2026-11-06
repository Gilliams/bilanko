import type { Bilan, BilanTemplate, FieldDef, FieldValue, Patient } from '../types';
import { BILAN_TYPES, age, formatDate } from './store';
import { evaluer, type Contexte } from './formule';
import { estDessin, lireDessin, texteDessin } from './dessin';

/** Une valeur est-elle renseignée ? */
export function isFilled(v: FieldValue | undefined): boolean {
  if (v === null || v === undefined || v === '') return false;
  if (Array.isArray(v)) return v.length > 0;
  if (estDessin(v)) return v.traits.length > 0;
  if (typeof v === 'object') return Object.keys(v).length > 0;
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
      return `${v}${field.unit ? (field.unit === '°' ? '°' : ` ${field.unit}`) : ''}`;
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

  for (const s of template.sections) {
    const lines: SyntheseSection['lines'] = [];
    for (const f of s.fields) {
      if (f.inSynthese === false || !isVisible(f, bilan.values)) continue;
      total++;
      const v = bilan.values[f.id];
      if (!isFilled(v)) continue;
      filled++;
      lines.push({ label: f.reportLabel ?? f.label, value: formatValue(f, v), long: f.type === 'textarea' || f.type === 'bodychart', fieldId: f.id });
    }
    if (lines.length) sections.push({ title: s.title, lines });
  }

  const alertes: string[] = [];
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
    `${BILAN_TYPES[bilan.type]} du ${formatDate(bilan.date)} — modèle « ${template.nom} »`,
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
