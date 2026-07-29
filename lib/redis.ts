import { Redis } from "@upstash/redis";

let _redis: Redis | null = null;

export function getRedis(): Redis | null {
  if (_redis) return _redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null; // falls back to in-memory mock
  }

  _redis = new Redis({ 
    url, 
    token,
    // Disable Next.js aggressive fetch caching for Upstash API calls
    fetch: (input, init) => fetch(input, { ...init, cache: "no-store" })
  });
  return _redis;
}
