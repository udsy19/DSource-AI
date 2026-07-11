"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [form, setForm] = useState({ email: "", password: "" });
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

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

      // Redirect to home page after successful login
      router.push("/");
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
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-gray-200 bg-white/80 p-8 shadow-sm backdrop-blur-sm">
          <div className="mb-8 space-y-2">
            <h1 className="text-3xl font-semibold text-gray-900">Sign In</h1>
            <p className="text-sm text-gray-600">
              Sign in to your account to continue
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
                placeholder="Enter your password"
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
              {submitting ? "Signing in..." : "Sign In"}
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
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="font-semibold text-gray-900 hover:underline">
                Sign up
              </Link>
            </p>
            <p className="mt-2 text-gray-600">
              Are you a vendor?{" "}
              <Link href="/vendor" className="font-semibold text-gray-900 hover:underline">
                Vendor Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

