import { describe, expect, it } from 'vitest';
import { affectationsInitiales, appliquerImport, associer, ciblesDuModele, cleCible, lireCsvDynamo, lireLignes } from './importCsv';
import { creerModele, insererSection } from './modeles';
import { dynamometrie } from '../data/sections-biblio';

const modele = insererSection(creerModele('Test'), dynamometrie).modele;
const cibles = ciblesDuModele(modele);
const cibleDe = (test: string) => associer(test, cibles)?.label ?? null;

describe('lecture CSV', () => {
  it('gère guillemets, séparateur point-virgule et décimales à virgule', () => {
    expect(lireLignes('a;"b;c";d\r\n1;"dit ""oui""";3,5\n')).toEqual([
      ['a', 'b;c', 'd'],
      ['1', 'dit "oui"', '3,5'],
    ]);
  });

  it('lit une ligne par mesure (test, côté, force en newtons)', () => {
    const r = lireCsvDynamo('Date,Client,Test Name,Side,Peak Force (N),Time to Peak (s)\n2026-11-14,X,Hip Abduction,Right,162,1.2\n2026-11-14,X,Hip Abduction,Left,184,1.1');
    expect(r.mesures.map((m) => [m.test, m.cote, m.force])).toEqual([
      ['Hip Abduction', 'd', 162],
      ['Hip Abduction', 'g', 184],
    ]);
    expect(r.avertissements).toEqual([]);
    expect(r.dates).toEqual(['2026-11-14']);
  });

  it('lit une colonne de force par côté et convertit les kilos et les livres', () => {
    const kg = lireCsvDynamo('Muscle;Gauche (kg);Droite (kg)\nQuadriceps;41,2;36,9');
    expect(kg.mesures.map((m) => [m.cote, m.force])).toEqual([
      ['g', 404],
      ['d', 361.9],
    ]);
    const lb = lireCsvDynamo('Test,Left Peak Force (lbs),Right Peak Force (lbs)\nKnee Flexion 90,34.8,34.2');
    expect(lb.mesures[0].force).toBe(154.8);
  });

  it('trouve le côté dans le nom du test et signale une unité absente', () => {
    const r = lireCsvDynamo('Exercise,Max\nAnkle Inversion - Left,205\nAnkle Inversion - Right,194');
    expect(r.mesures.map((m) => [m.test, m.cote])).toEqual([
      ['Ankle Inversion', 'g'],
      ['Ankle Inversion', 'd'],
    ]);
    expect(r.avertissements.join(' ')).toContain('newtons');
  });

  it('refuse un fichier sans colonne de force', () => {
    expect(lireCsvDynamo('Nom,Prénom\nA,B').avertissements.join(' ')).toContain('Aucune colonne de force');
  });
});

describe('correspondance avec les champs du bilan', () => {
  it('reconnaît les tests en anglais et en français', () => {
    expect(cibleDe('Hip Abduction')).toBe('Hanche : abducteurs et adducteurs — Abducteurs');
    expect(cibleDe('Hip Adduction')).toBe('Hanche : abducteurs et adducteurs — Adducteurs');
    expect(cibleDe('Hip Internal Rotation')).toBe('Hanche : rotateurs — Rotateurs internes');
    expect(cibleDe('Hip ER')).toBe('Hanche : rotateurs — Rotateurs externes');
    expect(cibleDe('Ankle Eversion')).toBe('Cheville : inverseurs et éverseurs — Éverseurs');
    expect(cibleDe('Hip Extension')).toBe('Hanche : extenseurs et fléchisseurs — Extenseurs');
    expect(cibleDe('Fléchisseurs de hanche')).toBe('Hanche : extenseurs et fléchisseurs — Fléchisseurs');
    expect(cibleDe('Knee Extension')).toBe('Quadriceps');
    expect(cibleDe('Hamstrings 90°')).toBe('Ischio-jambiers à 90° — IJ 90°');
    expect(cibleDe('Shoulder Abduction')).toBeNull();
    expect(cibleDe('Grip')).toBeNull();
  });

  it('remplit les champs en gardant le meilleur essai', () => {
    const r = lireCsvDynamo('Test,Side,Force (N)\nHip Abduction,R,150\nHip Abduction,R,162\nHip Abduction,L,184\nGrip,R,300');
    const aff = affectationsInitiales(r.mesures, cibles);
    expect(aff[3].cible).toBe('');
    const { values, remplis } = appliquerImport({ dyn_hanche_abd_add: { add_d: 142 } }, aff);
    expect(remplis).toBe(2);
    expect(values.dyn_hanche_abd_add).toEqual({ add_d: 142, abd_d: 162, abd_g: 184 });
    expect(cleCible(cibles[0])).toBe('dyn_hanche_abd_add|abd');
  });
});
