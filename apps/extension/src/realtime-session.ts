const OPENAI_REALTIME_CALLS_URL = "https://api.openai.com/v1/realtime/calls";

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

    this.pc.createDataChannel("oai-events");

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
  }
}

export type ClientSecretResponse = {
  value: string;
  expires_at: number;
  session: { id: string; model: string; object: string; type: string };
};

export async function fetchClientSecret(
  apiBaseUrl: string
): Promise<ClientSecretResponse> {
  const response = await fetch(`${apiBaseUrl}/v1/realtime/sessions`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Session broker returned ${response.status}`);
  }

  return response.json() as Promise<ClientSecretResponse>;
}
