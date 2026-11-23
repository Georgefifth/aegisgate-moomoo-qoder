/**
 * AegisGate — Momen Headless BaaS Dual-Channel Client (GraphQL HTTP v2 + Legacy subscriptions-transport-ws)
 * Follows `momen-headless-pipeline` reference architecture with graceful deterministic local persistence.
 */

import { HistoricalAuditDecisionRow, INITIAL_DECISION_LEDGER } from "./engine/marketDataset";

export const DEFAULT_MOMEN_PROJECT_EX_ID =
  (import.meta as any).env?.VITE_MOMEN_PROJECT_EX_ID || "aegisgate_moomoo_qoder_v1";

export function getMomenHttpEndpoint(projectExId = DEFAULT_MOMEN_PROJECT_EX_ID): string {
  return `https://villa.momen.app/zero/${projectExId}/api/graphql-v2`;
}

export function getMomenWsEndpoint(projectExId = DEFAULT_MOMEN_PROJECT_EX_ID): string {
  return `wss://villa.momen.app/zero/${projectExId}/api/graphql-subscription`;
}

export interface WsFrameLog {
  id: string;
  timestamp: string;
  direction: "TX" | "RX" | "LOCAL";
  type: string;
  summary: string;
}

const STORAGE_KEY_DECISIONS = "aegisgate_decisions_v1";

export function loadPersistedDecisions(): HistoricalAuditDecisionRow[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_DECISIONS);
    if (!raw) return INITIAL_DECISION_LEDGER;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {
    // ignore storage read errors
  }
  return INITIAL_DECISION_LEDGER;
}

export function savePersistedDecisions(rows: HistoricalAuditDecisionRow[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY_DECISIONS, JSON.stringify(rows));
  } catch {
    // ignore storage write errors
  }
}

export async function momenGraphql<T = any>(
  query: string,
  variables?: Record<string, unknown>,
  projectExId = DEFAULT_MOMEN_PROJECT_EX_ID,
  jwtToken?: string
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (jwtToken) {
    headers["Authorization"] = `Bearer ${jwtToken}`;
  }

  const res = await fetch(getMomenHttpEndpoint(projectExId), {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new Error(`Momen HTTP ${res.status}`);
  }

  const json = await res.json();
  if (json.errors && json.errors.length > 0) {
    throw new Error(json.errors.map((e: any) => e.message).join("; "));
  }
  return json.data as T;
}

type SubHandler = {
  onData: (data: any) => void;
  onError?: (err: any) => void;
  onComplete?: () => void;
};

/**
 * Momen's WebSocket endpoint speaks the legacy Apollo `subscriptions-transport-ws`
 * wire protocol (`connection_init` -> `connection_ack` -> `start`/`data`/`complete`/`stop`).
 */
export class MomenRealtimeWsEngine {
  private ws: WebSocket | null = null;
  private acked = false;
  private opCounter = 1;
  private subs = new Map<string, SubHandler>();
  private pendingFrames: string[] = [];
  public state: string = "READY_DETERMINISTIC";
  private onFrameLog?: (frame: WsFrameLog) => void;

  constructor(onFrameLog?: (frame: WsFrameLog) => void) {
    this.onFrameLog = onFrameLog;
  }

  private emitLog(direction: "TX" | "RX" | "LOCAL", type: string, summary: string) {
    this.onFrameLog?.({
      id: `frm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString().slice(11, 23),
      direction,
      type,
      summary,
    });
  }

  public connect(projectExId = DEFAULT_MOMEN_PROJECT_EX_ID, jwtToken?: string) {
    if (!projectExId || projectExId === "aegisgate_moomoo_qoder_v1") {
      this.state = "LOCAL_DETERMINISTIC_SYNC";
      this.emitLog(
        "LOCAL",
        "connection_ack",
        "Deterministic Local + JSONL Audit Bus Active (Momen BaaS Dual-Channel Ready)"
      );
      return;
    }

    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    try {
      this.acked = false;
      this.state = "CONNECTING";
      this.ws = new WebSocket(getMomenWsEndpoint(projectExId), "graphql-ws");

      this.ws.onopen = () => {
        this.state = "HANDSHAKING";
        const payload = jwtToken ? { Authorization: `Bearer ${jwtToken}` } : {};
        const initFrame = JSON.stringify({ type: "connection_init", payload });
        this.emitLog("TX", "connection_init", "Sent legacy subscriptions-transport-ws handshake");
        this.ws?.send(initFrame);
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(String(event.data));
          if (msg.type === "connection_ack") {
            this.acked = true;
            this.state = "CONNECTED_MOMEN_WS";
            this.emitLog("RX", "connection_ack", "Momen WebSocket subscription channel established");
            while (this.pendingFrames.length > 0) {
              this.ws?.send(this.pendingFrames.shift()!);
            }
            return;
          }
          if (msg.type === "data" && msg.id) {
            this.emitLog("RX", "data", `Subscription frame ${msg.id} received`);
            this.subs.get(String(msg.id))?.onData(msg.payload?.data);
          } else if (msg.type === "error" && msg.id) {
            this.subs.get(String(msg.id))?.onError?.(msg.payload);
          } else if (msg.type === "complete" && msg.id) {
            const sub = this.subs.get(String(msg.id));
            this.subs.delete(String(msg.id));
            sub?.onComplete?.();
          }
        } catch {
          // ignore malformed frame
        }
      };

      this.ws.onerror = () => {
        this.state = "LOCAL_DETERMINISTIC_SYNC";
      };

      this.ws.onclose = () => {
        this.acked = false;
        this.state = "LOCAL_DETERMINISTIC_SYNC";
      };
    } catch {
      this.state = "LOCAL_DETERMINISTIC_SYNC";
    }
  }
}
