export interface Quantity {
  value: number;
  unit: string;
}

export interface Envelope {
  max_w: number | null;
  max_d: number | null;
  max_h: number | null;
  unit: string;
}

export interface BudgetCeiling {
  amount: number;
  currency: string;
  basis: 'per_unit' | 'total';
}

export interface HardConstraints {
  min_acoustic_nrc: number | null;
  fire_rating_min: string | null;
}

export interface StyleIntent {
  text: string | null;
  reference_image: string | null;
  precomputed_vector: number[] | null;
}

export interface BOQLine {
  category: string;
  quantity: Quantity;
  envelope: Envelope | null;
  budget_ceiling: BudgetCeiling;
  required_certs: string[];
  hard_constraints: HardConstraints;
  style_intent: StyleIntent;
}

export interface Breakdown {
  style_similarity: number;
  budget_fit: number;
  lead_time_score: number;
  sustainability_bonus: number;
  filters_passed: string[];
}

export interface Candidate {
  product_id: string;
  score: number;
  hard_pass: boolean;
  breakdown: Breakdown;
  has_geometry: boolean;
}

export interface Weights {
  style: number;
  budget: number;
  lead_time: number;
  sustainability: number;
}

export interface MatchResponse {
  query: BOQLine;
  candidates: Candidate[];
  weights_used: Weights;
}

export interface Product {
  id: string;
  source: string;
  source_ref: string;
  brand: string;
  name: string;
  category: string;
  price: { amount: number; currency: string; unit: string };
  dimensions: { w: number | null; d: number | null; h: number | null; unit: string };
  acoustic_nrc: number | null;
  fire_rating: string | null;
  lead_time_days: number | null;
  certifications: string[];
  has_epd: boolean;
  embodied_carbon: number | null;
  has_geometry: boolean;
  model_3d: { format: string; uri: string } | null;
}

async function asJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${res.statusText} — ${body || 'request failed'}`);
  }
  return res.json() as Promise<T>;
}

export async function postMatch(line: BOQLine): Promise<MatchResponse> {
  const res = await fetch('/match', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(line),
  });
  return asJson<MatchResponse>(res);
}

export async function getProduct(id: string): Promise<Product> {
  return asJson<Product>(await fetch(`/products/${id}`));
}
