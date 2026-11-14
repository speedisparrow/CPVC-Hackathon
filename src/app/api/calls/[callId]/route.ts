import { NextResponse } from "next/server";
import { getCall, getPublicCall } from "@/lib/calls";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ callId: string }> },
) {
  const { callId } = await params;
  const call = getCall(callId);
  if (!call) return NextResponse.json({ error: "Call not found or expired." }, { status: 404 });
  return NextResponse.json({ call: getPublicCall(call) });
}
