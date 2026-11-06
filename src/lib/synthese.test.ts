import { describe, expect, it } from 'vitest';
import { createStore } from './store';
import { evolutions, formatValue, genererSynthese, scoreTotal } from './synthese';
import { getTemplate } from '../data/templates';
import { demoDB } from '../data/demo';

const memory = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
};

describe('store', () => {
  it('reprend les valeurs du dernier bilan du même modèle', () => {
    const s = createStore(memory());
    const p = s.addPatient({ nom: 'Test', prenom: 'Ana', dateNaissance: '1990-01-01', sexe: 'F' });
    const b1 = s.addBilan(p.id, 'msk-lombalgie', 'initial');
    s.updateBilan(b1.id, { values: { schober: 2 } });
    const b2 = s.addBilan(p.id, 'msk-lombalgie', 'intermediaire');
    expect(b2.values).toEqual({ schober: 2 });
    // copie indépendante
    s.updateBilan(b2.id, { values: { schober: 4 } });
    expect(s.get().bilans.find((b) => b.id === b1.id)!.values.schober).toBe(2);
    // autre modèle : pas de reprise
    expect(s.addBilan(p.id, 'vestibulaire', 'initial').values).toEqual({});
  });

  it('supprime les bilans avec le patient et persiste', () => {
    const storage = memory();
    const s = createStore(storage);
    const p = s.addPatient({ nom: 'X', prenom: 'Y', dateNaissance: '2000-01-01', sexe: 'X' });
    s.addBilan(p.id, 'msk-epaule', 'initial');
    s.deletePatient(p.id);
    expect(createStore(storage).get()).toMatchObject({ patients: [], bilans: [] });
  });
});

describe('synthèse', () => {
  const db = demoDB();
  const lombo = getTemplate('msk-lombalgie')!;
  const [b1, b2] = db.bilans;
  const patient = db.patients[0];

  it('ne liste que les champs renseignés et calcule la complétude', () => {
    const s = genererSynthese(b2, lombo, patient);
    const labels = s.sections.flatMap((x) => x.lines.map((l) => l.label));
    expect(labels).toContain('Indice de Schober');
    expect(labels).not.toContain('Diagnostic kinésithérapique');
    expect(s.completude).toBeGreaterThan(0);
    expect(s.completude).toBeLessThan(100);
  });

  it('calcule et interprète le score Oswestry', () => {
    const f = lombo.sections.flatMap((s) => s.fields).find((x) => x.id === 'oswestry')!;
    expect(scoreTotal(f, b1.values.oswestry)).toEqual({ total: 17, max: 36, complete: true });
    expect(formatValue(f, b1.values.oswestry)).toBe('17/36 (47 % — incapacité sévère)');
  });

  it('signale les drapeaux rouges', () => {
    const s = genererSynthese({ ...b1, values: { ...b1.values, drapeaux_rouges: ['Fièvre'] } }, lombo, patient);
    expect(s.alertes[0]).toMatch(/Fièvre/);
  });

  it('détecte les évolutions entre deux bilans', () => {
    const evo = evolutions(b1, b2, lombo);
    const schober = evo.find((e) => e.label === 'Indice de Schober')!;
    expect(schober).toMatchObject({ avant: '2.5 cm', apres: '3.5 cm', delta: 1 });
    expect(evo.find((e) => e.label === 'EVA au mouvement')?.delta).toBe(-3);
  });
});
