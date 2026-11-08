import type { ReactNode } from 'react';
import type { Activite, FieldDef, FieldValue } from '../types';
import { BodyChart } from './BodyChart';
import { criteresPresents, estActivites, estTestValeur, formatValue, moyenneActivites } from '../lib/synthese';
import { ficheDuChamp } from '../data/catalogue';
import { FicheContenu } from './Items';
import { Suggestions } from './Suggestions';

interface Props {
  field: FieldDef;
  value: FieldValue | undefined;
  onChange: (v: FieldValue) => void;
  previous?: FieldValue;
  /** Présent si le champ peut être suivi dans le temps */
  suivi?: { actif: boolean; onToggle: () => void };
  /** Résultat d'un champ 'calcul' */
  calcule?: number | null;
  /** Épinglage dans le mémo du patient */
  memo?: { actif: boolean; onToggle: () => void };
  /** Contenu affiché sous la saisie (photos et vidéos) */
  complement?: ReactNode;
}

const RESULTATS_TEST = ['Négatif', 'Positif'];
const MAX_ACTIVITES = 5;

function ChampNombre({ label, value, unit, min, max, onChange }: { label: string; value: number | null | undefined; unit?: string; min?: number; max?: number; onChange: (v: number | null) => void }) {
  return (
    <label className="bilateral-cote">
      <span>{label}</span>
      <span className="with-unit">
        <input className="input" type="number" inputMode="decimal" step="any" min={min} max={max} value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} />
        {unit && <span className="unit">{unit}</span>}
      </span>
    </label>
  );
}

export function FieldInput({ field, value, onChange, previous, suivi, calcule, memo, complement }: Props) {
  const id = `f-${field.id}`;
  // Le schéma compare déjà le bilan précédent en transparence.
  const prevText = previous !== undefined && field.type !== 'bodychart' ? formatValue(field, previous) : '';
  const fiche = ficheDuChamp(field);

  const control = (() => {
    switch (field.type) {
      case 'text':
      case 'textarea': {
        const texte = typeof value === 'string' ? value : '';
        const props = { id, className: 'input', value: texte, placeholder: field.placeholder ?? (field.options?.length ? 'Choisissez dans la liste et/ou notez directement' : undefined) };
        return (
          <>
            {field.type === 'text' ? <input {...props} onChange={(e) => onChange(e.target.value)} /> : <textarea {...props} rows={3} onChange={(e) => onChange(e.target.value)} />}
            {field.options?.length ? <Suggestions options={field.options} value={texte} onChange={onChange} /> : null}
          </>
        );
      }
      case 'test': {
        const courant = estTestValeur(value) ? value : { resultat: null, observation: '' };
        const maj = (patch: Partial<typeof courant>) => {
          const suivant = { ...courant, ...patch };
          onChange(suivant.resultat || suivant.observation?.trim() ? suivant : null);
        };
        return (
          <div className="test-champ">
            <div className="segmented" role="radiogroup" aria-labelledby={`${id}-l`}>
              {(field.options?.length ? field.options : RESULTATS_TEST).map((o) => (
                <button key={o} type="button" role="radio" aria-checked={courant.resultat === o} className={courant.resultat === o ? 'is-on' : ''} onClick={() => maj({ resultat: courant.resultat === o ? null : o })}>
                  {o}
                </button>
              ))}
            </div>
            <input id={id} className="input" placeholder="Observations" value={courant.observation ?? ''} onChange={(e) => maj({ observation: e.target.value })} />
          </div>
        );
      }
      case 'criteres': {
        const reponses = (value && typeof value === 'object' && !Array.isArray(value) && !estTestValeur(value) ? value : {}) as Record<string, boolean>;
        const { presents, repondus, seuilAtteint } = criteresPresents(field, value);
        const options = field.options ?? [];
        const repondre = (o: string, oui: boolean) => {
          const { [o]: _ancien, ...reste } = reponses;
          const suivant = reponses[o] === oui ? reste : { ...reste, [o]: oui };
          onChange(Object.keys(suivant).length ? suivant : null);
        };
        return (
          <div className="criteres">
            {options.map((o) => (
              <div key={o} className="critere">
                <span>{o}</span>
                <div className="segmented is-small" role="radiogroup" aria-label={o}>
                  {[true, false].map((oui) => (
                    <button key={String(oui)} type="button" role="radio" aria-checked={reponses[o] === oui} className={reponses[o] === oui ? 'is-on' : ''} onClick={() => repondre(o, oui)}>
                      {oui ? 'Oui' : 'Non'}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <p className={`criteres-bilan ${seuilAtteint ? 'is-atteint' : ''}`}>
              {presents.length} présent{presents.length > 1 ? 's' : ''} sur {options.length}
              {repondus < options.length ? `, ${options.length - repondus} non recherché${options.length - repondus > 1 ? 's' : ''}` : ''}
              {field.seuil !== undefined && (seuilAtteint ? ` — ${field.seuilLabel || 'seuil atteint'}` : ` — seuil : ${field.seuil}`)}
            </p>
          </div>
        );
      }
      case 'bilateral': {
        const cotes = (value && typeof value === 'object' && !Array.isArray(value) ? value : {}) as Record<string, number | null>;
        const maj = (cote: 'g' | 'd', n: number | null) => {
          const suivant = { ...cotes, [cote]: n };
          onChange(suivant.g === null && suivant.d === null ? null : (suivant as Record<string, number>));
        };
        return (
          <div className="bilateral">
            <ChampNombre label="Gauche" value={cotes.g} unit={field.unit} min={field.min} max={field.max} onChange={(n) => maj('g', n)} />
            <ChampNombre label="Droite" value={cotes.d} unit={field.unit} min={field.min} max={field.max} onChange={(n) => maj('d', n)} />
          </div>
        );
      }
      case 'calcul':
        return (
          <p className="calcul" id={id}>
            {calcule !== null && calcule !== undefined ? <strong>{formatValue(field, calcule)}</strong> : <span className="muted">Renseignez les mesures utilisées par ce calcul pour obtenir le résultat.</span>}
          </p>
        );
      case 'activites': {
        const lignes: Activite[] = estActivites(value) ? value : [{ activite: '', note: null }];
        const maj = (suivant: Activite[]) => onChange(suivant.length ? suivant : null);
        const moyenne = moyenneActivites(value);
        return (
          <div className="activites">
            {lignes.map((a, i) => (
              <div key={i} className="activite">
                <input className="input" aria-label={`Activité ${i + 1}`} placeholder={`Activité ${i + 1}, ex. monter un étage`} value={a.activite} onChange={(e) => maj(lignes.map((x, j) => (j === i ? { ...x, activite: e.target.value } : x)))} />
                <span className="with-unit">
                  <input
                    className="input"
                    type="number"
                    min={0}
                    max={10}
                    step={1}
                    aria-label={`Note de l’activité ${i + 1}`}
                    value={a.note ?? ''}
                    onChange={(e) => maj(lignes.map((x, j) => (j === i ? { ...x, note: e.target.value === '' ? null : Math.min(10, Math.max(0, Number(e.target.value))) } : x)))}
                  />
                  <span className="unit">/10</span>
                </span>
                <button type="button" className="btn btn-small btn-ghost" aria-label={`Retirer l’activité ${i + 1}`} onClick={() => maj(lignes.filter((_, j) => j !== i))}>
                  ✕
                </button>
              </div>
            ))}
            <div className="activites-pied">
              {lignes.length < MAX_ACTIVITES && (
                <button type="button" className="btn btn-small btn-ghost" onClick={() => maj([...lignes, { activite: '', note: null }])}>
                  + Ajouter une activité
                </button>
              )}
              <span className="muted">{moyenne !== null ? `Moyenne : ${moyenne.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}/10` : '0 = impossible, 10 = comme avant le problème'}</span>
            </div>
          </div>
        );
      }
      case 'number':
        return (
          <div className="with-unit">
            <input
              id={id}
              className="input"
              type="number"
              inputMode="decimal"
              min={field.min}
              max={field.max}
              step="any"
              value={value === undefined || value === null ? '' : String(value)}
              onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
            />
            {field.unit && <span className="unit">{field.unit}</span>}
          </div>
        );
      case 'select':
        return (
          <div className="segmented" role="radiogroup" aria-labelledby={`${id}-l`}>
            {field.options!.map((o) => (
              <button key={o} type="button" role="radio" aria-checked={value === o} className={value === o ? 'is-on' : ''} onClick={() => onChange(value === o ? null : o)}>
                {o}
              </button>
            ))}
          </div>
        );
      case 'multiselect': {
        const arr = (value as string[]) ?? [];
        return (
          <div className="chips">
            {field.options!.map((o) => {
              const on = arr.includes(o);
              return (
                <button key={o} type="button" aria-pressed={on} className={`chip ${on ? 'is-on' : ''}`} onClick={() => onChange(on ? arr.filter((x) => x !== o) : [...arr, o])}>
                  {o}
                </button>
              );
            })}
          </div>
        );
      }
      case 'boolean':
        return (
          <div className="segmented">
            {[true, false].map((b) => (
              <button key={String(b)} type="button" aria-pressed={value === b} className={value === b ? 'is-on' : ''} onClick={() => onChange(value === b ? null : b)}>
                {b ? 'Oui' : 'Non'}
              </button>
            ))}
          </div>
        );
      case 'eva': {
        const n = typeof value === 'number' ? value : null;
        return (
          <div className="eva" role="radiogroup" aria-labelledby={`${id}-l`}>
            {Array.from({ length: 11 }, (_, i) => (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={n === i}
                className={n === i ? 'is-on' : ''}
                style={{ ['--eva' as string]: `hsl(${120 - i * 12} 65% 45%)` }}
                onClick={() => onChange(n === i ? null : i)}
              >
                {i}
              </button>
            ))}
          </div>
        );
      }
      case 'bodychart':
        return <BodyChart value={value} onChange={onChange} previous={previous} />;
      case 'score': {
        const answers = (value && typeof value === 'object' && !Array.isArray(value) ? value : {}) as Record<string, number>;
        return (
          <div className="score">
            {field.items!.map((it) => (
              <div key={it.id} className="score-item">
                <div className="score-q">{it.label}</div>
                <div className="segmented is-small">
                  {it.options.map((o) => (
                    <button
                      key={o.label}
                      type="button"
                      aria-pressed={answers[it.id] === o.points}
                      className={answers[it.id] === o.points ? 'is-on' : ''}
                      onClick={() => onChange({ ...answers, [it.id]: o.points })}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className="score-total">Résultat : {formatValue(field, value) || '—'}</div>
          </div>
        );
      }
    }
  })();

  return (
    <div className={`field field-${field.type}`}>
      <div className="field-head">
        <label id={`${id}-l`} htmlFor={id} className="field-label">
          {field.label}
          {prevText && <span className="prev" title="Valeur du bilan précédent">précédent : {prevText}</span>}
        </label>
        {memo && (
          <button type="button" className={`memo-toggle ${memo.actif ? 'is-on' : ''}`} aria-pressed={memo.actif} title={memo.actif ? 'Retirer du mémo du patient' : 'Épingler dans le mémo du patient'} onClick={memo.onToggle}>
            Mémo
            <span className="sr-only"> : {field.label}</span>
          </button>
        )}
        {suivi && (
          <button type="button" className={`suivi-toggle ${suivi.actif ? 'is-on' : ''}`} aria-pressed={suivi.actif} title={suivi.actif ? 'Retirer du suivi' : 'Suivre cet item dans le temps'} onClick={suivi.onToggle}>
            {suivi.actif ? '★' : '☆'}
            <span className="sr-only">Suivre {field.label}</span>
          </button>
        )}
      </div>
      {control}
      {complement}
      {field.help && <p className="help">{field.help}</p>}
      {fiche && (
        <details className="fiche">
          <summary>Voir la fiche</summary>
          <FicheContenu item={fiche} />
        </details>
      )}
    </div>
  );
}
