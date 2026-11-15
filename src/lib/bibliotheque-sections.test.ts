import { describe, expect, it } from 'vitest';
import { createStore } from './store';
import { champs, creerModele, insererSection, sectionPourBibliotheque, problemes } from './modeles';
import { cleNote, genererSynthese } from './synthese';
import { filtrerPatients } from './patients';
import { anamneseComplete, BIBLIOTHEQUE_SECTIONS } from '../data/sections-biblio';
import type { Bilan, Patient, SectionDef } from '../types';

const memory = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
};

describe('bibliothèque de sections', () => {
  it('remplace la section vide d’un modèle neuf et garde les identifiants', () => {
    const { modele } = insererSection(creerModele('Test'), anamneseComplete);
    expect(modele.sections).toHaveLength(1);
    expect(modele.sections[0].title).toBe('Anamnèse');
    expect(champs(modele).map((f) => f.id)).toEqual(anamneseComplete.fields.map((f) => f.id));
    expect(modele.sections[0].id).not.toBe(anamneseComplete.id);
    expect(problemes(modele)).toEqual([]);
  });

  it('renomme les champs déjà présents, conditions comprises', () => {
    const source: SectionDef = {
      id: 's',
      title: 'Avec condition',
      fields: [
        { id: 'a', label: 'A', type: 'boolean' },
        { id: 'b', label: 'B', type: 'text', visibleIf: { field: 'a', in: [true] } },
      ],
    };
    const une = insererSection(creerModele('Test'), source).modele;
    const deux = insererSection(une, source).modele;
    expect(champs(deux).map((f) => f.id)).toEqual(['a', 'b', 'a_2', 'b_2']);
    expect(deux.sections[1].fields[1].visibleIf).toEqual({ field: 'a_2', in: [true] });
    expect(new Set(champs(deux).map((f) => f.id)).size).toBe(4);
  });

  it('enregistre une section sans ses conditions vers d’autres sections', () => {
    const s = sectionPourBibliotheque({ id: 'x', title: 'X', fields: [{ id: 'c', label: 'C', type: 'text', visibleIf: { field: 'ailleurs' } }] });
    expect(s.fields[0].visibleIf).toBeUndefined();
    const store = createStore(memory());
    store.addSectionBiblio(s);
    expect(store.get().sectionsBiblio).toHaveLength(1);
    store.deleteSectionBiblio(s.id);
    expect(store.get().sectionsBiblio).toHaveLength(0);
  });

  it('propose des sections valides, aux identifiants uniques', () => {
    for (const s of BIBLIOTHEQUE_SECTIONS) {
      const ids = s.fields.map((f) => f.id);
      expect(new Set(ids).size, s.title).toBe(ids.length);
      expect(problemes(insererSection(creerModele(s.title), s).modele), s.title).toEqual([]);
    }
  });
});

describe('notes de section et sous-titres', () => {
  it('reprend la note dans le compte rendu, sans les sous-titres', () => {
    const { modele } = insererSection(creerModele('Test'), anamneseComplete);
    const section = modele.sections[0];
    const patient = { id: 'p', nom: 'Test', prenom: 'Léa', dateNaissance: '1990-01-01', sexe: 'F', createdAt: '' } as Patient;
    const bilan = { id: 'b', patientId: 'p', templateId: modele.id, type: 'initial', statut: 'brouillon', date: '2026-11-15', values: { anam_sommeil: 'Réveils nocturnes', [cleNote(section.id)]: 'Patiente très motivée' }, createdAt: '', updatedAt: '' } as Bilan;
    const s = genererSynthese(bilan, modele, patient);
    expect(s.sections[0].lines.map((l) => l.label)).toEqual(['Sommeil', 'Note']);
    expect(s.sections[0].lines[1].value).toBe('Patiente très motivée');
  });
});

describe('liste des patients', () => {
  const p = (id: string, nom: string, archiveLe?: string) => ({ id, nom, prenom: 'X', dateNaissance: '1990-01-01', sexe: 'F', createdAt: '', archiveLe }) as Patient;
  const b = (patientId: string, date: string) => ({ id: `${patientId}${date}`, patientId, date }) as Bilan;
  const patients = [p('1', 'Bernard'), p('2', 'Albert'), p('3', 'Durand', '2026-10-01'), p('4', 'Chevalier')];
  const bilans = [b('1', '2026-01-10'), b('1', '2026-06-01'), b('2', '2026-03-05'), b('3', '2026-02-01')];
  const base = { archives: false, recherche: '', tri: 'nom', ordre: 'asc' } as const;

  it('sépare les dossiers archivés et y permet la recherche', () => {
    expect(filtrerPatients(patients, bilans, base).map((l) => l.p.nom)).toEqual(['Albert', 'Bernard', 'Chevalier']);
    expect(filtrerPatients(patients, bilans, { ...base, archives: true, recherche: 'dur' }).map((l) => l.p.nom)).toEqual(['Durand']);
    expect(filtrerPatients(patients, bilans, { ...base, archives: true, recherche: 'bern' })).toEqual([]);
  });

  it('trie par date du dernier bilan dans les deux sens, patients sans bilan à la fin', () => {
    const tri = (ordre: 'asc' | 'desc') => filtrerPatients(patients, bilans, { ...base, tri: 'dernierBilan', ordre }).map((l) => l.p.nom);
    expect(tri('desc')).toEqual(['Bernard', 'Albert', 'Chevalier']);
    expect(tri('asc')).toEqual(['Albert', 'Bernard', 'Chevalier']);
  });

  it('filtre sur une période de bilan', () => {
    const r = filtrerPatients(patients, bilans, { ...base, du: '2026-01-01', au: '2026-02-28' });
    expect(r.map((l) => l.p.nom)).toEqual(['Bernard']);
  });
});
