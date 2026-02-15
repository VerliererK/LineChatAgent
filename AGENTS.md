# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LINE chatbot deployed on Vercel Functions, powered by AI SDK v6 with tool calling, Neon PostgreSQL for persistence, and a web UI for settings management. Written in Traditional Chinese (zh-TW) context.

## Development Commands

No build/test/lint scripts are defined. The project uses Vercel's native TypeScript support with no build step.

```bash
# Type checking (must use --skipLibCheck due to third-party type issues)
npx -p typescript tsc --noEmit --skipLibCheck

# Deploy (handled by Vercel CLI or Git push)
vercel

# Local development
vercel dev
```

## Architecture

### Request Flow

LINE message → `api/webhook.ts` (signature validation) → `lib/neon.ts` (load user history) → `lib/ai.ts::createChat()` (stream AI response with tools) → `lib/line.ts` (reply to user) → `lib/neon.ts` (persist messages)

### API Routes (`api/`)

Vercel Functions auto-discovered from `/api`. Each file exports named HTTP methods (`GET`, `POST`).

- **webhook.ts** — LINE webhook receiver. Validates HMAC-SHA256 signature, handles text/image messages.
- **settings.ts** — GET/POST LLM configuration. Protected by AUTH_KEY bearer token.
- **completions.ts** — Direct AI chat endpoint. Protected by AUTH_KEY bearer token.

### Core Library (`lib/`)

- **ai.ts** — Central module. `createModel()` instantiates provider-specific models (Vercel/OpenAI/Google). `createTools()` conditionally registers tools based on available API keys. `createChat()` orchestrates streaming with AI SDK v6's built-in `timeout` and `onAbort`, propagating `abortSignal` to all tool fetch calls.
- **neon.ts** — Database queries for `users` (conversation history as JSONB) and `settings` tables.
- **line.ts** — LINE Messaging API helpers (reply, push, get image content).
- **auth.ts** — Bearer token validation against `CONFIG.AUTH_KEY`.
- **DEFAULT_SYSTEM_ROLE.ts** — System prompt enforcing no-Markdown output (LINE limitation), Taiwan timezone, and tool-first behavior.
- **settings.ts** — Helper to load LLM settings from DB with defaults.

### Configuration (`utils/config.ts`)

Environment variables loaded at runtime. `GOOGLE_MAP_API_KEY` and `TAVILY_API_KEY` are optional and control which tools are available.

### Database Schema (`database-schema.sql`)

Two tables: `users` (id, messages JSONB) and `settings` (key, value). LLM settings (provider, model, api_key, base_url, system_role, temperature, max_tokens, timeout) are stored in `settings` and configurable via web UI.

### Tool System

Tools are conditionally registered in `createTools()` based on API key availability:
- **Always**: `clear` (clear conversation)
- **GOOGLE_MAP_API_KEY**: `geocode`, `weather`, `weather_forecast`, `google_map`
- **TAVILY_API_KEY**: `tavily_search`, `tavily_extract`

All network tools receive `abortSignal` from AI SDK and pass it to `fetch` for proper timeout cancellation.

### AI SDK v6 Patterns

- `streamText()` with `timeout: { totalMs }` and `onAbort` callback for timeout handling
- `stopWhen: stepCountIs(5)` to limit tool loop iterations
- `ModelMessage` type for conversation history
- `inputSchema` with Zod for tool parameter validation
- Tools use `{ abortSignal }` from second `execute` parameter

## Key Constraints

- **No Markdown in AI output**: LINE doesn't render Markdown. The system prompt enforces plain text responses.
- **290s default timeout**: Vercel Functions have a 300s limit with Fluid Compute; default timeout is set to 290s.
- **Vercel provider**: When `LLM_PROVIDER=vercel`, the model string (e.g. `openai/gpt-5`) is passed directly as-is; other providers create SDK client instances.
