import { AsyncLocalStorage } from "node:async_hooks";
import { after } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";

/**
 * Records EVERY model invocation (Gemini + Replicate) for the admin AI monitor.
 *
 * A request establishes a log context via startAiLog() at the top of an AI
 * route. Because AsyncLocalStorage propagates through the async call tree, every
 * callWithRetry / generateContentWithResilience call — however deep in the
 * visualizer util chain — records into that context. The batched rows are
 * flushed to `ai_calls` via a service-role client inside after() (runs after the
 * response is sent, so logging never adds latency and completes reliably in
 * serverless).
 */
const aiLogStore = new AsyncLocalStorage();

/** Record a single model call into the current request's log (no-op if none). */
export function recordAiCall(entry) {
  const store = aiLogStore.getStore();
  if (!store) return;
  store.calls.push({
    route: store.route ?? null,
    label: entry.label ?? null,
    provider: entry.provider ?? null,
    model: entry.model ?? null,
    operation: entry.operation ?? null,
    status: entry.status ?? "success",
    error: entry.error ? String(entry.error).slice(0, 300) : null,
    latency_ms: entry.latencyMs ?? null,
  });
}

async function flushAiCalls(store) {
  if (!store.calls.length) return;
  try {
    const admin = createAdminClient();
    await admin
      .from("ai_calls")
      .insert(
        store.calls.map((c) => ({ ...c, user_id: store.userId ?? null })),
      );
  } catch {
    console.error("ai-log: flush failed");
  }
}

/**
 * Begin AI-call logging for the current request. Call at the very top of any
 * route that may invoke a model. Returns the mutable store so the route can set
 * `.userId` once authenticated. Uses enterWith so no handler-body wrapping is
 * needed, and schedules the flush via after().
 */
export function startAiLog(route) {
  const store = { route, userId: null, calls: [] };
  aiLogStore.enterWith(store);
  after(() => flushAiCalls(store));
  return store;
}
