import { NextResponse } from "next/server";
import { getCall, getPublicCall, setCallResult, setCallStatus } from "@/lib/calls";
import { getRetellPhoneCall, toCallResult, toCallStatus } from "@/lib/retell";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ callId: string }> },
) {
  const { callId } = await params;
  const call = getCall(callId);
  if (!call) return NextResponse.json({ error: "Call not found or expired." }, { status: 404 });

  if (call.providerCallId) {
    try {
      const retellCall = await getRetellPhoneCall(call.providerCallId);
      setCallStatus(call, toCallStatus(retellCall.call_status));
      const result = toCallResult(retellCall);
      if (result) setCallResult(call, result);
    } catch {
      // Keep the latest known state. The Retell dashboard remains the source of truth.
    }
  }

  return NextResponse.json({ call: getPublicCall(call) });
}
