const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

export function hasUpstash() {
  return Boolean(url && token);
}

export async function redisGet<T>(key: string, fallback: T): Promise<T> {
  if (!hasUpstash()) return fallback;
  try {
    const data = await redisCommand<unknown>(["GET", key]);
    if (typeof data !== "string") return fallback;
    return JSON.parse(data) as T;
  } catch {
    return fallback;
  }
}

export async function redisSetJson<T>(key: string, value: T) {
  if (!hasUpstash()) return false;
  await redisCommand(["SET", key, JSON.stringify(value)]);
  return true;
}

async function redisCommand<T>(command: unknown[]): Promise<T> {
  if (!url || !token) throw new Error("Upstash is not configured");
  const response = await fetch(`${url.replace(/\/$/, "")}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify([command])
  });
  const data = (await response.json().catch(() => [])) as Array<{ result?: T; error?: string }>;
  const first = data[0];
  if (!response.ok || first?.error) {
    throw new Error(first?.error ?? response.statusText);
  }
  return first?.result as T;
}
