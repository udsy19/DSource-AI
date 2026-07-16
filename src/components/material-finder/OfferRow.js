"use client";

import { useState } from "react";
import ConfidenceMark from "./ConfidenceMark";
import EvidenceChain from "./EvidenceChain";

/**
 * One seller's offer, set as a ledger row rather than a card.
 *
 * A card grid would make fourteen sellers look like fourteen products. They
 * are one product in fourteen places — so this is a ledger: aligned prices you
 * can read down, sellers you can compare, evidence on demand.
 *
 * The evidence chain is collapsed by default and opens per row. Showing every
 * chain at once buries the prices, which are what the reader came for.
 */

const CURRENCY_SYMBOL = { USD: "$", GBP: "£", EUR: "€", INR: "₹" };

const formatPrice = (price) => {
  if (!price?.value) return null;
  const symbol = CURRENCY_SYMBOL[price.currency] ?? "";
  const value = price.value.toLocaleString(undefined, {
    maximumFractionDigits: price.value % 1 === 0 ? 0 : 2,
  });
  return symbol
    ? `${symbol}${value}`
    : `${value} ${price.currency ?? ""}`.trim();
};

/**
 * How old the price is, in words. Aggregators mix observations years apart —
 * one real barcode returned prices stamped anywhere from 2017 to last week —
 * so an unlabeled figure would be a claim we can't support.
 */
const stalenessLabel = (offer) => {
  if (!offer.priceStale) return null;
  const days = offer.ageDays;
  if (!Number.isFinite(days)) return "price age unknown";
  if (days > 365) {
    const years = Math.floor(days / 365);
    return `price from ${years} year${years > 1 ? "s" : ""} ago`;
  }
  return `price ${Math.floor(days / 30)} months old`;
};

const OfferRow = ({ offer, onAddToSpec }) => {
  const [open, setOpen] = useState(false);
  const hasDetail = offer.evidence?.length > 0 || offer.flags?.length > 0;
  const price = formatPrice(offer.price);

  return (
    <li className="border-b border-[var(--viz-line)] py-3 last:border-b-0">
      <div className="flex items-baseline gap-3">
        <ConfidenceMark tier={offer.tier} />

        {/* Tabular figures so prices align down the column — the whole point
            of a ledger. */}
        <span className="viz-mono w-24 shrink-0 text-right text-sm tabular-nums">
          {price ?? <span className="text-[var(--viz-muted)]">—</span>}
        </span>

        <div className="min-w-0 flex-1">
          <a
            href={offer.url}
            target={offer.internal ? undefined : "_blank"}
            rel={offer.internal ? undefined : "noopener noreferrer"}
            className="text-sm underline-offset-4 hover:underline"
          >
            {offer.seller ?? offer.domain ?? "Unknown seller"}
            <span aria-hidden="true" className="ml-1 text-[var(--viz-muted)]">
              ↗
            </span>
          </a>

          <p className="viz-mono mt-0.5 text-[11px] text-[var(--viz-muted)]">
            {[
              offer.inStock === true
                ? "in stock"
                : offer.inStock === false
                  ? "out of stock"
                  : null,
              offer.condition,
              offer.marketplaceSeller
                ? `sold by ${offer.marketplaceSeller}`
                : null,
              // Never let an old price read as a current one. Aggregators
              // return observations years old alongside fresh ones, and the
              // difference is invisible unless we say it.
              stalenessLabel(offer),
            ]
              .filter(Boolean)
              .join(" · ") || offer.domain}
          </p>

          {hasDetail && open && (
            <EvidenceChain evidence={offer.evidence} flags={offer.flags} />
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {onAddToSpec && (
            <button
              type="button"
              onClick={() => onAddToSpec(offer)}
              className="cursor-pointer rounded-md border border-[var(--viz-line)] px-2 py-1 text-xs transition-colors hover:bg-[var(--viz-ground)]"
            >
              Add to spec
            </button>
          )}
          {hasDetail && (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              className="viz-mono cursor-pointer text-[11px] tracking-[0.08em] text-[var(--viz-muted)] uppercase hover:text-[var(--viz-ink)]"
            >
              {open ? "Hide" : "Why"}
            </button>
          )}
        </div>
      </div>
    </li>
  );
};

export default OfferRow;
