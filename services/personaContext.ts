import { PatientPersona } from '../types';

const relationshipLabels: Record<string, string> = {
  myself: 'ตัวฉันเอง',
  father: 'พ่อ',
  mother: 'แม่',
  child: 'เด็ก',
  elderly: 'ผู้สูงอายุ',
  other: 'บุคคลอื่น',
};

export const getRelationshipLabel = (relationship?: string) =>
  relationship ? relationshipLabels[relationship] || relationship : '-';

export const calculateAge = (dateOfBirth?: string) => {
  if (!dateOfBirth) return undefined;
  const birthDate = new Date(dateOfBirth);
  if (Number.isNaN(birthDate.getTime())) return undefined;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const hasBirthdayPassed =
    today.getMonth() > birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());
  if (!hasBirthdayPassed) age -= 1;
  return age >= 0 ? age : undefined;
};

export const getPersonaAge = (persona: PatientPersona) =>
  typeof persona.age === 'number' ? persona.age : calculateAge(persona.dateOfBirth);

const listOrNone = (items: string[]) => items.filter(Boolean).join(', ') || 'ไม่มีข้อมูล';

export const getPersonaWarningBadges = (persona: PatientPersona) => {
  const age = getPersonaAge(persona);
  const badges: string[] = [];

  if (persona.allergies.length > 0) badges.push('แพ้ยา');
  if (persona.pregnancyStatus && persona.pregnancyStatus !== 'not_pregnant') badges.push('ตั้งครรภ์');
  if (persona.breastfeedingStatus && persona.breastfeedingStatus !== 'not_breastfeeding') badges.push('ให้นมบุตร');
  if (typeof age === 'number' && age < 12) badges.push('เด็ก');
  if (typeof age === 'number' && age >= 60) badges.push('ผู้สูงอายุ');
  if (persona.chronicDiseases.length > 0) badges.push('โรคประจำตัว');
  if (persona.currentMedications.length >= 3) badges.push('ใช้ยาหลายชนิด');

  return badges;
};

export const formatPersonaContext = (persona?: PatientPersona | null) => {
  if (!persona) {
    return [
      'Patient Profile:',
      'No patient persona selected. Ask the user who the consultation is for before giving medication-specific advice.',
    ].join('\n');
  }

  const age = getPersonaAge(persona);
  const allergies = persona.allergies.map((item) =>
    [item.substance, item.reaction ? `reaction: ${item.reaction}` : '', item.severity ? `severity: ${item.severity}` : '']
      .filter(Boolean)
      .join(' - ')
  );
  const chronicDiseases = persona.chronicDiseases.map((item) =>
    [item.name, item.severity ? `severity: ${item.severity}` : '', item.notes].filter(Boolean).join(' - ')
  );
  const currentMedications = persona.currentMedications.map((item) =>
    [item.name, item.dose, item.frequency].filter(Boolean).join(' ')
  );

  return [
    'Patient Profile:',
    `Name: ${persona.displayName}`,
    `Relationship: ${getRelationshipLabel(persona.relationship)}`,
    `Age: ${typeof age === 'number' ? age : 'ไม่มีข้อมูล'}`,
    `Gender: ${persona.gender || 'ไม่มีข้อมูล'}`,
    `Weight: ${persona.weightKg ? `${persona.weightKg} kg` : 'ไม่มีข้อมูล'}`,
    `Height: ${persona.heightCm ? `${persona.heightCm} cm` : 'ไม่มีข้อมูล'}`,
    `Allergies: ${listOrNone(allergies)}`,
    `Chronic diseases: ${listOrNone(chronicDiseases)}`,
    `Current medications: ${listOrNone(currentMedications)}`,
    `Medication history: ${persona.medicationHistory || 'ไม่มีข้อมูล'}`,
    `Pregnancy/Breastfeeding: ${persona.pregnancyStatus || 'ไม่มีข้อมูล'} / ${persona.breastfeedingStatus || 'ไม่มีข้อมูล'}`,
    `Preferred language: ${persona.preferredLanguage || 'th'}`,
    `Emergency contact: ${persona.emergencyContact || 'ไม่มีข้อมูล'}`,
    `Notes: ${persona.notes || 'ไม่มีข้อมูล'}`,
    `Warning badges: ${getPersonaWarningBadges(persona).join(', ') || 'none'}`,
  ].join('\n');
};

export const buildSafetyPrompt = (persona?: PatientPersona | null) =>
  [
    'Medical safety rules for RSU Pharma:',
    '- Do not make a definitive diagnosis.',
    '- Always advise the user to consult a pharmacist or doctor when symptoms are severe, persistent, unusual, or worsening.',
    '- Use stronger caution for children, pregnant users, breastfeeding users, elderly users, and users with chronic diseases.',
    '- Highlight allergy and current medication information before any medication suggestion.',
    '- Do not recommend controlled drugs, antibiotics, prescription-only medicines, or high-risk medicines without pharmacist/doctor consultation.',
    '- If the patient profile is incomplete, ask concise follow-up questions before medication-specific advice.',
    '',
    formatPersonaContext(persona),
  ].join('\n');

export const buildChatQueryWithPersona = (message: string, persona?: PatientPersona | null) =>
  [buildSafetyPrompt(persona), '', 'User question:', message].join('\n');
