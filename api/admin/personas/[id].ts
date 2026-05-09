import { prisma } from '../../../lib/prisma';

type VercelRequest = {
  method?: string;
  query?: Record<string, string | string[]>;
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
const getId = (req: VercelRequest) => getString(Array.isArray(req.query?.id) ? req.query?.id[0] : req.query?.id);

const buildPersonaData = (body: Record<string, unknown>) => ({
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const id = getId(req);
  if (!id) {
    res.status(400).json({ error: 'persona id is required' });
    return;
  }

  if (req.method === 'GET') {
    const persona = await prisma.patientPersona.findUnique({
      where: { id },
      include: includeHealthContext,
    });
    if (!persona) {
      res.status(404).json({ error: 'Patient persona not found' });
      return;
    }
    res.status(200).json(persona);
    return;
  }

  if (req.method === 'PUT') {
    const body = parseBody(req.body);
    const personaData = buildPersonaData(body);
    if (!personaData.displayName) {
      res.status(400).json({ error: 'displayName is required' });
      return;
    }

    const persona = await prisma.patientPersona.update({
      where: { id },
      data: {
        ...personaData,
        allergies: { deleteMany: {}, ...buildNestedCreate(body).allergies },
        chronicDiseases: { deleteMany: {}, ...buildNestedCreate(body).chronicDiseases },
        currentMedications: { deleteMany: {}, ...buildNestedCreate(body).currentMedications },
      },
      include: includeHealthContext,
    });

    res.status(200).json(persona);
    return;
  }

  if (req.method === 'DELETE') {
    const persona = await prisma.patientPersona.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!persona) {
      res.status(404).json({ error: 'Patient persona not found' });
      return;
    }

    await prisma.patientPersona.delete({ where: { id } });
    const firstPersona = await prisma.patientPersona.findFirst({
      where: { userId: persona.userId },
      orderBy: { updatedAt: 'desc' },
      select: { id: true },
    });
    await prisma.user.update({
      where: { id: persona.userId },
      data: { activePatientPersonaId: firstPersona?.id || null },
    });

    res.status(204).json({});
    return;
  }

  res.setHeader('Allow', 'GET, PUT, DELETE');
  res.status(405).json({ error: 'Method Not Allowed' });
}
