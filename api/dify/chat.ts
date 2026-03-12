type ChatRequestBody = {
  query?: string;
  conversationId?: string;
  inputs?: Record<string, unknown>;
  user?: string;
};

type VercelRequest = {
  method?: string;
  body?: ChatRequestBody | string;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  const apiKey = process.env.DIFY_API_KEY || "";
  const rawDifyTarget = process.env.DIFY_BASE_URL || process.env.DIFY_TARGET || "https://dify2.nrct.ai.in.th";
  const difyTarget = rawDifyTarget.replace(/\/+$/, "");
  const difyApiBase = /\/v1$/i.test(difyTarget) ? difyTarget : `${difyTarget}/v1`;

  if (!apiKey) {
    res.status(500).json({ error: "Missing DIFY_API_KEY on server" });
    return;
  }

  let rawBody: ChatRequestBody | undefined;
  try {
    rawBody = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    res.status(400).json({ error: "Invalid JSON body" });
    return;
  }
  const query = rawBody?.query?.toString().trim();

  if (!query) {
    res.status(400).json({ error: "query is required" });
    return;
  }

  const payload: Record<string, unknown> = {
    inputs: rawBody?.inputs ?? {},
    query,
    response_mode: "blocking",
    user: rawBody?.user || "web-client-user",
  };

  if (rawBody?.conversationId) {
    payload.conversation_id = rawBody.conversationId;
  }

  try {
    const response = await fetch(`${difyApiBase}/chat-messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      res.status(response.status).json({
        error: "Dify API call failed",
        endpoint: `${difyApiBase}/chat-messages`,
        details: data,
      });
      return;
    }

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Dify proxy failed",
      endpoint: `${difyApiBase}/chat-messages`,
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
