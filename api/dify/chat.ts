type ChatRequestBody = {
  query?: string;
  inputs?: Record<string, unknown>;
  response_mode?: 'blocking' | 'streaming';
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

const demoAnswer = (query: string) =>
  [
    `รับทราบคำถาม: "${query || 'ทดลองแชท'}"`,
    '',
    'ตอนนี้ระบบอยู่ในโหมดทดลองใช้งาน โดยไม่ใช้ระบบ login และไม่บันทึกข้อมูลลงฐานข้อมูล',
    '',
    'คำแนะนำเบื้องต้น:',
    '- ระบุอาการหลัก อายุ น้ำหนัก โรคประจำตัว ยาที่ใช้อยู่ และประวัติแพ้ยา',
    '- หากมีอาการรุนแรง เช่น หายใจลำบาก เจ็บหน้าอก หน้ามืดมาก หรือแพ้ยารุนแรง ควรไปพบแพทย์ทันที',
    '- ข้อมูลนี้ใช้สำหรับทดลองระบบเท่านั้น ไม่แทนการวินิจฉัยหรือคำสั่งแพทย์',
  ].join('\n');

const parseBody = (body: VercelRequest['body']): ChatRequestBody => {
  if (!body) return {};
  if (typeof body === 'string') return JSON.parse(body) as ChatRequestBody;
  return body;
};

const extractAnswer = (data: unknown) => {
  const payload = data as {
    answer?: unknown;
    data?: { outputs?: Record<string, unknown> };
  };
  const outputs = payload?.data?.outputs || {};
  const rawAnswer =
    (typeof payload?.answer === 'string' && payload.answer) ||
    (typeof outputs.answer === 'string' && outputs.answer) ||
    (typeof outputs.text === 'string' && outputs.text) ||
    (typeof outputs.result === 'string' && outputs.result) ||
    (typeof outputs.output === 'string' && outputs.output) ||
    '';

  return {
    answer: rawAnswer.replace(/<think>[\s\S]*?<\/think>\s*/gi, '').trim(),
    outputs,
  };
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');

  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      res.status(405).json({ error: 'Method Not Allowed' });
      return;
    }

    let rawBody: ChatRequestBody;
    try {
      rawBody = parseBody(req.body);
    } catch {
      res.status(200).json({ answer: demoAnswer(''), mode: 'demo', error: 'Invalid JSON body' });
      return;
    }

    const query = rawBody.query?.toString().trim() || '';
    const apiKey = process.env.DIFY_API_KEY?.trim() || '';
    const rawDifyTarget = (process.env.DIFY_BASE_URL || process.env.DIFY_TARGET || 'https://dify2.nrct.ai.in.th/v1').trim();
    const difyTarget = rawDifyTarget.replace(/\/+$/, '');
    const difyApiBase = /\/v1$/i.test(difyTarget) ? difyTarget : `${difyTarget}/v1`;
    const queryInputKey = (process.env.DIFY_QUERY_INPUT_KEY || 'user_input').trim() || 'user_input';

    if (!apiKey) {
      res.status(200).json({
        answer: demoAnswer(query),
        mode: 'demo',
        warning: 'Missing DIFY_API_KEY on server',
      });
      return;
    }

    const workflowInputs: Record<string, unknown> = { ...(rawBody.inputs || {}) };
    if (query && workflowInputs[queryInputKey] === undefined) {
      workflowInputs[queryInputKey] = query;
    }

    const response = await fetch(`${difyApiBase}/workflows/run`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: workflowInputs,
        response_mode: rawBody.response_mode || 'blocking',
        user: rawBody.user?.toString().trim() || 'demo-user',
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      res.status(200).json({
        answer: demoAnswer(query),
        mode: 'demo',
        warning: 'Dify API call failed',
        status: response.status,
        details: data,
      });
      return;
    }

    const { answer, outputs } = extractAnswer(data);

    res.status(200).json({
      ...(typeof data === 'object' && data ? data : {}),
      answer: answer || demoAnswer(query),
      outputs,
      mode: answer ? 'workflow' : 'demo',
    });
  } catch (error) {
    res.status(200).json({
      answer: demoAnswer(''),
      mode: 'demo',
      warning: 'Dify proxy recovered from an error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
