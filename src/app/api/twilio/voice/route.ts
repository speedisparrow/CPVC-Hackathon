import { NextResponse } from "next/server";
import twilio from "twilio";
import {
  getPublicBaseUrl,
  validateTwilioWebhook,
} from "@/lib/calling-config";
import { addTranscript, getCall, setCallError, setCallStatus, setTwilioCallSid } from "@/lib/calls";

function twimlResponse(response: InstanceType<typeof twilio.twiml.VoiceResponse>) {
  return new NextResponse(response.toString(), {
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

function asParams(formData: FormData) {
  return Object.fromEntries(
    [...formData.entries()].map(([key, value]) => [key, String(value)]),
  );
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const params = asParams(formData);
  if (!validateTwilioWebhook(request, params)) {
    return new NextResponse("Invalid Twilio signature.", { status: 403 });
  }

  const callId = new URL(request.url).searchParams.get("callId");
  const record = callId ? getCall(callId) : null;
  if (!record) return new NextResponse("Call not found.", { status: 404 });

  try {
    const callSid = params.CallSid;
    if (callSid) setTwilioCallSid(record, callSid);
    setCallStatus(record, "in-progress");

    const baseUrl = getPublicBaseUrl(request);
    const opening = `Hi, I'm an AI assistant calling on behalf of a customer. Could I ask about availability for a party of ${record.partySize} at ${record.requestedTime}?`;
    addTranscript(record, "assistant", opening);

    const response = new twilio.twiml.VoiceResponse();
    const gather = response.gather({
      input: ["speech"],
      action: `${baseUrl}/api/twilio/respond?callId=${encodeURIComponent(record.id)}`,
      method: "POST",
      speechTimeout: "auto",
      timeout: 30,
      language: "en-US",
    });
    gather.say({ voice: "Polly.Joanna" }, opening);
    response.say({ voice: "Polly.Joanna" }, "I didn't hear a response. Thank you for your time. Goodbye.");
    response.hangup();
    return twimlResponse(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "The voice call could not begin.";
    setCallError(record, message);
    const response = new twilio.twiml.VoiceResponse();
    response.say("I'm sorry, there was a technical issue. Goodbye.");
    response.hangup();
    return twimlResponse(response);
  }
}
