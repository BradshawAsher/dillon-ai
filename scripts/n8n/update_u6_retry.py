import json
import os

scratch_dir = r"C:\Users\s-bas\.gemini\antigravity-ide\brain\7b3c0470-d411-4e65-b278-3d2138787487\scratch"
os.makedirs(scratch_dir, exist_ok=True)

classify_llm_code = '''function sanitizeAndExtractJson(input) {
  if (!input) return null;
  if (typeof input === "object" && input !== null) {
    if (Array.isArray(input.fields) && input.fields.length > 0) return input;
    if (
      input.output &&
      Array.isArray(input.output.fields) &&
      input.output.fields.length > 0
    )
      return input.output;
  }

  let text = typeof input === "string" ? input : JSON.stringify(input);
  const errorMatch =
    text.match(/Previous completion to correct:\\s*([\\s\\S]+?)(?=\\n\\n|$)/) ||
    text.match(/model output:\\s*([\\s\\S]+?)(?=\\n\\n|$)/i) ||
    text.match(/raw output:\\s*([\\s\\S]+?)(?=\\n\\n|$)/i);
  if (errorMatch && errorMatch[1]) text = errorMatch[1];
  text = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  try {
    const direct = JSON.parse(text);
    if (direct && Array.isArray(direct.fields)) return direct;
  } catch {}

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    let candidate = text.slice(firstBrace, lastBrace + 1);
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && Array.isArray(parsed.fields)) return parsed;
    } catch {}
    candidate = candidate.replace(/,\\s*([}\\]])/g, "$1");
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && Array.isArray(parsed.fields)) return parsed;
    } catch {}
  }
  return null;
}

let baseInput = $("Prepare AI Request").item.json || {};
try {
  const parsedImageInput = $("Normalize Questionnaire Image Text").item.json;
  if (parsedImageInput?.imageParsed && parsedImageInput?.sourceText)
    baseInput = parsedImageInput;
} catch (e) {}
const item = $json;
const rawError = item.error ?? item.message ?? item.errorMessage ?? item;
const details = (
  typeof rawError === "object" ? JSON.stringify(rawError) : String(rawError)
).toLowerCase();

// Instant salvage check
const salvaged =
  sanitizeAndExtractJson(rawError) || sanitizeAndExtractJson(item);
if (salvaged && Array.isArray(salvaged.fields) && salvaged.fields.length > 0) {
  return {
    json: {
      ...baseInput,
      ...item,
      output: salvaged,
      isSalvaged: true,
      providerRetryable: false,
      modelUsed: item.modelUsed || "OpenAI 5.6 Terra (Salvaged)",
    },
  };
}

const isPermanentAuthOrBilling =
  /invalid.*api.*key|unauthorized|forbidden|\\b401\\b|\\b403\\b|credit.*balance|balance.*too low|insufficient.*credit|plans.*billing|\\b402\\b/i.test(
    details,
  );
const isFormatOrParseError =
  /invalid json|model output doesn\'t fit|output parser|syntaxerror|unexpected token|json\\.parse/i.test(
    details,
  );
const isTransient =
  !isPermanentAuthOrBilling &&
  (/\\b429\\b/.test(details) ||
    /\\b5\\d\\d\\b/.test(details) ||
    /rate.?limit|too many requests|quota|tokens per min|timeout|timed out|econnreset|etimedout|esockettimedout|eai_again|temporar|overload|service unavailable|bad gateway|gateway timeout|server_error/i.test(
      details,
    ));

const attempt =
  Number(
    item.questionnaireRetryAttempt ?? baseInput.questionnaireRetryAttempt ?? 0,
  ) + 1;
const delays = [3, 6];
// If format/schema failed, do not retry the exact same prompt; route directly to salvage chain
const retryable = !isPermanentAuthOrBilling && !isFormatOrParseError && isTransient && attempt < 2;

return {
  json: {
    ...baseInput,
    ...item,
    isSalvaged: false,
    questionnaireRetryAttempt: attempt,
    providerRetryable: retryable,
    providerBackoffSeconds: retryable ? delays[attempt - 1] || 3 : 0,
    providerFailureKind: isPermanentAuthOrBilling
      ? "auth_or_quota_exhausted"
      : isFormatOrParseError
        ? "schema_format_escalate_salvage"
        : isTransient
          ? "provider_transient"
          : "non_retryable",
    providerErrorMessage:
      typeof rawError === "object"
        ? rawError.message || JSON.stringify(rawError)
        : String(rawError),
  },
};
'''

classify_salvage_code = '''function sanitizeAndExtractJson(input) {
  if (!input) return null;
  if (typeof input === "object" && input !== null) {
    if (Array.isArray(input.fields) && input.fields.length > 0) return input;
    if (
      input.output &&
      Array.isArray(input.output.fields) &&
      input.output.fields.length > 0
    )
      return input.output;
  }

  let text = typeof input === "string" ? input : JSON.stringify(input);
  const errorMatch =
    text.match(/Previous completion to correct:\\s*([\\s\\S]+?)(?=\\n\\n|$)/) ||
    text.match(/model output:\\s*([\\s\\S]+?)(?=\\n\\n|$)/i) ||
    text.match(/raw output:\\s*([\\s\\S]+?)(?=\\n\\n|$)/i);
  if (errorMatch && errorMatch[1]) text = errorMatch[1];
  text = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  try {
    const direct = JSON.parse(text);
    if (direct && Array.isArray(direct.fields)) return direct;
  } catch {}

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    let candidate = text.slice(firstBrace, lastBrace + 1);
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && Array.isArray(parsed.fields)) return parsed;
    } catch {}
    candidate = candidate.replace(/,\\s*([}\\]])/g, "$1");
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && Array.isArray(parsed.fields)) return parsed;
    } catch {}
  }
  return null;
}

const baseInput = $("Prepare AI Request").item.json || {};
const item = $json;
const rawError = item.error ?? item.message ?? item.errorMessage ?? item;
const details = (
  typeof rawError === "object" ? JSON.stringify(rawError) : String(rawError)
).toLowerCase();

// Instant salvage check
const salvaged =
  sanitizeAndExtractJson(rawError) || sanitizeAndExtractJson(item);
if (salvaged && Array.isArray(salvaged.fields) && salvaged.fields.length > 0) {
  return {
    json: {
      ...baseInput,
      ...item,
      output: salvaged,
      isSalvaged: true,
      salvageRetryable: false,
      modelUsed: "OpenAI 5.6 Sol (Salvaged)",
    },
  };
}

const isPermanentAuthOrBilling =
  /invalid.*api.*key|unauthorized|forbidden|\\b401\\b|\\b403\\b|credit.*balance|balance.*too low|insufficient.*credit|plans.*billing|\\b402\\b/i.test(
    details,
  );
const isFormatOrParseError =
  /invalid json|model output doesn\'t fit|output parser|syntaxerror|unexpected token|json\\.parse/i.test(
    details,
  );
const isTransient =
  !isPermanentAuthOrBilling &&
  (/\\b429\\b/.test(details) ||
    /\\b5\\d\\d\\b/.test(details) ||
    /rate.?limit|too many requests|quota|tokens per min|timeout|timed out|econnreset|etimedout|esockettimedout|eai_again|temporar|overload|service unavailable|bad gateway|gateway timeout|server_error/i.test(
      details,
    ));

const attempt = Number(item.salvageRetryAttempt ?? 0) + 1;
const delays = [3, 6];
// Do not loop on persistent format errors
const retryable = !isPermanentAuthOrBilling && !isFormatOrParseError && isTransient && attempt < 2;

return {
  json: {
    ...baseInput,
    ...item,
    salvageRetryAttempt: attempt,
    salvageRetryable: retryable,
    salvageBackoffSeconds: retryable ? delays[attempt - 1] || 3 : 0,
    salvageFailureKind: isPermanentAuthOrBilling
      ? "auth_or_quota_exhausted"
      : isFormatOrParseError
        ? "salvage_schema_format_exhausted"
        : isTransient
          ? "salvage_transient_retry"
          : "non_retryable",
  },
};
'''

payload = {
    "workflowId": "U6hocPOecg7AQS0I",
    "versionName": "Fast Escalation on Schema Parse Errors",
    "versionDescription": "Route format errors immediately to salvage chain without wasting 100s in duplicate retries",
    "operations": [
        {
            "type": "updateNodeParameters",
            "nodeName": "Classify LLM Error & Retry",
            "parameters": {
                "mode": "runOnceForEachItem",
                "jsCode": classify_llm_code
            }
        },
        {
            "type": "updateNodeParameters",
            "nodeName": "Classify Salvage Error",
            "parameters": {
                "mode": "runOnceForEachItem",
                "jsCode": classify_salvage_code
            }
        }
    ]
}

target_file = os.path.join(scratch_dir, "update_u6.json")
with open(target_file, "w", encoding="utf-8") as f:
    json.dump(payload, f, indent=2)

print("Generated update payload at:", target_file)
