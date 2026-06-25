import { afterEach, describe, expect, it } from "vitest";
import { rateLimit, resetRateLimit } from "./rate-limit";

afterEach(() => {
  resetRateLimit();
});

describe("rateLimit", () => {
  it("permite intentos hasta alcanzar el limite", () => {
    const key = "torneo-a";
    const now = 1_000;

    expect(rateLimit(key, 3, 60_000, now).allowed).toBe(true);
    expect(rateLimit(key, 3, 60_000, now).allowed).toBe(true);
    expect(rateLimit(key, 3, 60_000, now).allowed).toBe(true);

    const blocked = rateLimit(key, 3, 60_000, now);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it("reinicia el conteo cuando pasa la ventana", () => {
    const key = "torneo-b";

    rateLimit(key, 2, 10_000, 0);
    rateLimit(key, 2, 10_000, 0);
    expect(rateLimit(key, 2, 10_000, 5_000).allowed).toBe(false);

    expect(rateLimit(key, 2, 10_000, 10_001).allowed).toBe(true);
  });

  it("separa los contadores por clave", () => {
    rateLimit("torneo-c", 1, 10_000, 0);
    expect(rateLimit("torneo-c", 1, 10_000, 0).allowed).toBe(false);
    expect(rateLimit("torneo-d", 1, 10_000, 0).allowed).toBe(true);
  });

  it("resetRateLimit limpia una clave puntual", () => {
    rateLimit("torneo-e", 1, 10_000, 0);
    expect(rateLimit("torneo-e", 1, 10_000, 0).allowed).toBe(false);

    resetRateLimit("torneo-e");
    expect(rateLimit("torneo-e", 1, 10_000, 0).allowed).toBe(true);
  });
});
