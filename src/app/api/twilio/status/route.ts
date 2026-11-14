import { NextResponse } from "next/server";
import { validateTwilioWebhook } from "@/lib/calling-config";
import { getCall, setCallStatus } from "@/lib/calls";

const supportedStatuses = new Set([
  "queued",
  "ringing",
  "in-progress",
  "completed",
  "busy",
  "failed",
  "no-answer",
  "canceled",
]);

export async function POST(request: Request) {
  const formData = await request.formData();
  const params = Object.fromEntries(
    [...formData.entries()].map(([key, value]) => [key, String(value)]),
  );
  if (!validateTwilioWebhook(request, params)) {
    return new NextResponse("Invalid Twilio signature.", { status: 403 });
  }

  const callId = new URL(request.url).searchParams.get("callId");
  const record = callId ? getCall(callId) : null;
  const status = params.CallStatus;
  if (record && status && supportedStatuses.has(status)) {
    setCallStatus(record, status as Parameters<typeof setCallStatus>[1]);
  }
  return new NextResponse(null, { status: 204 });
}
