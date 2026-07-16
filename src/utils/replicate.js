import Replicate from "replicate";
import { getReplicateToken } from "@/utils/env";

/**
 * Shared, lazily constructed Replicate client.
 *
 * Constructed on first call — not at module scope — so a missing
 * REPLICATE_API_TOKEN fails at first use with utils/env's clear message
 * instead of failing the build (CI builds with placeholder env) or
 * surfacing as an opaque Replicate auth error.
 *
 * useFileOutput: false → run() returns plain URL strings instead of
 * FileOutput streams, which callers can fetch and re-encode uniformly.
 */
let client;

export const getReplicateClient = () => {
  client ??= new Replicate({ auth: getReplicateToken(), useFileOutput: false });
  return client;
};
