import { getItem } from '../data/catalogue';
import { getTemplate } from '../data/templates';
import type { DB } from './store';
import { formatValue, isFilled, isVisible, scoreTotal } from './synthese';
import type { FieldDef } from '../types';

export interface PointSuivi {
  date: string;
  valeur: number;
  source: 'bilan' | 'seance';
}

export interface ItemSuivi {
  key: string;
  label: string;
  field: FieldDef;
  points: PointSuivi[];
}

export const suiviKey = (templateId: string, fieldId: string) => `${templateId}/${fieldId}`;

/** Seuls les champs chiffrés peuvent être suivis dans le temps. */
export const estSuivable = (f: FieldDef) => f.type === 'number' || f.type === 'eva' || f.type === 'score';

/** Une mesure peut être saisie en séance pour les valeurs simples, pas pour un questionnaire. */
export const estMesurableEnSeance = (f: FieldDef) => f.type === 'number' || f.type === 'eva';

export function trouverChamp(key: string): FieldDef | undefined {
  const [templateId, fieldId] = key.split('/');
  const duModele = getTemplate(templateId)
    ?.sections.flatMap((s) => s.fields)
    .find((f) => f.id === fieldId);
  return duModele ?? (fieldId.startsWith('cat_') ? getItem(fieldId.slice(4))?.field : undefined);
}

export interface LigneMemo {
  key: string;
  label: string;
  valeur: string;
  date: string;
}

/** Informations épinglées du patient : dernière valeur renseignée dans ses bilans. */
export function memoPatient(db: DB, patientId: string): LigneMemo[] {
  return (db.memos[patientId] ?? []).flatMap((key) => {
    const field = trouverChamp(key);
    if (!field) return [];
    const [templateId] = key.split('/');
    const dernier = db.bilans
      .filter((b) => b.patientId === patientId && b.templateId === templateId && isVisible(field, b.values) && isFilled(b.values[field.id]))
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))[0];
    return [{ key, label: field.reportLabel ?? field.label, valeur: dernier ? formatValue(field, dernier.values[field.id]) : '', date: dernier?.date ?? '' }];
  });
}

/** Items suivis d'un patient, avec leurs valeurs issues des bilans et des séances, par date croissante. */
export function itemsSuivis(db: DB, patientId: string): ItemSuivi[] {
  return (db.suivis[patientId] ?? []).flatMap((key) => {
    const field = trouverChamp(key);
    if (!field) return [];
    const [templateId] = key.split('/');

    const depuisBilans = db.bilans
      .filter((b) => b.patientId === patientId && b.templateId === templateId && isVisible(field, b.values))
      .flatMap((b): PointSuivi[] => {
        const v = b.values[field.id];
        if (!isFilled(v)) return [];
        const valeur = field.type === 'score' ? scoreTotal(field, v).total : v;
        return typeof valeur === 'number' ? [{ date: b.date, valeur, source: 'bilan' }] : [];
      });

    const depuisSeances = db.seances
      .filter((s) => s.patientId === patientId && s.mesures[key] !== undefined)
      .map((s): PointSuivi => ({ date: s.date, valeur: s.mesures[key], source: 'seance' }));

    const points = [...depuisBilans, ...depuisSeances].sort((a, b) => a.date.localeCompare(b.date));
    return [{ key, label: field.reportLabel ?? field.label, field, points }];
  });
}
