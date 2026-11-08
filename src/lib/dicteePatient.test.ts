import { describe, expect, it } from 'vitest';
import { analyserDictee, lireDate } from './dicteePatient';

describe('dictée de la fiche patient', () => {
  it('découpe les champs annoncés par « deux points » et retire le « point » final', () => {
    const r = analyserDictee('Nom deux points Didier point Prénom deux points Michael point Antécédents deux points entorse de cheville en 2019 virgule appendicectomie point');
    expect(r.donnees).toEqual({ nom: 'Didier', prenom: 'Michael', antecedents: 'Entorse de cheville en 2019, appendicectomie' });
    expect(r.reconnus.map((x) => x.libelle)).toEqual(['Nom', 'Prénom', 'Antécédents']);
    expect(r.horsChamp).toBe('');
  });

  it('accepte la ponctuation déjà écrite par la reconnaissance vocale', () => {
    expect(analyserDictee('nom: Didier. prénom : Michael.').donnees).toEqual({ nom: 'Didier', prenom: 'Michael' });
    expect(analyserDictee('Nom 2 points dupont point').donnees).toEqual({ nom: 'Dupont' });
  });

  it('garde un « point » au milieu d’une valeur', () => {
    expect(analyserDictee('Notes deux points point douloureux au genou point').donnees.notes).toBe('Point douloureux au genou');
  });

  it('distingue les champs dont les noms se ressemblent', () => {
    const r = analyserDictee('antécédents familiaux deux points diabète chez le père point antécédents deux points fracture du poignet point médecin traitant deux points docteur Martin point médecin deux points docteur Kahn');
    expect(r.donnees).toEqual({
      antecedentsFamiliaux: 'Diabète chez le père',
      antecedents: 'Fracture du poignet',
      medecinTraitant: 'Docteur Martin',
      medecinPrescripteur: 'Docteur Kahn',
    });
  });

  it('convertit dates, sexe, latéralité, tabac, taille, poids, téléphone et e-mail', () => {
    const r = analyserDictee(
      [
        'date de naissance deux points 12 mars 1985 point',
        'sexe deux points homme point',
        'latéralité deux points gaucher point',
        'tabac deux points ancien fumeur point',
        'taille deux points 1 m 75 point',
        'poids deux points 72,5 kilos point',
        'téléphone deux points 06 12 34 56 78 point',
        'mail deux points didier point dupont arobase exemple point fr point',
        'nombre de séances deux points 15 point',
      ].join(' '),
    );
    expect(r.donnees).toEqual({
      dateNaissance: '1985-03-12',
      sexe: 'M',
      lateralite: 'gaucher',
      tabac: 'sevre',
      taille: 175,
      poids: 72.5,
      telephone: '06 12 34 56 78',
      email: 'didier.dupont@exemple.fr',
      seancesPrescrites: 15,
    });
  });

  it('signale une valeur non comprise sans remplir le champ', () => {
    const r = analyserDictee('date de naissance deux points hier soir point prénom deux points Léa');
    expect(r.donnees).toEqual({ prenom: 'Léa' });
    expect(r.reconnus).toEqual([
      { cle: 'dateNaissance', libelle: 'Date de naissance', texte: 'hier soir', compris: false },
      { cle: 'prenom', libelle: 'Prénom', texte: 'Léa', compris: true },
    ]);
  });

  it('garde le texte dicté avant le premier champ et la dernière valeur d’un champ répété', () => {
    const r = analyserDictee('bonjour alors nom deux points Martin point nom deux points Martinez');
    expect(r.horsChamp).toBe('bonjour alors');
    expect(r.donnees.nom).toBe('Martinez');
    expect(r.reconnus).toHaveLength(1);
  });

  it('lit les dates sous plusieurs formes', () => {
    expect(lireDate('1er février 2001')).toBe('2001-02-01');
    expect(lireDate('12/03/1985')).toBe('1985-03-12');
    expect(lireDate('12 03 85')).toBe('1985-03-12');
    expect(lireDate('31 février 2001')).toBeUndefined();
  });
});
