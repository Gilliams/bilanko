import { existsSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { bilanPrecedent, brouillonCourrier, cabinetRenseigne, compteRendu, courrier, lienMail, lignesCabinet, type ImagesDocument } from './documents';
import { genererPdf } from './export/pdf';
import { genererWord } from './export/word';
import { createStore } from './store';
import { demoDB } from '../data/demo';
import { getTemplate } from '../data/templates';
import type { Cabinet } from '../types';

const PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const image = { dataUrl: PIXEL, largeur: 300, hauteur: 300 };

const cabinet: Cabinet = {
  nom: 'Cabinet des Tilleuls',
  praticien: 'Camille Martin',
  rpps: '10000000000',
  adresse: '12 rue des Tilleuls, 75000 Paris',
  telephone: '01 02 03 04 05',
  email: 'contact@exemple.fr',
  mentions: 'Document confidentiel.',
};

const db = demoDB();
const patient = db.patients[0];
const [b1, b2] = db.bilans;
const lombo = getTemplate('msk-lombalgie')!;
const memory = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
};

describe('cabinet', () => {
  it('compose l’en-tête sans les informations absentes', () => {
    expect(lignesCabinet(cabinet)).toEqual(['Cabinet des Tilleuls', 'Camille Martin · RPPS 10000000000', '12 rue des Tilleuls, 75000 Paris', '01 02 03 04 05 · contact@exemple.fr']);
    expect(lignesCabinet({ telephone: '01' })).toEqual(['01']);
    expect(cabinetRenseigne({ nom: '  ' })).toBe(false);
  });

  it('enregistre les informations du cabinet', () => {
    const storage = memory();
    const s = createStore(storage);
    s.updateCabinet({ nom: 'Test' });
    s.updateCabinet({ rpps: '1' });
    expect(createStore(storage).get().cabinet).toEqual({ nom: 'Test', rpps: '1' });
  });
});

describe('modèle de document', () => {
  it('contient l’évolution, les champs et les schémas', () => {
    const m = compteRendu(b2, lombo, patient, cabinet, b1);
    expect(m.fichier).toMatch(/^compte-rendu-[a-z0-9-]+-\d{4}-\d{2}-\d{2}$/);
    expect(m.blocs.some((b) => b.t === 'tableau')).toBe(true);
    expect(m.blocs.some((b) => b.t === 'champ' && b.label === 'Indice de Schober')).toBe(true);
    expect(m.blocs.filter((b) => b.t === 'schema')).toHaveLength(1);
    expect(m.signataire).toBe('Camille Martin');
  });

  it('retrouve le bilan précédent', () => {
    expect(bilanPrecedent(db.bilans, b2)?.id).toBe(b1.id);
    expect(bilanPrecedent(db.bilans, b1)).toBeUndefined();
  });

  it('prépare un courrier relisible et découpe ses paragraphes', () => {
    const corps = brouillonCourrier(b2, lombo, patient, b1);
    expect(corps).toContain(patient.nom.toUpperCase());
    expect(corps).toContain('Évolution depuis le bilan');
    const m = courrier(patient, cabinet, { destinataire: 'Dr Lefèvre', objet: 'Bilan', corps: 'Un.\n\nDeux.\n\n\n' });
    expect(m.blocs).toEqual([
      { t: 'texte', texte: 'Un.' },
      { t: 'texte', texte: 'Deux.' },
    ]);
  });

  it('ne met aucune information du patient dans le lien e-mail', () => {
    const lien = lienMail('dr@exemple.fr', 'courrier', 'Camille Martin');
    expect(lien.startsWith('mailto:dr%40exemple.fr?subject=')).toBe(true);
    expect(decodeURIComponent(lien)).not.toContain(patient.nom);
  });
});

describe('fichiers générés', () => {
  const images = (): ImagesDocument => {
    const m = compteRendu(b2, lombo, patient, cabinet, b1);
    const schemas = Object.fromEntries(m.blocs.flatMap((b) => (b.t === 'schema' ? [[b.cle, image]] : [])));
    return { logo: image, signature: image, schemas };
  };
  const sortie = process.env.SORTIE_DOCUMENTS;

  it('génère un PDF', () => {
    const pdf = genererPdf(compteRendu(b2, lombo, patient, cabinet, b1), images());
    expect(new TextDecoder().decode(pdf.slice(0, 5))).toBe('%PDF-');
    if (sortie && existsSync(sortie)) writeFileSync(`${sortie}/test.pdf`, new Uint8Array(pdf));
  });

  it('génère un PDF sur plusieurs pages sans erreur', () => {
    const corps = Array.from({ length: 120 }, (_, i) => `Paragraphe ${i} de test avec SpO₂ ≥ 90 %.`).join('\n\n');
    expect(genererPdf(courrier(patient, cabinet, { destinataire: 'Dr X', objet: 'Long', corps }), { schemas: {} }).byteLength).toBeGreaterThan(1000);
  });

  it('génère un Word', async () => {
    const blob = await genererWord(compteRendu(b2, lombo, patient, cabinet, b1), images());
    const octets = new Uint8Array(await blob.arrayBuffer());
    expect(String.fromCharCode(octets[0], octets[1])).toBe('PK');
    if (sortie && existsSync(sortie)) writeFileSync(`${sortie}/test.docx`, octets);
  });
});
