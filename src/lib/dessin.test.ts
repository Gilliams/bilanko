import { describe, expect, it } from 'vitest';
import { FONDS, getFond, lisser } from '../data/fonds';
import { cheminTrait, estDessin, fondsUtilises, lireDessin, resumerDessin, simplifier, texteDessin, toucheTrait } from './dessin';
import { createStore } from './store';
import { formatValue, isFilled } from './synthese';
import type { BodyMark, FieldDef, Trait } from '../types';

const trait = (partiel: Partial<Trait>): Trait => ({
  id: 't',
  fond: 'corps',
  sensation: 'vive',
  outil: 'trait',
  epaisseur: 10,
  intensite: 5,
  points: [0, 0, 10, 0],
  ...partiel,
});

const memory = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
};

describe('tracés', () => {
  it('garde les extrémités et retire les points trop proches', () => {
    expect(simplifier([0, 0, 0.5, 0, 1, 0, 3, 0, 3.2, 0])).toEqual([0, 0, 3, 0, 3.2, 0]);
    expect(simplifier([1, 1])).toEqual([1, 1]);
  });

  it('dessine un point et une zone fermée', () => {
    expect(cheminTrait([5, 6])).toBe('M5 6l0.01 0');
    expect(cheminTrait([0, 0, 10, 0, 10, 10], true).endsWith('Z')).toBe(true);
  });

  it('détecte un point sur un trait et dans une zone', () => {
    expect(toucheTrait(trait({ points: [0, 0, 100, 0] }), 50, 8, 4)).toBe(true);
    expect(toucheTrait(trait({ points: [0, 0, 100, 0] }), 50, 20, 4)).toBe(false);
    const zone = trait({ outil: 'zone', epaisseur: 0, points: [0, 0, 100, 0, 100, 100, 0, 100] });
    expect(toucheTrait(zone, 50, 50, 1)).toBe(true);
    expect(toucheTrait(zone, 150, 50, 1)).toBe(false);
    expect(toucheTrait(trait({ points: [10, 10] }), 12, 10, 1)).toBe(true);
  });
});

describe('régions du corps', () => {
  const corps = getFond('corps');

  it('tient compte de l’inversion droite-gauche entre face et dos', () => {
    expect(corps.zoneDe(70, 340)).toBe('cuisse droite');
    expect(corps.zoneDe(190, 340)).toBe('cuisse gauche');
    expect(corps.zoneDe(330, 340)).toBe('cuisse gauche');
    expect(corps.zoneDe(450, 340)).toBe('cuisse droite');
  });

  it('reconnaît les grandes régions', () => {
    expect(corps.zoneDe(130, 30)).toBe('tête');
    expect(corps.zoneDe(390, 240)).toBe('région lombaire');
    expect(corps.zoneDe(80, 110)).toBe('épaule droite');
  });

  it('fournit des tracés valides pour chaque fond', () => {
    for (const f of FONDS) {
      expect(f.formes.length).toBeGreaterThan(0);
      f.formes.forEach((x) => expect(x.d).not.toMatch(/NaN|undefined/));
      f.details.forEach((d) => expect(d).not.toMatch(/NaN|undefined/));
    }
    expect(lisser([[0, 0], [10, 0], [10, 10]], true).endsWith('Z')).toBe(true);
  });
});

describe('dessin dans un bilan', () => {
  const champ: FieldDef = { id: 'schema', label: 'Schéma', type: 'bodychart' };

  it('convertit l’ancien schéma à points', () => {
    const anciens: BodyMark[] = [{ id: 'm', view: 'dos', x: 50, y: 40, kind: 'paresthesie', intensite: 3 }];
    const { traits } = lireDessin(anciens);
    expect(traits[0]).toMatchObject({ fond: 'corps', sensation: 'fourmillements', intensite: 3 });
    expect(traits[0].points[0]).toBe(390);
    expect(lireDessin(null).traits).toEqual([]);
    expect(lireDessin(undefined).traits).toEqual([]);
  });

  it('résume par sensation avec régions et intensité maximale', () => {
    const d = {
      traits: [
        trait({ id: 'a', points: [390, 240, 392, 242], intensite: 4 }),
        trait({ id: 'b', points: [390, 245, 392, 246], intensite: 7 }),
        trait({ id: 'c', sensation: 'cicatrice', intensite: null, points: [130, 200] }),
      ],
    };
    const [vive, cicatrice] = resumerDessin(d);
    expect(vive).toMatchObject({ traits: 2, intensiteMax: 7, zones: ['région lombaire'] });
    expect(cicatrice.intensiteMax).toBeNull();
    expect(texteDessin(d)).toBe('Douleur vive 7/10 : région lombaire ; Cicatrice : abdomen');
    expect(formatValue(champ, d)).toBe(texteDessin(d));
  });

  it('liste les fonds utilisés et considère un dessin vide comme non renseigné', () => {
    const d = { traits: [trait({ fond: 'pieds' }), trait({ id: 'x' })] };
    expect(fondsUtilises(d).map((f) => f.id)).toEqual(['corps', 'pieds']);
    expect(isFilled({ traits: [] })).toBe(false);
    expect(isFilled(d)).toBe(true);
    expect(estDessin(d)).toBe(true);
    expect(estDessin([])).toBe(false);
  });

  it('ne reprend pas le dessin dans un nouveau bilan', () => {
    const s = createStore(memory());
    const p = s.addPatient({ nom: 'T', prenom: 'A', dateNaissance: '1990-01-01', sexe: 'F' });
    const b = s.addBilan(p.id, 'msk-lombalgie', 'initial');
    s.updateBilan(b.id, { values: { schober: 2, schema: { traits: [trait({})] } } });
    expect(s.addBilan(p.id, 'msk-lombalgie', 'intermediaire').values).toEqual({ schober: 2 });
  });
});
