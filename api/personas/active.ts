import { prisma } from '../../lib/prisma';
import { requireUser, sendAuthError } from '../../lib/auth';

type VercelRequest = {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  query?: Record<string, string | string[]>;
  body?: Record<string, unknown> | string;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
};

const getString = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
const parseBody = (body: VercelRequest['body']) =>
  typeof body === 'string' ? (JSON.parse(body) as Record<string, unknown>) : body || {};
const getUserId = (req: VercelRequest, body?: Record<string, unknown>) => {
  const queryUserId = Array.isArray(req.query?.userId) ? req.query?.userId[0] : req.query?.userId;
  return getString(body?.userId) || getString(queryUserId) || 'web-client-user';
};

const ensureUser = (userId: string) =>
  prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: { id: userId, name: 'RSU Pharma User' },
  });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  let currentUser: { id: string };
  try {
    currentUser = await requireUser(req, res);
  } catch (error) {
    sendAuthError(error, res);
    return;
  }

  if (req.method === 'GET') {
    const userId = currentUser.id;
    const user = await ensureUser(userId);
    res.status(200).json({ activePatientPersonaId: user.activePatientPersonaId });
    return;
  }

  if (req.method === 'POST') {
    const body = parseBody(req.body);
    const userId = currentUser.id;
    const patientPersonaId = getString(body.patientPersonaId);

    if (!patientPersonaId) {
      res.status(400).json({ error: 'patientPersonaId is required' });
      return;
    }

    await ensureUser(userId);
    const persona = await prisma.patientPersona.findFirst({
      where: { id: patientPersonaId, userId },
      select: { id: true },
    });

    if (!persona) {
      res.status(404).json({ error: 'Patient persona not found' });
      return;
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { activePatientPersonaId: patientPersonaId },
      select: { activePatientPersonaId: true },
    });

    res.status(200).json(user);
    return;
  }

  res.setHeader('Allow', 'GET, POST');
  res.status(405).json({ error: 'Method Not Allowed' });
}
