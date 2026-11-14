import twilio from "twilio";
import { readFileSync } from "fs";
import { join } from "path";

function readRequired(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}. Add it to .env.local or Vercel.`);
  return value;
}

export function getCallingConfig() {
  return {
    accountSid: readRequired("TWILIO_ACCOUNT_SID"),
    authToken: readRequired("TWILIO_AUTH_TOKEN"),
    fromNumber: readRequired("TWILIO_PHONE_NUMBER"),
    openAiApiKey: readRequired("OPENAI_API_KEY"),
    model: process.env.OPENAI_MODEL?.trim() || "gpt-5-mini",
  };
}

export function normalizeUsPhoneNumber(value: string) {
  const cleaned = value.trim().replace(/[\s().-]/g, "");
  if (/^\+[1-9]\d{7,14}$/.test(cleaned)) return cleaned;
  if (/^1\d{10}$/.test(cleaned)) return `+${cleaned}`;
  if (/^\d{10}$/.test(cleaned)) return `+1${cleaned}`;
  return null;
}

export function recipientIsAllowed(phoneNumber: string) {
  const allowed = (process.env.TWILIO_ALLOWED_RECIPIENTS ?? "")
    .split(",")
    .map(normalizeUsPhoneNumber)
    .filter((value): value is string => Boolean(value));
  return allowed.includes(phoneNumber);
}

export function getTestRecipient() {
  const configuredRecipient = process.env.TWILIO_TEST_RECIPIENT?.trim();
  return configuredRecipient ? normalizeUsPhoneNumber(configuredRecipient) : null;
}

export function getPublicBaseUrl(request: Request) {
  if (process.env.NODE_ENV !== "production") {
    try {
      const tunnelUrl = readFileSync(join(process.cwd(), ".tunnel-url"), "utf8").trim();
      const parsedUrl = new URL(tunnelUrl);
      if (parsedUrl.protocol === "https:" && parsedUrl.hostname.endsWith(".trycloudflare.com")) {
        return parsedUrl.origin;
      }
    } catch {
      // A tunnel is optional. Use APP_URL or the incoming request URL when absent.
    }
  }

  const configuredUrl = process.env.APP_URL?.trim();
  if (configuredUrl) return configuredUrl.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;

  const host = request.headers.get("x-forwarded-host");
  const protocol = request.headers.get("x-forwarded-proto");
  if (host) return `${protocol ?? "https"}://${host}`;
  return new URL(request.url).origin;
}

export function validateTwilioWebhook(request: Request, params: Record<string, string>) {
  const signature = request.headers.get("x-twilio-signature");
  if (!signature) return false;
  const { authToken } = getCallingConfig();
  return twilio.validateRequest(authToken, signature, request.url, params);
}
