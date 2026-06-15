# ICM Server — local AI bridge

The local backend bridge (spec section 4). It spawns the headless `claude` CLI
and streams the result to the UI, and broadcasts file changes so the UI updates
live.

## Bridge path used: **CLI spawn** (no API key)

We spawn the user's locally installed `claude` CLI, which runs on their existing
Max-plan login — **no API key is wired in** (`apiKeySource: "none"` is confirmed
in the CLI's init event). The exact command:

```
claude -p "<prompt>" --output-format stream-json --verbose \
       --permission-mode bypassPermissions [--resume <sessionId>]
```

run with `cwd` set to the repo root. `--permission-mode bypassPermissions` lets
file + bash tools run without interactive prompts (trusted local single-user
app). `src/config.ts` lists the tools we intend to allow — the seam to tighten
this later via `--allowedTools`.

We did **not** need the Agent SDK + API key path. If a future CLI version
requires it, swap the spawn in `src/claude.ts` for the Agent SDK but keep the
`/ask` request/response shape unchanged so the UI is unaffected.

## Endpoints

- `POST /ask` — body `{ action?, prompt?, params?, sessionId? }`. Provide a
  named `action` (`startMock` / `scoreMock`, resolved from `src/prompts.ts`) or a
  raw `prompt` (used for each candidate turn, with `sessionId` to resume the
  interview). Streams newline-delimited JSON (`application/x-ndjson`): each line
  is a `claude` stream-json event, then a final `{ type: "done", sessionId,
  result }`. One run at a time (returns `409` if busy).
- `POST /api/resume` — multipart upload (field `file`); parses a PDF/DOCX/TXT
  resume to text and saves `data/resume.md`.
- `GET /api/health` — `{ claude: {ok}, hasResume }`.
- `GET /api/file?path=` — read a data file. `GET /api/collection?dir=mocks` —
  list scored mocks (score trend).
- `ws://<host>/watch` — broadcasts `{ type: "change", event, path }` when a file
  under `data/` or `mocks/` changes.

## Run

```
npm install
npm run dev      # tsx watch, http://localhost:4317
```

`npm run typecheck` type-checks without emitting. `ICM_PORT` overrides the port.
