import { useState } from 'react';

import type { BOQLine, MatchResponse } from 'src/api';
import { postMatch } from 'src/api';
import { BoqForm } from 'src/BoqForm';
import { CandidateCard } from 'src/CandidateCard';

const WEIGHT_LABELS: { key: keyof MatchResponse['weights_used']; label: string }[] = [
  { key: 'style', label: 'style' },
  { key: 'attribute', label: 'attribute' },
  { key: 'budget', label: 'budget' },
  { key: 'lead_time', label: 'lead time' },
  { key: 'sustainability', label: 'sustainability' },
];

export function App() {
  const [result, setResult] = useState<MatchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function resolve(line: BOQLine) {
    setPending(true);
    setError(null);
    try {
      setResult(await postMatch(line));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setResult(null);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="shell">
      <header className="masthead">
        <h1>Quarry</h1>
        <p>
          Resolve a BOQ line into ranked, real products. Hard constraints eliminate; soft signals
          rank. Every candidate shows the breakdown behind its score.
        </p>
      </header>

      <div className="layout">
        <aside>
          <BoqForm onSubmit={resolve} pending={pending} />
        </aside>

        <main aria-live="polite">
          {error && (
            <div className="notice is-error" role="alert">
              Match failed: {error}
            </div>
          )}

          {!result && !error && (
            <p className="empty">Compose a BOQ line and resolve to see ranked candidates.</p>
          )}

          {result && (
            <>
              <div className="results-head">
                <span className="results-count">
                  {result.candidates.length}{' '}
                  {result.candidates.length === 1 ? 'candidate' : 'candidates'}
                </span>
                <div className="weights" aria-label="Weights used">
                  {WEIGHT_LABELS.map(({ key, label }) => (
                    <div className="w" key={key}>
                      <b>{result.weights_used[key].toFixed(2)}</b>
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {result.candidates.length === 0 ? (
                <p className="empty">
                  No products passed the hard filter for this line. Loosen a constraint.
                </p>
              ) : (
                <div className="cards">
                  {result.candidates.map((c, i) => (
                    <CandidateCard key={c.product_id} candidate={c} rank={i + 1} />
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
