import { useState } from "react";
import { askStream, eventText, type AskRequest, type ClaudeEvent } from "./api";

export type AiStatus = "idle" | "running" | "done" | "error";

/**
 * Run a streaming AI action (POST /ask) with simple status + a live status
 * line. Files update via the watcher, so callers usually just react to status.
 */
export function useAiAction() {
  const [status, setStatus] = useState<AiStatus>("idle");
  const [line, setLine] = useState("");

  const run = async (req: AskRequest): Promise<string | null> => {
    setStatus("running");
    setLine("Thinking…");
    try {
      const { result } = await askStream(req, (ev: ClaudeEvent) => {
        if (ev.type === "assistant") {
          const { text, tools } = eventText(ev);
          if (tools.length) setLine(`Editing files… (${tools.join(", ")})`);
          else if (text) setLine(text);
        }
      });
      setLine(result ?? "Done.");
      setStatus("done");
      return result;
    } catch (e) {
      setLine((e as Error).message);
      setStatus("error");
      return null;
    }
  };

  return { status, line, run };
}
