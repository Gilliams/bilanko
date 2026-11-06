import { useState } from 'react';
import { CATALOGUE, CATEGORIES, REGIONS, rechercherItems, type CategorieItem, type RegionItem } from '../data/catalogue';
import { FavoriButton, FicheContenu } from '../components/Items';
import { useDB } from '../lib/store';

export function Bibliotheque() {
  const db = useDB();
  const [texte, setTexte] = useState('');
  const [categorie, setCategorie] = useState<CategorieItem | ''>('');
  const [region, setRegion] = useState<RegionItem | ''>('');
  const [favoris, setFavoris] = useState(false);

  const items = rechercherItems(texte, {
    categorie: categorie || undefined,
    region: region || undefined,
    ids: favoris ? db.favoris : undefined,
  });

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Bibliothèque</h1>
          <p className="muted">
            {CATALOGUE.length} tests, mesures et scores à ajouter à vos bilans. Contenu d’exercice, non relu par un kinésithérapeute.
          </p>
        </div>
      </header>

      <input className="input search" type="search" placeholder="Rechercher un test, une mesure, un score" aria-label="Rechercher" value={texte} onChange={(e) => setTexte(e.target.value)} />
      <div className="filtres">
        {(Object.keys(CATEGORIES) as CategorieItem[]).map((c) => (
          <button key={c} type="button" aria-pressed={categorie === c} className={`chip ${categorie === c ? 'is-on' : ''}`} onClick={() => setCategorie(categorie === c ? '' : c)}>
            {CATEGORIES[c]}
          </button>
        ))}
        <button type="button" aria-pressed={favoris} className={`chip ${favoris ? 'is-on' : ''}`} onClick={() => setFavoris(!favoris)}>
          Favoris
        </button>
        <select className="input" aria-label="Région" value={region} onChange={(e) => setRegion(e.target.value as RegionItem | '')}>
          <option value="">Toutes les régions</option>
          {(Object.keys(REGIONS) as RegionItem[]).map((r) => (
            <option key={r} value={r}>
              {REGIONS[r]}
            </option>
          ))}
        </select>
      </div>

      {items.length === 0 ? (
        <p className="muted">Aucun item ne correspond à ces critères.</p>
      ) : (
        <div className="items-list">
          {items.map((i) => (
            <details key={i.id} className="card item-card">
              <summary>
                <FavoriButton item={i} />
                <strong>{i.nom}</strong>
                <span className="item-tag">
                  {CATEGORIES[i.categorie]} · {REGIONS[i.region]}
                </span>
              </summary>
              <FicheContenu item={i} />
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
