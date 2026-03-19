type ChatRequestBody = {
  query?: string;
  inputs?: Record<string, unknown>;
  response_mode?: "blocking" | "streaming";
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

type DifyParameterField = {
  variable?: unknown;
  required?: unknown;
};

type DifyParametersResponse = {
  user_input_form?: Array<Record<string, DifyParameterField>>;
};

function extractAnswer(data: unknown): { answer: string; outputs: Record<string, unknown> } {
  const payload = data as {
    answer?: unknown;
    data?: { outputs?: Record<string, unknown> };
  };
  const outputs = payload?.data?.outputs || {};
  const rawAnswer =
    (typeof payload?.answer === "string" && payload.answer) ||
    (typeof outputs.answer === "string" && outputs.answer) ||
    (typeof outputs.text === "string" && outputs.text) ||
    (typeof outputs.result === "string" && outputs.result) ||
    (typeof outputs.output === "string" && outputs.output) ||
    "";
  const answer = rawAnswer.replace(/<think>[\s\S]*?<\/think>\s*/gi, "").trim();
  return { answer, outputs };
}

function extractWorkflowInputVariables(parameters: unknown): string[] {
  if (!parameters || typeof parameters !== "object") return [];
  const response = parameters as DifyParametersResponse;
  if (!Array.isArray(response.user_input_form)) return [];

  const requiredVariables: string[] = [];
  const optionalVariables: string[] = [];

  for (const item of response.user_input_form) {
    if (!item || typeof item !== "object") continue;
    for (const config of Object.values(item)) {
      if (!config || typeof config !== "object") continue;
      const variable = typeof config.variable === "string" ? config.variable.trim() : "";
      if (!variable) continue;
      if (Boolean(config.required)) requiredVariables.push(variable);
      else optionalVariables.push(variable);
    }
  }

  return Array.from(new Set([...requiredVariables, ...optionalVariables]));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  const apiKey = process.env.DIFY_API_KEY || "";
  const rawDifyTarget = process.env.DIFY_BASE_URL || process.env.DIFY_TARGET || "https://dify2.nrct.ai.in.th/v1";
  const difyTarget = rawDifyTarget.replace(/\/+$/, "");
  const difyApiBase = /\/v1$/i.test(difyTarget) ? difyTarget : `${difyTarget}/v1`;
  const configuredQueryInputKey = (process.env.DIFY_QUERY_INPUT_KEY || "user_input").trim() || "user_input";

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

  const responseMode = rawBody?.response_mode || "blocking";
  const user = rawBody?.user?.toString().trim() || "web-client-user";
  const query = rawBody?.query?.toString().trim() || "";
  const workflowInputs: Record<string, unknown> = { ...(rawBody?.inputs ?? {}) };

  try {
    const parametersResp = await fetch(`${difyApiBase}/parameters`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    }).catch(() => null);
    const parametersData = await parametersResp?.json().catch(() => null);
    const detectedWorkflowInputKeys = extractWorkflowInputVariables(parametersData);
    const queryInputKey = configuredQueryInputKey || detectedWorkflowInputKeys[0] || "user_input";

    if (query && workflowInputs[queryInputKey] === undefined) {
      workflowInputs[queryInputKey] = query;
    }

    if (Object.keys(workflowInputs).length === 0) {
      res.status(400).json({
        error: "inputs is required for workflow apps",
        details: {
          queryInputKey,
          detectedWorkflowInputKeys,
        },
      });
      return;
    }

    const endpoint = `${difyApiBase}/workflows/run`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: workflowInputs,
        response_mode: responseMode,
        user,
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const infoResp = await fetch(`${difyApiBase}/info`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      }).catch(() => null);
      const appInfo = (await infoResp?.json().catch(() => null)) as { mode?: string } | null;

      res.status(response.status).json({
        error: "Dify API call failed",
        endpoint,
        diagnostics: {
          appMode: appInfo?.mode ?? null,
          queryInputKey,
          detectedWorkflowInputKeys,
        },
        details: data,
      });
      return;
    }

    const { answer, outputs } = extractAnswer(data);

    res.status(200).json({
      ...(typeof data === "object" && data ? data : {}),
      answer,
      outputs,
      mode: "workflow",
    });
  } catch (error) {
    res.status(500).json({
      error: "Dify proxy failed",
      endpoint: `${difyApiBase}/workflows/run`,
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
