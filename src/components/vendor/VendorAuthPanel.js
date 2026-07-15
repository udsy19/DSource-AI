"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/utils/supabase/client";

const EMAIL_REDIRECT_FALLBACK = "/vendor";

const inputClasses =
  "w-full rounded-md border border-[var(--viz-line)] bg-[var(--viz-paper)] px-4 py-3 text-sm text-[var(--viz-ink)] placeholder:text-[var(--viz-muted)]";

const MODES = [
  { key: "signIn", label: "Sign in" },
  { key: "signUp", label: "Request access" },
];

export default function VendorAuthPanel() {
  const router = useRouter();
  const [mode, setMode] = useState("signIn");
  const [form, setForm] = useState({ email: "", password: "" });
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const supabase = createClient();

  const emailRedirect =
    typeof window !== "undefined"
      ? new URL(EMAIL_REDIRECT_FALLBACK, window.location.origin).toString()
      : EMAIL_REDIRECT_FALLBACK;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    try {
      const trimmedEmail = form.email.trim().toLowerCase();
      const parsedPassword = form.password.trim();

      if (!trimmedEmail || !parsedPassword) {
        setFeedback({
          type: "error",
          message: "Please provide both email and password.",
        });
        setSubmitting(false);
        return;
      }

      let response;
      if (mode === "signUp") {
        response = await supabase.auth.signUp({
          email: trimmedEmail,
          password: parsedPassword,
          options: {
            emailRedirectTo: emailRedirect,
            data: {
              user_type: "vendor",
            },
          },
        });
      } else {
        response = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password: parsedPassword,
        });
      }

      if (response.error) {
        throw response.error;
      }

      if (mode === "signUp") {
        setFeedback({
          type: "success",
          message:
            "Check your inbox to confirm the email address before logging in.",
        });
      } else {
        // After sign in, refresh the session to get updated user data
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user) {
          console.log("Session after login:", session.user);
          console.log("User metadata:", session.user.user_metadata);
          console.log("App metadata:", session.user.app_metadata);
        }
        router.refresh();
      }
    } catch (error) {
      setFeedback({
        type: "error",
        message: error?.message ?? "Something went wrong. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid w-full overflow-hidden rounded-2xl border border-[var(--viz-line)] bg-[var(--viz-paper)] shadow-xl lg:grid-cols-2">
      {/* The form side */}
      <div className="px-6 py-10 sm:px-10 sm:py-12">
        <p className="viz-label">Vendor access</p>
        <h1 className="viz-serif mt-3 text-3xl sm:text-4xl">
          {mode === "signIn"
            ? "The workshop office"
            : "Take a place on the shelf"}
        </h1>
        <p className="mt-3 text-sm text-[var(--viz-muted)]">
          Use your vendor email and password. New partners can request access —
          we&rsquo;ll send a confirmation link to verify the address.
        </p>

        <div className="mt-8 flex gap-6 border-b border-[var(--viz-line)]">
          {MODES.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setMode(item.key)}
              aria-pressed={mode === item.key}
              className={`viz-mono -mb-px cursor-pointer border-b-2 pb-3 text-xs uppercase tracking-[0.08em] transition-colors duration-200 ${
                mode === item.key
                  ? "border-[var(--viz-ink)] font-semibold text-[var(--viz-ink)]"
                  : "border-transparent text-[var(--viz-muted)] hover:text-[var(--viz-ink)]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="vendor-email" className="viz-label mb-2 block">
              Work email
            </label>
            <input
              id="vendor-email"
              name="email"
              value={form.email}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, email: event.target.value }))
              }
              className={inputClasses}
              placeholder="you@company.com"
              type="email"
              autoComplete="email"
              required
            />
          </div>
          <div>
            <label htmlFor="vendor-password" className="viz-label mb-2 block">
              Password
            </label>
            <input
              id="vendor-password"
              name="password"
              value={form.password}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, password: event.target.value }))
              }
              className={inputClasses}
              placeholder="Minimum 6 characters"
              type="password"
              autoComplete="current-password"
              minLength={6}
              required
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full cursor-pointer rounded-full bg-[var(--viz-ink)] px-4 py-3 text-sm font-semibold text-[var(--viz-paper)] transition-colors hover:bg-[var(--viz-well)] disabled:cursor-not-allowed disabled:bg-[var(--viz-line)] disabled:text-[var(--viz-muted)]"
          >
            {submitting
              ? "One moment…"
              : mode === "signIn"
                ? "Sign in"
                : "Request access"}
          </button>
        </form>

        {feedback && (
          <p
            className={`mt-4 rounded-md border px-4 py-3 text-sm ${
              feedback.type === "error"
                ? "border-red-300 bg-red-50 text-red-700"
                : "border-[var(--viz-blue)]/40 bg-[var(--viz-blue)]/5 text-[var(--viz-blue-deep)]"
            }`}
          >
            {feedback.message}
          </p>
        )}

        {mode === "signIn" && (
          <p className="mt-4 text-xs text-[var(--viz-muted)]">
            Need an account? Switch to &ldquo;Request access&rdquo; and
            we&rsquo;ll walk you through onboarding.
          </p>
        )}
      </div>

      {/* The office vignette */}
      <div className="relative hidden overflow-hidden bg-[var(--viz-well)] lg:block">
        <div
          className="viz-dots-light viz-dots-drift pointer-events-none absolute inset-0"
          aria-hidden="true"
        />
        <p className="viz-serif absolute bottom-8 left-8 max-w-[16rem] text-2xl italic text-stone-200">
          Your catalog, kept in order. <br />
          Every product on record.
        </p>
      </div>
    </div>
  );
}
