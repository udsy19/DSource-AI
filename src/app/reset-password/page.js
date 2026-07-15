"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { mapAuthError, validatePassword } from "@/utils/auth-validation";
import { createClient } from "@/utils/supabase/client";

const inputClasses =
  "w-full rounded-md border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [hasSession, setHasSession] = useState(null); // null = checking

  // A valid recovery session must already be established (via the email link →
  // /auth/callback). Without it, updateUser cannot change the password.
  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active) setHasSession(!!data?.user);
    });
    return () => {
      active = false;
    };
  }, [supabase.auth]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setFeedback(null);

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
      const { error } = await supabase.auth.updateUser({
        password: passwordCheck.value,
      });
      if (error) {
        setFeedback({ type: "error", message: mapAuthError(error).message });
        setSubmitting(false);
        return;
      }
      setFeedback({
        type: "success",
        message: "Your password has been updated. Redirecting to sign in...",
      });
      setTimeout(() => {
        router.push("/login");
        router.refresh();
      }, 1500);
    } catch (error) {
      setFeedback({ type: "error", message: mapAuthError(error).message });
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-gray-200 bg-white/80 p-8 shadow-sm backdrop-blur-sm">
          <div className="mb-8 space-y-2">
            <h1 className="text-3xl font-semibold text-gray-900">
              Set a new password
            </h1>
            <p className="text-sm text-gray-600">
              Choose a strong password for your account.
            </p>
          </div>

          {hasSession === false ? (
            <div
              className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
              role="alert"
            >
              This reset link is invalid or has expired. Please{" "}
              <Link href="/forgot-password" className="font-semibold underline">
                request a new one
              </Link>
              .
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="password" className="mb-2 block text-sm">
                  New password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      password: event.target.value,
                    }))
                  }
                  className={inputClasses}
                  placeholder="At least 8 characters, with a letter and a number"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="mb-2 block text-sm">
                  Confirm new password
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
                disabled={submitting || hasSession === null}
                className="w-full rounded-md bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                {submitting ? "Updating..." : "Update password"}
              </button>
            </form>
          )}

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
        </div>
      </div>
    </div>
  );
}
