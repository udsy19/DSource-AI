"use client";

import Link from "next/link";
import { useState } from "react";
import {
  getPasswordStrength,
  mapAuthError,
  validateEmail,
  validatePassword,
} from "@/utils/auth-validation";
import { createClient } from "@/utils/supabase/client";

const inputClasses =
  "w-full rounded-md border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10";

export default function SignUpPage() {
  const supabase = createClient();
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const strength = getPasswordStrength(form.password);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    const emailCheck = validateEmail(form.email);
    if (!emailCheck.valid) {
      setFeedback({ type: "error", message: emailCheck.message });
      setSubmitting(false);
      return;
    }

    const passwordCheck = validatePassword(form.password);
    if (!passwordCheck.valid) {
      setFeedback({ type: "error", message: passwordCheck.message });
      setSubmitting(false);
      return;
    }

    if (form.password !== form.confirmPassword) {
      setFeedback({ type: "error", message: "Passwords do not match." });
      setSubmitting(false);
      return;
    }

    try {
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const { error } = await supabase.auth.signUp({
        email: emailCheck.value,
        password: passwordCheck.value,
        options: {
          emailRedirectTo: `${origin}/auth/callback?next=/`,
          // Cosmetic only — role authorization is derived exclusively from
          // app_metadata (service-role controlled); user_metadata is never trusted.
          data: { user_type: "user" },
        },
      });

      if (error) {
        setFeedback({ type: "error", message: mapAuthError(error).message });
        setSubmitting(false);
        return;
      }

      setFeedback({
        type: "success",
        message:
          "Check your inbox to confirm your email address before signing in.",
      });
    } catch (error) {
      setFeedback({ type: "error", message: mapAuthError(error).message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setFeedback(null);
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${origin}/auth/callback?next=/` },
    });
    if (error)
      setFeedback({ type: "error", message: mapAuthError(error).message });
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

          <button
            type="button"
            onClick={handleGoogle}
            className="mb-4 flex w-full items-center justify-center gap-2 rounded-md border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 transition hover:bg-gray-50"
          >
            Continue with Google
          </button>

          <div className="mb-4 flex items-center gap-3 text-xs text-gray-400">
            <span className="h-px flex-1 bg-gray-200" />
            or
            <span className="h-px flex-1 bg-gray-200" />
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
                className={inputClasses}
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
                className={inputClasses}
                placeholder="At least 8 characters, with a letter and a number"
                autoComplete="new-password"
                minLength={8}
                required
              />
              {form.password && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1 flex-1 rounded-full bg-gray-100">
                    <div
                      className={`h-1 rounded-full transition-all ${
                        strength.score >= 3
                          ? "bg-green-500"
                          : strength.score === 2
                            ? "bg-yellow-500"
                            : "bg-red-400"
                      }`}
                      style={{ width: `${(strength.score / 4) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500">
                    {strength.label}
                  </span>
                </div>
              )}
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
                  setForm((prev) => ({
                    ...prev,
                    confirmPassword: event.target.value,
                  }))
                }
                className={inputClasses}
                placeholder="Confirm your password"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>
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
              role={feedback.type === "error" ? "alert" : "status"}
            >
              {feedback.message}
            </p>
          )}

          <div className="mt-6 text-center text-sm">
            <p className="text-gray-600">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-semibold text-gray-900 hover:underline"
              >
                Sign in
              </Link>
            </p>
            <p className="mt-2 text-gray-600">
              Are you a vendor?{" "}
              <Link
                href="/vendor"
                className="font-semibold text-gray-900 hover:underline"
              >
                Vendor Sign Up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
