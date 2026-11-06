import { useState, type ChangeEvent } from 'react';
import { EnteteCabinet } from '../components/Documents';
import { COULEUR_DEFAUT } from '../lib/documents';
import { store, useDB } from '../lib/store';
import type { Cabinet } from '../types';

const CHAMPS: { cle: keyof Cabinet; label: string; type?: string; large?: boolean }[] = [
  { cle: 'nom', label: 'Nom du cabinet' },
  { cle: 'praticien', label: 'Praticien' },
  { cle: 'rpps', label: 'Numéro RPPS' },
  { cle: 'telephone', label: 'Téléphone', type: 'tel' },
  { cle: 'email', label: 'E-mail', type: 'email' },
  { cle: 'adresse', label: 'Adresse', large: true },
  { cle: 'mentions', label: 'Mention de bas de page', large: true },
];

function ChoixImage({ label, cle, valeur }: { label: string; cle: 'logo' | 'signature'; valeur?: string }) {
  const [erreur, setErreur] = useState('');
  const choisir = async (e: ChangeEvent<HTMLInputElement>) => {
    const fichier = e.target.files?.[0];
    e.target.value = '';
    if (!fichier) return;
    setErreur('');
    try {
      const { lireImage } = await import('../lib/export/images');
      store.updateCabinet({ [cle]: await lireImage(fichier) });
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Image illisible.');
    }
  };
  return (
    <div className="cabinet-image">
      <span className="field-label">{label}</span>
      {valeur ? <img src={valeur} alt={label} /> : <p className="muted">Aucune image</p>}
      <div className="actions">
        <label className="btn btn-small btn-ghost">
          {valeur ? 'Remplacer' : 'Choisir une image'}
          <input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={choisir} />
        </label>
        {valeur && (
          <button type="button" className="btn btn-small btn-ghost" onClick={() => store.updateCabinet({ [cle]: undefined })}>
            Retirer
          </button>
        )}
      </div>
      {erreur && <p className="alert">{erreur}</p>}
    </div>
  );
}

export function CabinetPage() {
  const { cabinet } = useDB();
  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Mon cabinet</h1>
          <p className="muted">Ces informations apparaissent sur vos comptes rendus et courriers. Elles sont enregistrées automatiquement.</p>
        </div>
      </header>

      <section className="card form-grid">
        {CHAMPS.map((c) => (
          <label key={c.cle} className={c.large ? 'span-2' : ''}>
            {c.label}
            <input className="input" type={c.type ?? 'text'} value={(cabinet[c.cle] as string) ?? ''} onChange={(e) => store.updateCabinet({ [c.cle]: e.target.value })} />
          </label>
        ))}
        <label>
          Couleur des documents
          <input className="input cabinet-couleur" type="color" value={cabinet.couleur ?? COULEUR_DEFAUT} onChange={(e) => store.updateCabinet({ couleur: e.target.value })} />
        </label>
      </section>

      <section className="card cabinet-images">
        <ChoixImage label="Logo" cle="logo" valeur={cabinet.logo} />
        <ChoixImage label="Signature" cle="signature" valeur={cabinet.signature} />
      </section>

      <section className="card">
        <h2>Aperçu de l’en-tête</h2>
        <EnteteCabinet cabinet={cabinet} />
      </section>
    </div>
  );
}
