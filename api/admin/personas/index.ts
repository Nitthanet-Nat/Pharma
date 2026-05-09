import { prisma } from '../../../lib/prisma';
import { requireAdmin, sendAuthError } from '../../../lib/auth';

type VercelRequest = {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  body?: Record<string, unknown> | string;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
};

const includeHealthContext = {
  allergies: true,
  chronicDiseases: true,
  currentMedications: true,
  user: { select: { id: true, email: true, name: true, activePatientPersonaId: true } },
} as const;

const getString = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
const getOptionalNumber = (value: unknown) => {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parseBody = (body: VercelRequest['body']) =>
  typeof body === 'string' ? (JSON.parse(body) as Record<string, unknown>) : body || {};

const buildPersonaData = (body: Record<string, unknown>, userId: string) => ({
  userId,
  displayName: getString(body.displayName),
  relationship: getString(body.relationship) || 'myself',
  gender: getString(body.gender) || null,
  dateOfBirth: getString(body.dateOfBirth) ? new Date(getString(body.dateOfBirth)) : null,
  age: getOptionalNumber(body.age),
  weightKg: getOptionalNumber(body.weightKg),
  heightCm: getOptionalNumber(body.heightCm),
  pregnancyStatus: getString(body.pregnancyStatus) || null,
  breastfeedingStatus: getString(body.breastfeedingStatus) || null,
  medicationHistory: getString(body.medicationHistory) || null,
  preferredLanguage: getString(body.preferredLanguage) || 'th',
  emergencyContact: getString(body.emergencyContact) || null,
  notes: getString(body.notes) || null,
});

const buildNestedCreate = (body: Record<string, unknown>) => {
  const allergies = Array.isArray(body.allergies) ? body.allergies : [];
  const chronicDiseases = Array.isArray(body.chronicDiseases) ? body.chronicDiseases : [];
  const currentMedications = Array.isArray(body.currentMedications) ? body.currentMedications : [];

  return {
    allergies: {
      create: allergies
        .map((item) => item as Record<string, unknown>)
        .filter((item) => getString(item.substance))
        .map((item) => ({
          substance: getString(item.substance),
          reaction: getString(item.reaction) || null,
          severity: getString(item.severity) || null,
          notes: getString(item.notes) || null,
        })),
    },
    chronicDiseases: {
      create: chronicDiseases
        .map((item) => item as Record<string, unknown>)
        .filter((item) => getString(item.name))
        .map((item) => ({
          name: getString(item.name),
          severity: getString(item.severity) || null,
          notes: getString(item.notes) || null,
        })),
    },
    currentMedications: {
      create: currentMedications
        .map((item) => item as Record<string, unknown>)
        .filter((item) => getString(item.name))
        .map((item) => ({
          name: getString(item.name),
          dose: getString(item.dose) || null,
          frequency: getString(item.frequency) || null,
          notes: getString(item.notes) || null,
        })),
    },
  };
};

const ensureUser = (body: Record<string, unknown>) => {
  const userId = getString(body.userId) || 'web-client-user';
  return prisma.user.upsert({
    where: { id: userId },
    update: {
      email: getString(body.userEmail) || undefined,
      name: getString(body.userName) || undefined,
    },
    create: {
      id: userId,
      email: getString(body.userEmail) || null,
      name: getString(body.userName) || 'RSU Pharma User',
    },
  });
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await requireAdmin(req, res);
  } catch (error) {
    sendAuthError(error, res);
    return;
  }

  if (req.method === 'GET') {
    const personas = await prisma.patientPersona.findMany({
      include: includeHealthContext,
      orderBy: { updatedAt: 'desc' },
    });
    res.status(200).json(personas);
    return;
  }

  if (req.method === 'POST') {
    const body = parseBody(req.body);
    const user = await ensureUser(body);
    const personaData = buildPersonaData(body, user.id);

    if (!personaData.displayName) {
      res.status(400).json({ error: 'displayName is required' });
      return;
    }

    const persona = await prisma.patientPersona.create({
      data: {
        ...personaData,
        ...buildNestedCreate(body),
      },
      include: includeHealthContext,
    });

    if (!user.activePatientPersonaId) {
      await prisma.user.update({
        where: { id: user.id },
        data: { activePatientPersonaId: persona.id },
      });
    }

    res.status(201).json(persona);
    return;
  }

  res.setHeader('Allow', 'GET, POST');
  res.status(405).json({ error: 'Method Not Allowed' });
}
