import { NextResponse } from "next/server";
import {
  normalizeUsPhoneNumber,
} from "@/lib/calling-config";
import { createCall, getPublicCall, setCallError, setProviderCallId, setCallStatus } from "@/lib/calls";
import { createRetellPhoneCall, getRetellTestRecipient, toCallStatus } from "@/lib/retell";

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
    const selectedPhoneNumber = normalizeUsPhoneNumber(text(input.phoneNumber, 30));
    const useTestRecipient = input.useTestRecipient === true;
    const testRecipient = useTestRecipient ? getRetellTestRecipient() : null;
    const phoneNumber = testRecipient ?? selectedPhoneNumber;
    const partySize = Number(input.partySize);

    if (!restaurantId || !restaurantName || !requestedTime || !phoneNumber) {
      return NextResponse.json({ error: "Enter a restaurant, a valid phone number, and an arrival time." }, { status: 400 });
    }
    if (useTestRecipient && !testRecipient) {
      return NextResponse.json(
        { error: "Missing RETELL_TEST_RECIPIENT in the server environment." },
        { status: 500 },
      );
    }
    if (!Number.isInteger(partySize) || partySize < 1 || partySize > 20) {
      return NextResponse.json({ error: "Party size must be between 1 and 20." }, { status: 400 });
    }
    const record = createCall({ restaurantId, restaurantName, phoneNumber, partySize, requestedTime });

    try {
      const call = await createRetellPhoneCall(phoneNumber);
      setProviderCallId(record, call.call_id!);
      setCallStatus(record, toCallStatus(call.call_status));
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
