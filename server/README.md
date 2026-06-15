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

- `POST /ask` — body `{ action?, prompt?, sessionId? }`. Provide a named
  `action` (resolved from `src/prompts.ts`) or a raw `prompt`. Streams
  newline-delimited JSON (`application/x-ndjson`): each line is a `claude`
  stream-json event, followed by a final `{ type: "done", sessionId, result }`.
  Only one AI action runs at a time (returns `409` if busy) to avoid concurrent
  file edits.
- `GET /api/logs` — daily logs in `data/logs/` with parsed frontmatter.
- `GET /api/health` — reports whether the `claude` CLI is installed.
- `ws://<host>/watch` — WebSocket; broadcasts `{ type: "change", event, path }`
  whenever a file under `data/ goals/ roadmaps/ schedule/ mocks/` changes
  (`data/index.json` is ignored).

## Run

```
npm install
npm run dev      # tsx watch, http://localhost:4317
```

`npm run typecheck` type-checks without emitting. `ICM_PORT` overrides the port.
