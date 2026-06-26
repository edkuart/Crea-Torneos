/**
 * Limitador de intentos en memoria por proceso.
 *
 * Suficiente para frenar fuerza bruta de PIN en un despliegue de un solo
 * contenedor (Railway). No es un limite distribuido: si algun dia hay varias
 * instancias, conviene mover esto a la base de datos o a un store compartido.
 */

type AttemptBucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, AttemptBucket>();

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
};

/**
 * Registra un intento para `key` y devuelve si esta permitido. Cada llamada
 * cuenta como un intento dentro de la ventana de `windowMs`.
 */
let pruneCounter = 0;

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): RateLimitResult {
  if (++pruneCounter >= 100) {
    pruneCounter = 0;
    for (const [k, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(k);
    }
  }

  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterMs: 0 };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: existing.resetAt - now,
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: limit - existing.count,
    retryAfterMs: 0,
  };
}

/**
 * Limpia el contador de `key` (por ejemplo tras un intento exitoso) o todos los
 * contadores si no se pasa `key`.
 */
export function resetRateLimit(key?: string) {
  if (key) {
    buckets.delete(key);
    return;
  }

  buckets.clear();
}
