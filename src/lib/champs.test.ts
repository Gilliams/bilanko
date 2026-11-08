import { describe, expect, it } from 'vitest';
import { compteRendu, PARTIE_CONCLUSION } from './documents';
import { erreurFormule, problemes } from './modeles';
import { createStore, nomBilan } from './store';
import { evolutions, formatValue, genererSynthese, isFilled, valeurCalculee } from './synthese';
import { getItem, templateDuBilan } from '../data/catalogue';
import { getTemplate } from '../data/templates';
import type { Bilan, BilanTemplate, FieldDef, Patient } from '../types';

const memory = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
};

const lombo = getTemplate('msk-lombalgie')!;
const champ = (id: string) => lombo.sections.flatMap((s) => s.fields).find((f) => f.id === id)!;
const patient: Patient = { id: 'p', nom: 'Test', prenom: 'Alex', dateNaissance: '1990-01-01', sexe: 'X', createdAt: '2026-01-01' };
const bilan = (values: Bilan['values'], extra: Partial<Bilan> = {}): Bilan => ({
  id: 'b',
  patientId: 'p',
  templateId: lombo.id,
  type: 'initial',
  statut: 'brouillon',
  date: '2026-11-01',
  values,
  createdAt: '2026-11-01',
  updatedAt: '2026-11-01',
  ...extra,
});

describe('bilans : nom, duplication', () => {
  it('affiche le nom choisi, sinon le type', () => {
    expect(nomBilan({ type: 'initial' })).toBe('Bilan initial');
    expect(nomBilan({ type: 'initial', titre: '  ' })).toBe('Bilan initial');
    expect(nomBilan({ type: 'final', titre: 'Bilan LCA' })).toBe('Bilan LCA');
  });

  it('crée un bilan à partir d’un bilan choisi, pas du dernier', () => {
    const s = createStore(memory());
    const initial = s.addBilan('p', lombo.id, 'initial');
    s.updateBilan(initial.id, { values: { schober: 2 }, titre: 'Initial', date: '2026-01-01' });
    const autre = s.addBilan('p', lombo.id, 'intermediaire');
    s.updateBilan(autre.id, { values: { schober: 4 }, date: '2026-02-01' });

    const copie = s.dupliquerBilan(initial.id, 'final')!;
    expect(copie.values).toEqual({ schober: 2 });
    expect(copie.type).toBe('final');
    expect(copie.titre).toBeUndefined();
    expect(copie.statut).toBe('brouillon');
    expect(s.get().bilans).toHaveLength(3);
    expect(s.dupliquerBilan('inconnu', 'final')).toBeUndefined();
  });
});

describe('export : choix des items', () => {
  const b = bilan({ schober: 3, dms: 20 }, { conclusion: 'Bonne évolution.' });
  const titres = (exclus: string[]) => compteRendu(b, lombo, patient, {}, undefined, new Set(exclus)).blocs.map((x) => ('label' in x ? x.label : 'texte' in x ? x.texte : ''));

  it('garde tout par défaut', () => {
    expect(titres([])).toEqual(expect.arrayContaining(['Indice de Schober', 'Distance doigts-sol', 'Conclusion', 'Bonne évolution.']));
  });

  it('retire les items décochés, leur section vide et la conclusion', () => {
    const t = titres(['schober', 'dms', PARTIE_CONCLUSION]);
    expect(t).not.toContain('Indice de Schober');
    expect(t).not.toContain('Mobilité');
    expect(t).not.toContain('Conclusion');
  });
});

describe('nouveaux types de champs', () => {
  it('test : résultat et observation', () => {
    const f = champ('instabilite_procubitus');
    expect(formatValue(f, { resultat: 'Positif', observation: 'L4-L5' })).toBe('Positif — L4-L5');
    expect(isFilled({ resultat: null, observation: '  ' })).toBe(false);
    expect(isFilled({ resultat: null, observation: 'à refaire' })).toBe(true);
  });

  it('critères : présents, non recherchés et seuil', () => {
    const f = champ('radiculopathie');
    const [a, b, c, d] = f.options!;
    expect(formatValue(f, { [a]: true, [b]: true, [c]: true, [d]: false })).toBe(`3/5 : ${a}, ${b}, ${c} (1 non recherché) — radiculopathie probable`);
    expect(formatValue(f, { [a]: false, [b]: false })).toBe('aucun sur 2 recherchés — seuil de 3 non atteint');
    expect(isFilled({ [a]: false })).toBe(true);
  });

  it('critères : alerte du compte rendu quand le seuil est atteint', () => {
    const item = getItem('drapeaux_recherche')!;
    const b = bilan({}, { itemsAjoutes: ['drapeaux_recherche'] });
    const t = templateDuBilan(b, lombo);
    expect(genererSynthese(b, t, patient).alertes).toEqual([]);
    b.values[item.field.id] = { 'Fièvre ou frissons': true, 'Antécédent de cancer': false };
    expect(genererSynthese(b, t, patient).alertes).toEqual(['Drapeaux rouges : Fièvre ou frissons — avis médical recommandé']);
  });

  it('gauche / droite : écart en pourcentage', () => {
    const f = getItem('heel_rise')!.field;
    expect(formatValue(f, { g: 25, d: 15 })).toBe('G 25 rép · D 15 rép (écart 40 %)');
    expect(formatValue(f, { g: 20, d: null } as never)).toBe('G 20 rép');
    expect(isFilled({ g: null, d: null } as never)).toBe(false);
  });

  it('activités : liste et moyenne', () => {
    const f = champ('psfs');
    const v = [
      { activite: 'Monter un étage', note: 4 },
      { activite: 'Porter les courses', note: 7 },
      { activite: '', note: null },
    ];
    expect(formatValue(f, v)).toBe('Monter un étage 4/10 ; Porter les courses 7/10 — moyenne 5,5/10');
    expect(isFilled([{ activite: '', note: null }])).toBe(false);
  });

  it('calcul : ratio Shirado-Ito / Sorensen, dans le modèle et depuis la bibliothèque', () => {
    const ratio = champ('ratio_endurance');
    expect(valeurCalculee(ratio, lombo, { shirado: 90 })).toBeNull();
    expect(valeurCalculee(ratio, lombo, { shirado: 90, sorensen: 0 })).toBeNull();
    expect(valeurCalculee(ratio, lombo, { shirado: 90, sorensen: 60 })).toBe(1.5);
    expect(formatValue(ratio, 1.5)).toBe('1,5');

    // Sorensen du modèle + Shirado et ratio ajoutés depuis la bibliothèque
    const epaule = getTemplate('msk-epaule')!;
    const t: BilanTemplate = templateDuBilan({ itemsAjoutes: ['sorensen', 'shirado', 'ratio_endurance'] }, epaule);
    expect(valeurCalculee(getItem('ratio_endurance')!.field, t, { cat_shirado: 50, cat_sorensen: 100 })).toBe(0.5);
  });

  it('calcul : apparaît dans le compte rendu sans compter dans la complétude', () => {
    const vide = genererSynthese(bilan({}), lombo, patient);
    const rempli = genererSynthese(bilan({ shirado: 90, sorensen: 60 }), lombo, patient);
    const lignes = rempli.sections.flatMap((s) => s.lines);
    expect(lignes.find((l) => l.fieldId === 'ratio_endurance')?.value).toBe('1,5');
    expect(vide.completude).toBe(0);
  });

  it('évolutions : calculs et moyenne des activités', () => {
    const avant = bilan({ shirado: 60, sorensen: 60, psfs: [{ activite: 'Marcher', note: 3 }] });
    const apres = bilan({ shirado: 90, sorensen: 60, psfs: [{ activite: 'Marcher', note: 6 }] });
    const evo = evolutions(avant, apres, lombo);
    expect(evo.map((e) => [e.label, e.avant, e.apres])).toEqual(
      expect.arrayContaining([
        ['Ratio fléchisseurs / extenseurs', '1', '1,5'],
        ['PSFS', 'moyenne 3/10', 'moyenne 6/10'],
      ]),
    );
  });
});

describe('éditeur de modèles : formules', () => {
  const modele: BilanTemplate = {
    id: 'm',
    nom: 'Modèle',
    specialite: 'musculo-squelettique',
    description: '',
    sections: [
      {
        id: 's',
        title: 'Section',
        fields: [
          { id: 'a', label: 'A', type: 'number' },
          { id: 'b', label: 'B', type: 'eva' },
          { id: 'r', label: 'Ratio', type: 'calcul', formule: 'a / b' },
        ] as FieldDef[],
      },
    ],
  };

  it('valide les formules sur les mesures du modèle', () => {
    expect(erreurFormule(modele, 'a / b')).toBeNull();
    expect(erreurFormule(modele, '')).toBe('La formule est vide.');
    expect(erreurFormule(modele, 'a / c')).toContain('Variable inconnue');
    expect(problemes(modele)).toEqual([]);
    const casse = { ...modele, sections: [{ ...modele.sections[0], fields: [...modele.sections[0].fields, { id: 'x', label: 'X', type: 'calcul', formule: 'a +' } as FieldDef] }] };
    expect(problemes(casse)).toEqual([expect.stringContaining('« X »')]);
  });
});

describe('questionnaires protégés : résultat seul', () => {
  it('DN4 : score sur 10 et interprétation au seuil de 4', () => {
    const dn4 = champ('dn4');
    expect(formatValue(dn4, 3)).toBe('3/10 — douleur neuropathique peu probable');
    expect(formatValue(dn4, 4)).toBe('4/10 — douleur neuropathique probable');
  });

  it('STarT Back : catégorie de risque calculée', () => {
    const risque = champ('startback_risque');
    const cas = (total: number, psy: number) => formatValue(risque, valeurCalculee(risque, lombo, { startback_total: total, startback_psy: psy }));
    expect(cas(3, 3)).toBe('risque faible : conseils, réassurance, peu de séances');
    expect(cas(3, 4)).toContain('risque faible');
    expect(cas(4, 3)).toContain('risque moyen');
    expect(cas(6, 4)).toContain('risque élevé');
    expect(valeurCalculee(risque, lombo, { startback_total: 6 })).toBeNull();
  });

  it('les mêmes items de la bibliothèque calculent aussi la catégorie', () => {
    const t = templateDuBilan({ itemsAjoutes: ['startback_total', 'startback_psy', 'startback_risque'] }, getTemplate('msk-epaule')!);
    expect(valeurCalculee(getItem('startback_risque')!.field, t, { cat_startback_total: 5, cat_startback_psy: 4 })).toBe(3);
  });
});
