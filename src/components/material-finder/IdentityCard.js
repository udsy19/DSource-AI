/**
 * What we decided the product IS, and what that decision rests on.
 *
 * This card exists because the identity is a claim, not a given. When we
 * resolved a GTIN it's near-certain; when a model read a photo with no legible
 * label it's a guess. Those two states must not look alike, so `findability`
 * is rendered as prominently as the product name.
 */

/**
 * These describe how well we know WHAT THE PRODUCT IS — not how good the
 * matches are. Conflating the two would overclaim: we can know a product
 * exactly and still only find probable sellers for it. Each seller carries its
 * own tier for that.
 */
const FINDABILITY_NOTE = {
  identifier:
    "We read this product's own code, so we know exactly what it is. Each seller below is rated separately.",
  branded:
    "We could read the brand but no model number, so the product is identified by name rather than by code.",
  generic:
    "No brand or model was legible, so this is a visual identification — we could not confirm what it is.",
};

/**
 * Reads as a sentence at any count. "1 of 1 sellers agree" is technically true
 * and useless.
 */
const agreementLine = (summary) => {
  if (summary.total === 0) return null;
  if (summary.gtinAgreeing === 0) {
    return `${summary.total} ${summary.total === 1 ? "seller" : "sellers"} found, none confirmed by identifier.`;
  }
  if (summary.total === 1) {
    return "The one seller we found carries this identifier.";
  }
  if (summary.gtinAgreeing === summary.total) {
    return `All ${summary.total} sellers carry this identifier.`;
  }
  return `${summary.gtinAgreeing} of ${summary.total} sellers carry this identifier.`;
};

const IdentityCard = ({ identity, summary }) => {
  const rows = [
    identity.brand && { label: "Brand", value: identity.brand },
    identity.gtin && { label: "GTIN", value: identity.gtin },
    identity.mpn && { label: "MPN", value: identity.mpn },
    identity.asin && { label: "ASIN", value: identity.asin },
    identity.category && { label: "Category", value: identity.category },
  ].filter(Boolean);

  return (
    <div className="viz-panel rounded-2xl p-5">
      <p className="viz-label">Identity</p>

      {identity.imageUrl && (
        // Product photos come from unbounded supplier CDNs that no allowlist
        // can cover, and provider terms require live rendering rather than a
        // cached copy — so a plain <img>, same as the marketplace cards.
        // biome-ignore lint/performance/noImgElement: unbounded CDNs + no-cache terms
        <img
          src={identity.imageUrl}
          alt={identity.title ?? "The product we identified"}
          className="mt-3 aspect-square w-full rounded-lg border border-[var(--viz-line)] bg-[var(--viz-ground)] object-contain"
        />
      )}

      <h2 className="viz-serif mt-4 text-2xl leading-tight">
        {identity.title ?? "Unidentified product"}
      </h2>

      {rows.length > 0 && (
        <dl className="mt-4 space-y-1.5">
          {rows.map((row) => (
            <div key={row.label} className="flex gap-3">
              <dt className="viz-mono w-16 shrink-0 text-[11px] tracking-[0.08em] text-[var(--viz-muted)] uppercase">
                {row.label}
              </dt>
              <dd className="viz-mono min-w-0 break-all text-[11px]">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      <div className="mt-5 border-t border-[var(--viz-line)] pt-4">
        <p className="viz-label">Evidence</p>
        <p className="mt-2 text-xs leading-relaxed text-[var(--viz-muted)]">
          {FINDABILITY_NOTE[identity.findability] ??
            "We matched this on what we could read."}
        </p>

        {summary && agreementLine(summary) && (
          <p className="viz-mono mt-3 text-[11px] leading-relaxed text-[var(--viz-muted)]">
            {agreementLine(summary)}
            {summary.flagged > 0 &&
              ` ${summary.flagged} flagged for a closer look.`}
          </p>
        )}

        {identity.note && (
          <p className="viz-mono mt-2 text-[11px] leading-relaxed text-[var(--viz-muted)]">
            {identity.note}
          </p>
        )}
      </div>
    </div>
  );
};

export default IdentityCard;
