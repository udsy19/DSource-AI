import IdentityCard from "./IdentityCard";
import OfferLedger from "./OfferLedger";

/**
 * The result: one product on the left, every seller of it on the right.
 *
 * Two things this deliberately does NOT do:
 *
 * 1. Claim completeness. There is no cross-retailer index in existence —
 *    Google has one and sells no API, Shopify forbids caching theirs, Amazon
 *    bars aggregation. "Every seller" means every seller our providers can
 *    see, and the footer says exactly that rather than implying otherwise by
 *    silence.
 * 2. Hide anything. Low-confidence and flagged offers are labeled and ranked
 *    last, never dropped.
 */

const Dossier = ({ result, onAddToSpec }) => {
  const { identity, offers, summary, notice, unconfigured } = result;

  if (!offers || offers.length === 0) {
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-4">
          <IdentityCard identity={identity} summary={null} />
        </div>
        <div className="lg:col-span-8">
          <div className="border-b-2 border-[var(--viz-ink)] pb-1.5">
            <h3 className="viz-label">No sellers found</h3>
          </div>
          {/* An empty state is a direction, not a mood — say what happened and
              what would work instead. */}
          <p className="viz-serif mt-4 max-w-md text-lg italic text-[var(--viz-muted)]">
            {notice ?? "We couldn't find anyone selling this right now."}
          </p>
          <Provenance unconfigured={unconfigured} />
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-10">
      <div className="lg:col-span-4">
        <IdentityCard identity={identity} summary={summary} />
      </div>

      <div className="lg:col-span-8">
        <OfferLedger offers={offers} onAddToSpec={onAddToSpec} />
        <Provenance unconfigured={unconfigured} />
      </div>
    </div>
  );
};

/**
 * Says where the answer came from and where it didn't. A thin result set with
 * no explanation reads as "this is everything"; naming the providers that were
 * off makes the gap legible instead.
 */
const Provenance = ({ unconfigured }) => (
  <div className="mt-8 border-t border-[var(--viz-line)] pt-4">
    <p className="viz-mono text-[11px] leading-relaxed text-[var(--viz-muted)]">
      These are the sellers we could reach and check. No service indexes every
      retailer, so treat this as thorough, not exhaustive.
      {unconfigured?.length > 0 && (
        <> Not searched: {unconfigured.join(", ")}.</>
      )}
    </p>
  </div>
);

export default Dossier;
