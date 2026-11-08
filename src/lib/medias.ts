import { useEffect, useState } from 'react';

/**
 * Photos et vidéos des bilans, stockées dans IndexedDB : le localStorage (environ 5 Mo)
 * ne suffit pas pour des images. Les fichiers restent dans ce navigateur, comme le reste des données.
 */

export interface Media {
  id: string;
  patientId: string;
  bilanId?: string;
  /** Champ du bilan auquel le média est rattaché ; absent pour un média du bilan entier */
  fieldId?: string;
  nom: string;
  type: string;
  taille: number;
  date: string;
  legende?: string;
  fichier: Blob;
}

export interface FiltreMedias {
  patientId?: string;
  bilanId?: string;
  fieldId?: string;
}

export const TAILLE_MAX = 200 * 1024 * 1024;
const BASE = 'bilanko-medias';
const TABLE = 'medias';
const EVENEMENT = 'bilanko:medias';

export const disponible = () => typeof indexedDB !== 'undefined';

let ouverture: Promise<IDBDatabase> | null = null;
function ouvrir(): Promise<IDBDatabase> {
  ouverture ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(BASE, 1);
    req.onupgradeneeded = () => {
      const table = req.result.createObjectStore(TABLE, { keyPath: 'id' });
      table.createIndex('patientId', 'patientId');
      table.createIndex('bilanId', 'bilanId');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      ouverture = null;
      reject(req.error);
    };
  });
  return ouverture;
}

function transaction<T>(mode: IDBTransactionMode, action: (table: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  return ouvrir().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(TABLE, mode);
        const req = action(tx.objectStore(TABLE));
        tx.oncomplete = () => resolve(req ? req.result : undefined);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error ?? new Error('Enregistrement interrompu (espace disque ?)'));
      }),
  );
}

const prevenir = () => window.dispatchEvent(new Event(EVENEMENT));

/** Médias correspondant au filtre, du plus ancien au plus récent. */
export function filtrer(medias: Media[], f: FiltreMedias): Media[] {
  return medias
    .filter((m) => (f.patientId === undefined || m.patientId === f.patientId) && (f.bilanId === undefined || m.bilanId === f.bilanId) && (f.fieldId === undefined || m.fieldId === f.fieldId))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function listerMedias(f: FiltreMedias): Promise<Media[]> {
  if (!disponible()) return [];
  const tous = (await transaction<Media[]>('readonly', (t) => (f.patientId ? t.index('patientId').getAll(f.patientId) : t.getAll()))) ?? [];
  return filtrer(tous, f);
}

export async function ajouterMedia(fichier: File, rattachement: Omit<FiltreMedias, 'patientId'> & { patientId: string }): Promise<void> {
  if (fichier.size > TAILLE_MAX) throw new Error(`${fichier.name} dépasse ${TAILLE_MAX / 1024 / 1024} Mo.`);
  if (!/^(image|video)\//.test(fichier.type)) throw new Error(`${fichier.name} n’est ni une photo ni une vidéo.`);
  const media: Media = {
    id: crypto.randomUUID(),
    ...rattachement,
    nom: fichier.name,
    type: fichier.type,
    taille: fichier.size,
    date: new Date().toISOString(),
    fichier,
  };
  await transaction('readwrite', (t) => t.put(media));
  prevenir();
}

export async function modifierLegende(media: Media, legende: string): Promise<void> {
  await transaction('readwrite', (t) => t.put({ ...media, legende: legende.trim() || undefined }));
  prevenir();
}

export async function supprimerMedia(id: string): Promise<void> {
  await transaction('readwrite', (t) => t.delete(id));
  prevenir();
}

/** Supprime les médias d'un patient ou d'un bilan (appelé quand on supprime l'un ou l'autre). */
export async function supprimerMedias(f: { patientId: string } | { bilanId: string }): Promise<void> {
  if (!disponible()) return;
  const cibles = 'patientId' in f ? await listerMedias({ patientId: f.patientId }) : ((await transaction<Media[]>('readonly', (t) => t.index('bilanId').getAll(f.bilanId))) ?? []);
  if (!cibles.length) return;
  await transaction('readwrite', (t) => {
    cibles.forEach((m) => t.delete(m.id));
  });
  prevenir();
}

/** Médias du filtre, rechargés à chaque ajout ou suppression. */
export function useMedias(f: FiltreMedias): Media[] {
  const [medias, setMedias] = useState<Media[]>([]);
  const cle = `${f.patientId}|${f.bilanId}|${f.fieldId}`;
  useEffect(() => {
    let actif = true;
    const charger = () => listerMedias(f).then((m) => actif && setMedias(m), () => actif && setMedias([]));
    charger();
    window.addEventListener(EVENEMENT, charger);
    return () => {
      actif = false;
      window.removeEventListener(EVENEMENT, charger);
    };
  }, [cle]); // eslint-disable-line react-hooks/exhaustive-deps
  return medias;
}

export const tailleLisible = (octets: number) => (octets < 1024 * 1024 ? `${Math.max(1, Math.round(octets / 1024))} Ko` : `${(octets / 1024 / 1024).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} Mo`);
