type ChatRequestBody = {
  query?: string;
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
  const workflowInputs: Record<string, unknown> = { ...(rawBody?.inputs ?? {}) };
  if (query) {
    // Keep compatibility with common workflow variable names.
    if (workflowInputs.query === undefined) workflowInputs.query = query;
    if (workflowInputs.user_query === undefined) workflowInputs.user_query = query;
    if (workflowInputs.message === undefined) workflowInputs.message = query;
  }

  if (Object.keys(workflowInputs).length === 0) {
    res.status(400).json({ error: "inputs or query is required" });
    return;
  }

  const payload: Record<string, unknown> = {
    inputs: workflowInputs,
    response_mode: "blocking",
    user: rawBody?.user || "web-client-user",
  };

  try {
    const response = await fetch(`${difyApiBase}/workflows/run`, {
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
        endpoint: `${difyApiBase}/workflows/run`,
        details: data,
      });
      return;
    }

    const outputs = (data as { data?: { outputs?: Record<string, unknown> } })?.data?.outputs || {};
    const answer =
      (outputs.answer as string) ||
      (outputs.text as string) ||
      (outputs.result as string) ||
      (outputs.output as string) ||
      "";

    res.status(200).json({
      ...data,
      answer,
      outputs,
    });
  } catch (error) {
    res.status(500).json({
      error: "Dify proxy failed",
      endpoint: `${difyApiBase}/workflows/run`,
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
