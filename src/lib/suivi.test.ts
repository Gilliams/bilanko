import { describe, expect, it } from 'vitest';
import { evaluer } from './formule';
import { createStore } from './store';
import { itemsSuivis, suiviKey } from './suivi';
import { formatValue, genererSynthese, isVisible, scoreResultats } from './synthese';
import { TEMPLATES, getTemplate } from '../data/templates';
import { demoDB } from '../data/demo';
import type { FieldDef } from '../types';

const memory = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
};

describe('formules', () => {
  it('respecte les priorités et les parenthèses', () => {
    expect(evaluer('2 + 3 * 4', {})).toBe(14);
    expect(evaluer('(2 + 3) * 4', {})).toBe(20);
    expect(evaluer('100 - total / max * 100', { total: 7, max: 28 })).toBe(75);
    expect(evaluer('-2 + 5', {})).toBe(3);
  });

  it('ignore les réponses manquantes dans somme et moyenne', () => {
    const ctx = { a: 4, b: null, c: 2 };
    expect(evaluer('somme(a, b, c)', ctx)).toBe(6);
    expect(evaluer('moyenne(a, b, c)', ctx)).toBe(3);
    expect(evaluer('moyenne(b)', ctx)).toBeNull();
  });

  it('rend le calcul indisponible sans réponse ou sur une division par zéro', () => {
    expect(evaluer('a + 1', { a: null })).toBeNull();
    expect(evaluer('total / max', { total: 1, max: 0 })).toBeNull();
  });

  it('refuse les formules invalides', () => {
    expect(() => evaluer('inconnue + 1', {})).toThrow(/inconnue/);
    expect(() => evaluer('1 +', {})).toThrow();
    expect(() => evaluer('1 2', {})).toThrow();
    expect(() => evaluer('1 $ 2', {})).toThrow();
  });

  it('accepte toutes les formules des modèles', () => {
    const scores = TEMPLATES.flatMap((t) => t.sections.flatMap((s) => s.fields)).filter((f) => f.type === 'score');
    expect(scores.length).toBeGreaterThan(0);
    scores.forEach((f) => expect(() => scoreResultats(f, {})).not.toThrow());
  });
});

describe('affichage conditionnel', () => {
  const lombo = getTemplate('msk-lombalgie')!;
  const angle = lombo.sections.flatMap((s) => s.fields).find((f) => f.id === 'lasegue_angle')!;

  it('dépend de la valeur du champ déclencheur', () => {
    expect(isVisible(angle, {})).toBe(false);
    expect(isVisible(angle, { lasegue: 'Négatif' })).toBe(false);
    expect(isVisible(angle, { lasegue: 'Positif à droite' })).toBe(true);
  });

  it('sans liste de valeurs, exige un champ renseigné et non négatif', () => {
    const f: FieldDef = { id: 'x', label: 'X', type: 'text', visibleIf: { field: 'y' } };
    expect(isVisible(f, {})).toBe(false);
    expect(isVisible(f, { y: false })).toBe(false);
    expect(isVisible(f, { y: true })).toBe(true);
  });

  it('écarte un champ masqué du compte rendu même s’il garde une valeur', () => {
    const db = demoDB();
    const bilan = { ...db.bilans[0], values: { lasegue: 'Négatif', lasegue_angle: 45 } };
    const labels = genererSynthese(bilan, lombo, db.patients[0]).sections.flatMap((s) => s.lines.map((l) => l.label));
    expect(labels).toContain('Lasègue');
    expect(labels).not.toContain('Angle de Lasègue');
  });
});

describe('scores et compte rendu', () => {
  it('utilise le libellé de compte rendu', () => {
    const db = demoDB();
    const lombo = getTemplate('msk-lombalgie')!;
    const labels = genererSynthese(db.bilans[0], lombo, db.patients[0]).sections.flatMap((s) => s.lines.map((l) => l.label));
    expect(labels).toContain('Oswestry (ODI)');
  });

  it('garde l’affichage des échelles', () => {
    const mmrc = getTemplate('cardio-bpco')!.sections.flatMap((s) => s.fields).find((f) => f.id === 'mmrc')!;
    expect(formatValue(mmrc, { mrc: 2 })).toBe('2/4 (grade 2)');
  });
});

describe('suivi', () => {
  it('réunit bilans et séances par date, et nettoie à la suppression du patient', () => {
    const s = createStore(memory());
    const p = s.addPatient({ nom: 'Test', prenom: 'Ana', dateNaissance: '1990-01-01', sexe: 'F' });
    const b = s.addBilan(p.id, 'msk-lombalgie', 'initial');
    s.updateBilan(b.id, { date: '2026-01-10', values: { schober: 2 } });
    const key = suiviKey('msk-lombalgie', 'schober');
    s.toggleSuivi(p.id, key);
    s.addSeance({ patientId: p.id, date: '2026-01-20', mesures: { [key]: 3 } });
    s.addSeance({ patientId: p.id, date: '2026-01-05', mesures: { [key]: 1 } });

    const [item] = itemsSuivis(s.get(), p.id);
    expect(item.points.map((x) => [x.valeur, x.source])).toEqual([
      [1, 'seance'],
      [2, 'bilan'],
      [3, 'seance'],
    ]);

    s.toggleSuivi(p.id, key);
    expect(itemsSuivis(s.get(), p.id)).toEqual([]);

    s.deletePatient(p.id);
    expect(s.get()).toMatchObject({ seances: [], suivis: {} });
  });

  it('charge une ancienne base sans séances', () => {
    const storage = memory();
    storage.setItem('bilanko:db', JSON.stringify({ version: 1, patients: [], bilans: [] }));
    expect(createStore(storage).get()).toMatchObject({ seances: [], suivis: {} });
  });
});
