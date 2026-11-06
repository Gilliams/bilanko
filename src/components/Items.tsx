import { useState } from 'react';
import { CATEGORIES, REGIONS, estDansLeModele, rechercherItems, type CatalogueItem } from '../data/catalogue';
import { store, useDB } from '../lib/store';
import type { BilanTemplate } from '../types';

export function FicheContenu({ item }: { item: CatalogueItem }) {
  return (
    <dl className="fiche-contenu">
      <dt>Objectif</dt>
      <dd>{item.objectif}</dd>
      <dt>Réalisation</dt>
      <dd>{item.realisation}</dd>
      <dt>Interprétation</dt>
      <dd>{item.interpretation}</dd>
      <dt>Source</dt>
      <dd>{item.source}</dd>
    </dl>
  );
}

export function FavoriButton({ item }: { item: CatalogueItem }) {
  const db = useDB();
  const actif = db.favoris.includes(item.id);
  return (
    <button
      type="button"
      className={`suivi-toggle ${actif ? 'is-on' : ''}`}
      aria-pressed={actif}
      title={actif ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      onClick={(e) => {
        e.preventDefault();
        store.toggleFavori(item.id);
      }}
    >
      {actif ? '★' : '☆'}
      <span className="sr-only">Favori : {item.nom}</span>
    </button>
  );
}

interface PickerProps {
  bilanId: string;
  ajoutes: string[];
  modele: BilanTemplate;
}

/** Recherche dans la bibliothèque pour ajouter des items à un bilan, favoris en tête. */
export function ItemPicker({ bilanId, ajoutes, modele }: PickerProps) {
  const db = useDB();
  const [texte, setTexte] = useState('');
  const favori = (i: CatalogueItem) => (db.favoris.includes(i.id) ? 0 : 1);
  const items = rechercherItems(texte).sort((a, b) => favori(a) - favori(b));

  return (
    <div className="picker">
      <input className="input" type="search" autoFocus placeholder="Rechercher un test, une mesure, un score" aria-label="Rechercher un item" value={texte} onChange={(e) => setTexte(e.target.value)} />
      {items.length === 0 ? (
        <p className="muted">Aucun item ne correspond à cette recherche.</p>
      ) : (
        <ul className="picker-list">
          {items.map((i) => {
            const ajoute = ajoutes.includes(i.id);
            const present = estDansLeModele(modele, i);
            return (
              <li key={i.id}>
                <FavoriButton item={i} />
                <div>
                  <strong>{i.nom}</strong>
                  <small>
                    {CATEGORIES[i.categorie]} · {REGIONS[i.region]}
                  </small>
                </div>
                {present ? (
                  <span className="item-tag">Déjà dans le modèle</span>
                ) : (
                  <button type="button" className="btn btn-small btn-ghost" onClick={() => store.toggleItemBilan(bilanId, i.id)}>
                    {ajoute ? 'Retirer' : 'Ajouter'}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
