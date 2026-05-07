# PharmaAI

โปรเจกต์ Vite + React สำหรับเชื่อมต่อ Dify workflow app `RSU_Pharma_Expanded_Manual`

## Environment

สร้าง `.env.local` จาก `.env.example` แล้วตั้งค่า:

- `DIFY_API_KEY` = คีย์จริงของ Dify
- `DIFY_BASE_URL` = `https://dify2.nrct.ai.in.th/v1`
- `DIFY_QUERY_INPUT_KEY` = `user_input`
- `VITE_DIFY_BASE_URL` = `/api/dify/chat`

หมายเหตุ: โปรเจกต์นี้เรียก Dify ผ่าน workflow route เท่านั้น คือ `POST /v1/workflows/run`

## Run Local

1. `npm install`
2. Start XAMPP MySQL on port `3306`
3. Create database `rsu_pharma` if it does not already exist:
   `CREATE DATABASE rsu_pharma CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
4. Set Prisma database URL in `.env`:
   `DATABASE_URL="mysql://root:@localhost:3306/rsu_pharma"`
5. Run Prisma migration and seed:
   `npx prisma migrate dev --name init_patient_personas`
   `npx prisma db seed`
6. `npm run dev`
7. เปิด `http://localhost:3000`

## Patient Persona / Family Profiles

The app now supports patient personas for family consultation context:

- Prisma models: `User`, `PatientPersona`, `Allergy`, `ChronicDisease`, `CurrentMedication`, `ChatSession`, `ChatMessage`
- API routes:
  - `GET /api/personas?userId=web-client-user`
  - `POST /api/personas`
  - `GET /api/personas/:id`
  - `PUT /api/personas/:id`
  - `DELETE /api/personas/:id`
  - `GET /api/personas/active?userId=web-client-user`
  - `POST /api/personas/active`
- UI components:
  - `PersonaList`
  - `PersonaCard`
  - `PersonaForm`
  - `ActivePersonaSelector`
  - `PersonaHealthSummary`

When a chat message is sent, the active patient profile is formatted as `Patient Profile:` and prepended with safety rules before the request is sent to the Dify workflow. In Vite local dev, persona management falls back to `localStorage` if the serverless API runtime is unavailable.

## Build

- `npm run build`

## Deploy

ถ้า deploy บน Vercel ให้ตั้งค่า environment variables เดียวกันใน Project Settings และอย่าใส่คีย์จริงลงไฟล์ที่ถูก track โดย git

## Security Checklist Before Push

- `.env.local` ต้องไม่ถูก track
- ใช้ `.env.example` สำหรับ placeholder เท่านั้น
- ห้าม hardcode `Bearer` token หรือ `app-...` key ในไฟล์ที่ push ขึ้น repo
- ตรวจสอบก่อน push:
  - `git status`
  - `git ls-files | findstr /I ".env"`
  - `rg -n "app-|Bearer " --glob "!node_modules/**" --glob "!dist/**" --glob "!.env.local"`
