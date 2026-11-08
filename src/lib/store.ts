import { useSyncExternalStore } from 'react';
import { estDessin } from './dessin';
import { supprimerMedias } from './medias';
import type { Bilan, BilanTemplate, BilanType, Cabinet, FieldValue, Patient, Seance } from '../types';

/**
 * Stockage local (localStorage) — volontairement simple pour l'exercice.
 * Un store observable unique, consommé via useSyncExternalStore.
 */

export interface DB {
  version: 1;
  patients: Patient[];
  bilans: Bilan[];
  seances: Seance[];
  /** Items suivis par patient (clés : voir suiviKey()) */
  suivis: Record<string, string[]>;
  /** Items favoris de la bibliothèque */
  favoris: string[];
  /** Informations épinglées dans le mémo de chaque patient (clés : voir suiviKey()) */
  memos: Record<string, string[]>;
  /** Modèles de bilan favoris */
  modelesFavoris: string[];
  /** Modèles créés par l'utilisateur */
  modeles: BilanTemplate[];
  cabinet: Cabinet;
}

const KEY = 'bilanko:db';

/** Un nouveau bilan reprend les valeurs, sauf les schémas : ils restent visibles en transparence. */
const valeursReprises = (values: Record<string, FieldValue>) => Object.fromEntries(Object.entries(structuredClone(values)).filter(([, v]) => !estDessin(v)));
const empty = (): DB => ({ version: 1, patients: [], bilans: [], seances: [], suivis: {}, favoris: [], memos: {}, modelesFavoris: [], modeles: [], cabinet: {} });

export interface Storage {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
}

const memoryStorage = (): Storage => {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
};

export function createStore(storage: Storage = typeof localStorage !== 'undefined' ? localStorage : memoryStorage()) {
  let db: DB = load();
  const listeners = new Set<() => void>();

  function load(): DB {
    try {
      const raw = storage.getItem(KEY);
      if (!raw) return empty();
      const parsed = JSON.parse(raw) as DB;
      return parsed.version === 1 ? { ...empty(), ...parsed } : empty();
    } catch {
      return empty();
    }
  }

  function commit(next: DB) {
    db = next;
    storage.setItem(KEY, JSON.stringify(db));
    listeners.forEach((l) => l());
  }

  const now = () => new Date().toISOString();
  const uid = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`);

  return {
    subscribe(l: () => void) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    get: () => db,

    addPatient(data: Omit<Patient, 'id' | 'createdAt'>): Patient {
      const p: Patient = { ...data, id: uid(), createdAt: now() };
      commit({ ...db, patients: [...db.patients, p] });
      return p;
    },
    updatePatient(id: string, patch: Partial<Patient>) {
      commit({ ...db, patients: db.patients.map((p) => (p.id === id ? { ...p, ...patch, id } : p)) });
    },
    deletePatient(id: string) {
      void supprimerMedias({ patientId: id }).catch(() => undefined);
      const { [id]: _retire, ...suivis } = db.suivis;
      const { [id]: _memo, ...memos } = db.memos;
      commit({
        ...db,
        patients: db.patients.filter((p) => p.id !== id),
        bilans: db.bilans.filter((b) => b.patientId !== id),
        seances: db.seances.filter((s) => s.patientId !== id),
        suivis,
        memos,
      });
    },

    /**
     * Crée un bilan. Si le patient a déjà un bilan sur le même modèle,
     * les valeurs du dernier sont reprises (« le bilan se construit au fil de la rééducation »).
     */
    addBilan(patientId: string, templateId: string, type: BilanType): Bilan {
      const previous = db.bilans
        .filter((b) => b.patientId === patientId && b.templateId === templateId)
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))[0];
      return this.creerBilan(patientId, templateId, type, previous);
    },
    /** Crée un bilan qui reprend les valeurs d'un bilan choisi, par exemple l'initial pour un intermédiaire. */
    dupliquerBilan(sourceId: string, type: BilanType): Bilan | undefined {
      const source = db.bilans.find((b) => b.id === sourceId);
      return source && this.creerBilan(source.patientId, source.templateId, type, source);
    },
    creerBilan(patientId: string, templateId: string, type: BilanType, previous?: Bilan): Bilan {
      const b: Bilan = {
        id: uid(),
        patientId,
        templateId,
        type,
        statut: 'brouillon',
        date: now().slice(0, 10),
        prescription: previous?.prescription,
        nbSeancesPrescrites: previous?.nbSeancesPrescrites,
        values: previous ? valeursReprises(previous.values) : {},
        itemsAjoutes: previous?.itemsAjoutes ? [...previous.itemsAjoutes] : undefined,
        createdAt: now(),
        updatedAt: now(),
      };
      commit({ ...db, bilans: [...db.bilans, b] });
      return b;
    },
    updateBilan(id: string, patch: Partial<Bilan>) {
      commit({
        ...db,
        bilans: db.bilans.map((b) => (b.id === id ? { ...b, ...patch, id, updatedAt: now() } : b)),
      });
    },
    deleteBilan(id: string) {
      void supprimerMedias({ bilanId: id }).catch(() => undefined);
      commit({ ...db, bilans: db.bilans.filter((b) => b.id !== id) });
    },

    updateCabinet(patch: Partial<Cabinet>) {
      commit({ ...db, cabinet: { ...db.cabinet, ...patch } });
    },

    addModele(modele: BilanTemplate) {
      commit({ ...db, modeles: [...db.modeles, modele] });
    },
    updateModele(id: string, modele: BilanTemplate) {
      commit({ ...db, modeles: db.modeles.map((m) => (m.id === id ? { ...modele, id } : m)) });
    },
    /** Refuse de supprimer un modèle encore utilisé par un bilan. */
    deleteModele(id: string): boolean {
      if (db.bilans.some((b) => b.templateId === id)) return false;
      commit({ ...db, modeles: db.modeles.filter((m) => m.id !== id) });
      return true;
    },

    toggleFavori(itemId: string) {
      const favoris = db.favoris.includes(itemId) ? db.favoris.filter((i) => i !== itemId) : [...db.favoris, itemId];
      commit({ ...db, favoris });
    },

    /** Ajoute ou retire un item de la bibliothèque dans un bilan. */
    toggleItemBilan(bilanId: string, itemId: string) {
      const bilan = db.bilans.find((b) => b.id === bilanId);
      if (!bilan) return;
      const courant = bilan.itemsAjoutes ?? [];
      const itemsAjoutes = courant.includes(itemId) ? courant.filter((i) => i !== itemId) : [...courant, itemId];
      this.updateBilan(bilanId, { itemsAjoutes });
    },

    /** Épingle ou retire une information du mémo du patient. */
    toggleMemo(patientId: string, key: string) {
      const courant = db.memos[patientId] ?? [];
      const memo = courant.includes(key) ? courant.filter((k) => k !== key) : [...courant, key];
      commit({ ...db, memos: { ...db.memos, [patientId]: memo } });
    },

    toggleModeleFavori(modeleId: string) {
      const modelesFavoris = db.modelesFavoris.includes(modeleId) ? db.modelesFavoris.filter((i) => i !== modeleId) : [...db.modelesFavoris, modeleId];
      commit({ ...db, modelesFavoris });
    },

    /** Ajoute ou retire un item du suivi du patient. */
    toggleSuivi(patientId: string, key: string) {
      const courant = db.suivis[patientId] ?? [];
      const suivi = courant.includes(key) ? courant.filter((k) => k !== key) : [...courant, key];
      commit({ ...db, suivis: { ...db.suivis, [patientId]: suivi } });
    },

    addSeance(data: Omit<Seance, 'id' | 'createdAt'>): Seance {
      const s: Seance = { ...data, id: uid(), createdAt: now() };
      commit({ ...db, seances: [...db.seances, s] });
      return s;
    },
    updateSeance(id: string, patch: Partial<Seance>) {
      commit({ ...db, seances: db.seances.map((s) => (s.id === id ? { ...s, ...patch, id } : s)) });
    },
    deleteSeance(id: string) {
      commit({ ...db, seances: db.seances.filter((s) => s.id !== id) });
    },

    /** Remplace les données de démonstration en gardant les informations du cabinet. */
    replaceAll(next: DB) {
      commit({ ...next, cabinet: db.cabinet });
    },
  };
}

export const store = createStore();
export type Store = ReturnType<typeof createStore>;

export function useDB(): DB {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}

export function age(dateNaissance: string, at = new Date()): number {
  const d = new Date(dateNaissance);
  let a = at.getFullYear() - d.getFullYear();
  const m = at.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && at.getDate() < d.getDate())) a--;
  return a;
}

/** Indice de masse corporelle, ou null si la taille ou le poids manque. */
export function imc(p: Pick<Patient, 'taille' | 'poids'>): number | null {
  return p.taille && p.poids ? p.poids / (p.taille / 100) ** 2 : null;
}

export function formatAge(dateNaissance: string): string {
  const a = age(dateNaissance);
  if (a >= 2) return `${a} ans`;
  const d = new Date(dateNaissance);
  const now = new Date();
  const months = (now.getFullYear() - d.getFullYear()) * 12 + now.getMonth() - d.getMonth() - (now.getDate() < d.getDate() ? 1 : 0);
  return `${Math.max(0, months)} mois`;
}

export function formatDate(iso: string): string {
  return new Date(iso + (iso.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export const BILAN_TYPES: Record<BilanType, string> = {
  initial: 'Bilan initial',
  intermediaire: 'Bilan intermédiaire',
  final: 'Bilan de fin de traitement',
};

/** Nom affiché d'un bilan : celui choisi par le praticien, sinon son type. */
export const nomBilan = (b: Pick<Bilan, 'titre' | 'type'>) => b.titre?.trim() || BILAN_TYPES[b.type];
