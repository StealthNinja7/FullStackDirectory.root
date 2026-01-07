src/components/Components.tsx // Purpose: Single root "Components" file that houses a React full-stack system (TypeScript, Next.js App Router). // Chosen minimal stack and parameters (no extra questions): // - Frontend: Next.js (App Router), React 18+, TypeScript // - Backend: Next.js API routes (or app route handlers) running on Node 18+ // - DB: MongoDB Atlas (mongodb native driver) — expect MONGODB_URI // - Auth: NextAuth.js (JWT/session) — expect NEXTAUTH_URL, NEXTAUTH_SECRET // - LLMs: Hugging Face Inference API (primary) + option to run transformers/pipelines on server (via python microservice) — expect HUGGINGFACE_API_KEY, HUGGINGFACE_MODEL // - Vector/search: MongoDB Atlas Vector Search or MongoDB + embedded vectors stored in a collection // - Caching/queue (optional): Redis (REDIS_URL) for background jobs // - Query client: @tanstack/react-query (React Query) // - Theme: next-themes (Tailwind recommended) // - Expected env variables: MONGODB_URI, HUGGINGFACE_API_KEY, HUGGINGFACE_MODEL, NEXTAUTH_URL, NEXTAUTH_SECRET, REDIS_URL (optional) // // This file provides: // - AppProviders: wraps QueryClient, Theme, Auth, ErrorBoundary, and LLM client context // - useLLM hook: frontend helper to call backend LLM/embedding/search endpoints // - Minimal ErrorBoundary and types // // Add backend route implementations at: // - /api/llm/generate (POST) -> calls Hugging Face Inference API or local transformers service // - /api/llm/embed (POST) -> embeddings via HF or local service // - /api/docs (POST/GET) -> save/fetch documents to MongoDB // - /api/docs/search (POST) -> vector search (MongoDB Atlas native vector search or approximate match) // // Drop this file into src/components/ and wire the backend API routes accordingly.

import React, { createContext, useContext, useMemo, useState } from "react"; import { QueryClient, QueryClientProvider } from "@tanstack/react-query"; import { ThemeProvider } from "next-themes"; import { SessionProvider } from "next-auth/react";

// ---------------------------- // Types // ---------------------------- type LLMGenerateOptions = { maxTokens?: number; temperature?: number; stop?: string | string[]; topP?: number; stream?: boolean; model?: string; // override HUGGINGFACE_MODEL };

type LLMGenerateResponse = { output: string; raw?: any; };

type EmbeddingResponse = { vector: number[]; raw?: any; };

type SaveDocPayload = { id?: string; title?: string; content: string; metadata?: Record<string, any>; embedding?: number[]; // optional precomputed };

type SearchResult<T = any> = { id: string; score: number; document: T; };

// ---------------------------- // Config (chosen parameters) // ---------------------------- export const STACK_CONFIG = { frontend: "Next.js (App Router) + TypeScript", backend: "Next.js API Routes / Route Handlers (Node 18+)", database: "MongoDB Atlas (mongodb native driver)", auth: "NextAuth.js", llmPrimary: "Hugging Face Inference API (model via HUGGINGFACE_MODEL)", llmFallback: "Self-hosted Transformers/pipelines service (python microservice)", vectorSearch: "MongoDB Atlas Vector Search (or store vectors in collection + use $vectorSearch)", queryClient: "TanStack React Query", theme: "next-themes (Tailwind CSS recommended)", cachingOptional: "Redis for queues/caching (optional)", env: [ "MONGODB_URI", "NEXTAUTH_URL", "NEXTAUTH_SECRET", "HUGGINGFACE_API_KEY", "HUGGINGFACE_MODEL", "REDIS_URL (optional)" ] };

// ---------------------------- // Error Boundary // ---------------------------- class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error?: Error }> { constructor(props: any) { super(props); this.state = { hasError: false }; } static getDerivedStateFromError(error: Error) { return { hasError: true, error }; } componentDidCatch(error: Error, info: any) { // TODO: send to logging (Sentry/Logflare) on backend // console.error(error, info); } render() { if (this.state.hasError) { return ( <div style={{ padding: 24 }}> <h2>Something went wrong.</h2> <pre style={{ whiteSpace: "pre-wrap" }}>{String(this.state.error?.message || "Unknown error")}</pre> </div> ); } return this.props.children; } }

// ---------------------------- // LLM Client Context (frontend) // ---------------------------- // This context abstracts calls to backend endpoints which perform the actual LLM/DB interactions. // Backend endpoints should perform auth checks and call Hugging Face or local pipelines and MongoDB. type LLMClient = { generate: (prompt: string, opts?: LLMGenerateOptions) => Promise<LLMGenerateResponse>; embed: (text: string) => Promise<EmbeddingResponse>; saveDocument: (doc: SaveDocPayload) => Promise<{ id: string; ok: boolean }>; fetchDocument: (id: string) => Promise<any | null>; searchDocuments: (query: string, topK?: number) => Promise<SearchResult[]>; };

const LLMContext = createContext<LLMClient | null>(null);

export const useLLM = (): LLMClient => { const ctx = useContext(LLMContext); if (!ctx) throw new Error("useLLM must be used within AppProviders"); return ctx; };

// Minimal fetch wrapper with JSON handling and error throwing async function apiFetch<T = any>(url: string, opts: RequestInit = {}): Promise<T> { const res = await fetch(url, { credentials: "same-origin", headers: { "Content-Type": "application/json" }, ...opts, }); if (!res.ok) { const text = await res.text(); throw new Error(API error ${res.status}: ${text}); } return (await res.json()) as T; }

// ---------------------------- // App Providers component // ---------------------------- export function AppProviders({ children, session }: { children: React.ReactNode; session?: any }) { // QueryClient with conservative defaults const [queryClient] = useState( () => new QueryClient({ defaultOptions: { queries: { staleTime: 1000 * 60 * 0.5, // 30s cacheTime: 1000 * 60 * 5, // 5m retry: 1, refetchOnWindowFocus: false, }, }, }) );

const llmClient = useMemo<LLMClient>(() => { return { generate: async (prompt: string, opts?: LLMGenerateOptions) => { const body = { prompt, options: opts || {} }; return apiFetch<LLMGenerateResponse>("/api/llm/generate", { method: "POST", body: JSON.stringify(body), }); },

Code
  embed: async (text: string) => {
    const body = { text };
    return apiFetch<EmbeddingResponse>("/api/llm/embed", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  saveDocument: async (doc: SaveDocPayload) => {
    return apiFetch<{ id: string; ok: boolean }>("/api/docs", {
      method: "POST",
      body: JSON.stringify(doc),
    });
  },

  fetchDocument: async (id: string) => {
    return apiFetch<any>(`/api/docs/${encodeURIComponent(id)}`, {
      method: "GET",
    });
  },

  searchDocuments: async (query: string, topK = 10) => {
    const body = { query, topK };
    return apiFetch<SearchResult[]>("/api/docs/search", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
};
}, []);

return ( <SessionProvider session={session}> <QueryClientProvider client={queryClient}> <ThemeProvider attribute="class"> <ErrorBoundary> <LLMContext.Provider value={llmClient}>{children}</LLMContext.Provider> </ErrorBoundary> </ThemeProvider> </QueryClientProvider> </SessionProvider> ); }

// ---------------------------- // Minimal exported helpers/hooks // ---------------------------- export { ErrorBoundary as AppErrorBoundary };

// Example convenience hook to generate + optionally store result export async function generateAndSave( llm: LLMClient, prompt: string, saveOpts?: { title?: string; metadata?: Record<string, any> } ) { const res = await llm.generate(prompt); const embedding = await llm.embed(res.output).catch(() => null); const payload: SaveDocPayload = { title: saveOpts?.title ?? prompt.slice(0, 120), content: res.output, metadata: saveOpts?.metadata ?? {}, embedding: embedding?.vector, }; const saveRes = await llm.saveDocument(payload); return { generate: res, save: saveRes }; }

// ---------------------------- // Small example components (optional quick usage examples) // ---------------------------- export function LLMPlayground() { const llm = useLLM(); const [prompt, setPrompt] = useState(""); const [out, setOut] = useState<string | null>(null); const [loading, setLoading] = useState(false);

const run = async () => { setLoading(true); try { const r = await llm.generate(prompt); setOut(r.output); } catch (e: any) { setOut(Error: ${e?.message || e}); } finally { setLoading(false); } };

return ( <div style={{ padding: 12 }}> <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={6} style={{ width: "100%" }} /> <div style={{ marginTop: 8 }}> <button onClick={run} disabled={loading || !prompt}> {loading ? "Running…" : "Run"} </button> </div> {out && ( <pre style={{ marginTop: 8, whiteSpace: "pre-wrap", background: "#f5f5f5", padding: 12 }}>{out}</pre> )} </div> ); }

// ---------------------------- // Notes for backend implementers (keep minimal): // - /api/llm/generate: // - Validate auth // - If HUGGINGFACE_API_KEY available: call HF Inference API: POST https://api-inference.huggingface.co/models/${HUGGINGFACE_MODEL} // - Send JSON with inputs (prompt) and parameters (max_new_tokens, temperature, stop, top_p) // - Else: proxy to internal transformer microservice (e.g., python FastAPI) that hosts pipelines.transformers // - Return standardized { output, raw } // - /api/llm/embed: // - Use HF endpoint or local embedder (sentence-transformers) to produce vector // - /api/docs: // - Use mongodb native driver or mongoose to persist documents, store embedding vector in field (e.g., embedding: [Float]) // - Create vector indexes in Atlas or use $vectorSearch for similarity // - /api/docs/search: // - If using Atlas vectorSearch: call $search aggregation with vector and knn // - Else: fetch candidates and compute cosine similarity server-side (if small scale) // Security: never call HF API key from the browser — always from server routes. // Performance: for heavy LLM usage, consider background workers, batching, and rate limiting. // // End of file.

Ask anything
Skip to content
Navigation Menu
StealthNinja7
FullStackDirectory.root

Type / to search
Code
Issues
Pull requests
Actions
Projects
Wiki
Security
Insights
Settings
Files
Go to file
.github/workflows
elixir.yml
.gitignore
FullStackDirectory.root/.github/workflows/Components/
/
GitHub Copilot Chat Assistant 
in
main

Edit

Preview
Indent mode

Spaces
Indent size

2
Line wrap mode

No wrap
Editing GitHub Copilot Chat Assistant file contents
1

Use Control + Shift + m to toggle the tab key moving focus. Alternatively, use esc then tab to move to the next interactive element on the page.
