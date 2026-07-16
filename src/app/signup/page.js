"use client";

import Link from "next/link";
import { useState } from "react";
import AuthShell from "@/components/auth/AuthShell";
import { createClient } from "@/utils/supabase/client";

const EMAIL_REDIRECT_FALLBACK = "/";

export default function SignUpPage() {
  const supabase = createClient();
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

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
      const confirmPassword = form.confirmPassword.trim();

      if (!trimmedEmail || !parsedPassword) {
        setFeedback({
          type: "error",
          message: "Please provide both email and password.",
        });
        setSubmitting(false);
        return;
      }

      if (parsedPassword.length < 6) {
        setFeedback({
          type: "error",
          message: "Password must be at least 6 characters long.",
        });
        setSubmitting(false);
        return;
      }

      if (parsedPassword !== confirmPassword) {
        setFeedback({
          type: "error",
          message: "Passwords do not match.",
        });
        setSubmitting(false);
        return;
      }

      const response = await supabase.auth.signUp({
        email: trimmedEmail,
        password: parsedPassword,
        options: {
          emailRedirectTo: emailRedirect,
          data: {
            user_type: "user", // Set as regular user by default
          },
        },
      });

      if (response.error) {
        throw response.error;
      }

      setFeedback({
        type: "success",
        message:
          "Check your inbox to confirm your email address before signing in.",
      });
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
    <AuthShell
      eyebrow="Seven days on us"
      title="Set up your studio."
      lede="Bring a room — renders, boards, and drawings from day one. Every version kept."
      aside="Every room starts as a sketch."
      footer={
        <>
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-[var(--viz-ink)] hover:underline"
          >
            Sign in
          </Link>{" "}
          · Vendor?{" "}
          <Link
            href="/vendor"
            className="font-semibold text-[var(--viz-ink)] hover:underline"
          >
            Vendor sign up
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="viz-label">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={form.email}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, email: event.target.value }))
            }
            className="mt-1.5 w-full rounded-md border border-[var(--viz-line)] bg-white px-3 py-2.5 text-sm focus:border-[var(--viz-ink)] focus:outline-none"
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </div>
        <div>
          <label htmlFor="password" className="viz-label">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            value={form.password}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, password: event.target.value }))
            }
            className="mt-1.5 w-full rounded-md border border-[var(--viz-line)] bg-white px-3 py-2.5 text-sm focus:border-[var(--viz-ink)] focus:outline-none"
            placeholder="At least 6 characters"
            autoComplete="new-password"
            minLength={6}
            required
          />
        </div>
        <div>
          <label htmlFor="confirmPassword" className="viz-label">
            Confirm password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            value={form.confirmPassword}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                confirmPassword: event.target.value,
              }))
            }
            className="mt-1.5 w-full rounded-md border border-[var(--viz-line)] bg-white px-3 py-2.5 text-sm focus:border-[var(--viz-ink)] focus:outline-none"
            placeholder="Same password again"
            autoComplete="new-password"
            minLength={6}
            required
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="viz-btn mt-2 w-full cursor-pointer rounded-full bg-[var(--viz-ink)] px-4 py-3.5 text-[var(--viz-paper)] transition-colors hover:bg-black disabled:cursor-not-allowed disabled:bg-[var(--viz-line)] disabled:text-[var(--viz-muted)]"
        >
          {submitting ? "Setting up…" : "Create account"}
        </button>
      </form>

      {feedback && (
        <p
          className={
            feedback.type === "error"
              ? "mt-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700"
              : "mt-4 rounded-md border border-[var(--viz-blue)]/40 bg-[var(--viz-blue)]/5 p-3 text-sm text-[var(--viz-blue-deep)]"
          }
        >
          {feedback.message}
        </p>
      )}
    </AuthShell>
  );
}
