import { jsPDF } from 'jspdf';
import { COULEUR_DEFAUT, lignesCabinet, type Bloc, type DocumentModele, type Image, type ImagesDocument } from '../documents';

const MARGE = 18;
const LARGEUR = 210;
const HAUTEUR = 297;
const BAS = HAUTEUR - 20;
const UTILE = LARGEUR - 2 * MARGE;
const GRIS: [number, number, number] = [95, 100, 120];
const NOIR: [number, number, number] = [29, 32, 51];

/** Les polices intégrées du PDF ne contiennent pas ces caractères. */
const REMPLACEMENTS: Record<string, string> = { '₂': '2', '≥': '>=', '≤': '<=', '→': '->', '⚠': '', '▲': '+', '▼': '-', ' ': ' ', ' ': ' ' };
const propre = (s: string) => s.replace(/[₂≥≤→⚠▲▼  ]/g, (c) => REMPLACEMENTS[c]);

const rgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

function ajuster(img: Image, largeurMax: number, hauteurMax: number) {
  const k = Math.min(largeurMax / img.largeur, hauteurMax / img.hauteur);
  return { l: img.largeur * k, h: img.hauteur * k };
}

export function genererPdf(m: DocumentModele, images: ImagesDocument): ArrayBuffer {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const couleur = rgb(m.cabinet.couleur ?? COULEUR_DEFAUT);
  let y = MARGE;

  const police = (taille: number, gras = false, teinte = NOIR) => {
    doc.setFont('helvetica', gras ? 'bold' : 'normal');
    doc.setFontSize(taille);
    doc.setTextColor(...teinte);
  };
  const place = (h: number) => {
    if (y + h <= BAS) return;
    doc.addPage();
    police(8.5, false, GRIS);
    doc.text(propre(m.rappel), MARGE, 12);
    y = 20;
  };
  const paragraphe = (texte: string, taille = 10.5, gras = false, teinte = NOIR, largeur = UTILE, x = MARGE) => {
    police(taille, gras, teinte);
    const ligne = taille * 0.46;
    for (const l of doc.splitTextToSize(propre(texte), largeur) as string[]) {
      place(ligne);
      doc.text(l, x, y + ligne * 0.8);
      y += ligne;
    }
  };

  const enTete = () => {
    const lignes = lignesCabinet(m.cabinet);
    const debut = y;
    let xTexte = MARGE;
    if (images.logo) {
      const { l, h } = ajuster(images.logo, 38, 22);
      doc.addImage(images.logo.dataUrl, 'PNG', MARGE, y, l, h, undefined, 'FAST');
      xTexte = MARGE + l + 6;
    }
    lignes.forEach((ligne, i) => {
      police(i === 0 ? 11.5 : 9, i === 0, i === 0 ? couleur : GRIS);
      doc.text(propre(ligne), xTexte, debut + 4 + i * 4.6);
    });
    const hauteur = Math.max(images.logo ? ajuster(images.logo, 38, 22).h : 0, lignes.length * 4.6 + 1);
    y = debut + hauteur + 3;
    if (lignes.length || images.logo) {
      doc.setDrawColor(...couleur);
      doc.setLineWidth(0.5);
      doc.line(MARGE, y, LARGEUR - MARGE, y);
      y += 7;
    }
  };

  const tableau = (b: Extract<Bloc, { t: 'tableau' }>) => {
    const larges = [UTILE * 0.46, UTILE * 0.27, UTILE * 0.27];
    const rangee = (cellules: string[], gras: boolean) => {
      police(9.5, gras, gras ? GRIS : NOIR);
      const textes = cellules.map((c, i) => doc.splitTextToSize(propre(c), larges[i] - 2) as string[]);
      const h = Math.max(...textes.map((t) => t.length)) * 4.4 + 2;
      place(h);
      let x = MARGE;
      textes.forEach((t, i) => {
        doc.text(t, x, y + 4);
        x += larges[i];
      });
      y += h;
      doc.setDrawColor(225, 227, 238);
      doc.setLineWidth(0.2);
      doc.line(MARGE, y, LARGEUR - MARGE, y);
    };
    rangee(b.entetes, true);
    b.lignes.forEach((l) => rangee(l, false));
    y += 2;
  };

  enTete();

  if (m.lieuDate) {
    paragraphe(m.lieuDate, 10.5, false, GRIS);
    y += 3;
  }
  if (m.destinataire) {
    paragraphe(`À l’attention de ${m.destinataire}`, 10.5, true);
    y += 3;
  }
  if (m.objet) {
    paragraphe(`Objet : ${m.objet}`, 10.5, true);
    y += 5;
  }
  if (m.titre) {
    paragraphe(m.titre, 15, true, couleur);
    y += 2;
  }
  m.sousTitres.forEach((l) => paragraphe(l, 10, false, GRIS));
  if (m.sousTitres.length) y += 3;

  for (const b of m.blocs) {
    switch (b.t) {
      case 'titre':
        place(16);
        y += 4;
        paragraphe(b.texte, 11.5, true, couleur);
        y += 1.5;
        break;
      case 'texte':
        paragraphe(b.texte);
        y += 3;
        break;
      case 'alerte':
        paragraphe(`Alerte : ${b.texte}`, 10, true, [201, 42, 42]);
        y += 2;
        break;
      case 'champ':
        if (b.long) {
          place(10);
          paragraphe(b.label, 9.5, true, GRIS);
          paragraphe(b.valeur);
          y += 2;
        } else {
          police(9.5, false, GRIS);
          const label = doc.splitTextToSize(propre(b.label), UTILE * 0.42 - 2) as string[];
          police(10, true);
          const valeur = doc.splitTextToSize(propre(b.valeur), UTILE * 0.58) as string[];
          const h = Math.max(label.length, valeur.length) * 4.5 + 1.2;
          place(h);
          police(9.5, false, GRIS);
          doc.text(label, MARGE, y + 3.6);
          police(10, true);
          doc.text(valeur, MARGE + UTILE * 0.42, y + 3.6);
          y += h;
        }
        break;
      case 'tableau':
        tableau(b);
        break;
      case 'schema': {
        const img = images.schemas[b.cle];
        if (!img) break;
        const reste = BAS - y - 8;
        const { l, h } = ajuster(img, UTILE * 0.8, reste >= 65 ? Math.min(105, reste) : 105);
        place(h + 8);
        doc.addImage(img.dataUrl, 'PNG', MARGE + (UTILE - l) / 2, y, l, h, undefined, 'FAST');
        y += h + 1;
        paragraphe(b.label, 8.5, false, GRIS, UTILE);
        y += 3;
        break;
      }
    }
  }

  if (m.signataire || images.signature) {
    place(34);
    y += 6;
    const x = LARGEUR - MARGE - 60;
    if (images.signature) {
      const { l, h } = ajuster(images.signature, 50, 22);
      doc.addImage(images.signature.dataUrl, 'PNG', x, y, l, h, undefined, 'FAST');
      y += h + 2;
    }
    paragraphe(m.signataire, 10.5, true, NOIR, 60, x);
  }

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    police(8, false, GRIS);
    if (m.cabinet.mentions) doc.text(doc.splitTextToSize(propre(m.cabinet.mentions), UTILE - 24) as string[], MARGE, HAUTEUR - 12);
    doc.text(`${i} / ${pages}`, LARGEUR - MARGE, HAUTEUR - 12, { align: 'right' });
  }
  return doc.output('arraybuffer');
}
