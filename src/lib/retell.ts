import type { CallResult, CallStatus } from "@/lib/calls";
import { normalizeUsPhoneNumber } from "@/lib/calling-config";

const RETELL_API_URL = "https://api.retellai.com";

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}. Add it to .env.local.`);
  return value;
}

function config() {
  return {
    apiKey: required("RETELL_API_KEY"),
    fromNumber: required("RETELL_FROM_NUMBER"),
  };
}

export function getRetellTestRecipient() {
  const value = process.env.RETELL_TEST_RECIPIENT?.trim();
  return value ? normalizeUsPhoneNumber(value) : null;
}

type RetellCall = {
  call_id?: string;
  call_status?: string;
  call_analysis?: { call_summary?: string | null } | null;
};

async function retellRequest(path: string, init?: RequestInit) {
  const { apiKey } = config();
  const response = await fetch(`${RETELL_API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });
  const data = (await response.json()) as RetellCall & { message?: string; detail?: string };
  if (!response.ok) throw new Error(data.message || data.detail || "Retell could not process the call.");
  return data;
}

export async function createRetellPhoneCall(toNumber: string) {
  const { fromNumber } = config();
  const call = await retellRequest("/v2/create-phone-call", {
    method: "POST",
    body: JSON.stringify({ from_number: fromNumber, to_number: toNumber }),
  });
  if (!call.call_id) throw new Error("Retell did not return a call ID.");
  return call;
}

export async function getRetellPhoneCall(callId: string) {
  return retellRequest(`/v2/get-call/${encodeURIComponent(callId)}`);
}

export function toCallStatus(value: string | undefined): CallStatus {
  switch (value?.toLowerCase()) {
    case "registered":
    case "not_connected":
      return "queued";
    case "ongoing":
      return "in-progress";
    case "ended":
      return "completed";
    case "error":
      return "failed";
    default:
      return "queued";
  }
}

export function toCallResult(call: RetellCall): CallResult | null {
  if (call.call_status?.toLowerCase() !== "ended") return null;
  return {
    availability: "unknown",
    waitMinutes: null,
    notes: call.call_analysis?.call_summary || "Retell call completed. Review the Retell dashboard for its transcript and analysis.",
    needsHumanConfirmation: true,
  };
}
