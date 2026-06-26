import { useEffect, useState } from 'react';

import type { Candidate, Product } from 'src/api';
import { getProduct } from 'src/api';
import { money, pct, score } from 'src/format';

interface CandidateCardProps {
  candidate: Candidate;
  rank: number;
}

type NumericMetric = 'style_similarity' | 'budget_fit' | 'lead_time_score' | 'sustainability_bonus';

const METRICS: { key: NumericMetric; label: string }[] = [
  { key: 'style_similarity', label: 'Style similarity' },
  { key: 'budget_fit', label: 'Budget fit' },
  { key: 'lead_time_score', label: 'Lead time' },
  { key: 'sustainability_bonus', label: 'Sustainability' },
];

export function CandidateCard({ candidate, rank }: CandidateCardProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setProduct(null);
    setError(null);
    getProduct(candidate.product_id)
      .then((p) => live && setProduct(p))
      .catch((e: unknown) => live && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      live = false;
    };
  }, [candidate.product_id]);

  const { breakdown } = candidate;

  return (
    <article className="card">
      <div className="rank" aria-label={`Rank ${rank}`}>
        {rank}
      </div>

      <div className="card-main">
        <div className="card-top">
          <div>
            <h3 className="product-name">
              {product ? product.name : error ? 'Product unavailable' : 'Loading…'}
            </h3>
            {product && <div className="product-brand">{product.brand}</div>}
            {error && <div className="null-note">{error}</div>}
          </div>
          <div className="score">
            <b>{score(candidate.score)}</b>
            <span>score</span>
          </div>
        </div>

        <div className="tags">
          <span className={`tag ${candidate.has_geometry ? 'is-ok' : 'is-warn'}`}>
            {candidate.has_geometry ? 'render-ready 3D' : 'no 3D geometry'}
          </span>
          {product && (
            <span className="price">
              {money(product.price.amount, product.price.currency)}{' '}
              <span className="unit">/ {product.price.unit}</span>
            </span>
          )}
        </div>

        {product && (
          <div className="tags">
            <span className="tag">{product.category}</span>
            {product.lead_time_days !== null ? (
              <span className="tag">{product.lead_time_days} day lead</span>
            ) : (
              <span className="tag null-note">lead time: not reported</span>
            )}
            {product.acoustic_nrc !== null && (
              <span className="tag">NRC {product.acoustic_nrc}</span>
            )}
            {product.fire_rating !== null && (
              <span className="tag">fire {product.fire_rating}</span>
            )}
            {product.has_epd && <span className="tag is-ok">EPD</span>}
            {product.embodied_carbon !== null && (
              <span className="tag">{product.embodied_carbon} kgCO₂e</span>
            )}
          </div>
        )}

        {product && product.certifications.length > 0 && (
          <div className="tags">
            {product.certifications.map((c) => (
              <span key={c} className="tag is-accent">
                {c}
              </span>
            ))}
          </div>
        )}

        <div>
          <div className="section-label">Score breakdown</div>
          <div className="breakdown">
            {METRICS.map(({ key, label }) => {
              const value = breakdown[key];
              return (
                <div className="metric" key={key}>
                  <label>{label}</label>
                  <div
                    className="bar"
                    role="meter"
                    aria-label={label}
                    aria-valuenow={Math.round(value * 100)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <i style={{ width: pct(value) }} />
                  </div>
                  <span className="val">{score(value)}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="filters">
          <div className="section-label">Hard filters passed</div>
          {breakdown.filters_passed.length > 0 ? (
            <div className="tags">
              {breakdown.filters_passed.map((f) => (
                <span key={f} className="tag is-ok">
                  {f}
                </span>
              ))}
            </div>
          ) : (
            <span className="null-note">none reported</span>
          )}
        </div>
      </div>
    </article>
  );
}
