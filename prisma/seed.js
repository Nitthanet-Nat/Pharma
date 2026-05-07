import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "demo@rsu-pharma.local" },
    update: {},
    create: {
      email: "demo@rsu-pharma.local",
      name: "RSU Pharma Demo User",
    },
  });

  const myself = await prisma.patientPersona.create({
    data: {
      userId: user.id,
      displayName: "สมศรี ใจดี",
      relationship: "myself",
      gender: "female",
      age: 34,
      weightKg: 58,
      heightCm: 160,
      pregnancyStatus: "not_pregnant",
      breastfeedingStatus: "not_breastfeeding",
      preferredLanguage: "th",
      medicationHistory: "เคยใช้พาราเซตามอลได้ ไม่มีผลข้างเคียงสำคัญ",
      notes: "ติดตามความดันเป็นระยะ",
      allergies: {
        create: [{ substance: "Penicillin", reaction: "ผื่นคัน", severity: "moderate" }],
      },
      chronicDiseases: {
        create: [{ name: "ความดันโลหิตสูง", severity: "mild", notes: "ควบคุมได้ด้วยยา" }],
      },
      currentMedications: {
        create: [{ name: "Amlodipine", dose: "5 mg", frequency: "วันละครั้งหลังอาหารเช้า" }],
      },
    },
  });

  await prisma.patientPersona.create({
    data: {
      userId: user.id,
      displayName: "คุณพ่อ",
      relationship: "father",
      gender: "male",
      age: 68,
      weightKg: 70,
      heightCm: 168,
      preferredLanguage: "th",
      notes: "ผู้สูงอายุ มีโรคประจำตัว ควรปรึกษาเภสัชกรก่อนใช้ยาใหม่",
      chronicDiseases: {
        create: [
          { name: "เบาหวานชนิดที่ 2", severity: "moderate" },
          { name: "โรคไตเรื้อรัง", severity: "moderate" },
        ],
      },
      currentMedications: {
        create: [
          { name: "Metformin", dose: "500 mg", frequency: "วันละ 2 ครั้งหลังอาหาร" },
          { name: "Losartan", dose: "50 mg", frequency: "วันละครั้ง" },
        ],
      },
    },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { activePatientPersonaId: myself.id },
  });
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
