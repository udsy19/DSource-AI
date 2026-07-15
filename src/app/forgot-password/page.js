"use client";

import Link from "next/link";
import { useState } from "react";
import { mapAuthError, validateEmail } from "@/utils/auth-validation";
import { createClient } from "@/utils/supabase/client";

const inputClasses =
  "w-full rounded-md border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10";

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
      setFeedback({ type: "error", message: emailCheck.message });
      setSubmitting(false);
      return;
    }

    try {
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      // The recovery link lands on the callback route, which exchanges the code
      // for a session and forwards to /reset-password.
      await supabase.auth.resetPasswordForEmail(emailCheck.value, {
        redirectTo: `${origin}/auth/callback?next=/reset-password`,
      });
      // Always show the same message to avoid revealing whether an account exists.
      setFeedback({
        type: "success",
        message:
          "If an account exists for that email, we've sent a password reset link.",
      });
    } catch (error) {
      setFeedback({ type: "error", message: mapAuthError(error).message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-gray-200 bg-white/80 p-8 shadow-sm backdrop-blur-sm">
          <div className="mb-8 space-y-2">
            <h1 className="text-3xl font-semibold text-gray-900">
              Reset password
            </h1>
            <p className="text-sm text-gray-600">
              Enter your email and we&apos;ll send you a link to reset your
              password.
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
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={inputClasses}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {submitting ? "Sending..." : "Send reset link"}
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
            <Link
              href="/login"
              className="font-semibold text-gray-900 hover:underline"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
