const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

type TurnstileVerificationResponse = {
  success?: boolean;
};

export async function verifyTurnstileToken(
  token: string,
  request: Request,
  secret: string | undefined,
): Promise<boolean> {
  const normalizedSecret = secret?.trim();
  const normalizedToken = token.trim();
  if (!normalizedSecret || !normalizedToken) return false;

  const body = new FormData();
  body.append("secret", normalizedSecret);
  body.append("response", normalizedToken);
  const clientAddress = request.headers.get("cf-connecting-ip")?.trim();
  if (clientAddress) body.append("remoteip", clientAddress);

  try {
    const response = await fetch(TURNSTILE_VERIFY_URL, { method: "POST", body });
    if (!response.ok) return false;
    const result = await response.json() as TurnstileVerificationResponse;
    return result.success === true;
  } catch {
    return false;
  }
}
