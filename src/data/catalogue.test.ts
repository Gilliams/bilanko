import { describe, expect, it } from 'vitest';
import { CATALOGUE, estDansLeModele, ficheDuChamp, getItem, rechercherItems, templateDuBilan } from './catalogue';
import { TEMPLATES, getTemplate } from './templates';
import { createStore } from '../lib/store';
import { itemsSuivis, suiviKey } from '../lib/suivi';
import { formatValue, genererSynthese, scoreResultats } from '../lib/synthese';
import { demoDB } from './demo';

const memory = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
};

describe('catalogue', () => {
  it('a des identifiants uniques et des fiches complètes', () => {
    expect(new Set(CATALOGUE.map((i) => i.id)).size).toBe(CATALOGUE.length);
    for (const i of CATALOGUE) {
      expect(i.field.id).toBe(`cat_${i.id}`);
      for (const texte of [i.objectif, i.realisation, i.interpretation, i.source]) expect(texte.length).toBeGreaterThan(5);
    }
  });

  it('n’entre pas en collision avec les champs des modèles', () => {
    const ids = new Set(TEMPLATES.flatMap((t) => t.sections.flatMap((s) => s.fields.map((f) => f.id))));
    expect(CATALOGUE.filter((i) => ids.has(i.field.id))).toEqual([]);
  });

  it('calcule les scores à formule', () => {
    CATALOGUE.filter((i) => i.field.type === 'score').forEach((i) => expect(() => scoreResultats(i.field, {})).not.toThrow());
    const wells = getItem('wells')!.field;
    expect(formatValue(wells, { wells1: 1, wells2: 1, wells10: 0 })).toContain('probable, avis médical');
    expect(formatValue(wells, { wells1: 1, wells2: 1, wells10: -2 })).toContain('peu probable');
  });

  it('cherche sans tenir compte des accents ni de la casse', () => {
    expect(rechercherItems('LASEGUE').map((i) => i.id)).toEqual(['lasegue']);
    expect(rechercherItems('genou', { categorie: 'test' }).length).toBeGreaterThan(2);
    expect(rechercherItems('', { ids: [] })).toEqual([]);
  });

  it('relie les champs des modèles à leur fiche', () => {
    const lombo = getTemplate('msk-lombalgie')!;
    const lasegue = lombo.sections.flatMap((s) => s.fields).find((f) => f.id === 'lasegue')!;
    expect(ficheDuChamp(lasegue)?.id).toBe('lasegue');
    expect(estDansLeModele(lombo, getItem('lasegue')!)).toBe(true);
    expect(estDansLeModele(lombo, getItem('lachman')!)).toBe(false);
  });
});

describe('items ajoutés à un bilan', () => {
  it('apparaissent dans le compte rendu et sont repris au bilan suivant', () => {
    const s = createStore(memory());
    const p = s.addPatient({ nom: 'Test', prenom: 'Ana', dateNaissance: '1990-01-01', sexe: 'F' });
    const b = s.addBilan(p.id, 'msk-lombalgie', 'initial');
    s.toggleItemBilan(b.id, 'lachman');
    s.updateBilan(b.id, { values: { cat_lachman: 'Positif à droite' } });

    const bilan = s.get().bilans[0];
    const modele = getTemplate('msk-lombalgie')!;
    const synthese = genererSynthese(bilan, templateDuBilan(bilan, modele), demoDB().patients[0]);
    expect(synthese.sections.at(-1)).toMatchObject({ title: 'Items ajoutés', lines: [{ label: 'Lachman', value: 'Positif à droite' }] });

    expect(s.addBilan(p.id, 'msk-lombalgie', 'intermediaire').itemsAjoutes).toEqual(['lachman']);

    s.toggleItemBilan(b.id, 'lachman');
    expect(templateDuBilan(s.get().bilans[0], modele)).toBe(modele);
  });

  it('peuvent être suivis dans le temps', () => {
    const s = createStore(memory());
    const p = s.addPatient({ nom: 'Test', prenom: 'Ana', dateNaissance: '1990-01-01', sexe: 'F' });
    const b = s.addBilan(p.id, 'msk-epaule', 'initial');
    s.updateBilan(b.id, { itemsAjoutes: ['grip'], values: { cat_grip: 30 } });
    s.toggleSuivi(p.id, suiviKey('msk-epaule', 'cat_grip'));
    expect(itemsSuivis(s.get(), p.id)[0]).toMatchObject({ label: 'Force de préhension', points: [{ valeur: 30 }] });
  });

  it('gère les favoris', () => {
    const s = createStore(memory());
    s.toggleFavori('tug');
    expect(s.get().favoris).toEqual(['tug']);
    s.toggleFavori('tug');
    expect(s.get().favoris).toEqual([]);
  });
});

describe('bibliothèque et modèles étendus', () => {
  it('chaque modèle est valide et sans identifiant de champ en double', async () => {
    const { problemes } = await import('../lib/modeles');
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(16);
    for (const t of TEMPLATES) {
      const ids = t.sections.flatMap((s) => s.fields.map((f) => f.id));
      expect(new Set(ids).size, t.id).toBe(ids.length);
      expect(problemes(t), t.id).toEqual([]);
    }
    expect(new Set(TEMPLATES.map((t) => t.id)).size).toBe(TEMPLATES.length);
  });

  it('les plages d’interprétation sont rangées par ordre croissant', () => {
    for (const i of CATALOGUE) {
      const bornes = (i.field.plages ?? []).map((p) => p.jusqua);
      expect(bornes, i.id).toEqual([...bornes].sort((a, b) => a - b));
      if (i.field.plages?.length && i.field.max !== undefined) expect(bornes.at(-1), i.id).toBeGreaterThanOrEqual(i.field.max);
    }
  });

  it('les champs repris de la bibliothèque gardent leur fiche', () => {
    const genou = getTemplate('msk-genou')!;
    const champs = genou.sections.flatMap((s) => s.fields);
    expect(ficheDuChamp(champs.find((f) => f.id === 'lachman')!)?.id).toBe('lachman');
    expect(ficheDuChamp(champs.find((f) => f.id === 'koos')!)?.nom).toContain('KOOS');
    expect(CATALOGUE.length).toBeGreaterThan(150);
  });
});
