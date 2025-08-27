import { ChatStreamRequest, StreamCallbacks, StreamDelta, StreamDone, APIError } from "./types";
import { API_BASE } from "./api";

export async function streamChat(
  request: Omit<ChatStreamRequest, "stream">,
  callbacks: StreamCallbacks
): Promise<void> {
  const { onDelta, onDone, onError, signal } = callbacks;

  try {
    const response = await fetch(`${API_BASE}/chat/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...request,
        stream: true,
      }),
      signal,
    });

    if (!response.ok) {
      throw new APIError(
        response.status,
        response.statusText,
        `Stream failed: ${response.status} ${response.statusText}`
      );
    }

    if (!response.body) {
      throw new Error("Response body is null");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { value, done } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });

        // SSE events are separated by double newlines
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || ""; // incomplete tail stays in buffer

        for (const part of parts) {
          if (!part.trim()) continue;
          
          const lines = part.split("\n");
          const eventLine = lines.find((l) => l.startsWith("event:"));
          const dataLine = lines.find((l) => l.startsWith("data:"));
          
          if (!dataLine) continue;
          
          const eventType = eventLine ? eventLine.replace("event:", "").trim() : "message";
          const jsonStr = dataLine.replace("data:", "").trim();
          
          try {
            const data = JSON.parse(jsonStr);
            
            if (eventType === "delta" && typeof data.text === "string") {
              onDelta(data as StreamDelta);
            } else if (eventType === "done") {
              onDone(data as StreamDone);
              return; // Stream completed successfully
            }
          } catch (parseError) {
            // Ignore JSON parse errors for malformed lines
            console.warn("Failed to parse SSE data:", parseError);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        // Stream was cancelled, this is expected
        return;
      }
      onError(error);
    } else {
      onError(new Error("Unknown streaming error"));
    }
  }
}
