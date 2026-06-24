import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const keyLength = 64;

export function createSecretToken() {
  return randomBytes(32).toString("base64url");
}

export function hashSecret(value: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(value, salt, keyLength).toString("hex");

  return `${salt}:${hash}`;
}

export function verifySecret(value: string, stored: string) {
  const [salt, hash] = stored.split(":");

  if (!salt || !hash) {
    return false;
  }

  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(value, salt, keyLength);

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function hashToken(token: string) {
  return hashSecret(token);
}

export function verifyToken(token: string, storedHash: string) {
  return verifySecret(token, storedHash);
}

