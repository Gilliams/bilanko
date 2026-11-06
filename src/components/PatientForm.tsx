import { useState } from 'react';
import type { Patient, Sexe } from '../types';

type Data = Omit<Patient, 'id' | 'createdAt'>;

interface Props {
  initial?: Partial<Data>;
  onSubmit: (d: Data) => void;
  onCancel: () => void;
  submitLabel?: string;
}

export function PatientForm({ initial, onSubmit, onCancel, submitLabel = 'Enregistrer' }: Props) {
  const [d, setD] = useState<Data>({
    nom: '',
    prenom: '',
    dateNaissance: '',
    sexe: 'F',
    telephone: '',
    email: '',
    profession: '',
    medecinPrescripteur: '',
    antecedents: '',
    notes: '',
    ...initial,
  });
  const set = <K extends keyof Data>(k: K, v: Data[K]) => setD((x) => ({ ...x, [k]: v }));
  const valid = d.nom.trim() && d.prenom.trim() && d.dateNaissance && d.dateNaissance <= new Date().toISOString().slice(0, 10);

  return (
    <form
      className="form-grid"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSubmit({ ...d, nom: d.nom.trim(), prenom: d.prenom.trim() });
      }}
    >
      <label>
        Nom *<input className="input" required value={d.nom} onChange={(e) => set('nom', e.target.value)} autoFocus />
      </label>
      <label>
        Prénom *<input className="input" required value={d.prenom} onChange={(e) => set('prenom', e.target.value)} />
      </label>
      <label>
        Date de naissance *
        <input className="input" type="date" required max={new Date().toISOString().slice(0, 10)} value={d.dateNaissance} onChange={(e) => set('dateNaissance', e.target.value)} />
      </label>
      <label>
        Sexe
        <select className="input" value={d.sexe} onChange={(e) => set('sexe', e.target.value as Sexe)}>
          <option value="F">Femme</option>
          <option value="M">Homme</option>
          <option value="X">Non précisé</option>
        </select>
      </label>
      <label>
        Téléphone<input className="input" type="tel" value={d.telephone} onChange={(e) => set('telephone', e.target.value)} />
      </label>
      <label>
        E-mail<input className="input" type="email" value={d.email} onChange={(e) => set('email', e.target.value)} />
      </label>
      <label>
        Profession / activité<input className="input" value={d.profession} onChange={(e) => set('profession', e.target.value)} />
      </label>
      <label>
        Médecin prescripteur<input className="input" value={d.medecinPrescripteur} onChange={(e) => set('medecinPrescripteur', e.target.value)} />
      </label>
      <label className="span-2">
        Antécédents<textarea className="input" rows={2} value={d.antecedents} onChange={(e) => set('antecedents', e.target.value)} />
      </label>
      <label className="span-2">
        Notes<textarea className="input" rows={2} value={d.notes} onChange={(e) => set('notes', e.target.value)} />
      </label>
      <div className="span-2 actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Annuler
        </button>
        <button type="submit" className="btn btn-primary" disabled={!valid}>
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
