"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/utils/supabase/client";

const inputClasses =
  "w-full rounded-md border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10";

export default function AccountSecurityPage() {
  const router = useRouter();
  const supabase = createClient();
  const { user, loading: authLoading } = useAuth();

  const [factors, setFactors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);
  const [enrolling, setEnrolling] = useState(null); // { factorId, qrCode, secret }
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  // Client-side guard (middleware also protects /account).
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login?redirect=/account/security");
    }
  }, [authLoading, user, router]);

  const loadFactors = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (!error) setFactors(data?.totp ?? []);
    setLoading(false);
  }, [supabase.auth]);

  useEffect(() => {
    if (user) loadFactors();
  }, [user, loadFactors]);

  const startEnroll = async () => {
    setFeedback(null);
    setBusy(true);
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
    });
    setBusy(false);
    if (error) {
      setFeedback({
        type: "error",
        message: "Could not start MFA enrollment. Try again.",
      });
      return;
    }
    setEnrolling({
      factorId: data.id,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
    });
    setCode("");
  };

  const cancelEnroll = async () => {
    if (enrolling?.factorId) {
      await supabase.auth.mfa.unenroll({ factorId: enrolling.factorId });
    }
    setEnrolling(null);
    setCode("");
    loadFactors();
  };

  const verifyEnroll = async (event) => {
    event.preventDefault();
    setBusy(true);
    setFeedback(null);
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: enrolling.factorId,
      code: code.trim(),
    });
    setBusy(false);
    if (error) {
      setFeedback({
        type: "error",
        message: "That code is incorrect or expired. Try again.",
      });
      return;
    }
    setEnrolling(null);
    setCode("");
    setFeedback({
      type: "success",
      message: "Two-factor authentication is now enabled.",
    });
    loadFactors();
  };

  const removeFactor = async (factorId) => {
    setBusy(true);
    setFeedback(null);
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    setBusy(false);
    if (error) {
      setFeedback({ type: "error", message: "Could not remove that factor." });
      return;
    }
    setFeedback({
      type: "success",
      message: "Two-factor authentication removed.",
    });
    loadFactors();
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen px-4 py-16 text-center text-sm text-gray-500">
        Loading…
      </div>
    );
  }

  const verifiedFactors = factors.filter((f) => f.status === "verified");

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-16">
      <h1 className="text-3xl font-semibold text-gray-900">Security</h1>
      <p className="mt-2 text-sm text-gray-600">
        Add two-factor authentication for an extra layer of account protection.
      </p>

      <section className="mt-8 rounded-2xl border border-gray-200 bg-white/80 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">
          Two-factor authentication (TOTP)
        </h2>

        {loading
          ? <p className="mt-4 text-sm text-gray-500">Loading…</p>
          : enrolling
            ? <div className="mt-6 space-y-4">
                <p className="text-sm text-gray-600">
                  Scan this QR code with an authenticator app (Google
                  Authenticator, 1Password, Authy), then enter the 6-digit code
                  to confirm.
                </p>
                {/* qr_code is a self-contained SVG data URI from Supabase; next/image adds no value for inline data URIs. */}
                {/* biome-ignore lint/performance/noImgElement: inline SVG data URI, not a remote asset */}
                <img
                  src={enrolling.qrCode}
                  alt="Two-factor authentication QR code"
                  className="h-44 w-44 rounded-lg border border-gray-200 bg-white p-2"
                />
                <p className="break-all text-xs text-gray-500">
                  Or enter this secret manually:{" "}
                  <span className="font-mono">{enrolling.secret}</span>
                </p>
                <form
                  onSubmit={verifyEnroll}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    className={`${inputClasses} max-w-[10rem] tracking-[0.4em] text-center`}
                    placeholder="000000"
                    maxLength={6}
                    required
                  />
                  <button
                    type="submit"
                    disabled={busy}
                    className="rounded-md bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:bg-gray-400"
                  >
                    {busy ? "Verifying…" : "Verify"}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEnroll}
                    className="rounded-md border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </form>
              </div>
            : verifiedFactors.length > 0
              ? <div className="mt-6 space-y-3">
                  <p className="text-sm text-green-700">
                    Two-factor authentication is enabled.
                  </p>
                  {verifiedFactors.map((factor) => (
                    <div
                      key={factor.id}
                      className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3"
                    >
                      <span className="text-sm text-gray-700">
                        {factor.friendly_name || "Authenticator app"}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFactor(factor.id)}
                        disabled={busy}
                        className="text-sm font-semibold text-red-600 hover:underline disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              : <div className="mt-6">
                  <button
                    type="button"
                    onClick={startEnroll}
                    disabled={busy}
                    className="rounded-md bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:bg-gray-400"
                  >
                    {busy ? "Starting…" : "Enable two-factor authentication"}
                  </button>
                </div>}

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
      </section>
    </div>
  );
}
