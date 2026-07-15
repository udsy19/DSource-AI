"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  mapAuthError,
  safeNextPath,
  validateEmail,
} from "@/utils/auth-validation";
import { createClient } from "@/utils/supabase/client";

const inputClasses =
  "w-full rounded-md border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const redirectTo = safeNextPath(searchParams.get("redirect"), "/");

  const [form, setForm] = useState({ email: "", password: "" });
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [canResend, setCanResend] = useState(false);
  const [step, setStep] = useState("credentials"); // "credentials" | "mfa"
  const [mfa, setMfa] = useState({ factorId: null, code: "" });

  // Surface an error passed back from the auth callback route.
  useEffect(() => {
    const error = searchParams.get("error");
    if (error) setFeedback({ type: "error", message: error });
  }, [searchParams]);

  const completeLogin = () => {
    router.push(redirectTo);
    router.refresh();
  };

  const handleSignIn = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    setCanResend(false);

    const emailCheck = validateEmail(form.email);
    if (!emailCheck.valid) {
      setFeedback({ type: "error", message: emailCheck.message });
      setSubmitting(false);
      return;
    }
    if (!form.password) {
      setFeedback({ type: "error", message: "Please enter your password." });
      setSubmitting(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: emailCheck.value,
        password: form.password,
      });

      if (error) {
        const mapped = mapAuthError(error);
        if (mapped.code === "email_not_confirmed") setCanResend(true);
        setFeedback({ type: "error", message: mapped.message });
        setSubmitting(false);
        return;
      }

      // If MFA is enrolled, a second factor is required before the session is
      // fully elevated to aal2.
      const { data: aal } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal?.nextLevel === "aal2" && aal.nextLevel !== aal.currentLevel) {
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const totp = factors?.totp?.[0];
        if (totp) {
          setMfa({ factorId: totp.id, code: "" });
          setStep("mfa");
          setSubmitting(false);
          return;
        }
      }

      completeLogin();
    } catch (error) {
      setFeedback({ type: "error", message: mapAuthError(error).message });
      setSubmitting(false);
    }
  };

  const handleVerifyMfa = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: mfa.factorId,
        code: mfa.code.trim(),
      });
      if (error) {
        setFeedback({
          type: "error",
          message: "That code is incorrect or expired. Try again.",
        });
        setSubmitting(false);
        return;
      }
      completeLogin();
    } catch (error) {
      setFeedback({ type: "error", message: mapAuthError(error).message });
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    const emailCheck = validateEmail(form.email);
    if (!emailCheck.valid) return;
    setFeedback(null);
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: emailCheck.value,
      options: { emailRedirectTo: `${origin}/auth/callback?next=/` },
    });
    setFeedback(
      error
        ? { type: "error", message: mapAuthError(error).message }
        : {
            type: "success",
            message: "Confirmation email sent. Check your inbox.",
          },
    );
    setCanResend(false);
  };

  const handleGoogle = async () => {
    setFeedback(null);
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
      },
    });
    if (error)
      setFeedback({ type: "error", message: mapAuthError(error).message });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-gray-200 bg-white/80 p-8 shadow-sm backdrop-blur-sm">
          {step === "mfa" ? (
            <>
              <div className="mb-8 space-y-2">
                <h1 className="text-3xl font-semibold text-gray-900">
                  Two-factor
                </h1>
                <p className="text-sm text-gray-600">
                  Enter the 6-digit code from your authenticator app.
                </p>
              </div>
              <form onSubmit={handleVerifyMfa} className="space-y-4">
                <input
                  id="mfa-code"
                  name="mfa-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={mfa.code}
                  onChange={(event) =>
                    setMfa((prev) => ({ ...prev, code: event.target.value }))
                  }
                  className={`${inputClasses} tracking-[0.5em] text-center`}
                  placeholder="000000"
                  maxLength={6}
                  required
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-md bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-gray-400"
                >
                  {submitting ? "Verifying..." : "Verify"}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="mb-8 space-y-2">
                <h1 className="text-3xl font-semibold text-gray-900">
                  Sign In
                </h1>
                <p className="text-sm text-gray-600">
                  Sign in to your account to continue
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

              <form onSubmit={handleSignIn} className="space-y-4">
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
                      setForm((prev) => ({
                        ...prev,
                        email: event.target.value,
                      }))
                    }
                    className={inputClasses}
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                  />
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label htmlFor="password" className="block text-sm">
                      Password
                    </label>
                    <Link
                      href="/forgot-password"
                      className="text-xs font-medium text-gray-500 hover:text-gray-900 hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
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
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-md bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-gray-400"
                >
                  {submitting ? "Signing in..." : "Sign In"}
                </button>
              </form>
            </>
          )}

          {feedback && (
            <div
              className={`mt-4 rounded-lg px-4 py-3 text-sm ${
                feedback.type === "error"
                  ? "bg-red-50 text-red-700"
                  : "bg-green-50 text-green-700"
              }`}
              role={feedback.type === "error" ? "alert" : "status"}
            >
              <p>{feedback.message}</p>
              {canResend && (
                <button
                  type="button"
                  onClick={handleResend}
                  className="mt-2 font-semibold underline"
                >
                  Resend confirmation email
                </button>
              )}
            </div>
          )}

          {step === "credentials" && (
            <div className="mt-6 text-center text-sm">
              <p className="text-gray-600">
                Don&apos;t have an account?{" "}
                <Link
                  href="/signup"
                  className="font-semibold text-gray-900 hover:underline"
                >
                  Sign up
                </Link>
              </p>
              <p className="mt-2 text-gray-600">
                Are you a vendor?{" "}
                <Link
                  href="/vendor"
                  className="font-semibold text-gray-900 hover:underline"
                >
                  Vendor Login
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
