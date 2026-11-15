import type { DynamoDef, FieldDef, GroupeDynamo } from '../types';

const lireNombre = (s: string) => (s.trim() === '' ? undefined : Number(s.replace(',', '.')));

/** Réglages d'un champ dynamomètre : un ou deux groupes, leurs normes en N/kg et le ratio. */
export function ProprietesDynamo({ champ, onChange }: { champ: FieldDef; onChange: (patch: Partial<FieldDef>) => void }) {
  const def: DynamoDef = champ.dynamo ?? { groupes: [] };
  const majDef = (patch: Partial<DynamoDef>) => onChange({ dynamo: { ...def, ...patch } });
  const majGroupe = (i: number, patch: Partial<GroupeDynamo>) => majDef({ groupes: def.groupes.map((g, j) => (j === i ? { ...g, ...patch } : g)) });

  return (
    <div className="props-dynamo">
      <span className="props-label">Groupes musculaires (normes en N/kg)</span>
      {def.groupes.map((g, i) => (
        <fieldset key={g.id} className="props-groupe">
          <legend className="sr-only">Groupe {i + 1}</legend>
          <label>
            Groupe {i + 1}
            <input className="input" value={g.label} onChange={(e) => majGroupe(i, { label: e.target.value })} />
          </label>
          <div className="props-duo">
            <label>
              Norme min.
              <input className="input" type="number" step="any" value={g.normeMin ?? ''} onChange={(e) => majGroupe(i, { normeMin: lireNombre(e.target.value) })} />
            </label>
            <label>
              Norme max.
              <input className="input" type="number" step="any" value={g.normeMax ?? ''} onChange={(e) => majGroupe(i, { normeMax: lireNombre(e.target.value) })} />
            </label>
          </div>
          {def.groupes.length > 1 && (
            <button
              type="button"
              className="btn btn-ghost btn-small"
              onClick={() => {
                const groupes = def.groupes.filter((_, j) => j !== i);
                majDef({ groupes, ratio: groupes.length > 1 ? def.ratio : undefined });
              }}
            >
              Retirer ce groupe
            </button>
          )}
        </fieldset>
      ))}
      {def.groupes.length < 2 && (
        <button type="button" className="btn btn-ghost btn-small" onClick={() => majDef({ groupes: [...def.groupes, { id: `groupe${Date.now().toString(36)}`, label: 'Antagonistes' }] })}>
          + Ajouter le groupe antagoniste
        </button>
      )}
      {def.groupes.length === 2 && (
        <>
          <label className="props-check">
            <input type="checkbox" checked={Boolean(def.ratio)} onChange={(e) => majDef({ ratio: e.target.checked ? { label: `${def.groupes[0].label}/${def.groupes[1].label}` } : undefined })} />
            Calculer le ratio {def.groupes[0].label} / {def.groupes[1].label}
          </label>
          {def.ratio && (
            <div className="props-duo">
              <label>
                Ratio, norme min.
                <input className="input" type="number" step="any" value={def.ratio.normeMin ?? ''} onChange={(e) => majDef({ ratio: { ...def.ratio!, normeMin: lireNombre(e.target.value) } })} />
              </label>
              <label>
                Ratio, norme max.
                <input className="input" type="number" step="any" value={def.ratio.normeMax ?? ''} onChange={(e) => majDef({ ratio: { ...def.ratio!, normeMax: lireNombre(e.target.value) } })} />
              </label>
            </div>
          )}
        </>
      )}
      <label>
        Déficit à partir de (% d’écart entre les côtés)
        <input className="input" type="number" min={0} max={100} value={def.seuilDeficit ?? ''} placeholder="10" onChange={(e) => majDef({ seuilDeficit: lireNombre(e.target.value) })} />
      </label>
      <p className="help">Mettez la position du test dans « Aide à la saisie ». Le poids du patient (fiche patient) sert au calcul des N/kg.</p>
    </div>
  );
}
