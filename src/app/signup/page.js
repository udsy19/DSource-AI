"use client";

import Link from "next/link";
import { useState } from "react";
import AuthShell from "@/components/auth/AuthShell";
import { PASSWORD_MIN_LENGTH, validatePassword } from "@/utils/auth-validation";
import { createClient } from "@/utils/supabase/client";

// Confirmation emails land on the OTP confirm route, which reads `next` and
// sends the freshly confirmed user into the studio.
const EMAIL_REDIRECT_FALLBACK = "/auth/confirm?next=/studio";

// Client-side UX gate only — a DB trigger enforces the allowlist server-side.
// Unset means signup stays open.
const ALLOWED_DOMAINS = (process.env.NEXT_PUBLIC_SIGNUP_ALLOWED_DOMAINS ?? "")
  .split(",")
  .map((domain) => domain.trim().toLowerCase())
  .filter(Boolean);

const INVITE_ONLY_MESSAGE =
  "DSource is currently invite-only. Ask an admin to add your email.";

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

      const emailDomain = trimmedEmail.split("@")[1] ?? "";
      if (
        ALLOWED_DOMAINS.length > 0 &&
        !ALLOWED_DOMAINS.includes(emailDomain)
      ) {
        setFeedback({ type: "error", message: INVITE_ONLY_MESSAGE });
        setSubmitting(false);
        return;
      }

      const passwordCheck = validatePassword(parsedPassword);
      if (!passwordCheck.valid) {
        setFeedback({
          type: "error",
          message: passwordCheck.message,
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
      // The DB trigger rejects non-allowlisted emails that bypass the client
      // gate; surface the same friendly invite-only message.
      const raw = (error?.message ?? "").toLowerCase();
      const rejectedByAllowlist =
        raw.includes("not allowed") ||
        raw.includes("database error saving new user");
      setFeedback({
        type: "error",
        message: rejectedByAllowlist
          ? INVITE_ONLY_MESSAGE
          : (error?.message ?? "Something went wrong. Please try again."),
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
            placeholder={`At least ${PASSWORD_MIN_LENGTH} characters, with a letter and a number`}
            autoComplete="new-password"
            minLength={PASSWORD_MIN_LENGTH}
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
            minLength={PASSWORD_MIN_LENGTH}
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
