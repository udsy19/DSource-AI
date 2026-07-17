/**
 * The evidence chain — why we believe this listing is the same product.
 *
 * This is the page's signature, and it earns the slot by tying to a product
 * truth rather than decorating one: the pipeline genuinely reasons in
 * evidence (GTIN agreement, MPN match, Shopify's own clustering, a vision
 * check), and this is that reasoning shown rather than compressed into a
 * score. Set as footnotes in a catalogue raisonné — the reference each claim
 * rests on, in the margin.
 *
 * Flags sit alongside evidence rather than in a separate "warnings" region:
 * both answer the same question, and splitting them would let a reader take
 * the evidence and miss the caveat.
 */

const EVIDENCE_PREFIX = {
  gtin: "GTIN",
  mpn: "MPN",
  upid: "Cluster",
  vision: "Image",
  visual: "Visual",
};

const EvidenceChain = ({ evidence = [], flags = [] }) => {
  if (evidence.length === 0 && flags.length === 0) return null;

  return (
    <ul className="mt-2 space-y-1">
      {evidence.map((item) => (
        <li
          key={`${item.kind}-${item.detail}`}
          className="viz-mono flex gap-2 text-[11px] leading-relaxed text-[var(--viz-muted)]"
        >
          <span aria-hidden="true" className="select-none">
            └
          </span>
          <span>
            <span className="text-[var(--viz-ink)]">
              {EVIDENCE_PREFIX[item.kind] ?? item.kind}
            </span>{" "}
            {item.detail}
          </span>
        </li>
      ))}

      {flags.map((flag) => (
        <li
          key={`${flag.kind}-${flag.detail}`}
          className="viz-mono flex gap-2 text-[11px] leading-relaxed text-[var(--viz-muted)]"
        >
          <span aria-hidden="true" className="select-none">
            ⚠
          </span>
          <span>{flag.detail}</span>
        </li>
      ))}
    </ul>
  );
};

export default EvidenceChain;
