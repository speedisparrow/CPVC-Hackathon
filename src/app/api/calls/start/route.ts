import { NextResponse } from "next/server";
import twilio from "twilio";
import {
  getCallingConfig,
  getPublicBaseUrl,
  normalizeUsPhoneNumber,
  recipientIsAllowed,
} from "@/lib/calling-config";
import { createCall, getPublicCall, setCallError, setTwilioCallSid } from "@/lib/calls";

function text(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const input = body as Record<string, unknown>;
    const restaurantId = text(input.restaurantId, 80);
    const restaurantName = text(input.restaurantName, 100);
    const requestedTime = text(input.requestedTime, 100);
    const phoneNumber = normalizeUsPhoneNumber(text(input.phoneNumber, 30));
    const partySize = Number(input.partySize);

    if (!restaurantId || !restaurantName || !requestedTime || !phoneNumber) {
      return NextResponse.json({ error: "Enter a restaurant, a valid phone number, and an arrival time." }, { status: 400 });
    }
    if (!Number.isInteger(partySize) || partySize < 1 || partySize > 20) {
      return NextResponse.json({ error: "Party size must be between 1 and 20." }, { status: 400 });
    }
    if (!recipientIsAllowed(phoneNumber)) {
      return NextResponse.json(
        {
          error:
            "This number is not on the allowed call list. Add it to TWILIO_ALLOWED_RECIPIENTS before testing.",
        },
        { status: 403 },
      );
    }

    const baseUrl = getPublicBaseUrl(request);
    if (baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1")) {
      return NextResponse.json(
        { error: "Twilio needs a public URL. Deploy to Vercel or set APP_URL to a tunnel URL for local testing." },
        { status: 400 },
      );
    }

    const record = createCall({ restaurantId, restaurantName, phoneNumber, partySize, requestedTime });
    const { accountSid, authToken, fromNumber } = getCallingConfig();
    const client = twilio(accountSid, authToken);
    const query = `callId=${encodeURIComponent(record.id)}`;

    try {
      const call = await client.calls.create({
        to: phoneNumber,
        from: fromNumber,
        url: `${baseUrl}/api/twilio/voice?${query}`,
        method: "POST",
        statusCallback: `${baseUrl}/api/twilio/status?${query}`,
        statusCallbackMethod: "POST",
        statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
      });
      setTwilioCallSid(record, call.sid);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Twilio could not start the call.";
      setCallError(record, message);
      return NextResponse.json({ error: message }, { status: 502 });
    }

    return NextResponse.json({ call: getPublicCall(record) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to start the call.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
