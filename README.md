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
2. `npm run dev`
3. เปิด `http://localhost:3000`

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
