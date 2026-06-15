import { useEffect, useRef, useState } from "react";

export interface ChangeMessage {
  type: "change";
  event: "add" | "change" | "unlink";
  path: string;
}

/**
 * Subscribe to the backend file-watch WebSocket. `onChange` fires whenever a
 * data file changes, so screens can re-read files and update live.
 * Returns whether the socket is currently connected.
 */
export function useWatch(onChange: (msg: ChangeMessage) => void): boolean {
  const [connected, setConnected] = useState(false);
  const cb = useRef(onChange);
  cb.current = onChange;

  useEffect(() => {
    let ws: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let closed = false;

    const connect = () => {
      const proto = location.protocol === "https:" ? "wss" : "ws";
      ws = new WebSocket(`${proto}://${location.host}/watch`);
      ws.onopen = () => setConnected(true);
      ws.onclose = () => {
        setConnected(false);
        if (!closed) retry = setTimeout(connect, 1500);
      };
      ws.onerror = () => ws?.close();
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === "change") cb.current(msg);
        } catch {
          /* ignore malformed */
        }
      };
    };
    connect();

    return () => {
      closed = true;
      if (retry) clearTimeout(retry);
      ws?.close();
    };
  }, []);

  return connected;
}
