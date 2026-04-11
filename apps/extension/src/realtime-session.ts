import type { ProblemPayloadForBackend } from "./leetcode-page";
import {
  createRealtimeToolDispatcher,
  type RealtimeToolDispatcher,
  type RealtimeToolResult
} from "./realtime-tool-dispatch";

const OPENAI_REALTIME_CALLS_URL = "https://api.openai.com/v1/realtime/calls";

type RealtimeClientEvent =
  | { type: "response.create" }
  | {
      type: "conversation.item.create";
      item: {
        type: "function_call_output";
        call_id: string;
        output: string;
      };
    };

type RealtimeDataChannel = Pick<RTCDataChannel, "send" | "onmessage" | "onopen">;

type RealtimeFunctionCallEvent = {
  type: "response.function_call_arguments.done";
  call_id: string;
  name: string;
  arguments: string;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isRealtimeFunctionCallEvent = (
  value: unknown
): value is RealtimeFunctionCallEvent =>
  isObject(value) &&
  value.type === "response.function_call_arguments.done" &&
  typeof value.call_id === "string" &&
  typeof value.name === "string" &&
  typeof value.arguments === "string";

const parseToolArguments = (rawArguments: string): Record<string, unknown> | null => {
  try {
    const parsed = JSON.parse(rawArguments) as unknown;
    return isObject(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const readRealtimeError = async (response: Response): Promise<string> => {
  const contentType = response.headers.get("Content-Type") ?? "";

  if (contentType.includes("application/json")) {
    try {
      const payload = (await response.json()) as {
        error?: { message?: string; code?: string };
      };
      if (payload.error?.message) {
        return payload.error.message;
      }
      if (payload.error?.code) {
        return payload.error.code;
      }
    } catch {
      // Fall back to a plain-text read below if the body is not valid JSON.
    }
  }

  try {
    const text = await response.text();
    if (text.trim()) {
      return text.trim();
    }
  } catch {
    // Preserve the status fallback below when the body cannot be read.
  }

  return `OpenAI Realtime returned ${response.status}`;
};

export class RealtimeSession {
  private pc: RTCPeerConnection | null = null;
  private micStream: MediaStream | null = null;
  private audioEl: HTMLAudioElement | null = null;
  private dataChannel: RealtimeDataChannel | null = null;
  private toolDispatcher: RealtimeToolDispatcher;

  constructor({
    toolDispatcher = createRealtimeToolDispatcher()
  }: {
    toolDispatcher?: RealtimeToolDispatcher;
  } = {}) {
    this.toolDispatcher = toolDispatcher;
  }

  async start(clientSecretValue: string, model: string): Promise<void> {
    this.pc = new RTCPeerConnection();

    this.audioEl = document.createElement("audio");
    this.audioEl.autoplay = true;
    document.body.appendChild(this.audioEl);

    this.pc.ontrack = (event) => {
      if (this.audioEl && event.streams[0]) {
        this.audioEl.srcObject = event.streams[0];
      }
    };

    this.dataChannel = this.pc.createDataChannel("oai-events");
    this.dataChannel.onopen = () => {
      this.sendClientEvent({ type: "response.create" });
    };
    this.dataChannel.onmessage = (event) => {
      void this.handleDataChannelMessage(event.data);
    };

    this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    for (const track of this.micStream.getTracks()) {
      this.pc.addTrack(track, this.micStream);
    }

    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);

    const response = await fetch(OPENAI_REALTIME_CALLS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clientSecretValue}`,
        "Content-Type": "application/sdp",
      },
      body: offer.sdp,
    });

    if (!response.ok) {
      this.cleanup();
      throw new Error(await readRealtimeError(response));
    }

    const answerSdp = await response.text();
    await this.pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
  }

  setMuted(muted: boolean): void {
    for (const track of this.micStream?.getAudioTracks() ?? []) {
      track.enabled = !muted;
    }
  }

  end(): void {
    this.cleanup();
  }

  private sendClientEvent(event: RealtimeClientEvent): void {
    this.dataChannel?.send(JSON.stringify(event));
  }

  private cleanup(): void {
    for (const track of this.micStream?.getTracks() ?? []) {
      track.stop();
    }
    this.pc?.close();
    if (this.audioEl) {
      this.audioEl.srcObject = null;
      this.audioEl.remove();
    }
    this.pc = null;
    this.micStream = null;
    this.audioEl = null;
    this.dataChannel = null;
  }

  private async handleDataChannelMessage(rawData: unknown): Promise<void> {
    if (typeof rawData !== "string") {
      return;
    }

    let event: unknown;

    try {
      event = JSON.parse(rawData) as unknown;
    } catch {
      console.warn("[loop] Ignoring malformed Realtime data channel event");
      return;
    }

    if (!isRealtimeFunctionCallEvent(event)) {
      return;
    }

    const parsedArguments = parseToolArguments(event.arguments);

    if (!parsedArguments) {
      console.warn("[loop] Ignoring tool call with malformed arguments", event.name);
      return;
    }

    let output: RealtimeToolResult;

    try {
      output = await this.toolDispatcher.dispatch({
        name: event.name,
        arguments: parsedArguments
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown tool failure";
      console.error("[loop] Tool dispatch failed", error);
      output = { ok: false, error: message };
    }

    this.sendClientEvent({
      type: "conversation.item.create",
      item: {
        type: "function_call_output",
        call_id: event.call_id,
        output: JSON.stringify(output)
      }
    });
    this.sendClientEvent({ type: "response.create" });
  }
}

export type ClientSecretResponse = {
  value: string;
  expires_at: number;
  session: { id: string; model: string; object: string; type: string };
};

export async function fetchClientSecret(
  apiBaseUrl: string,
  payload: ProblemPayloadForBackend
): Promise<ClientSecretResponse> {
  const response = await fetch(`${apiBaseUrl}/v1/realtime/sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Session broker returned ${response.status}`);
  }

  return response.json() as Promise<ClientSecretResponse>;
}
