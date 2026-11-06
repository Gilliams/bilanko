import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  ImageRun,
  PageNumber,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  type FileChild,
} from 'docx';
import { COULEUR_DEFAUT, lignesCabinet, type DocumentModele, type Image, type ImagesDocument } from '../documents';

const GRIS = '5F6478';
const PX_PAR_MM = 3.78;

const octets = (dataUrl: string) => Uint8Array.from(atob(dataUrl.split(',')[1]), (c) => c.charCodeAt(0));

function image(img: Image, largeurMm: number, hauteurMm: number) {
  const k = Math.min((largeurMm * PX_PAR_MM) / img.largeur, (hauteurMm * PX_PAR_MM) / img.hauteur);
  return new ImageRun({
    type: 'png',
    data: octets(img.dataUrl),
    transformation: { width: Math.round(img.largeur * k), height: Math.round(img.hauteur * k) },
  });
}

const texte = (t: string, options: { bold?: boolean; color?: string; size?: number } = {}) => new TextRun({ text: t, ...options });

/** Respecte les retours à la ligne saisis. */
const lignes = (t: string, options: { bold?: boolean; color?: string; size?: number } = {}) => t.split('\n').map((l, i) => new TextRun({ text: l, break: i > 0 ? 1 : 0, ...options }));

export function genererWord(m: DocumentModele, images: ImagesDocument): Promise<Blob> {
  const couleur = (m.cabinet.couleur ?? COULEUR_DEFAUT).slice(1);
  const enfants: FileChild[] = [];

  if (images.logo) enfants.push(new Paragraph({ children: [image(images.logo, 38, 22)], spacing: { after: 80 } }));
  lignesCabinet(m.cabinet).forEach((l, i) => enfants.push(new Paragraph({ children: [texte(l, i === 0 ? { bold: true, color: couleur, size: 24 } : { color: GRIS, size: 18 })] })));
  enfants.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: couleur, space: 4 } }, spacing: { after: 240 } }));

  if (m.lieuDate) enfants.push(new Paragraph({ children: [texte(m.lieuDate, { color: GRIS })], spacing: { after: 160 } }));
  if (m.destinataire) enfants.push(new Paragraph({ children: [texte(`À l’attention de ${m.destinataire}`, { bold: true })], spacing: { after: 160 } }));
  if (m.objet) enfants.push(new Paragraph({ children: [texte(`Objet : ${m.objet}`, { bold: true })], spacing: { after: 240 } }));
  if (m.titre) enfants.push(new Paragraph({ children: [texte(m.titre, { bold: true, color: couleur, size: 30 })], spacing: { after: 120 } }));
  m.sousTitres.forEach((l) => enfants.push(new Paragraph({ children: [texte(l, { color: GRIS, size: 20 })] })));

  for (const b of m.blocs) {
    switch (b.t) {
      case 'titre':
        enfants.push(new Paragraph({ children: [texte(b.texte, { bold: true, color: couleur, size: 23 })], spacing: { before: 280, after: 80 }, keepNext: true }));
        break;
      case 'texte':
        enfants.push(new Paragraph({ children: lignes(b.texte), spacing: { after: 160 } }));
        break;
      case 'alerte':
        enfants.push(new Paragraph({ children: [texte(`Alerte : ${b.texte}`, { bold: true, color: 'C92A2A' })], spacing: { after: 80 } }));
        break;
      case 'champ':
        if (b.long) {
          enfants.push(new Paragraph({ children: [texte(b.label, { bold: true, color: GRIS, size: 19 })], keepNext: true }));
          enfants.push(new Paragraph({ children: lignes(b.valeur), spacing: { after: 120 } }));
        } else {
          enfants.push(new Paragraph({ children: [texte(`${b.label} : `, { color: GRIS }), texte(b.valeur, { bold: true })], spacing: { after: 40 } }));
        }
        break;
      case 'tableau':
        enfants.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [b.entetes, ...b.lignes].map(
              (ligne, i) =>
                new TableRow({
                  tableHeader: i === 0,
                  children: ligne.map((c) => new TableCell({ children: [new Paragraph({ children: [texte(c, i === 0 ? { bold: true, color: GRIS } : {})] })] })),
                }),
            ),
          }),
        );
        break;
      case 'schema': {
        const img = images.schemas[b.cle];
        if (!img) break;
        enfants.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [image(img, 140, 105)], spacing: { before: 120 }, keepNext: true }));
        enfants.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [texte(b.label, { color: GRIS, size: 17 })], spacing: { after: 160 } }));
        break;
      }
    }
  }

  if (images.signature) enfants.push(new Paragraph({ alignment: AlignmentType.RIGHT, children: [image(images.signature, 50, 22)], spacing: { before: 360 }, keepNext: true }));
  if (m.signataire) enfants.push(new Paragraph({ alignment: AlignmentType.RIGHT, children: [texte(m.signataire, { bold: true })], spacing: { before: images.signature ? 60 : 360 } }));

  const piedDePage = new Footer({
    children: [
      ...(m.cabinet.mentions ? [new Paragraph({ children: [texte(m.cabinet.mentions, { color: GRIS, size: 16 })] })] : []),
      new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ children: [PageNumber.CURRENT, ' / ', PageNumber.TOTAL_PAGES], color: GRIS, size: 16 })] }),
    ],
  });

  const document = new Document({
    creator: m.signataire || 'Bilanko',
    title: m.titre || m.rappel,
    styles: { default: { document: { run: { font: 'Calibri', size: 21 } } } },
    sections: [
      {
        properties: { titlePage: true, page: { size: { width: 11906, height: 16838 }, margin: { top: 1000, bottom: 1000, left: 1020, right: 1020 } } },
        headers: { default: new Header({ children: [new Paragraph({ children: [texte(m.rappel, { color: GRIS, size: 16 })] })] }), first: new Header({ children: [] }) },
        footers: { default: piedDePage, first: piedDePage },
        children: enfants,
      },
    ],
  });
  return Packer.toBlob(document);
}
