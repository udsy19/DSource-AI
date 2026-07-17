import OfferRow from "./OfferRow";

/**
 * Every seller, ranked. Nothing is hidden — low-confidence offers are labeled
 * and sorted last, never dropped.
 *
 * The tier headings are the honest part. Grouping by tier stops a $289
 * unverified listing from sitting flush against a $1,240 confirmed one as if
 * the two were comparable, which is exactly the mistake a bare price-sorted
 * list invites.
 */

const GROUPS = [
  {
    tier: "HIGH",
    heading: "Confirmed",
    note: "The identifier agrees across more than one source.",
  },
  {
    tier: "MEDIUM",
    heading: "Probable",
    note: "Strong signals, no corroborated identifier.",
  },
  {
    tier: "LOW",
    heading: "Unverified",
    note: "These look like it. We could not confirm they are it.",
  },
];

const OfferLedger = ({ offers, onAddToSpec }) => {
  return (
    <div>
      {GROUPS.map((group) => {
        const rows = offers.filter((offer) => offer.tier === group.tier);
        if (rows.length === 0) return null;

        return (
          <section key={group.tier} className="mb-8 last:mb-0">
            <div className="flex items-baseline justify-between gap-4 border-b-2 border-[var(--viz-ink)] pb-1.5">
              <h3 className="viz-label">{group.heading}</h3>
              <span className="viz-mono text-[11px] text-[var(--viz-muted)]">
                {rows.length}
              </span>
            </div>
            <p className="viz-mono mt-2 text-[11px] text-[var(--viz-muted)]">
              {group.note}
            </p>

            <ul className="mt-1">
              {rows.map((offer) => (
                <OfferRow
                  key={`${offer.domain}-${offer.url}`}
                  offer={offer}
                  onAddToSpec={onAddToSpec}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
};

export default OfferLedger;
