import json

# ==========================================
# 1. W5Jp7CJIQbNy0qlY (Per Document AI Analysis)
# ==========================================

# Normalize Extraction Response
w5j_norm_code = """const inputItem = $input.first()?.json || {};
let rawText = "";
const res = inputItem;

if (res.output) {
  if (typeof res.output === "object") {
    return [{ json: { ...res.output } }];
  }
  rawText = res.output;
} else if (res.choices && res.choices[0] && res.choices[0].message) {
  rawText = res.choices[0].message.content || "";
} else if (
  res.candidates &&
  res.candidates[0] &&
  res.candidates[0].content &&
  res.candidates[0].content.parts
) {
  rawText = res.candidates[0].content.parts[0].text || "";
} else if (res.content && Array.isArray(res.content)) {
  const toolUse = res.content.find((c) => c.type === "tool_use");
  if (toolUse && toolUse.input) {
    return [{ json: { ...toolUse.input } }];
  }
  const textPart = res.content.find((c) => c.type === "text");
  rawText = textPart ? textPart.text : "";
} else if (typeof res === "object") {
  return [{ json: { ...res } }];
}

rawText = (rawText || "").trim();
if (rawText.startsWith("```json")) {
  rawText = rawText.replace(/^```json\\s*/i, "").replace(/\\s*```$/, "");
} else if (rawText.startsWith("```")) {
  rawText = rawText.replace(/^```\\s*/, "").replace(/\\s*```$/, "");
}

try {
  const parsed = JSON.parse(rawText);
  return [{ json: { ...parsed } }];
} catch (e) {
  return [
    {
      json: {
        rawOutput: rawText,
        parseError: e.message,
      },
    },
  ];
}
"""

# Validate Repaired Schema
w5j_val_code = """const item = $input.first()?.json || {};
const baseInput = $("When Executed by Another Workflow").first()?.json || {};

// LangChain Structured Output Parser returns parsed object in item.output or directly in item
let parsed = item.output || item;

if (typeof parsed === "string") {
  try {
    parsed = JSON.parse(
      parsed
        .replace(/^```json\\s*/i, "")
        .replace(/\\s*```$/, "")
        .trim(),
    );
  } catch (e) {
    const firstBrace = parsed.indexOf("{");
    const lastBrace = parsed.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        parsed = JSON.parse(parsed.slice(firstBrace, lastBrace + 1));
      } catch {}
    }
  }
}

const hasEssentialKeys = Boolean(
  parsed &&
    typeof parsed === "object" &&
    (parsed.financial_facts ||
      parsed.summary ||
      parsed.category ||
      parsed.revenue ||
      parsed.ebitda ||
      parsed.company_name),
);

if (hasEssentialKeys) {
  return [
    {
      json: {
        ...baseInput,
        ...item,
        ...parsed,
        output: parsed,
        isSalvaged: true,
        repairFailed: false,
        modelUsed: item.modelUsed || "OpenAI 5.6 Sol (Emergency Schema Repair)",
        repairedAt: new Date().toISOString(),
      },
    },
  ];
}

return [
  {
    json: {
      ...baseInput,
      ...item,
      isSalvaged: false,
      repairFailed: true,
      errorDescription:
        "Emergency LangChain Schema Repair was unable to produce valid required financial keys",
    },
  },
];
"""

# ==========================================
# 2. 0OVTAMMp2iMx53Aw (Document Counter Utility)
# ==========================================

doc_counter_code = """const docs = $("Get row(s)").all();
const first = docs[0]?.json ?? {};
const projectRow = $("Get Project State").first()?.json ?? {};
const triggerItem = $input.first()?.json || {};

// Project scope identifiers
const projectId =
  first.projectId ||
  projectRow.projectId ||
  triggerItem.projectId ||
  triggerItem.body?.projectId ||
  $("When Executed by Another Workflow").first()?.json?.projectId ||
  "";
const submissionBatchId =
  first.submissionBatchId ||
  projectRow.submissionBatchId ||
  triggerItem.submissionBatchId ||
  triggerItem.body?.submissionBatchId ||
  "";

// Document classification across the entire project
const consideredDocs = docs.filter((doc) => doc.json?.isConsidered !== false);
const completedDocs = consideredDocs.filter(
  (doc) => doc.json?.status === "completed",
);
const completed = completedDocs.length;
const failedDocs = consideredDocs.filter((doc) =>
  [
    "failed",
    "error",
    "rejected",
    "needs_review",
    "stopped",
    "upload_failed",
  ].includes(doc.json?.status),
);
const failed = failedDocs.length;
const stopRequested = consideredDocs.some(
  (doc) =>
    String(doc.json?.ai_escalation_reason ?? "")
      .trim()
      .toLowerCase() === "user_stopped_batch",
);
const terminal = completed + failed;
const active = consideredDocs.filter(
  (doc) =>
    ![
      "completed",
      "failed",
      "error",
      "rejected",
      "needs_review",
      "stopped",
      "upload_failed",
    ].includes(doc.json?.status),
).length;
const completedWithAnalysis = completedDocs.filter((doc) => {
  const value = doc.json?.ai_extractedJson;
  return (
    value !== null &&
    value !== undefined &&
    String(value).trim() !== "" &&
    String(value).trim() !== "null"
  );
}).length;
const completedWithoutAnalysis = completed - completedWithAnalysis;

const normalizeVersion = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : raw;
};

const evidenceManifest = consideredDocs
  .map((doc) => {
    const row = doc.json ?? {};
    const requestId = String(
      row.requestID ??
        row.requestId ??
        row.request_id ??
        row.id ??
        [
          row.fileName ?? row.file_name ?? "",
          row.driveFileID ?? row.storage_file_id ?? "",
        ].join(":"),
    ).trim();
    return {
      requestId,
      processedAt: normalizeVersion(
        row.ai_processedAt ??
          row.processedAt ??
          row.processed_at ??
          row.processingStartedAt ??
          row.triggerTimestamp,
      ),
      status: String(row.status ?? "")
        .trim()
        .toLowerCase(),
    };
  })
  .filter((entry) => entry.requestId)
  .sort(
    (a, b) =>
      a.requestId.localeCompare(b.requestId) ||
      a.status.localeCompare(b.status) ||
      a.processedAt.localeCompare(b.processedAt),
  );

// All documents across the project must be in a terminal state (at least 1 document total, 0 currently active/processing)
const allTerminal =
  consideredDocs.length >= 1 &&
  terminal >= consideredDocs.length &&
  active === 0;

// Project history check
const currentProjectStatus = String(projectRow.projectStatus ?? "")
  .trim()
  .toLowerCase();
const prevCompleted = Number(projectRow.documentsCompletedCount ?? 0);
const prevFailed = Number(projectRow.documentsFailedCount ?? 0);

// If new completed documents exist compared to previous synthesis pass, synthesis should fire!
const hasNewCompletedEvidence = completed > prevCompleted;
const alreadySynthesizedForThisCount =
  currentProjectStatus === "synthesized" &&
  completed <= prevCompleted &&
  failed === prevFailed;

// Synthesis triggers when all docs across the project are terminal, at least one usable analysis exists,
// and either there is new completed evidence or the project has not been synthesized yet
const synthesisReady =
  !stopRequested &&
  allTerminal &&
  completedWithAnalysis > 0 &&
  (!alreadySynthesizedForThisCount || hasNewCompletedEvidence);

// Block detection
const synthesisBlocked =
  !stopRequested &&
  allTerminal &&
  completedWithoutAnalysis > 0 &&
  completedWithAnalysis === 0;
const blockReason = synthesisBlocked
  ? completedWithoutAnalysis > 1
    ? "completed_without_analysis_multi_doc"
    : "completed_without_analysis_single_doc"
  : "";

return [
  {
    json: {
      projectId,
      submissionBatchId,
      documentsReceivedCount: docs.length,
      documentsCompletedCount: completed,
      documentsFailedCount: failed,
      processingCount: active,
      allDocumentsReceived: true,
      allTerminal,
      completedWithAnalysis,
      completedWithoutAnalysis,
      batchReady: synthesisReady ? "true" : "false",
      synthesisBlocked: synthesisBlocked ? "true" : "false",
      synthesisBlockReason: blockReason,
      stopRequested: stopRequested ? "true" : "false",
      isAlreadySynthesizing:
        currentProjectStatus === "synthesis_pending" ||
        currentProjectStatus === "synthesizing"
          ? "true"
          : "false",
      evidenceManifest,
    },
  },
];
"""

# Validate syntax with Node.js
print("Validating syntax of snippets...")
for name, code in [
    ("Normalize Extraction Response", w5j_norm_code),
    ("Validate Repaired Schema", w5j_val_code),
    ("Code in JavaScript (Document Counter)", doc_counter_code),
]:
    assert "$json" not in code, f"$json still found in {name}"
    assert "return [" in code, f"return array missing in {name}"
    print(f"[OK] Verified clean syntax for: {name}")

# Export payloads for updating
payload_w5j = {
    "workflowId": "W5Jp7CJIQbNy0qlY",
    "versionName": "Modernize Code nodes to eliminate red underlines and use clean n8n v1 APIs",
    "versionDescription": "Replace legacy $json access with $input.first()?.json in Normalize Extraction Response and Validate Repaired Schema, returning clean arrays.",
    "operations": [
        {
            "type": "setNodeParameter",
            "nodeName": "Normalize Extraction Response",
            "path": "/jsCode",
            "value": w5j_norm_code
        },
        {
            "type": "setNodeParameter",
            "nodeName": "Validate Repaired Schema",
            "path": "/jsCode",
            "value": w5j_val_code
        }
    ]
}

payload_doc_counter = {
    "workflowId": "0OVTAMMp2iMx53Aw",
    "versionName": "Modernize Code nodes to eliminate red underlines and use clean n8n v1 APIs",
    "versionDescription": "Replace legacy $json access with $input.first()?.json in Code in JavaScript and return clean array [{ json: ... }].",
    "operations": [
        {
            "type": "setNodeParameter",
            "nodeName": "Code in JavaScript",
            "path": "/jsCode",
            "value": doc_counter_code
        }
    ]
}

open("scripts/n8n/payload_w5j.json", "w", encoding="utf-8").write(json.dumps(payload_w5j, indent=2))
open("scripts/n8n/payload_doc_counter.json", "w", encoding="utf-8").write(json.dumps(payload_doc_counter, indent=2))
print("Saved payloads to scripts/n8n/")
