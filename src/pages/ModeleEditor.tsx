import { useState, type DragEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { SPECIALITES } from '../data/templates';
import { rechercherItems, ficheDuChamp } from '../data/catalogue';
import { store, useDB } from '../lib/store';
import {
  TYPES_CREABLES,
  ajouterChamp,
  ajouterSection,
  champs,
  creerChamp,
  decalerChamp,
  declencheursPossibles,
  deplacerChamp,
  deplacerSection,
  erreurFormule,
  estCalculable,
  majChamp,
  majSection,
  problemes,
  supprimerChamp,
  supprimerSection,
  valeursDe,
} from '../lib/modeles';
import type { BilanTemplate, FieldDef, FieldType, Specialite } from '../types';

const TYPE_MIME = 'text/bilanko';

interface Glisse {
  champ?: string;
  type?: FieldType;
  item?: string;
}

const libelleValeur = (v: string | boolean) => (v === true ? 'Oui' : v === false ? 'Non' : v);

function ProprietesCalcul({
  modele,
  champ,
  onChange,
  texte,
  nombre,
}: {
  modele: BilanTemplate;
  champ: FieldDef;
  onChange: (patch: Partial<FieldDef>) => void;
  texte: (cle: 'formule' | 'unit', label: string) => React.ReactNode;
  nombre: (cle: 'decimales', label: string) => React.ReactNode;
}) {
  const mesures = champs(modele).filter((f) => f.id !== champ.id && estCalculable(f));
  const erreur = champ.formule?.trim() ? erreurFormule(modele, champ.formule) : null;
  return (
    <>
      {texte('formule', 'Formule')}
      <p className="help">Opérations + − * / et parenthèses, fonctions somme() et moyenne(). Cliquez une mesure pour l’insérer.</p>
      {mesures.length ? (
        <div className="chips">
          {mesures.map((f) => (
            <button key={f.id} type="button" className="chip is-small" title={f.id} onClick={() => onChange({ formule: `${champ.formule?.trim() ? `${champ.formule.trim()} ` : ''}${f.id}` })}>
              + {f.label}
            </button>
          ))}
        </div>
      ) : (
        <p className="help">Ajoutez d’abord des champs de type Mesure ou Échelle 0 à 10.</p>
      )}
      {erreur && <p className="alert">{erreur}</p>}
      <div className="props-duo">
        {texte('unit', 'Unité')}
        {nombre('decimales', 'Décimales')}
      </div>
    </>
  );
}

function Proprietes({ modele, champ, onChange }: { modele: BilanTemplate; champ: FieldDef; onChange: (patch: Partial<FieldDef>) => void }) {
  const declencheurs = declencheursPossibles(modele, champ.id);
  const condition = champ.visibleIf;
  const declencheur = condition && champs(modele).find((f) => f.id === condition.field);
  const texte = (cle: 'label' | 'reportLabel' | 'help' | 'unit' | 'seuilLabel' | 'alerte' | 'formule', label: string) => (
    <label>
      {label}
      <input className="input" value={champ[cle] ?? ''} onChange={(e) => onChange({ [cle]: e.target.value || (cle === 'label' ? '' : undefined) })} />
    </label>
  );
  const nombre = (cle: 'min' | 'max' | 'seuil' | 'decimales', label: string) => (
    <label>
      {label}
      <input className="input" type="number" value={champ[cle] ?? ''} onChange={(e) => onChange({ [cle]: e.target.value === '' ? undefined : Number(e.target.value) })} />
    </label>
  );

  return (
    <div className="props">
      {texte('label', 'Libellé')}
      {texte('reportLabel', 'Libellé de compte rendu')}
      {texte('help', 'Aide à la saisie')}
      {(champ.type === 'number' || champ.type === 'bilateral') && (
        <>
          {texte('unit', 'Unité')}
          <div className="props-duo">
            {nombre('min', 'Minimum')}
            {nombre('max', 'Maximum')}
          </div>
        </>
      )}
      {(champ.type === 'select' || champ.type === 'multiselect' || champ.type === 'criteres' || champ.type === 'test' || champ.type === 'text' || champ.type === 'textarea') && (
        <label>
          {champ.type === 'criteres'
            ? 'Critères, un par ligne'
            : champ.type === 'test'
              ? 'Résultats possibles, un par ligne (vide : Négatif / Positif)'
              : champ.type === 'text' || champ.type === 'textarea'
                ? 'Suggestions à cliquer, une par ligne (facultatif)'
                : 'Options, une par ligne'}
          <textarea className="input" rows={4} value={(champ.options ?? []).join('\n')} onChange={(e) => onChange({ options: e.target.value.split('\n') })} onBlur={(e) => onChange({ options: e.target.value.split('\n').map((o) => o.trim()).filter(Boolean) })} />
        </label>
      )}
      {champ.type === 'criteres' && (
        <>
          <div className="props-duo">
            {nombre('seuil', 'Seuil (critères présents)')}
            {texte('seuilLabel', 'Conclusion au seuil')}
          </div>
          {texte('alerte', 'Alerte du compte rendu au seuil (facultatif)')}
        </>
      )}
      {champ.type === 'calcul' && <ProprietesCalcul modele={modele} champ={champ} onChange={onChange} texte={texte} nombre={nombre} />}
      <label className="props-check">
        <input type="checkbox" checked={champ.medias === true} onChange={(e) => onChange({ medias: e.target.checked || undefined })} />
        Photos et vidéos
      </label>
      <label className="props-check">
        <input type="checkbox" checked={champ.inSynthese !== false} onChange={(e) => onChange({ inSynthese: e.target.checked ? undefined : false })} />
        Inclure dans le compte rendu
      </label>
      <label>
        Afficher seulement si
        <select className="input" value={condition?.field ?? ''} onChange={(e) => onChange({ visibleIf: e.target.value ? { field: e.target.value, in: [] } : undefined })}>
          <option value="">Toujours afficher</option>
          {declencheurs.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
      </label>
      {condition && declencheur && (
        <div>
          <span className="props-label">Réponses qui affichent ce champ</span>
          <div className="chips">
            {valeursDe(declencheur).map((v) => {
              const actif = condition.in?.includes(v) ?? false;
              return (
                <button
                  key={String(v)}
                  type="button"
                  aria-pressed={actif}
                  className={`chip ${actif ? 'is-on' : ''}`}
                  onClick={() => onChange({ visibleIf: { ...condition, in: actif ? condition.in!.filter((x) => x !== v) : [...(condition.in ?? []), v] } })}
                >
                  {libelleValeur(v)}
                </button>
              );
            })}
          </div>
          {!condition.in?.length && <p className="help">Choisissez au moins une réponse, sinon le champ reste masqué.</p>}
        </div>
      )}
      {champ.type === 'score' && <p className="help">Les questions et la formule d’un score ne se modifient pas ici.</p>}
    </div>
  );
}

export function ModeleEditor() {
  const { id } = useParams();
  const db = useDB();
  const modele = db.modeles.find((m) => m.id === id);
  const [selection, setSelection] = useState<string | null>(null);
  const [recherche, setRecherche] = useState('');
  const [sectionActive, setSectionActive] = useState<string | null>(null);
  const [survol, setSurvol] = useState<string | null>(null);

  if (!modele) {
    return (
      <div className="page">
        <p>Ce modèle n’existe pas ou ne peut pas être modifié.</p>
        <Link to="/modeles">← Retour aux modèles</Link>
      </div>
    );
  }

  const maj = (m: BilanTemplate) => store.updateModele(modele.id, m);
  const cible = modele.sections.find((s) => s.id === sectionActive) ?? modele.sections[modele.sections.length - 1];
  const champSelectionne = champs(modele).find((f) => f.id === selection);
  const items = rechercherItems(recherche).filter((i) => !champs(modele).some((f) => ficheDuChamp(f)?.id === i.id));
  const alertes = problemes(modele);
  const utilisations = db.bilans.filter((b) => b.templateId === modele.id).length;

  const inserer = (champ: FieldDef, sectionId: string, index?: number) => {
    maj(ajouterChamp(modele, sectionId, champ, index));
    setSelection(champ.id);
    setSectionActive(sectionId);
  };

  const glisser = (e: DragEvent, donnee: Glisse) => {
    e.dataTransfer.setData(TYPE_MIME, JSON.stringify(donnee));
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  const deposer = (e: DragEvent, sectionId: string, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setSurvol(null);
    const brut = e.dataTransfer.getData(TYPE_MIME);
    if (!brut) return;
    const d = JSON.parse(brut) as Glisse;
    if (d.champ) maj(deplacerChamp(modele, d.champ, sectionId, index));
    else if (d.type) inserer(creerChamp(d.type), sectionId, index);
    else if (d.item) {
      const item = rechercherItems('').find((i) => i.id === d.item);
      if (item) inserer(structuredClone(item.field), sectionId, index);
    }
  };

  const survoler = (e: DragEvent, cle: string) => {
    e.preventDefault();
    setSurvol(cle);
  };

  return (
    <div className="page editeur-modele">
      <Link to="/modeles" className="back">
        ← Modèles de bilans
      </Link>
      <header className="page-head">
        <div>
          <h1>{modele.nom || 'Modèle sans nom'}</h1>
          <p className="muted">
            Enregistrement automatique{utilisations > 0 ? ` · utilisé par ${utilisations} bilan${utilisations > 1 ? 's' : ''}` : ''}
          </p>
        </div>
      </header>

      {alertes.length > 0 && (
        <ul className="alertes-modele">
          {alertes.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      )}

      <section className="card modele-infos form-grid">
        <label>
          Nom du modèle
          <input className="input" value={modele.nom} onChange={(e) => maj({ ...modele, nom: e.target.value })} />
        </label>
        <label>
          Spécialité
          <select className="input" value={modele.specialite} onChange={(e) => maj({ ...modele, specialite: e.target.value as Specialite })}>
            {(Object.keys(SPECIALITES) as Specialite[]).map((s) => (
              <option key={s} value={s}>
                {SPECIALITES[s].label}
              </option>
            ))}
          </select>
        </label>
        <label className="span-2">
          Description
          <input className="input" value={modele.description} onChange={(e) => maj({ ...modele, description: e.target.value })} />
        </label>
      </section>

      <div className="modele-grid">
        <aside className="card modele-palette">
          <h2>Ajouter</h2>
          <p className="help">Cliquez pour ajouter à « {cible.title} », ou glissez dans une section.</p>
          <div className="palette-liste">
            {TYPES_CREABLES.map((t) => (
              <button key={t.type} type="button" className="palette-item" draggable onDragStart={(e) => glisser(e, { type: t.type })} onClick={() => inserer(creerChamp(t.type), cible.id)}>
                {t.label}
              </button>
            ))}
          </div>
          <h3>Bibliothèque</h3>
          <input className="input" type="search" placeholder="Rechercher un test" aria-label="Rechercher dans la bibliothèque" value={recherche} onChange={(e) => setRecherche(e.target.value)} />
          <div className="palette-liste palette-biblio">
            {items.map((i) => (
              <button key={i.id} type="button" className="palette-item" draggable onDragStart={(e) => glisser(e, { item: i.id })} onClick={() => inserer(structuredClone(i.field), cible.id)}>
                {i.nom}
              </button>
            ))}
            {items.length === 0 && <p className="help">Aucun item disponible.</p>}
          </div>
        </aside>

        <div className="modele-centre">
          {modele.sections.map((s, si) => (
            <section key={s.id} className={`card modele-section-edit ${s.id === cible.id ? 'is-cible' : ''}`} onClick={() => setSectionActive(s.id)} onDragOver={(e) => survoler(e, `fin-${s.id}`)} onDragLeave={() => setSurvol(null)} onDrop={(e) => deposer(e, s.id, s.fields.length)}>
              <div className="section-tete">
                <input className="input section-titre" aria-label="Titre de la section" value={s.title} onChange={(e) => maj(majSection(modele, s.id, { title: e.target.value }))} />
                <button type="button" className="btn-icone" aria-label={`Monter la section ${s.title}`} disabled={si === 0} onClick={() => maj(deplacerSection(modele, s.id, -1))}>
                  ↑
                </button>
                <button type="button" className="btn-icone" aria-label={`Descendre la section ${s.title}`} disabled={si === modele.sections.length - 1} onClick={() => maj(deplacerSection(modele, s.id, 1))}>
                  ↓
                </button>
                <button type="button" className="btn-icone" aria-label={`Supprimer la section ${s.title}`} disabled={modele.sections.length === 1} onClick={() => (s.fields.length === 0 || confirm(`Supprimer la section « ${s.title} » et ses ${s.fields.length} champ(s) ?`)) && maj(supprimerSection(modele, s.id))}>
                  ×
                </button>
              </div>
              {s.fields.length === 0 && <p className={`zone-vide ${survol === `fin-${s.id}` ? 'is-survol' : ''}`}>Glissez un champ ici.</p>}
              <ol className="champs-liste">
                {s.fields.map((f, fi) => (
                  <li
                    key={f.id}
                    className={`champ-ligne ${selection === f.id ? 'is-on' : ''} ${survol === f.id ? 'is-survol' : ''}`}
                    draggable
                    onDragStart={(e) => glisser(e, { champ: f.id })}
                    onDragOver={(e) => {
                      e.stopPropagation();
                      survoler(e, f.id);
                    }}
                    onDrop={(e) => deposer(e, s.id, fi)}
                    onClick={() => setSelection(f.id)}
                  >
                    <span className="poignee" aria-hidden="true">
                      ⠿
                    </span>
                    <button type="button" className="champ-nom">
                      {f.label || 'Sans libellé'}
                      {f.visibleIf && <small>conditionnel</small>}
                    </button>
                    <button type="button" className="btn-icone" aria-label={`Monter ${f.label}`} disabled={fi === 0} onClick={() => maj(decalerChamp(modele, f.id, -1))}>
                      ↑
                    </button>
                    <button type="button" className="btn-icone" aria-label={`Descendre ${f.label}`} disabled={fi === s.fields.length - 1} onClick={() => maj(decalerChamp(modele, f.id, 1))}>
                      ↓
                    </button>
                    <button
                      type="button"
                      className="btn-icone"
                      aria-label={`Supprimer ${f.label}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        maj(supprimerChamp(modele, f.id));
                        if (selection === f.id) setSelection(null);
                      }}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ol>
            </section>
          ))}
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              const { modele: suivant, sectionId } = ajouterSection(modele);
              maj(suivant);
              setSectionActive(sectionId);
            }}
          >
            + Ajouter une section
          </button>
        </div>

        <aside className="card modele-props">
          <h2>Champ sélectionné</h2>
          {champSelectionne ? <Proprietes key={champSelectionne.id} modele={modele} champ={champSelectionne} onChange={(patch) => maj(majChamp(modele, champSelectionne.id, patch))} /> : <p className="muted">Cliquez sur un champ pour modifier ses propriétés.</p>}
        </aside>
      </div>
    </div>
  );
}
