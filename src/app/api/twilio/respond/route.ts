import { NextResponse } from "next/server";
import twilio from "twilio";
import { getCallingConfig, getPublicBaseUrl, validateTwilioWebhook } from "@/lib/calling-config";
import {
  addTranscript,
  getCall,
  getConversation,
  setCallError,
  setCallResult,
  setCallStatus,
} from "@/lib/calls";
import { decideNextRestaurantQuestion } from "@/lib/restaurant-agent";

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

function endCall(message: string) {
  const response = new twilio.twiml.VoiceResponse();
  response.say({ voice: "Polly.Joanna" }, message);
  response.hangup();
  return twimlResponse(response);
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

  const speechResult = params.SpeechResult?.trim();
  if (!speechResult) {
    setCallResult(record, {
      availability: "unknown",
      waitMinutes: null,
      notes: "No clear response was captured.",
      needsHumanConfirmation: true,
    });
    setCallStatus(record, "completed");
    return endCall("I didn't catch that. Thank you for your time. Goodbye.");
  }

  addTranscript(record, "restaurant", speechResult);

  try {
    const { openAiApiKey, model } = getCallingConfig();
    const decision = await decideNextRestaurantQuestion({
      apiKey: openAiApiKey,
      model,
      restaurantName: record.restaurantName,
      partySize: record.partySize,
      requestedTime: record.requestedTime,
      conversation: getConversation(record),
      questionCount: Math.max(0, record.questionCount - 1),
    });

    if (decision.callComplete) {
      setCallResult(record, {
        availability: decision.availability,
        waitMinutes: decision.waitMinutes,
        notes: decision.notes,
        needsHumanConfirmation: true,
      });
      setCallStatus(record, "completed");
      return endCall("Thank you for your help. Goodbye.");
    }

    setCallStatus(record, "in-progress");
    addTranscript(record, "assistant", decision.nextQuestion);
    const response = new twilio.twiml.VoiceResponse();
    const baseUrl = getPublicBaseUrl(request);
    const gather = response.gather({
      input: ["speech"],
      action: `${baseUrl}/api/twilio/respond?callId=${encodeURIComponent(record.id)}`,
      method: "POST",
      speechTimeout: "auto",
      timeout: 7,
      language: "en-US",
    });
    gather.say({ voice: "Polly.Joanna" }, decision.nextQuestion);
    response.say({ voice: "Polly.Joanna" }, "I didn't hear a response. Thank you for your time. Goodbye.");
    response.hangup();
    return twimlResponse(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "The AI could not continue the call.";
    setCallError(record, message);
    return endCall("I'm sorry, there was a technical issue. Goodbye.");
  }
}
