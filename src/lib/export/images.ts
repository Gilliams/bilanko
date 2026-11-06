import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Planche } from '../../components/BodyChart';
import { getFond } from '../../data/fonds';
import type { Bloc, DocumentModele, Image, ImagesDocument } from '../documents';

const ECHELLE = 2.5;
const STYLE = '.bc-repere{font:600 13px Arial,sans-serif;fill:#5f6478}.bc-repere.is-discret{font-size:11px;font-weight:500}';

function chargerImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image illisible.'));
    img.src = src;
  });
}

async function schemaEnPng(b: Extract<Bloc, { t: 'schema' }>): Promise<Image> {
  const fond = getFond(b.fond);
  const contenu = renderToStaticMarkup(createElement(Planche, { fond, traits: b.traits }))
    .replaceAll('var(--body-stroke)', '#9a95c4')
    .replaceAll('var(--body-fill)', '#f5f4fb');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${fond.largeur} ${fond.hauteur}" width="${fond.largeur}" height="${fond.hauteur}"><style>${STYLE}</style><rect width="100%" height="100%" fill="#fff"/>${contenu}</svg>`;
  const img = await chargerImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
  const canvas = document.createElement('canvas');
  canvas.width = fond.largeur * ECHELLE;
  canvas.height = fond.hauteur * ECHELLE;
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return { dataUrl: canvas.toDataURL('image/png'), largeur: canvas.width, hauteur: canvas.height };
}

async function dimensions(dataUrl?: string): Promise<Image | undefined> {
  if (!dataUrl) return undefined;
  const img = await chargerImage(dataUrl);
  return { dataUrl, largeur: img.naturalWidth, hauteur: img.naturalHeight };
}

/** Prépare les images d'un document : logo, signature et schémas. */
export async function preparerImages(m: DocumentModele): Promise<ImagesDocument> {
  const schemas: Record<string, Image> = {};
  for (const b of m.blocs) {
    if (b.t === 'schema') schemas[b.cle] = await schemaEnPng(b);
  }
  return { logo: await dimensions(m.cabinet.logo), signature: await dimensions(m.cabinet.signature), schemas };
}

/** Lit un fichier image et le réduit : le stockage local du navigateur est limité. */
export async function lireImage(fichier: File, tailleMax = 500): Promise<string> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(fichier.type)) throw new Error('Choisissez une image PNG, JPEG ou WebP.');
  const url = URL.createObjectURL(fichier);
  try {
    const img = await chargerImage(url);
    const k = Math.min(1, tailleMax / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * k);
    canvas.height = Math.round(img.naturalHeight * k);
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(url);
  }
}
