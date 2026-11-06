import type { FieldDef, FieldValue } from '../types';
import { BodyChart } from './BodyChart';
import { formatValue } from '../lib/synthese';
import { ficheDuChamp } from '../data/catalogue';
import { FicheContenu } from './Items';

interface Props {
  field: FieldDef;
  value: FieldValue | undefined;
  onChange: (v: FieldValue) => void;
  previous?: FieldValue;
  /** Présent si le champ peut être suivi dans le temps */
  suivi?: { actif: boolean; onToggle: () => void };
}

export function FieldInput({ field, value, onChange, previous, suivi }: Props) {
  const id = `f-${field.id}`;
  // Le schéma compare déjà le bilan précédent en transparence.
  const prevText = previous !== undefined && field.type !== 'bodychart' ? formatValue(field, previous) : '';
  const fiche = ficheDuChamp(field);

  const control = (() => {
    switch (field.type) {
      case 'text':
        return <input id={id} className="input" value={(value as string) ?? ''} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />;
      case 'textarea':
        return <textarea id={id} className="input" rows={3} value={(value as string) ?? ''} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />;
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
        {suivi && (
          <button type="button" className={`suivi-toggle ${suivi.actif ? 'is-on' : ''}`} aria-pressed={suivi.actif} title={suivi.actif ? 'Retirer du suivi' : 'Suivre cet item dans le temps'} onClick={suivi.onToggle}>
            {suivi.actif ? '★' : '☆'}
            <span className="sr-only">Suivre {field.label}</span>
          </button>
        )}
      </div>
      {control}
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
