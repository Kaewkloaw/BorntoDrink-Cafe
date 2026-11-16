<div align="center">
  <h1>☕ BorntoDrink Cafe 🦖</h1>
  <img src="https://readme-typing-svg.herokuapp.com/?lines=Welcome+to+BorntoDrink+Cafe!;🧋+Order+Your+Favorite+Drinks;💸+Pay+with+PromptPay+%26+Auto+Slip+Check&center=true&width=550&height=45&color=C2410C">
  <p align="center">🍵 เว็บสั่งเครื่องดื่มของคาเฟ่ พร้อมชำระเงินผ่าน PromptPay และตรวจสลิปอัตโนมัติด้วย Slip2Go 🥐</p>

  ![Next.js](https://img.shields.io/badge/Next.js_16-4A2C1A?style=for-the-badge&logo=nextdotjs&logoColor=white)
  ![React](https://img.shields.io/badge/React_19-C2410C?style=for-the-badge&logo=react&logoColor=white)
  ![TypeScript](https://img.shields.io/badge/TypeScript-E8913A?style=for-the-badge&logo=typescript&logoColor=white)
  ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_4-F4B860?style=for-the-badge&logo=tailwindcss&logoColor=white)
  ![Supabase](https://img.shields.io/badge/Supabase-8C5A3C?style=for-the-badge&logo=supabase&logoColor=white)
  ![Slip2Go](https://img.shields.io/badge/Slip2Go_API-D97757?style=for-the-badge)

</div>

<div align="center">
  <video src="https://github.com/user-attachments/assets/c3fc40c9-3094-4915-807a-04dd2e53d6da"></video>
  <br>
  <i>🎬 <b>Note:</b> Please click the volume icon to enable audio for the CallSense system demonstration.</i>
</div>
<br>

## 📄 Project Description

<p style="text-align: justify; line-height: 1.6;">
  <strong>BorntoDrink Cafe</strong> คือเว็บแอปสำหรับสั่งเครื่องดื่มและขนมของคาเฟ่ที่ออกแบบให้ใช้งานง่าย
  ลูกค้าเลือกเมนู ปรับตัวเลือก ใส่ตะกร้า แล้วสแกน QR PromptPay จ่ายตามยอดออเดอร์ได้ทันที
  จากนั้นอัปโหลดสลิปให้ระบบตรวจสอบอัตโนมัติผ่าน <a href="https://slip2go.com">Slip2Go</a>
  ทั้งยอดเงิน สลิปซ้ำ และบัญชีผู้รับ ส่วนฝั่งร้านมีแดชบอร์ดแอดมินไว้ดูออเดอร์และสถิติ
  ครบจบในที่เดียว! 🌿
</p>

## ✨ Key Features

* 🛒 **Menu & Cart:** หน้าร้านเลือกเมนู ปรับตัวเลือก และตะกร้าสินค้า
* 💸 **PromptPay QR:** สร้าง QR ตามยอดออเดอร์ที่ถูกต้องโดยอัตโนมัติ
* 🧾 **Auto Slip Verification:** อัปโหลดสลิปแล้วตรวจยอดเงิน สลิปซ้ำ และบัญชีผู้รับ
* ⚡ **Two Verify Modes:** รองรับ 2 โหมด คือ REST (ได้ผลทันที) และ Queue (ผ่าน webhook)
* 📊 **Admin Dashboard:** ดูออเดอร์ ตั้งค่าการชำระเงิน และสถิติการตรวจสลิป
* 📱 **Responsive Design:** ใช้งานสะดวกทั้งบนมือถือและเดสก์ท็อป

## 🎄 Prerequisites

* **Node.js** 20 ขึ้นไป
* **npm**
* บัญชี [Slip2Go](https://slip2go.com) (สำหรับตรวจสลิป)
* โปรเจกต์ [Supabase](https://supabase.com) (สำหรับฐานข้อมูล)

## 🌱 Installation

1.  Clone the repository:
    ```bash
    git clone <repo-url>
    ```
2.  Navigate to the project:
    ```bash
    cd BorntoDrink
    ```
3.  Install dependencies:
    ```bash
    npm install
    ```
4.  Create the environment file:
    ```bash
    cp .env.example .env.local
    ```
5.  Start the project:
    ```bash
    npm run dev
    ```

เปิด http://localhost:3000 — หน้าแอดมินอยู่ที่ http://localhost:3000/admin (รหัสผ่านคือ `ADMIN_PASSWORD`)

<div align="center">
  <img src="public/mascots/latte.webp" width="18%" alt="Latte mascot" />
  <img src="public/mascots/cheer.webp" width="18%" alt="Cheer mascot" />
  <img src="public/mascots/chef.webp" width="18%" alt="Chef mascot" />
  <img src="public/mascots/pour.webp" width="18%" alt="Pour mascot" />
  <img src="public/mascots/togo.webp" width="18%" alt="To-go mascot" />
</div>

### 🧁 Commands

| คำสั่ง | หน้าที่ |
| --- | --- |
| `npm run dev` | รันโหมดพัฒนา |
| `npm run build` | build สำหรับ production |
| `npm run start` | รันเวอร์ชันที่ build แล้ว |
| `npm run lint` | ตรวจโค้ดด้วย ESLint |

## 🌺 Environment Setup

ก่อนเริ่มใช้งาน ต้องตั้งค่า environment ในไฟล์ `.env.local` (ห้าม commit) โดยดูตัวอย่างจาก `.env.example`

```env
SLIP2GO_API_URL=https://connect.slip2go.com
SLIP2GO_SECRET_KEY=your_slip2go_secret_key
SLIP2GO_MODE=rest
SLIP2GO_WEBHOOK_TOKEN=your_webhook_token

ADMIN_PASSWORD=your_admin_password
SESSION_SECRET=your_random_secret

PROMPTPAY_ID=your_promptpay_id
PROMPTPAY_NAME=BorntoDrink Cafe

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

| ตัวแปร | หน้าที่ |
| --- | --- |
| `SLIP2GO_API_URL` | `https://connect.slip2go.com` |
| `SLIP2GO_SECRET_KEY` | Secret ของ Slip2Go ส่งเป็น `Authorization: Bearer <key>` (ฝั่งเซิร์ฟเวอร์เท่านั้น) |
| `SLIP2GO_MODE` | โหมดตรวจสลิปเริ่มต้น `rest` หรือ `queue` (แอดมินสลับได้ในแดชบอร์ด) |
| `SLIP2GO_WEBHOOK_TOKEN` | token ลับใน URL ของ webhook (โหมด Queue) |
| `ADMIN_PASSWORD`, `SESSION_SECRET` | รหัสผ่านแอดมินและคีย์เซ็น cookie |
| `PROMPTPAY_ID`, `PROMPTPAY_NAME` | ข้อมูลสร้าง QR PromptPay |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | ฐานข้อมูล Supabase (ฝั่งเซิร์ฟเวอร์เท่านั้น) |
| `RECEIVER_ACCOUNT_NUMBER` | (ไม่บังคับ) รับเฉพาะสลิปที่โอนเข้าบัญชีนี้ |

## 🗄️ Database (Supabase)

ออเดอร์ การตั้งค่า และ webhook log เก็บใน Supabase (Postgres)

1. สร้างโปรเจกต์ที่ [supabase.com](https://supabase.com)
2. เปิด **SQL Editor** แล้วรันไฟล์ [`supabase/schema.sql`](supabase/schema.sql)
3. นำ **Project URL** และ **service_role key** (Project Settings → API) ไปใส่ใน `.env.local`

## 🧾 Slip2Go Integration

ทุกครั้งที่ตรวจสลิปจะส่ง `checkDuplicate: true` และ `checkAmount: { type: "eq", amount: <ยอดออเดอร์> }`
เซิร์ฟเวอร์ตรวจยอดซ้ำอีกชั้น และปฏิเสธ `transRef` ที่เคยใช้จ่ายออเดอร์อื่นแล้ว

* **REST API** (ได้ผลทันที): `POST /api/verify-slip/qr-image/info` ถ้ามีแค่ข้อความ QR จะ fallback ไปที่ `/api/verify-slip/qr-code/info`
* **Queue API** (async): เบราว์เซอร์ถอดรหัส QR จากสลิป (jsQR) → `POST /api/queue/verify-slip/qr-code` → ออเดอร์เข้าสถานะ `verifying` → Slip2Go ส่งผลกลับมาที่

```
https://<public-host>/api/slip2go/webhook?token=<SLIP2GO_WEBHOOK_TOKEN>
```

> 💡 URL นี้ต้องเป็น HTTPS สาธารณะ ถ้าทดสอบในเครื่องให้ใช้ tunnel เช่น `npx cloudflared tunnel --url http://localhost:3000` หรือ ngrok

## 📂 Project Structure

```
src/
├── app/
│   ├── page.tsx          # หน้าร้าน
│   ├── checkout/         # หน้าสรุปออเดอร์
│   ├── pay/              # หน้าชำระเงิน + อัปโหลดสลิป
│   ├── admin/            # แดชบอร์ดแอดมิน
│   └── api/              # orders, admin, slip2go webhook
├── components/           # UI components
└── lib/                  # products, store (Supabase), verify, slip2go, auth
supabase/schema.sql       # ตารางฐานข้อมูล
public/                   # รูปแบรนด์ มาสคอต และสินค้า
```

## 🚀 Deploy on Vercel

1. Import repo นี้ที่ [vercel.com/new](https://vercel.com/new)
2. ใส่ Environment Variables ทั้งหมดจาก `.env.example`
3. Deploy แล้วลงทะเบียน webhook ใน Slip2Go เป็น `https://<โดเมนของคุณ>/api/slip2go/webhook?token=<SLIP2GO_WEBHOOK_TOKEN>`

## 🛠️ Tech Stack

[Next.js 16](https://nextjs.org/) (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Motion · Supabase · `promptpay-qr` · `qrcode` · `jsqr` · [Slip2Go API](https://slip2go.com)

## 📜 License

โปรเจกต์นี้เป็นโปรเจกต์ภายในของ BorntoDev
