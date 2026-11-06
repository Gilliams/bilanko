import { describe, expect, it } from 'vitest';
import { ajouterDictee, nettoyerDictee } from './dictee';

describe('dictée', () => {
  it('applique les commandes prononcées', () => {
    expect(nettoyerDictee('patient mieux virgule moins de douleur point final')).toBe('patient mieux, moins de douleur.');
    expect(nettoyerDictee('marche facile à la ligne escaliers difficiles')).toBe('marche facile\nescaliers difficiles');
    expect(nettoyerDictee('bonne séance point à la ligne suite')).toBe('bonne séance.\nsuite');
    expect(nettoyerDictee('un nouveau paragraphe deux')).toBe('un\n\ndeux');
    expect(nettoyerDictee('techniques deux points gainage')).toBe('techniques : gainage');
  });

  it('garde le mot point dans une phrase', () => {
    expect(nettoyerDictee('point douloureux au genou')).toBe('point douloureux au genou');
  });

  it('corrige les termes du métier', () => {
    expect(nettoyerDictee('test de la sègue à 60 degrés et eva à 3')).toBe('test de Lasègue à 60° et EVA à 3');
    expect(nettoyerDictee('indice de chober')).toBe('indice de Schober');
  });

  it('enchaîne les morceaux dictés', () => {
    expect(ajouterDictee('', 'patient mieux')).toBe('Patient mieux');
    expect(ajouterDictee('Patient mieux', 'à la marche')).toBe('Patient mieux à la marche');
    expect(ajouterDictee('Patient mieux.', 'reprise du travail')).toBe('Patient mieux. Reprise du travail');
    expect(ajouterDictee('Patient mieux', 'virgule surtout le matin')).toBe('Patient mieux, surtout le matin');
    expect(ajouterDictee('Ligne\n', 'suite')).toBe('Ligne\nSuite');
    expect(ajouterDictee('Déjà', '   ')).toBe('Déjà');
  });
});
