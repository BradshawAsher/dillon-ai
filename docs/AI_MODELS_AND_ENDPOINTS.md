# Verified AI Models, API Endpoints, & Authentication Reference

This document serves as the ground-truth technical specification for all AI models, REST endpoints, authentication protocols, and request payloads supported across MergeWorks Due Diligence.

---

## 1. Provider Reference Matrix

| Provider | Base URL / REST Endpoint | Supported Auth Header | Context Window | Default Active Models |
| :--- | :--- | :--- | :--- | :--- |
| **Anthropic** | `https://api.anthropic.com/v1/messages` | `x-api-key: <KEY>`<br>`anthropic-version: 2023-06-01` | 1M Tokens (Fable/Opus/Sonnet 5)<br>200k (Haiku 4.5) | `claude-sonnet-5`<br>`claude-opus-5`<br>`claude-fable-5`<br>`claude-haiku-4-5` |
| **OpenAI** | `https://api.openai.com/v1/chat/completions` | `Authorization: Bearer <KEY>` | 128k–1M Tokens | `gpt-5.6-terra`<br>`gpt-5.6-sol`<br>`o1`<br>`o3-mini`<br>`gpt-4o`<br>`gpt-4o-mini` |
| **Google Gemini** | `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key=<KEY>` | Query Param `?key=<KEY>` or `x-goog-api-key: <KEY>` | 1M–2M Tokens | `gemini-3.7-flash`<br>`gemini-3.5-flash-lite`<br>`gemini-3.1-pro-preview`<br>`gemini-2.5-pro`<br>`gemini-2.5-flash` |
| **DeepSeek** | `https://api.deepseek.com/chat/completions`<br>*(or `/anthropic/v1/messages`)* | `Authorization: Bearer <KEY>` | 1M Tokens (V4 series) | `deepseek-v4-flash`<br>`deepseek-v4-pro`<br>`deepseek-chat`<br>`deepseek-reasoner` |

---

## 2. Detailed Provider Specifications

### A. Anthropic Claude

#### REST Endpoint
- **URL**: `POST https://api.anthropic.com/v1/messages`
- **Headers**:
  ```http
  Content-Type: application/json
  x-api-key: <ANTHROPIC_API_KEY>
  anthropic-version: 2023-06-01
  dangerously-allow-browser: true  # (Client-side / browser only)
  ```

#### Model Catalog & Identifiers
- **`claude-sonnet-5`**: Balanced speed and frontier intelligence for high-accuracy document parsing and M&A synthesis.
- **`claude-opus-5`**: Deep complex reasoning, legal clause analysis, and debt covenant modeling.
- **`claude-fable-5`**: Always-on adaptive thinking and long-horizon diligence synthesis (1M context).
- **`claude-haiku-4-5`** (or `claude-haiku-4-5-20251001`): High-speed, low-latency extraction.

#### Example Request Payload
```json
{
  "model": "claude-sonnet-5",
  "max_tokens": 4096,
  "system": "You are an institutional M&A financial analyst.",
  "messages": [
    {
      "role": "user",
      "content": "Extract revenue, EBITDA, and red flags from this financial statement."
    }
  ]
}
```

---

### B. OpenAI

#### REST Endpoint
- **URL**: `POST https://api.openai.com/v1/chat/completions`
- **Headers**:
  ```http
  Content-Type: application/json
  Authorization: Bearer <OPENAI_API_KEY>
  ```

#### Model Catalog & Identifiers
- **`gpt-5.6-terra`**: Primary production model for deep financial OCR, reconciliations, and portfolio-level synthesis.
- **`gpt-5.6-sol`**: High-throughput backup model for document parsing and fast verification.
- **`o1`**: Deep chain-of-thought reasoning for complex debt waterfall and tax adjustment verification.
- **`o3-mini`**: Fast reasoning model supporting adjustable `reasoning_effort` (`"low"`, `"medium"`, `"high"`).
- **`gpt-4o`**: Omnimodal foundation model for table extraction and visual CIM parsing.
- **`gpt-4o-mini`**: Low-cost, high-speed extraction.

#### Example Request Payload
```json
{
  "model": "gpt-5.6-terra",
  "temperature": 0.2,
  "messages": [
    {
      "role": "system",
      "content": "You are Dillon AI, an institutional M&A due diligence advisor."
    },
    {
      "role": "user",
      "content": "Perform Quality of Earnings add-back verification."
    }
  ],
  "response_format": { "type": "json_object" }
}
```

---

### C. Google Gemini

#### REST Endpoint
- **URL**: `POST https://generativelanguage.googleapis.com/v1beta/models/{modelName}:generateContent?key=<GEMINI_API_KEY>`
- **Headers**:
  ```http
  Content-Type: application/json
  ```

#### Model Catalog & Identifiers
- **`gemini-3.7-flash`**: High-speed multimodal OCR and complex document understanding.
- **`gemini-3.5-flash-lite`**: Ultra-low latency extraction and high-concurrency batch parsing.
- **`gemini-3.1-pro-preview`**: Multi-step agentic reasoning and complex valuation modeling.
- **`gemini-2.5-pro`**: Deep reasoning with adaptive thinking budget and 1M token context.
- **`gemini-2.5-flash`**: Balanced workhorse model.
- **`gemini-1.5-pro`**: Extended 2M token context for massive virtual data rooms (VDRs).

#### Example Request Payload
```json
{
  "contents": [
    {
      "role": "user",
      "parts": [
        {
          "text": "Extract all documented financial facts and schedule adjustments from this document."
        }
      ]
    }
  ],
  "generationConfig": {
    "temperature": 0.2,
    "responseMimeType": "application/json"
  }
}
```

---

### D. DeepSeek

#### REST Endpoint
- **OpenAI Compatible Endpoint**: `POST https://api.deepseek.com/chat/completions`
- **Anthropic Compatible Endpoint**: `POST https://api.deepseek.com/anthropic/v1/messages`
- **Headers**:
  ```http
  Content-Type: application/json
  Authorization: Bearer <DEEPSEEK_API_KEY>
  ```

#### Model Catalog & Identifiers
- **`deepseek-v4-flash`**: Ultra-high concurrency, 1M context window, high-speed extraction.
- **`deepseek-v4-pro`**: High-performance agentic reasoning and deep financial math verification (1M context).
- **`deepseek-chat`**: General conversational and extraction model (DeepSeek-V3).
- **`deepseek-reasoner`**: Chain-of-thought reasoning model (DeepSeek-R1).

#### Example Request Payload
```json
{
  "model": "deepseek-v4-flash",
  "messages": [
    {
      "role": "system",
      "content": "You are a financial due diligence parser."
    },
    {
      "role": "user",
      "content": "Extract EBITDA, debt schedules, and transaction risks."
    }
  ],
  "temperature": 0.2
}
```

---

## 3. MergeWorks Production Defaults

| Diligence Role | Primary Model | Backup Model |
| :--- | :--- | :--- |
| **Per-Document Extraction** | `OpenAI 5.6 Terra` (`gpt-5.6-terra`) | `OpenAI 5.6 Sol` (`gpt-5.6-sol`) |
| **Project Synthesis Pass** | `OpenAI 5.6 Terra` (`gpt-5.6-terra`) | `OpenAI 5.6 Sol` (`gpt-5.6-sol`) |
| **Anthropic Custom Pipeline** | `Claude Sonnet 5` (`claude-sonnet-5`) | `Claude Opus 5` (`claude-opus-5`) |
| **Google Gemini Custom Pipeline** | `Gemini 3.7 Flash` (`gemini-3.7-flash`) | `Gemini 3.5 Flash Lite` (`gemini-3.5-flash-lite`) |
| **DeepSeek Custom Pipeline** | `DeepSeek V4 Flash` (`deepseek-v4-flash`) | `DeepSeek V4 Pro` (`deepseek-v4-pro`) |
