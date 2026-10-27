# PromptForge Pro

Vite + React + TypeScript + Tailwind/shadcn, backend em Supabase (projeto `cwrxbxxfaemcvliasycz`), pagamentos Paddle, alojamento Vercel.

## Desenvolvimento

```sh
bun install   # ou npm install
bun run dev   # http://localhost:8080
bun run build
```

## Variáveis de ambiente (frontend)

- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`
- `VITE_PAYMENTS_CLIENT_TOKEN` (Paddle client token; `test_` = sandbox, `live_` = produção)

## Edge Functions (Supabase)

Em `supabase/functions`. Secrets: `GROQ_API_KEY`, `AI_MODEL`, `AI_REASONING_EFFORT`, `OPENAI_API_KEY`,
`PADDLE_LIVE_API_KEY`, `PADDLE_WEBHOOK_SECRET`, `RESEND_API_KEY` (opcional: `PADDLE_SANDBOX_API_KEY`, `RESEND_FROM`).
