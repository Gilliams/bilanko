/** Ajoute une suggestion à la fin d'un texte libre. */
export const ajouterSuggestion = (texte: string, suggestion: string) => {
  const base = texte.trimEnd();
  if (!base) return suggestion;
  return `${base}${/[.,;:]$/.test(base) ? ' ' : ', '}${suggestion}`;
};

/** Réponses fréquentes à cliquer sous un champ texte. */
export function Suggestions({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="suggestions" aria-label="Suggestions">
      {options.map((o) => (
        <button key={o} type="button" className="chip is-small" onClick={() => onChange(ajouterSuggestion(value, o))}>
          + {o}
        </button>
      ))}
    </div>
  );
}
