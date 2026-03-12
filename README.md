# PharmaAI (Vite + React)

คู่มือสำหรับรันโปรเจกต์ในเครื่อง และ deploy ขึ้น GitHub + Vercel แบบปลอดภัย (เหมาะกับ public repo)

## 1) Prerequisites

- Node.js 20+ (แนะนำ LTS)
- npm
- บัญชี GitHub
- บัญชี Vercel
- Dify API Key

## 2) Run ในเครื่อง (Local)

1. ติดตั้ง dependencies
   - `npm install`
2. สร้างไฟล์ `.env.local` จาก `.env.example`
3. ใส่ค่าใน `.env.local`
   - `DIFY_API_KEY=your_real_key`
   - `DIFY_TARGET=https://dify2.nrct.ai.in.th`
   - `VITE_DIFY_BASE_URL=/api/dify/chat`
4. รัน dev server
   - `npm run dev`
5. ทดสอบ build production
   - `npm run build`

หมายเหตุ: โหมด `npm run dev` ใช้ Vite proxy เพื่อส่งคำขอไป Dify โดยไม่ต้องเปิดเผย key ใน browser

## 3) Push ขึ้น GitHub (ครั้งแรก)

1. สร้าง repository ใหม่บน GitHub (public/private ตามที่ต้องการ)
2. ในโฟลเดอร์โปรเจกต์ รัน:
   - `git init`
   - `git add .`
   - `git commit -m "Initial commit"`
   - `git branch -M main`
   - `git remote add origin <GITHUB_REPO_URL>`
   - `git push -u origin main`

## 4) Deploy ด้วย Vercel

1. เข้า Vercel แล้วเลือก `New Project`
2. เลือก import repo จาก GitHub
3. Build settings:
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. ตั้งค่า Environment Variables ใน Vercel Project Settings:
   - `DIFY_API_KEY` = คีย์จริงของคุณ
   - `DIFY_TARGET` = `https://dify2.nrct.ai.in.th` (หรือ endpoint Dify ของคุณ)
   - `VITE_DIFY_BASE_URL` = `/api/dify/chat`
5. กด Deploy

## 5) Security Checklist ก่อน Push

- ห้าม commit ค่า key จริงลง repo
- `.env.local` ต้องไม่ถูก track โดย git
- ใช้ `.env.example` สำหรับ placeholder เท่านั้น
- ห้ามมี fallback key ฝังใน source code

ตรวจสอบเร็ว:

- `git status`
- `git ls-files | findstr /I ".env"`
- `rg -n "app-|API_KEY|Bearer " --glob "!node_modules/**" --glob "!dist/**"`
