import { describe, expect, it } from 'vitest';
import { createStore } from './store';
import { memoPatient, suiviKey } from './suivi';
import { filtrer, tailleLisible, type Media } from './medias';
import { filtrerModeles } from '../components/NewBilanModal';
import { TEMPLATES } from '../data/templates';

const memory = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
};

describe('mémo du patient', () => {
  it('affiche la dernière valeur renseignée et se retire', () => {
    const s = createStore(memory());
    const b1 = s.addBilan('p', 'msk-lombalgie', 'initial');
    s.updateBilan(b1.id, { date: '2026-01-01', values: { motif: 'Lombalgie aiguë', lasegue: 'Négatif' } });
    const b2 = s.addBilan('p', 'msk-lombalgie', 'intermediaire');
    s.updateBilan(b2.id, { date: '2026-02-01', values: { motif: '' } });

    s.toggleMemo('p', suiviKey('msk-lombalgie', 'motif'));
    s.toggleMemo('p', suiviKey('msk-lombalgie', 'lasegue'));
    s.toggleMemo('p', suiviKey('msk-lombalgie', 'dms'));
    const memo = memoPatient(s.get(), 'p');
    expect(memo.map((l) => [l.label, l.valeur, l.date])).toEqual([
      ['Motif de consultation', 'Lombalgie aiguë', '2026-01-01'],
      ['Lasègue', 'Négatif', '2026-01-01'],
      ['Distance doigts-sol', '', ''],
    ]);

    s.toggleMemo('p', suiviKey('msk-lombalgie', 'dms'));
    expect(memoPatient(s.get(), 'p')).toHaveLength(2);
    s.deletePatient('p');
    expect(s.get().memos.p).toBeUndefined();
  });
});

describe('choix du modèle', () => {
  it('cherche sans accents dans le nom, la spécialité et les sections', () => {
    expect(filtrerModeles(TEMPLATES, 'lombalgie', null).map((t) => t.id)).toEqual(['msk-lombalgie']);
    expect(filtrerModeles(TEMPLATES, 'ENDURANCE', null).map((t) => t.id)).toContain('msk-lombalgie');
    expect(filtrerModeles(TEMPLATES, '', 'cardio-respiratoire').every((t) => t.specialite === 'cardio-respiratoire')).toBe(true);
  });

  it('garde les modèles favoris', () => {
    const s = createStore(memory());
    s.toggleModeleFavori('msk-lombalgie');
    s.toggleModeleFavori('msk-epaule');
    s.toggleModeleFavori('msk-lombalgie');
    expect(s.get().modelesFavoris).toEqual(['msk-epaule']);
  });
});

describe('médias', () => {
  const media = (id: string, extra: Partial<Media>): Media => ({ id, patientId: 'p', nom: `${id}.jpg`, type: 'image/jpeg', taille: 1000, date: `2026-01-0${id}`, fichier: new Blob(), ...extra });
  const tous = [media('3', { bilanId: 'b1', fieldId: 'imagerie' }), media('1', { bilanId: 'b1' }), media('2', { bilanId: 'b2', patientId: 'q' })];

  it('filtre par patient, bilan et champ, du plus ancien au plus récent', () => {
    expect(filtrer(tous, { patientId: 'p' }).map((m) => m.id)).toEqual(['1', '3']);
    expect(filtrer(tous, { bilanId: 'b1', fieldId: 'imagerie' }).map((m) => m.id)).toEqual(['3']);
    expect(filtrer(tous, {}).map((m) => m.id)).toEqual(['1', '2', '3']);
  });

  it('affiche une taille lisible', () => {
    expect(tailleLisible(500)).toBe('1 Ko');
    expect(tailleLisible(3.5 * 1024 * 1024)).toBe('3,5 Mo');
  });
});
