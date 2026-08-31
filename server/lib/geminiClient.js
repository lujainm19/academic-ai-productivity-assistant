// Thin wrapper around the Gemini API (Google AI Studio free tier).
// Docs: https://ai.google.dev/api/generate-content
//
// The API key travels as a header here (not a query string) so it never
// ends up logged in a URL by an intermediary proxy.

export function isGeminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

// `systemContext` is where we hand Gemini the student's real Canvas +
// task data so its answers are grounded instead of generic — this is the
// seam the agentic layer (phase 3) plugs into.
export async function askGemini({ message, history = [], systemContext = "" }) {
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const contents = [
    ...history.map(m => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    })),
    { role: "user", parts: [{ text: message }] },
  ];

  const body = {
    contents,
    ...(systemContext && { systemInstruction: { parts: [{ text: systemContext }] } }),
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": process.env.GEMINI_API_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Gemini API ${res.status}: ${errBody.slice(0, 300)}`);
  }

  const data = await res.json();
  const reply = data.candidates?.[0]?.content?.parts?.map(p => p.text).join("") ?? "";
  if (!reply) throw new Error("Gemini returned no text (possibly blocked by safety filters)");
  return reply;
}
