/**
 * The confidence mark: ●●● / ●●○ / ●○○.
 *
 * Typographic rather than a colored badge — this system says things with type,
 * and a red/amber/green pill would both import a new hue and imply a precision
 * we have not earned.
 *
 * Deliberately NOT a percentage. We have no calibrated probability; a bare
 * "62%" would claim one. Three filled dots means "an identifier agrees", one
 * means "we could not verify this" — which is what the reader actually needs
 * to decide.
 */

const FILLED = { HIGH: 3, MEDIUM: 2, LOW: 1 };

const LABEL = {
  HIGH: "Confirmed by identifier",
  MEDIUM: "Probable match",
  LOW: "Unverified — looks similar only",
};

const ConfidenceMark = ({ tier }) => {
  const filled = FILLED[tier] ?? 1;

  return (
    // role="img" with a label: the dots carry meaning, so a screen reader must
    // get the words, not three bullet characters.
    <span
      role="img"
      className="viz-mono shrink-0 text-[11px] leading-none tracking-[0.2em]"
      title={LABEL[tier]}
      aria-label={LABEL[tier]}
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          aria-hidden="true"
          className={
            i < filled ? "text-[var(--viz-ink)]" : "text-[var(--viz-line)]"
          }
        >
          ●
        </span>
      ))}
    </span>
  );
};

export default ConfidenceMark;
