import type { BilanTemplate, FieldDef, FieldType, SectionDef } from '../types';

/** Opérations d'édition d'un modèle : fonctions pures, testées indépendamment de l'interface. */

export const TYPES_CREABLES: { type: FieldType; label: string }[] = [
  { type: 'text', label: 'Texte court' },
  { type: 'textarea', label: 'Texte long' },
  { type: 'number', label: 'Mesure' },
  { type: 'select', label: 'Choix unique' },
  { type: 'multiselect', label: 'Choix multiples' },
  { type: 'boolean', label: 'Oui / non' },
  { type: 'eva', label: 'Échelle 0 à 10' },
  { type: 'bodychart', label: 'Schéma corporel' },
];

const nouvelId = (prefixe: string) => `${prefixe}_${globalThis.crypto.randomUUID().slice(0, 8)}`;

export const champs = (t: BilanTemplate) => t.sections.flatMap((s) => s.fields);

export function creerModele(nom: string): BilanTemplate {
  return {
    id: nouvelId('modele'),
    nom,
    specialite: 'musculo-squelettique',
    description: '',
    sections: [{ id: nouvelId('section'), title: 'Section 1', fields: [] }],
  };
}

/** Copie modifiable d'un modèle. Les identifiants de champs sont conservés pour garder les fiches. */
export function dupliquerModele(t: BilanTemplate): BilanTemplate {
  return { ...structuredClone(t), id: nouvelId('modele'), nom: `${t.nom} (copie)` };
}

export function creerChamp(type: FieldType, label?: string): FieldDef {
  const defaut = TYPES_CREABLES.find((x) => x.type === type)?.label ?? 'Champ';
  const champ: FieldDef = { id: nouvelId('champ'), label: label ?? defaut, type };
  if (type === 'select' || type === 'multiselect') champ.options = ['Option 1', 'Option 2'];
  return champ;
}

export function ajouterSection(t: BilanTemplate): { modele: BilanTemplate; sectionId: string } {
  const section: SectionDef = { id: nouvelId('section'), title: `Section ${t.sections.length + 1}`, fields: [] };
  return { modele: { ...t, sections: [...t.sections, section] }, sectionId: section.id };
}

/** Retire les conditions qui visent des champs disparus. */
function nettoyerConditions(t: BilanTemplate): BilanTemplate {
  const ids = new Set(champs(t).map((f) => f.id));
  return {
    ...t,
    sections: t.sections.map((s) => ({
      ...s,
      fields: s.fields.map((f) => {
        if (!f.visibleIf || ids.has(f.visibleIf.field)) return f;
        const { visibleIf: _retire, ...reste } = f;
        return reste;
      }),
    })),
  };
}

/** Un modèle garde toujours au moins une section. */
export function supprimerSection(t: BilanTemplate, sectionId: string): BilanTemplate {
  if (t.sections.length <= 1) return t;
  return nettoyerConditions({ ...t, sections: t.sections.filter((s) => s.id !== sectionId) });
}

export function majSection(t: BilanTemplate, sectionId: string, patch: Partial<SectionDef>): BilanTemplate {
  return { ...t, sections: t.sections.map((s) => (s.id === sectionId ? { ...s, ...patch, id: s.id } : s)) };
}

export function deplacerSection(t: BilanTemplate, sectionId: string, delta: number): BilanTemplate {
  const i = t.sections.findIndex((s) => s.id === sectionId);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= t.sections.length) return t;
  const sections = [...t.sections];
  sections.splice(j, 0, sections.splice(i, 1)[0]);
  return { ...t, sections };
}

export function ajouterChamp(t: BilanTemplate, sectionId: string, champ: FieldDef, index?: number): BilanTemplate {
  if (champs(t).some((f) => f.id === champ.id)) return t;
  return {
    ...t,
    sections: t.sections.map((s) => {
      if (s.id !== sectionId) return s;
      const fields = [...s.fields];
      fields.splice(index ?? fields.length, 0, champ);
      return { ...s, fields };
    }),
  };
}

export function supprimerChamp(t: BilanTemplate, fieldId: string): BilanTemplate {
  return nettoyerConditions({ ...t, sections: t.sections.map((s) => ({ ...s, fields: s.fields.filter((f) => f.id !== fieldId) })) });
}

export function majChamp(t: BilanTemplate, fieldId: string, patch: Partial<FieldDef>): BilanTemplate {
  return { ...t, sections: t.sections.map((s) => ({ ...s, fields: s.fields.map((f) => (f.id === fieldId ? { ...f, ...patch, id: f.id, type: f.type } : f)) })) };
}

/** Déplace un champ vers une section, à l'index voulu dans la liste d'arrivée. */
export function deplacerChamp(t: BilanTemplate, fieldId: string, sectionId: string, index: number): BilanTemplate {
  const champ = champs(t).find((f) => f.id === fieldId);
  if (!champ || !t.sections.some((s) => s.id === sectionId)) return t;
  const source = t.sections.find((s) => s.fields.some((f) => f.id === fieldId))!;
  const ancien = source.fields.findIndex((f) => f.id === fieldId);
  const cible = source.id === sectionId && ancien < index ? index - 1 : index;
  const sans = { ...t, sections: t.sections.map((s) => ({ ...s, fields: s.fields.filter((f) => f.id !== fieldId) })) };
  return ajouterChamp(sans, sectionId, champ, cible);
}

/** Déplace un champ d'un cran dans sa section. */
export function decalerChamp(t: BilanTemplate, fieldId: string, delta: number): BilanTemplate {
  const section = t.sections.find((s) => s.fields.some((f) => f.id === fieldId));
  if (!section) return t;
  const i = section.fields.findIndex((f) => f.id === fieldId);
  const j = i + delta;
  if (j < 0 || j >= section.fields.length) return t;
  return deplacerChamp(t, fieldId, section.id, delta > 0 ? j + 1 : j);
}

export const estDeclencheur = (f: FieldDef) => f.type === 'select' || f.type === 'multiselect' || f.type === 'boolean';

/** Valeurs proposables pour une condition portant sur ce champ. */
export const valeursDe = (f: FieldDef): (string | boolean)[] => (f.type === 'boolean' ? [true, false] : (f.options ?? []));

/** Champs pouvant déclencher l'affichage de `fieldId`, sans créer de dépendance circulaire. */
export function declencheursPossibles(t: BilanTemplate, fieldId: string): FieldDef[] {
  const parId = new Map(champs(t).map((f) => [f.id, f]));
  const dependDe = (f: FieldDef): boolean => {
    const vus = new Set<string>();
    let courant: FieldDef | undefined = f;
    while (courant?.visibleIf && !vus.has(courant.id)) {
      vus.add(courant.id);
      if (courant.visibleIf.field === fieldId) return true;
      courant = parId.get(courant.visibleIf.field);
    }
    return false;
  };
  return champs(t).filter((f) => f.id !== fieldId && estDeclencheur(f) && !dependDe(f));
}

/** Problèmes empêchant un usage correct du modèle, à signaler dans l'éditeur. */
export function problemes(t: BilanTemplate): string[] {
  const liste: string[] = [];
  if (!t.nom.trim()) liste.push('Le modèle n’a pas de nom.');
  if (champs(t).length === 0) liste.push('Le modèle ne contient aucun champ.');
  t.sections.forEach((s) => {
    if (!s.title.trim()) liste.push('Une section n’a pas de titre.');
    s.fields.forEach((f) => {
      if (!f.label.trim()) liste.push(`Un champ de « ${s.title} » n’a pas de libellé.`);
      if ((f.type === 'select' || f.type === 'multiselect') && !f.options?.length) liste.push(`« ${f.label} » n’a aucune option.`);
    });
  });
  return liste;
}
