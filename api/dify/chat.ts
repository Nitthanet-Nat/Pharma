type ChatRequestBody = {
  query?: string;
  inputs?: Record<string, unknown>;
  response_mode?: "blocking" | "streaming";
  user?: string;
  conversation_id?: string;
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

type DifyMode = "chat" | "workflow";

type DifyCallResult = {
  response: Response;
  data: unknown;
  endpoint: string;
  mode: DifyMode;
};

type DifyParameterField = {
  variable?: unknown;
  required?: unknown;
};

type DifyParametersResponse = {
  user_input_form?: Array<Record<string, DifyParameterField>>;
};

function normalizeDifyMode(modeValue?: string | null): DifyMode | null {
  const mode = (modeValue || "").trim().toLowerCase();
  if (!mode) return null;
  if (mode.includes("workflow")) return "workflow";
  if (mode.includes("chat") || mode.includes("agent") || mode.includes("completion")) return "chat";
  return null;
}

function isRouteMismatchError(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const payload = data as { code?: unknown; message?: unknown; details?: { code?: unknown; message?: unknown } };
  const nested = payload.details && typeof payload.details === "object" ? payload.details : null;
  const codeSource = nested?.code ?? payload.code;
  const messageSource = nested?.message ?? payload.message;
  const code = typeof codeSource === "string" ? codeSource : "";
  const message = typeof messageSource === "string" ? messageSource.toLowerCase() : "";
  return (
    code === "not_chat_app" ||
    code === "not_workflow_app" ||
    message.includes("app mode matches the right api route")
  );
}

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

function extractRequiredInputKeyFromError(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const payload = data as { message?: unknown; details?: { message?: unknown } };
  const messageSource = payload.details?.message ?? payload.message;
  if (typeof messageSource !== "string") return null;
  const match = messageSource.match(/([a-zA-Z0-9_]+)\s+is required in input form/i);
  return match?.[1] || null;
}

async function callDifyEndpoint(
  difyApiBase: string,
  apiKey: string,
  mode: DifyMode,
  payload: Record<string, unknown>
): Promise<DifyCallResult> {
  const endpoint = `${difyApiBase}${mode === "workflow" ? "/workflows/run" : "/chat-messages"}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => null);
  return { response, data, endpoint, mode };
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
  const configuredQueryInputKey = (process.env.DIFY_QUERY_INPUT_KEY || "").trim();
  const configuredMode = normalizeDifyMode(process.env.DIFY_APP_MODE || "workflow");

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
  let query = rawBody?.query?.toString().trim() || "";
  const workflowInputs: Record<string, unknown> = { ...(rawBody?.inputs ?? {}) };
  if (!query && configuredQueryInputKey) {
    const mappedInput = workflowInputs[configuredQueryInputKey];
    if (typeof mappedInput === "string") {
      query = mappedInput.trim();
    }
  }

  if (!query && Object.keys(workflowInputs).length === 0) {
    res.status(400).json({ error: "query or inputs is required" });
    return;
  }

  const responseMode = rawBody?.response_mode || "blocking";
  const user = rawBody?.user || "web-client-user";

  try {
    let detectedWorkflowInputKeys: string[] = [];
    if (!configuredQueryInputKey || !query || Object.keys(workflowInputs).length === 0) {
      const parametersResp = await fetch(`${difyApiBase}/parameters`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      }).catch(() => null);
      const parametersData = await parametersResp?.json().catch(() => null);
      detectedWorkflowInputKeys = extractWorkflowInputVariables(parametersData);
    }

    const candidateInputKeys = Array.from(
      new Set([configuredQueryInputKey, ...detectedWorkflowInputKeys, "user_input", "query"].filter(Boolean))
    );
    let resolvedQueryInputKey = "";
    for (const key of candidateInputKeys) {
      const value = workflowInputs[key];
      if (typeof value === "string" && value.trim()) {
        resolvedQueryInputKey = key;
        if (!query) query = value.trim();
        break;
      }
    }
    if (!resolvedQueryInputKey && query) {
      resolvedQueryInputKey = candidateInputKeys[0] || "query";
    }

    if (query) {
      if (workflowInputs[resolvedQueryInputKey] === undefined) workflowInputs[resolvedQueryInputKey] = query;
    }

    let detectedMode: DifyMode | null = null;
    if (!configuredMode) {
      const infoResp = await fetch(`${difyApiBase}/info`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      }).catch(() => null);
      const appInfo = (await infoResp?.json().catch(() => null)) as { mode?: string } | null;
      detectedMode = normalizeDifyMode(appInfo?.mode || null);
    }

    const preferredMode: DifyMode = configuredMode || detectedMode || (query ? "chat" : "workflow");
    const alternateMode: DifyMode = preferredMode === "chat" ? "workflow" : "chat";

    const buildPayload = (mode: DifyMode): Record<string, unknown> | null => {
      if (mode === "workflow") {
        if (Object.keys(workflowInputs).length === 0) return null;
        return {
          inputs: workflowInputs,
          response_mode: responseMode,
          user,
        };
      }
      if (!query) return null;
      return {
        query,
        inputs: workflowInputs,
        response_mode: responseMode,
        user,
        ...(rawBody?.conversation_id ? { conversation_id: rawBody.conversation_id } : {}),
      };
    };

    const firstPayload = buildPayload(preferredMode);
    if (!firstPayload) {
      res.status(400).json({
        error: "Invalid request for selected Dify mode",
        details: { mode: preferredMode, requires: preferredMode === "chat" ? "query" : "inputs" },
      });
      return;
    }

    let callResult = await callDifyEndpoint(difyApiBase, apiKey, preferredMode, firstPayload);
    if (!callResult.response.ok && callResult.mode === "workflow" && query) {
      const requiredInputKey = extractRequiredInputKeyFromError(callResult.data) || detectedWorkflowInputKeys[0] || "";
      const currentValue = requiredInputKey ? workflowInputs[requiredInputKey] : undefined;
      const shouldFillRequiredKey =
        Boolean(requiredInputKey) &&
        (typeof currentValue !== "string" || currentValue.trim().length === 0);
      if (requiredInputKey && shouldFillRequiredKey) {
        const retryInputs = { ...workflowInputs, [requiredInputKey]: query };
        callResult = await callDifyEndpoint(difyApiBase, apiKey, "workflow", {
          inputs: retryInputs,
          response_mode: responseMode,
          user,
        });
      }
    }
    if (!callResult.response.ok && isRouteMismatchError(callResult.data)) {
      const fallbackPayload = buildPayload(alternateMode);
      if (fallbackPayload) {
        callResult = await callDifyEndpoint(difyApiBase, apiKey, alternateMode, fallbackPayload);
      }
    }

    if (!callResult.response.ok) {
      const appInfoResp = await fetch(`${difyApiBase}/info`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      }).catch(() => null);
      const appInfo = (await appInfoResp?.json().catch(() => null)) as { mode?: string } | null;

      res.status(callResult.response.status).json({
        error: "Dify API call failed",
        endpoint: callResult.endpoint,
        diagnostics: {
          hasDifyBaseUrl: Boolean(process.env.DIFY_BASE_URL),
          hasDifyTarget: Boolean(process.env.DIFY_TARGET),
          configuredQueryInputKey,
          resolvedQueryInputKey,
          detectedWorkflowInputKeys,
          configuredMode,
          detectedMode,
          attemptedMode: callResult.mode,
          appMode: appInfo?.mode ?? null,
        },
        details: callResult.data,
      });
      return;
    }

    const { answer, outputs } = extractAnswer(callResult.data);

    res.status(200).json({
      ...(typeof callResult.data === "object" && callResult.data ? callResult.data : {}),
      answer,
      outputs,
      mode: callResult.mode,
    });
  } catch (error) {
    res.status(500).json({
      error: "Dify proxy failed",
      endpoint: difyApiBase,
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
