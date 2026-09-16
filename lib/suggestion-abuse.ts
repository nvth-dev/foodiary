import type { SuggestionInput } from "@/lib/suggestion-validation";

export const SUGGESTION_RATE_LIMIT_MAX = 3;
export const SUGGESTION_RATE_LIMIT_MINUTES = 15;
export const SUGGESTION_DAILY_LIMIT_MAX = 10;
export const SUGGESTION_DAILY_LIMIT_HOURS = 24;
export const SUGGESTION_DUPLICATE_HOURS = 24;
export const SUGGESTION_FORM_TOKEN_TTL_MINUTES = 15;

export type SuggestionAbuseContext = {
  fingerprint: string;
  messageHash: string;
};

export async function buildSuggestionAbuseContext(
  request: Request,
  input: SuggestionInput,
  secret: string | undefined,
): Promise<SuggestionAbuseContext> {
  const clientAddress = request.headers.get("cf-connecting-ip")?.trim()
    || request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim()
    || "unknown-client";
  const key = await importHmacKey(secret?.trim() || "foodblog-local-rate-limit");

  return {
    fingerprint: await hmacHex(key, `client:${clientAddress.slice(0, 160)}`),
    messageHash: await hmacHex(key, `message:${canonicalMessage(input.message)}`),
  };
}

export async function createSuggestionFormToken(secret: string | undefined): Promise<string> {
  const issuedAt = Math.floor(Date.now() / 1000);
  const nonce = base64UrlEncode(crypto.getRandomValues(new Uint8Array(18)));
  const payload = `v1.${issuedAt}.${nonce}`;
  const key = await importHmacKey(secret?.trim() || "foodblog-local-rate-limit");
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`form:${payload}`),
  );
  return `${payload}.${base64UrlEncode(new Uint8Array(signature))}`;
}

export async function validateSuggestionFormToken(
  token: string,
  secret: string | undefined,
): Promise<string | null> {
  const parts = token.trim().split(".");
  if (parts.length !== 4 || parts[0] !== "v1") return null;

  const issuedAt = Number(parts[1]);
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isSafeInteger(issuedAt)) return null;
  if (issuedAt > now + 60 || now - issuedAt > SUGGESTION_FORM_TOKEN_TTL_MINUTES * 60) return null;

  const signature = base64UrlDecode(parts[3]);
  if (!signature) return null;
  const payload = parts.slice(0, 3).join(".");
  const key = await importHmacKey(secret?.trim() || "foodblog-local-rate-limit");
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    signature,
    new TextEncoder().encode(`form:${payload}`),
  );
  return valid ? hashSuggestionFormToken(token.trim()) : null;
}

export async function hashSuggestionFormToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function canonicalMessage(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("vi")
    .replace(/\p{Cf}+/gu, "")
    .replace(/[\p{P}\p{S}]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function base64UrlEncode(value: Uint8Array): string {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  try {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (value.length % 4)) % 4);
    const binary = atob(padded);
    const decoded = new Uint8Array(new ArrayBuffer(binary.length));
    for (let index = 0; index < binary.length; index += 1) {
      decoded[index] = binary.charCodeAt(index);
    }
    return decoded;
  } catch {
    return null;
  }
}

async function hmacHex(key: CryptoKey, value: string): Promise<string> {
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
