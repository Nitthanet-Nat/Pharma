import crypto from "crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 32, "sha256").toString("hex");
  return `pbkdf2_sha256$120000$${salt}$${hash}`;
};

const upsertTestUser = async ({ username, email, name, role, password }) =>
  prisma.user.upsert({
    where: { email },
    update: {
      username,
      name,
      role,
      passwordHash: hashPassword(password),
    },
    create: {
      username,
      email,
      name,
      role,
      passwordHash: hashPassword(password),
    },
  });

async function recreatePersonas(user) {
  await prisma.patientPersona.deleteMany({ where: { userId: user.id } });

  const self = await prisma.patientPersona.create({
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
      medicationHistory: "ใช้พาราเซตามอลได้ ไม่มีประวัติแพ้ยาสำคัญ",
      emergencyContact: "081-000-0000",
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
    data: { activePatientPersonaId: self.id },
  });
}

async function main() {
  const admin = await upsertTestUser({
    username: "admin",
    email: "admin@gmail.com",
    name: "Local Admin",
    role: "ADMIN",
    password: "admin1234",
  });

  const user = await upsertTestUser({
    username: "user",
    email: "user@gmail.com",
    name: "Local User",
    role: "USER",
    password: "user1234",
  });

  await recreatePersonas(user);

  console.log("Seeded local accounts:");
  console.log("ADMIN username: admin | email: admin@gmail.com | password: admin1234");
  console.log("USER  username: user  | email: user@gmail.com  | password: user1234");
  console.log(`Admin id: ${admin.id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
