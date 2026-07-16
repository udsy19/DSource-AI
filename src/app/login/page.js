"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import AuthShell from "@/components/auth/AuthShell";
import { safeNextPath } from "@/utils/auth-validation";
import { createClient } from "@/utils/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [form, setForm] = useState({ email: "", password: "" });
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // The auth routes (/auth/callback, /auth/confirm) land here with ?error=
  // when a link is invalid or expired — surface it in the standard error box.
  const errorParam = searchParams.get("error");
  useEffect(() => {
    if (errorParam) {
      setFeedback({ type: "error", message: errorParam });
    }
  }, [errorParam]);

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

      const response = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: parsedPassword,
      });

      if (response.error) {
        throw response.error;
      }

      // Return the user where they were headed (middleware sets ?redirect=);
      // otherwise the studio is the signed-in front door.
      router.push(safeNextPath(searchParams.get("redirect"), "/studio"));
      router.refresh();
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
      eyebrow="The studio"
      title="Welcome back."
      lede="Your versions are where you left them — pick up the room mid-thought."
      aside="The room you imagined is still here."
      footer={
        <>
          New here?{" "}
          <Link
            href="/signup"
            className="font-semibold text-[var(--viz-ink)] hover:underline"
          >
            Create an account
          </Link>{" "}
          · Vendor?{" "}
          <Link
            href="/vendor"
            className="font-semibold text-[var(--viz-ink)] hover:underline"
          >
            Vendor login
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
            placeholder="Your password"
            autoComplete="current-password"
            minLength={6}
            required
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="viz-btn mt-2 w-full cursor-pointer rounded-full bg-[var(--viz-ink)] px-4 py-3.5 text-[var(--viz-paper)] transition-colors hover:bg-black disabled:cursor-not-allowed disabled:bg-[var(--viz-line)] disabled:text-[var(--viz-muted)]"
        >
          {submitting ? "Signing in…" : "Sign in"}
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

// useSearchParams requires a Suspense boundary for prerendering.
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
