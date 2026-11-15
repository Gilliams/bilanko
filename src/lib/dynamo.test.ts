import { describe, expect, it } from 'vitest';
import { analyserDynamo, texteDynamo } from './dynamo';
import { BIBLIOTHEQUE_SECTIONS } from '../data/sections-biblio';
import type { FieldDef } from '../types';

const champ = (id: string): FieldDef => {
  const f = BIBLIOTHEQUE_SECTIONS.flatMap((s) => s.fields).find((x) => x.id === id);
  if (!f) throw new Error(id);
  return f;
};

// Valeurs de l'exemple de compte rendu MicroFET2, patient de 51 kg.
const POIDS = 51;

describe('dynamométrie', () => {
  it('calcule déficit, N/kg et ratio comme le compte rendu de référence (hanche)', () => {
    const f = champ('dyn_hanche_abd_add');
    const r = analyserDynamo(f, { abd_d: 162, abd_g: 184, add_d: 142, add_g: 160 }, POIDS);
    const [abd, add] = r.groupes;
    expect(abd.ecart).toBe(12);
    expect(abd.deficit).toBe('d');
    expect(abd.parKg.d!.toFixed(2)).toBe('3.18');
    expect(abd.parKg.g!.toFixed(2)).toBe('3.61');
    expect(abd.etat).toEqual({ d: 'haut', g: 'haut' });
    expect(add.ecart).toBe(11);
    expect(add.etat.d).toBe('bas');
    expect(r.ratio!.valeur.d!.toFixed(2)).toBe('1.14');
    expect(r.ratio!.valeur.g!.toFixed(2)).toBe('1.15');
  });

  it('ne parle pas de déficit sous 10 % d’écart', () => {
    const r = analyserDynamo(champ('dyn_hanche_rot'), { ri_d: 182, ri_g: 171, re_d: 145, re_g: 139 }, POIDS);
    expect(r.groupes[0].ecart).toBe(6);
    expect(r.groupes[0].deficit).toBeNull();
    expect(r.ratio!.etat.d).toBe('bas');
  });

  it('gère un groupe seul, sans ratio', () => {
    const r = analyserDynamo(champ('dyn_quadriceps'), { quadri_d: 362, quadri_g: 404 }, POIDS);
    expect(r.groupes[0].ecart).toBe(10);
    expect(r.groupes[0].deficit).toBe('d');
    expect(r.ratio).toBeNull();
  });

  it('rédige le compte rendu', () => {
    const texte = texteDynamo(champ('dyn_cheville_inv_ev'), { inv_d: 194, inv_g: 205, ev_d: 256, ev_g: 219 }, POIDS);
    expect(texte).toContain('Inverseurs : D 194 N, G 205 N — RAS — 3,8 N/kg à droite et 4,02 à gauche (norme 3,2-3,5 N/kg)');
    expect(texte).toContain('Éverseurs : D 256 N, G 219 N — 14 % de déficit à gauche');
    expect(texte).toContain('Ratio INV/EV : 0,76 à droite et 0,94 à gauche (norme 0,9-1,1)');
  });

  it('signale l’absence de poids au lieu de calculer les N/kg', () => {
    const texte = texteDynamo(champ('dyn_quadriceps'), { quadri_d: 362 });
    expect(texte).toContain('Quadriceps : D 362 N');
    expect(texte).toContain('Poids du patient non renseigné');
    expect(texteDynamo(champ('dyn_quadriceps'), {})).toBe('');
  });
});
