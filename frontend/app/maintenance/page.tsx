"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

const SYSTEM_PROMPT = `You are an AI development agent. When the CEO describes a feature, ask clarifying questions until requirements are actionable and reply CONFIRMED. After confirmation, draft an implementation plan and invoke a coding service (e.g., Codex) to implement the feature. Run pytest and npm test, commit to a non-main branch, push, and open a pull request.`;

export default function MaintenancePage() {
  const [messages, setMessages] = useState<Message[]>([{ role: "system", content: SYSTEM_PROMPT }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const updated = [...messages, { role: "user", content: input }];
    setMessages(updated);
    setInput("");
    setLoading(true);

    const response = await fetch("/api/maintenance/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: updated }),
    });

    if (!response.body) {
      setLoading(false);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let assistant = "";
    const assistantIndex = updated.length;
    setMessages((msgs) => [...msgs, { role: "assistant", content: "" }]);

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      const parts = chunk.split("\n\n");
      for (const part of parts) {
        if (!part.trim()) continue;
        const lines = part.split("\n");
        const eventLine = lines.find((l) => l.startsWith("event:"));
        const dataLine = lines.find((l) => l.startsWith("data:"));
        if (!dataLine) continue;
        const event = eventLine ? eventLine.replace("event:", "").trim() : "";
        const data = JSON.parse(dataLine.replace("data:", "").trim());
        if (event === "delta" && typeof data.text === "string") {
          assistant += data.text;
          setMessages((msgs) => {
            const next = [...msgs];
            next[assistantIndex] = { role: "assistant", content: assistant };
            return next;
          });
        }
      }
    }

    setLoading(false);
    if (assistant.includes("CONFIRMED")) {
      setConfirmed(true);
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Maintenance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ScrollArea className="h-80 border rounded p-4">
            {messages
              .filter((m) => m.role !== "system")
              .map((m, idx) => (
                <div key={idx} className="mb-2">
                  <div className="font-semibold text-sm capitalize">{m.role}</div>
                  <div className="whitespace-pre-wrap text-sm">{m.content}</div>
                </div>
              ))}
          </ScrollArea>
          <div className="flex flex-col gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              placeholder="Describe the feature..."
            />
            <div className="flex gap-2">
              <Button onClick={sendMessage} disabled={loading || !input.trim()}>
                Send
              </Button>
              <Button variant="secondary" disabled={!confirmed}>
                Generate Plan
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
