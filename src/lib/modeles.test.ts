import { describe, expect, it } from 'vitest';
import { createStore } from './store';
import {
  ajouterChamp,
  ajouterSection,
  champs,
  creerChamp,
  creerModele,
  decalerChamp,
  declencheursPossibles,
  deplacerChamp,
  deplacerSection,
  dupliquerModele,
  majChamp,
  problemes,
  supprimerChamp,
  supprimerSection,
} from './modeles';
import { isVisible } from './synthese';
import { TEMPLATES } from '../data/templates';
import type { BilanTemplate, FieldDef } from '../types';

const memory = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
};

const f = (id: string, extra: Partial<FieldDef> = {}): FieldDef => ({ id, label: id, type: 'text', ...extra });

function exemple(): BilanTemplate {
  return {
    ...creerModele('Test'),
    sections: [
      { id: 's1', title: 'Un', fields: [f('a'), f('b'), f('c')] },
      { id: 's2', title: 'Deux', fields: [f('d')] },
    ],
  };
}

const ordre = (t: BilanTemplate) => t.sections.map((s) => s.fields.map((x) => x.id).join('')).join('|');

describe('édition de modèle', () => {
  it('déplace un champ dans sa section et vers une autre', () => {
    const t = exemple();
    expect(ordre(deplacerChamp(t, 'a', 's1', 3))).toBe('bca|d');
    expect(ordre(deplacerChamp(t, 'c', 's1', 0))).toBe('cab|d');
    expect(ordre(deplacerChamp(t, 'a', 's1', 2))).toBe('bac|d');
    expect(ordre(deplacerChamp(t, 'b', 's2', 0))).toBe('ac|bd');
    expect(ordre(deplacerChamp(t, 'b', 's2', 1))).toBe('ac|db');
  });

  it('décale un champ sans sortir de sa section', () => {
    const t = exemple();
    expect(ordre(decalerChamp(t, 'a', 1))).toBe('bac|d');
    expect(ordre(decalerChamp(t, 'c', -1))).toBe('acb|d');
    expect(ordre(decalerChamp(t, 'a', -1))).toBe('abc|d');
    expect(ordre(decalerChamp(t, 'c', 1))).toBe('abc|d');
  });

  it('réordonne les sections et en garde au moins une', () => {
    const t = exemple();
    expect(deplacerSection(t, 's2', -1).sections[0].id).toBe('s2');
    expect(deplacerSection(t, 's1', -1)).toBe(t);
    const une = supprimerSection(t, 's1');
    expect(ordre(une)).toBe('d');
    expect(supprimerSection(une, 's2')).toBe(une);
  });

  it('retire les conditions visant un champ supprimé', () => {
    const t = majChamp(exemple(), 'b', { visibleIf: { field: 'a', in: ['x'] } });
    expect(champs(supprimerChamp(t, 'a')).find((x) => x.id === 'b')!.visibleIf).toBeUndefined();
    expect(champs(supprimerSection(t, 's1'))).toHaveLength(1);
  });

  it('n’ajoute pas deux fois le même champ', () => {
    const t = exemple();
    expect(ajouterChamp(t, 's2', f('a'))).toBe(t);
  });

  it('ne change ni l’identifiant ni le type d’un champ', () => {
    const t = majChamp(exemple(), 'a', { id: 'z', type: 'number', label: 'Nouveau' });
    expect(t.sections[0].fields[0]).toMatchObject({ id: 'a', type: 'text', label: 'Nouveau' });
  });

  it('crée des options par défaut pour les choix', () => {
    expect(creerChamp('select').options).toHaveLength(2);
    expect(creerChamp('number').options).toBeUndefined();
  });

  it('évite les dépendances circulaires', () => {
    let t = exemple();
    t = majChamp(t, 'a', { type: 'select' });
    t = { ...t, sections: [{ id: 's1', title: 'Un', fields: [f('a', { type: 'select', options: ['x'] }), f('b', { type: 'boolean' }), f('c', { type: 'boolean', visibleIf: { field: 'b', in: [true] } })] }] };
    t = majChamp(t, 'b', { visibleIf: { field: 'a', in: ['x'] } });
    expect(declencheursPossibles(t, 'a').map((x) => x.id)).toEqual([]);
    expect(declencheursPossibles(t, 'c').map((x) => x.id)).toEqual(['a', 'b']);
  });

  it('signale les modèles incomplets', () => {
    expect(problemes(creerModele(''))).toHaveLength(2);
    const t = ajouterChamp(creerModele('Ok'), 'x', f('a'));
    expect(problemes(t)).toContain('Le modèle ne contient aucun champ.');
    const s = ajouterSection(creerModele('Ok'));
    const avecChoix = ajouterChamp(s.modele, s.sectionId, f('c', { type: 'select', options: [] }));
    expect(problemes(avecChoix)).toEqual(['« c » n’a aucune option.']);
  });

  it('duplique sans toucher à l’original et garde les conditions', () => {
    const original = TEMPLATES[0];
    const copie = dupliquerModele(original);
    expect(copie.id).not.toBe(original.id);
    const angle = champs(copie).find((x) => x.id === 'lasegue_angle')!;
    expect(isVisible(angle, { lasegue: 'Positif à droite' })).toBe(true);
    copie.sections[0].fields.pop();
    expect(champs(original).length).toBeGreaterThan(champs(copie).length);
  });
});

describe('modèles enregistrés', () => {
  it('persistent et ne se suppriment pas s’ils sont utilisés', () => {
    const storage = memory();
    const s = createStore(storage);
    const m = creerModele('Perso');
    s.addModele(m);
    s.updateModele(m.id, { ...m, nom: 'Renommé' });
    expect(createStore(storage).get().modeles[0].nom).toBe('Renommé');

    const p = s.addPatient({ nom: 'T', prenom: 'A', dateNaissance: '1990-01-01', sexe: 'F' });
    const b = s.addBilan(p.id, m.id, 'initial');
    expect(s.deleteModele(m.id)).toBe(false);
    s.deleteBilan(b.id);
    expect(s.deleteModele(m.id)).toBe(true);
    expect(s.get().modeles).toEqual([]);
  });
});
