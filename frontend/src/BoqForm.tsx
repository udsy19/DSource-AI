import { useState } from 'react';

import type { BOQLine } from 'src/api';

const CATEGORIES = [
  'finishes/acoustic/wall-panel',
  'ffe/seating/task-chair',
] as const;

interface BoqFormProps {
  onSubmit: (line: BOQLine) => void;
  pending: boolean;
}

function numberOrNull(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function csvToList(raw: string): string[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function BoqForm({ onSubmit, pending }: BoqFormProps) {
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [quantity, setQuantity] = useState('10');
  const [quantityUnit, setQuantityUnit] = useState('each');
  const [budgetAmount, setBudgetAmount] = useState('500');
  const [budgetBasis, setBudgetBasis] = useState<'per_unit' | 'total'>('per_unit');
  const [styleText, setStyleText] = useState('');
  const [certs, setCerts] = useState('');
  const [maxW, setMaxW] = useState('');
  const [maxD, setMaxD] = useState('');
  const [maxH, setMaxH] = useState('');
  const [minNrc, setMinNrc] = useState('');
  const [fireMin, setFireMin] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();

    const w = numberOrNull(maxW);
    const d = numberOrNull(maxD);
    const h = numberOrNull(maxH);
    const hasEnvelope = w !== null || d !== null || h !== null;

    const line: BOQLine = {
      category,
      quantity: { value: Number(quantity) || 0, unit: quantityUnit },
      envelope: hasEnvelope ? { max_w: w, max_d: d, max_h: h, unit: 'mm' } : null,
      budget_ceiling: {
        amount: Number(budgetAmount) || 0,
        currency: 'USD',
        basis: budgetBasis,
      },
      required_certs: csvToList(certs),
      hard_constraints: {
        min_acoustic_nrc: numberOrNull(minNrc),
        fire_rating_min: fireMin.trim() === '' ? null : fireMin.trim(),
      },
      style_intent: {
        text: styleText.trim() === '' ? null : styleText.trim(),
        reference_image: null,
        precomputed_vector: null,
      },
    };

    onSubmit(line);
  }

  return (
    <form className="form" onSubmit={submit} aria-label="Compose a BOQ line">
      <p className="eyebrow">Compose a BOQ line</p>

      <div className="field">
        <label htmlFor="category">Category</label>
        <select
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="row">
        <div className="field">
          <label htmlFor="quantity">Quantity</label>
          <input
            id="quantity"
            type="number"
            min="0"
            step="any"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="quantity-unit">Unit</label>
          <select
            id="quantity-unit"
            value={quantityUnit}
            onChange={(e) => setQuantityUnit(e.target.value)}
          >
            <option value="each">each</option>
            <option value="sqm">sqm</option>
            <option value="linear_m">linear_m</option>
          </select>
        </div>
      </div>

      <div className="row">
        <div className="field">
          <label htmlFor="budget">Budget ceiling (USD)</label>
          <input
            id="budget"
            type="number"
            min="0"
            step="any"
            value={budgetAmount}
            onChange={(e) => setBudgetAmount(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="budget-basis">Basis</label>
          <select
            id="budget-basis"
            value={budgetBasis}
            onChange={(e) => setBudgetBasis(e.target.value as 'per_unit' | 'total')}
          >
            <option value="per_unit">per_unit</option>
            <option value="total">total</option>
          </select>
        </div>
      </div>

      <div className="field">
        <label htmlFor="style">Style intent (optional)</label>
        <textarea
          id="style"
          placeholder="warm matte terracotta, mid-century"
          value={styleText}
          onChange={(e) => setStyleText(e.target.value)}
        />
        <span className="hint">Free text — embedded into a query vector by the resolver.</span>
      </div>

      <div className="field">
        <label htmlFor="certs">Required certifications (optional)</label>
        <input
          id="certs"
          placeholder="CDPH, GREENGUARD"
          value={certs}
          onChange={(e) => setCerts(e.target.value)}
        />
        <span className="hint">Comma-separated. Hard filter: product must have all.</span>
      </div>

      <fieldset>
        <legend>Envelope — max dimensions (mm, optional)</legend>
        <div className="row">
          <div className="field">
            <label htmlFor="max-w">Max width</label>
            <input
              id="max-w"
              type="number"
              min="0"
              step="any"
              value={maxW}
              onChange={(e) => setMaxW(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="max-d">Max depth</label>
            <input
              id="max-d"
              type="number"
              min="0"
              step="any"
              value={maxD}
              onChange={(e) => setMaxD(e.target.value)}
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="max-h">Max height</label>
          <input
            id="max-h"
            type="number"
            min="0"
            step="any"
            value={maxH}
            onChange={(e) => setMaxH(e.target.value)}
          />
        </div>
      </fieldset>

      <fieldset>
        <legend>Category hard constraints (optional)</legend>
        <div className="field">
          <label htmlFor="min-nrc">Min acoustic NRC</label>
          <input
            id="min-nrc"
            type="number"
            min="0"
            max="1"
            step="any"
            value={minNrc}
            onChange={(e) => setMinNrc(e.target.value)}
          />
          <span className="hint">For acoustic panels (0–1).</span>
        </div>
        <div className="field">
          <label htmlFor="fire-min">Fire rating min</label>
          <input
            id="fire-min"
            placeholder="Class A"
            value={fireMin}
            onChange={(e) => setFireMin(e.target.value)}
          />
        </div>
      </fieldset>

      <button className="btn btn--primary" type="submit" disabled={pending}>
        {pending ? 'Resolving…' : 'Resolve match'}
      </button>
    </form>
  );
}
