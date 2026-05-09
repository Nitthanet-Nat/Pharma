import { prisma } from '../../lib/prisma';
import { requireAdmin, sendAuthError } from '../../lib/auth';

type VercelRequest = {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await requireAdmin(req, res);
  } catch (error) {
    sendAuthError(error, res);
    return;
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const users = await prisma.user.findMany({
    include: {
      patientPersonas: {
        include: {
          allergies: true,
          chronicDiseases: true,
          currentMedications: true,
        },
        orderBy: { updatedAt: 'desc' },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  res.status(200).json(users);
}
