"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { mapAuthError, validateEmail } from "@/utils/auth-validation";
import { createClient } from "@/utils/supabase/client";

const EMAIL_REDIRECT_FALLBACK = "/vendor";

const inputClasses =
  "w-full rounded-md border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10";

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
      const emailCheck = validateEmail(form.email);
      if (!emailCheck.valid) {
        setFeedback({ type: "error", message: emailCheck.message });
        setSubmitting(false);
        return;
      }
      const trimmedEmail = emailCheck.value;
      const parsedPassword = form.password;

      if (!parsedPassword) {
        setFeedback({ type: "error", message: "Please enter your password." });
        setSubmitting(false);
        return;
      }

      let response;
      if (mode === "signUp") {
        // A self-service signup must NOT grant the vendor role. Roles are read
        // only from app_metadata, which is not settable from the client. An
        // admin grants vendor access via /api/admin/grant-role after review.
        response = await supabase.auth.signUp({
          email: trimmedEmail,
          password: parsedPassword,
          options: {
            emailRedirectTo: `${emailRedirect}`,
          },
        });
      } else {
        response = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password: parsedPassword,
        });
      }

      if (response.error) {
        setFeedback({
          type: "error",
          message: mapAuthError(response.error).message,
        });
        setSubmitting(false);
        return;
      }

      if (mode === "signUp") {
        setFeedback({
          type: "success",
          message:
            "Thanks for registering. Confirm your email, then an administrator will review your request and provision vendor access before you can upload products.",
        });
      } else {
        router.refresh();
      }
    } catch (error) {
      setFeedback({ type: "error", message: mapAuthError(error).message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white/80 p-8 shadow-sm backdrop-blur-sm">
      <div className="mb-8 space-y-2">
        <p className="text-sm uppercase tracking-[0.3em] text-gray-500">
          Vendor Access
        </p>
        <h1 className="text-3xl font-semibold text-gray-900">
          {mode === "signIn" ? "Sign in to upload products" : "Request access"}
        </h1>
        <p className="text-sm text-gray-600">
          Use your vendor email credentials to sign in. New partners can
          register below, but vendor access is provisioned by an
          administrator—signing up creates an account only and does not grant
          vendor permissions.
        </p>
      </div>

      <div className="mb-6 flex gap-2 rounded-xl bg-gray-100 p-1 text-sm font-medium">
        <button
          type="button"
          onClick={() => setMode("signIn")}
          className={`flex-1 rounded-lg px-4 py-2 transition ${
            mode === "signIn"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500"
          }`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => setMode("signUp")}
          className={`flex-1 rounded-lg px-4 py-2 transition ${
            mode === "signUp"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500"
          }`}
        >
          Request access
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="vendor-email" className="mb-2 block text-sm">
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
          <label htmlFor="vendor-password" className="mb-2 block text-sm">
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
          className="w-full rounded-md bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          {submitting
            ? "Processing..."
            : mode === "signIn"
              ? "Sign in"
              : "Request access"}
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

      {mode === "signIn" && (
        <>
          <p className="mt-4 text-xs text-gray-500">
            Need an account? Switch to &ldquo;Request access&rdquo; to register.
            An administrator will provision vendor access after reviewing your
            request.
          </p>
          <p className="mt-2 text-xs">
            <Link
              href="/forgot-password"
              className="font-medium text-gray-500 hover:text-gray-900 hover:underline"
            >
              Forgot your password?
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
