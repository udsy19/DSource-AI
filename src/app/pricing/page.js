"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import Reveal from "@/components/Reveal";

import madeImage1 from "../../../public/made-1.jpg";
import madeImage2 from "../../../public/made-2.avif";
import madeImage3 from "../../../public/made-3.avif";
import madeImage4 from "../../../public/made-4.jpg";
import madeImage5 from "../../../public/made-5.jpg";
import madeImage6 from "../../../public/made-6.avif";

const pricingPlans = {
  monthly: [
    {
      name: "Basic",
      price: "Free",
      priceSubtext: "",
      features: [
        "Generate 4 images",
        "Basic marketplace browsing",
        "Limited Spec Sheet",
        "Save images you love",
        "Basic exports (view-only or watermark)",
      ],
      cta: "Sign up",
      featured: false,
    },
    {
      name: "Plus",
      price: "$15",
      priceSubtext: "/mo",
      features: [
        "Unlimited image generation",
        "Limited marketplace browsing",
        "Limited Spec Sheet",
        "Save images you love",
        "Advanced AI tools",
        "Unlimited exports (view-only or watermark)",
      ],
      cta: "Start your 7 day Plus trial",
      featured: false,
    },
    {
      name: "Pro",
      price: "$48",
      priceSubtext: "/mo",
      features: [
        "Unlimited image generation",
        "Unlimited marketplace browsing",
        "Unlimited Spec Sheet",
        "Save images you love",
        "Advanced AI tools",
        "Unlimited exports (view-only or watermark)",
      ],
      cta: "Upgrade to Pro",
      featured: true,
    },
  ],
  yearly: [
    {
      name: "Basic",
      price: "Free",
      priceSubtext: "",
      features: [
        "Generate 4 images",
        "Basic marketplace browsing",
        "Limited Spec Sheet",
        "Save images you love",
        "Basic exports (view-only or watermark)",
      ],
      cta: "Sign up",
      featured: false,
    },
    {
      name: "Plus",
      price: "$10",
      priceSubtext: "/mo, $120 billed yearly",
      features: [
        "Unlimited image generation",
        "Limited marketplace browsing",
        "Limited Spec Sheet",
        "Save images you love",
        "Advanced AI tools",
        "Unlimited exports (view-only or watermark)",
      ],
      cta: "Start your 7 day Plus trial",
      featured: false,
    },
    {
      name: "Pro",
      price: "$32",
      priceSubtext: "/mo, $384 billed yearly",
      features: [
        "Unlimited image generation",
        "Unlimited marketplace browsing",
        "Unlimited Spec Sheet",
        "Save images you love",
        "Advanced AI tools",
        "Unlimited exports (view-only or watermark)",
      ],
      cta: "Upgrade to Pro",
      featured: true,
    },
  ],
};

const faqItems = [
  {
    question: "Do you offer a free trial or demo?",
    answer:
      "Yes! We offer a 7-day free trial for both Plus and Pro plans. You can explore all premium features risk-free before committing to a subscription.",
  },
  {
    question: "How does yearly plan work?",
    answer:
      "When you choose yearly billing, you pay upfront for 12 months and receive a significant discount compared to monthly billing. Your subscription auto-renews annually unless cancelled.",
  },
];

const galleryImages = [
  madeImage1,
  madeImage2,
  madeImage3,
  madeImage4,
  madeImage5,
  madeImage6,
];

const BILLING_PERIODS = ["monthly", "yearly"];

export default function PricingPage() {
  const [billingPeriod, setBillingPeriod] = useState("monthly");
  const [openFaq, setOpenFaq] = useState(null);

  const currentPlans = pricingPlans[billingPeriod];

  return (
    <div className="viz-scope min-h-screen w-full">
      <div className="mx-auto max-w-4xl px-4 pt-24 pb-16 sm:px-8 sm:pt-32 md:pt-36 md:pb-24">
        {/* Folio masthead */}
        <Reveal>
          <div className="flex items-baseline justify-between gap-4 pb-2">
            <p className="viz-label">Pricing</p>
            <p className="viz-label hidden sm:block">Plans · Billing</p>
          </div>
          <div className="relative pt-5">
            <span
              className="viz-rule absolute top-0 left-0 h-0.5 w-full bg-[var(--viz-ink)]"
              aria-hidden="true"
            />
            <span className="viz-dots-rule" aria-hidden="true" />
            <h1 className="viz-serif text-4xl leading-none sm:text-5xl">
              Pricing
            </h1>
            <p className="viz-serif mt-4 max-w-2xl text-lg italic text-[var(--viz-muted)] sm:text-xl">
              Step into the future of material sourcing.
            </p>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--viz-ink)]/85">
              Get access to AI-powered tools that help architects and interior
              designers discover materials faster, visualize ideas instantly,
              and generate project-ready details with ease.
            </p>
          </div>
        </Reveal>

        {/* Billing toggle — a typeset pair, the selected word inked */}
        <Reveal className="mt-10 sm:mt-12">
          <fieldset>
            <legend className="viz-label">Billing</legend>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
              {BILLING_PERIODS.map((period) => (
                <button
                  key={period}
                  type="button"
                  onClick={() => setBillingPeriod(period)}
                  aria-pressed={billingPeriod === period}
                  className={`viz-mono px-2 py-0.5 text-[11px] uppercase tracking-[0.08em] transition-colors ${
                    billingPeriod === period
                      ? "bg-[var(--viz-ink)] text-[var(--viz-paper)]"
                      : "text-[var(--viz-muted)] hover:text-[var(--viz-ink)]"
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
          </fieldset>
        </Reveal>

        {/* Plans */}
        <Reveal className="mt-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {currentPlans.map((plan) => (
              <div
                key={plan.name}
                className={`flex flex-col p-6 sm:p-7 ${
                  plan.featured
                    ? "rounded-2xl bg-[var(--viz-well)]"
                    : "viz-panel"
                }`}
              >
                <p
                  className={`viz-label ${plan.featured ? "text-stone-400" : ""}`}
                >
                  {plan.name}
                </p>
                <div className="mt-2 flex flex-wrap items-baseline gap-x-1.5">
                  <span
                    className={`viz-serif text-3xl ${
                      plan.featured ? "text-stone-100" : ""
                    }`}
                  >
                    {plan.price}
                  </span>
                  {plan.priceSubtext && (
                    <span
                      className={`viz-mono text-[11px] ${
                        plan.featured
                          ? "text-stone-400"
                          : "text-[var(--viz-muted)]"
                      }`}
                    >
                      {plan.priceSubtext}
                    </span>
                  )}
                </div>
                <ul className="mt-6 flex-grow space-y-2.5">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className={`flex gap-2 text-sm leading-relaxed ${
                        plan.featured
                          ? "text-stone-300"
                          : "text-[var(--viz-ink)]/85"
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`viz-mono ${
                          plan.featured
                            ? "text-stone-500"
                            : "text-[var(--viz-muted)]"
                        }`}
                      >
                        –
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className={`mt-8 rounded-full border py-2.5 text-center text-sm transition-colors ${
                    plan.featured
                      ? "border-stone-500 text-stone-100 hover:border-stone-300"
                      : "border-[var(--viz-ink)] text-[var(--viz-ink)] hover:bg-[var(--viz-ink)] hover:text-[var(--viz-paper)]"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </Reveal>

        {/* Questions about pricing */}
        <Reveal className="mt-14 sm:mt-20">
          <div className="border-t border-[var(--viz-line)] pt-2">
            <p className="viz-label">Questions</p>
          </div>
          <h2 className="viz-serif mt-4 text-2xl sm:text-3xl">
            Questions about pricing?
          </h2>
          <div className="mt-4">
            {faqItems.map((item, index) => (
              <div
                key={item.question}
                className="border-b border-[var(--viz-line)]"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  aria-expanded={openFaq === index}
                  className="flex w-full items-center justify-between gap-4 py-4 text-left transition-colors hover:text-[var(--viz-muted)]"
                >
                  <span className="text-sm sm:text-base">{item.question}</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    aria-hidden="true"
                    className={`h-4 w-4 flex-shrink-0 text-[var(--viz-muted)] transition-transform duration-200 ${
                      openFaq === index ? "rotate-180" : ""
                    }`}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                    />
                  </svg>
                </button>
                {openFaq === index && (
                  <p className="max-w-2xl pb-5 text-sm leading-relaxed text-[var(--viz-ink)]/80 sm:text-base">
                    {item.answer}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Reveal>

        {/* Made with DSource.AI */}
        <Reveal className="mt-14 sm:mt-20">
          <div className="border-t border-[var(--viz-line)] pt-2">
            <p className="viz-label">Gallery</p>
          </div>
          <h2 className="viz-serif mt-4 text-2xl sm:text-3xl">
            Made with DSource.AI
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--viz-muted)]">
            See how designers are using DSource.AI
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
            {galleryImages.map((image, index) => (
              <div
                key={image.src}
                className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-[var(--viz-line)]"
              >
                <Image
                  src={image}
                  alt={`Interior made with DSource.AI ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 50vw, 33vw"
                />
              </div>
            ))}
          </div>
        </Reveal>

        {/* Hand-off */}
        <Reveal className="mt-16 sm:mt-24">
          <div className="border-t border-[var(--viz-line)] pt-6">
            <p className="viz-serif text-xl italic text-[var(--viz-muted)]">
              Seven days on us. Bring a room.
            </p>
            <Link
              href="/signup"
              className="viz-mono mt-3 inline-block text-xs tracking-[0.08em] uppercase underline decoration-[var(--viz-line)] underline-offset-4 transition-colors hover:text-[var(--viz-blue)] hover:decoration-[var(--viz-blue)]"
            >
              Start your free trial →
            </Link>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
