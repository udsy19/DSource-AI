"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";

const EMAIL_REDIRECT_FALLBACK = "/";

export default function SignUpPage() {
  const router = useRouter();
  const supabase = createClient();
  const [form, setForm] = useState({ email: "", password: "", confirmPassword: "" });
  const [agreedToTerms, setAgreedToTerms] = useState(false);
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

      if (!agreedToTerms) {
        setFeedback({
          type: "error",
          message:
            "You must confirm you are 18 or older and agree to the Terms of Service and Privacy Policy.",
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
            terms_accepted_version: "1.0",
            terms_accepted_at: new Date().toISOString(),
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
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-gray-200 bg-white/80 p-8 shadow-sm backdrop-blur-sm">
          <div className="mb-8 space-y-2">
            <h1 className="text-3xl font-semibold text-gray-900">Sign Up</h1>
            <p className="text-sm text-gray-600">
              Create an account to get started
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm">
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
                className="w-full rounded-md border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-2 block text-sm">
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
                className="w-full rounded-md border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
                placeholder="Minimum 6 characters"
                autoComplete="new-password"
                minLength={6}
                required
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="mb-2 block text-sm">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))
                }
                className="w-full rounded-md border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
                placeholder="Confirm your password"
                autoComplete="new-password"
                minLength={6}
                required
              />
            </div>
            <label className="flex items-start gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(event) => setAgreedToTerms(event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-gray-900"
                required
              />
              <span>
                I am at least 18 years old and agree to the{" "}
                <Link
                  href="/terms"
                  target="_blank"
                  className="font-semibold text-gray-900 underline underline-offset-2"
                >
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link
                  href="/privacy"
                  target="_blank"
                  className="font-semibold text-gray-900 underline underline-offset-2"
                >
                  Privacy Policy
                </Link>
                .
              </span>
            </label>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {submitting ? "Creating account..." : "Sign Up"}
            </button>
          </form>

          {feedback && (
            <p
              className={`mt-4 rounded-lg px-4 py-3 text-sm ${
                feedback.type === "error"
                  ? "bg-red-50 text-red-700"
                  : "bg-green-50 text-green-700"
              }`}
            >
              {feedback.message}
            </p>
          )}

          <div className="mt-6 text-center text-sm">
            <p className="text-gray-600">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-gray-900 hover:underline">
                Sign in
              </Link>
            </p>
            <p className="mt-2 text-gray-600">
              Are you a vendor?{" "}
              <Link href="/vendor" className="font-semibold text-gray-900 hover:underline">
                Vendor Sign Up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

