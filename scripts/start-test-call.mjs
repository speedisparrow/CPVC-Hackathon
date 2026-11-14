import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const apiKey = process.env.RETELL_API_KEY?.trim();
const fromNumber = process.env.RETELL_FROM_NUMBER?.trim();
const toNumber = process.env.RETELL_TEST_RECIPIENT?.trim();

if (!apiKey || !fromNumber || !toNumber) {
  console.error("Set RETELL_API_KEY, RETELL_FROM_NUMBER, and RETELL_TEST_RECIPIENT in .env.local.");
  process.exit(1);
}

const response = await fetch("https://api.retellai.com/v2/create-phone-call", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    from_number: fromNumber,
    to_number: toNumber,
  }),
});

const result = await response.json();

if (!response.ok) {
  console.error(result.error || "Unable to start the test call.");
  process.exit(1);
}

console.log(`Calling the configured Retell test number. Call ID: ${result.call_id}`);
