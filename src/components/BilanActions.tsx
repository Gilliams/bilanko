import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from './Modal';
import { BILAN_TYPES, formatDate, nomBilan, store } from '../lib/store';
import type { Bilan, BilanType } from '../types';

type Vue = 'menu' | 'modifier' | 'dupliquer';

/** Actions sur un bilan depuis la ligne de temps : renommer, dater, repartir de ce bilan, supprimer. */
export function BilanActions({ bilan, modeleNom, onClose }: { bilan: Bilan; modeleNom: string; onClose: () => void }) {
  const nav = useNavigate();
  const [vue, setVue] = useState<Vue>('menu');
  const [titre, setTitre] = useState(bilan.titre ?? '');
  const [date, setDate] = useState(bilan.date);
  const [type, setType] = useState<BilanType>(bilan.type);
  const [typeCopie, setTypeCopie] = useState<BilanType>(bilan.type === 'initial' ? 'intermediaire' : 'final');

  const enregistrer = (e: React.FormEvent) => {
    e.preventDefault();
    store.updateBilan(bilan.id, { titre: titre.trim() || undefined, date, type });
    onClose();
  };

  const dupliquer = () => {
    const copie = store.dupliquerBilan(bilan.id, typeCopie);
    onClose();
    if (copie) nav(`/bilans/${copie.id}`);
  };

  const supprimer = () => {
    if (!confirm(`Supprimer définitivement « ${nomBilan(bilan)} » du ${formatDate(bilan.date)} ?`)) return;
    store.deleteBilan(bilan.id);
    onClose();
  };

  const types = (Object.keys(BILAN_TYPES) as BilanType[]).map((k) => (
    <option key={k} value={k}>
      {BILAN_TYPES[k]}
    </option>
  ));

  return (
    <Modal title={`${nomBilan(bilan)} du ${formatDate(bilan.date)}`} onClose={onClose}>
      {vue === 'menu' && (
        <div className="actions-bilan">
          <p className="muted">Modèle « {modeleNom} »</p>
          <button type="button" className="action-bilan" onClick={() => setVue('dupliquer')}>
            <strong>Créer un bilan à partir de celui-ci</strong>
            <small>Pour un bilan intermédiaire ou de fin de traitement : les valeurs sont reprises et restent modifiables.</small>
          </button>
          <button type="button" className="action-bilan" onClick={() => setVue('modifier')}>
            <strong>Modifier le nom ou la date</strong>
            <small>Le nom remplace le type de bilan dans la ligne de temps et les documents.</small>
          </button>
          <button type="button" className="action-bilan is-danger" onClick={supprimer}>
            <strong>Supprimer</strong>
            <small>Le bilan et ses valeurs sont effacés. Les séances du patient sont conservées.</small>
          </button>
        </div>
      )}

      {vue === 'modifier' && (
        <form className="form-grid" onSubmit={enregistrer}>
          <label className="span-2">
            Nom du bilan
            <input className="input" value={titre} placeholder={BILAN_TYPES[type]} onChange={(e) => setTitre(e.target.value)} autoFocus />
          </label>
          <label>
            Date
            <input className="input" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label>
            Type
            <select className="input" value={type} onChange={(e) => setType(e.target.value as BilanType)}>
              {types}
            </select>
          </label>
          <div className="actions span-2">
            <button type="button" className="btn btn-ghost" onClick={() => setVue('menu')}>
              Retour
            </button>
            <button type="submit" className="btn btn-primary">
              Enregistrer
            </button>
          </div>
        </form>
      )}

      {vue === 'dupliquer' && (
        <div className="form-grid">
          <label className="span-2">
            Type du nouveau bilan
            <select className="input" value={typeCopie} onChange={(e) => setTypeCopie(e.target.value as BilanType)}>
              {types}
            </select>
          </label>
          <p className="help span-2">Le nouveau bilan est daté d’aujourd’hui et repart des valeurs de celui-ci. Les schémas corporels restent visibles en transparence pour être redessinés.</p>
          <div className="actions span-2">
            <button type="button" className="btn btn-ghost" onClick={() => setVue('menu')}>
              Retour
            </button>
            <button type="button" className="btn btn-primary" onClick={dupliquer}>
              Créer le bilan
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
