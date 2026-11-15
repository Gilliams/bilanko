import type { Bilan, Patient } from '../types';

export type TriPatients = 'nom' | 'dernierBilan' | 'premierBilan';

export interface OptionsListe {
  archives: boolean;
  recherche: string;
  tri: TriPatients;
  ordre: 'asc' | 'desc';
  /** Période (ISO yyyy-mm-dd, bornes incluses) : garde les patients ayant au moins un bilan dedans. */
  du?: string;
  au?: string;
}

export interface LignePatient {
  p: Patient;
  nb: number;
  premier?: string;
  dernier?: string;
}

const norm = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/** Liste des patients filtrée et triée, pour la page Patients. */
export function filtrerPatients(patients: Patient[], bilans: Bilan[], o: OptionsListe): LignePatient[] {
  const n = norm(o.recherche.trim());
  const dansPeriode = (date: string) => (!o.du || date >= o.du) && (!o.au || date <= o.au);
  const lignes = patients
    .filter((p) => Boolean(p.archiveLe) === o.archives)
    .filter((p) => !n || norm(`${p.nom} ${p.prenom} ${p.medecinPrescripteur ?? ''}`).includes(n))
    .flatMap((p): LignePatient[] => {
      const dates = bilans
        .filter((b) => b.patientId === p.id)
        .map((b) => b.date)
        .sort();
      if ((o.du || o.au) && !dates.some(dansPeriode)) return [];
      return [{ p, nb: dates.length, premier: dates[0], dernier: dates[dates.length - 1] }];
    });

  const parNom = (a: LignePatient, b: LignePatient) => a.p.nom.localeCompare(b.p.nom, 'fr') || a.p.prenom.localeCompare(b.p.prenom, 'fr');
  const sens = o.ordre === 'asc' ? 1 : -1;
  return lignes.sort((a, b) => {
    if (o.tri === 'nom') return sens * parNom(a, b);
    const cle = o.tri === 'dernierBilan' ? 'dernier' : 'premier';
    const da = a[cle];
    const db = b[cle];
    // Les patients sans bilan restent en fin de liste, quel que soit l'ordre.
    if (!da || !db) return da ? -1 : db ? 1 : parNom(a, b);
    return sens * da.localeCompare(db) || parNom(a, b);
  });
}
