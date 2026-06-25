const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function normalizePublicCode(value: string) {
  return value.trim().toUpperCase();
}

export function createPublicCode() {
  let suffix = "";

  for (let index = 0; index < 5; index += 1) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  return `CT-${suffix}`;
}

export function organizerCookieName(publicCode: string) {
  return `ct_org_${normalizePublicCode(publicCode).toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
}

export function organizerCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  } as const;
}

