import { randomUUID } from "crypto";

export type Availability = "available" | "waitlist" | "unavailable" | "unknown";
export type CallStatus =
  | "queued"
  | "ringing"
  | "in-progress"
  | "completed"
  | "busy"
  | "failed"
  | "no-answer"
  | "canceled";

export type CallInput = {
  restaurantId: string;
  restaurantName: string;
  phoneNumber: string;
  partySize: number;
  requestedTime: string;
};

export type CallResult = {
  availability: Availability;
  waitMinutes: number | null;
  notes: string;
  needsHumanConfirmation: true;
};

type TranscriptLine = { speaker: "assistant" | "restaurant"; text: string };

type CallRecord = CallInput & {
  id: string;
  providerCallId: string | null;
  twilioCallSid: string | null;
  status: CallStatus;
  result: CallResult | null;
  transcript: TranscriptLine[];
  questionCount: number;
  error: string | null;
  createdAt: number;
  updatedAt: number;
};

export type PublicCallRecord = Pick<
  CallRecord,
  | "id"
  | "restaurantId"
  | "restaurantName"
  | "status"
  | "result"
  | "error"
  | "updatedAt"
>;

const RECORD_TTL_MS = 2 * 60 * 60 * 1000;

declare global {
  // Process-local for this hackathon prototype. Use Redis/Supabase for production.
  var callRecords: Map<string, CallRecord> | undefined;
}

const records = global.callRecords ?? new Map<string, CallRecord>();
global.callRecords = records;

function pruneExpiredRecords() {
  const cutoff = Date.now() - RECORD_TTL_MS;
  for (const [id, record] of records) {
    if (record.updatedAt < cutoff) records.delete(id);
  }
}

function touch(record: CallRecord) {
  record.updatedAt = Date.now();
  return record;
}

export function createCall(input: CallInput) {
  pruneExpiredRecords();
  const now = Date.now();
  const record: CallRecord = {
    ...input,
    id: `call_${randomUUID()}`,
    providerCallId: null,
    twilioCallSid: null,
    status: "queued",
    result: null,
    transcript: [],
    questionCount: 0,
    error: null,
    createdAt: now,
    updatedAt: now,
  };
  records.set(record.id, record);
  return record;
}

export function getCall(id: string) {
  pruneExpiredRecords();
  return records.get(id) ?? null;
}

export function getPublicCall(record: CallRecord): PublicCallRecord {
  const { id, restaurantId, restaurantName, status, result, error, updatedAt } = record;
  return { id, restaurantId, restaurantName, status, result, error, updatedAt };
}

export function setTwilioCallSid(record: CallRecord, twilioCallSid: string) {
  record.twilioCallSid = twilioCallSid;
  return touch(record);
}

export function setProviderCallId(record: CallRecord, providerCallId: string) {
  record.providerCallId = providerCallId;
  return touch(record);
}

export function setCallStatus(record: CallRecord, status: CallStatus) {
  record.status = status;
  return touch(record);
}

export function addTranscript(
  record: CallRecord,
  speaker: TranscriptLine["speaker"],
  text: string,
) {
  record.transcript.push({ speaker, text });
  if (speaker === "assistant") record.questionCount += 1;
  return touch(record);
}

export function setCallResult(record: CallRecord, result: CallResult) {
  record.result = result;
  return touch(record);
}

export function setCallError(record: CallRecord, error: string) {
  record.error = error;
  record.status = "failed";
  return touch(record);
}

export function getConversation(record: CallRecord) {
  return record.transcript.map((line) => `${line.speaker}: ${line.text}`).join("\n");
}
