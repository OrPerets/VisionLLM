"use client";

import { useState } from "react";
import { generateMaintenancePlan } from "@/lib/api";
import type { MaintenancePlanResponse } from "@/lib/types";

export default function MaintenancePage() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<MaintenancePlanResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const resp = await generateMaintenancePlan({
        transcript: [{ role: "user", content: text }],
      });
      setResult(resp);
    } catch (err) {
      console.error(err);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Maintenance Plan</h1>
      <textarea
        className="w-full border p-2 h-40"
        placeholder="Describe the feature request"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button
        className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        onClick={handleGenerate}
        disabled={loading || text.trim().length === 0}
      >
        {loading ? "Generating..." : "Generate Plan"}
      </button>
      {result && (
        <div>
          Plan saved: <a className="text-blue-600 underline" href={result.link}>{result.link}</a>
        </div>
      )}
    </div>
  );
}
