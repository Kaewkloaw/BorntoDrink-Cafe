# BorntoDrink Cafe ☕🦖

เว็บสั่งเครื่องดื่มของคาเฟ่ BorntoDrink พร้อมชำระเงินผ่าน PromptPay และ **ตรวจสลิปอัตโนมัติด้วย [Slip2Go](https://slip2go.com)**

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)

## ฟีเจอร์

- 🛒 หน้าร้านเลือกเมนู ปรับตัวเลือก และตะกร้าสินค้า
- 💸 สร้าง QR PromptPay ตามยอดออเดอร์ที่ถูกต้อง
- 🧾 อัปโหลดสลิปแล้วตรวจสอบอัตโนมัติ (ยอดเงิน สลิปซ้ำ บัญชีผู้รับ)
- ⚡ รองรับการตรวจสลิป 2 โหมด: REST (ทันที) และ Queue (ผ่าน webhook)
- 📊 แดชบอร์ดแอดมินสำหรับดูออเดอร์และสถิติ

## เทคโนโลยีที่ใช้

- [Next.js 16](https://nextjs.org/) (App Router) + React 19
- TypeScript
- Tailwind CSS 4
- Motion (animation)
- `promptpay-qr`, `qrcode`, `jsqr`
- [Slip2Go API](https://slip2go.com)

## เริ่มต้นใช้งาน

### ความต้องการ

- Node.js 20 ขึ้นไป
- บัญชี Slip2Go (สำหรับตรวจสลิป)

### ติดตั้ง

```bash
git clone <repo-url>
cd BorntoDrink
npm install
cp .env.example .env.local   # แล้วกรอกค่าต่าง ๆ
npm run dev
```

เปิด http://localhost:3000

หน้าแอดมิน: http://localhost:3000/admin (รหัสผ่านคือ `ADMIN_PASSWORD` ใน `.env.local`)

### คำสั่งที่ใช้บ่อย

| คำสั่ง | หน้าที่ |
| --- | --- |
| `npm run dev` | รันโหมดพัฒนา |
| `npm run build` | build สำหรับ production |
| `npm run start` | รันเวอร์ชันที่ build แล้ว |
| `npm run lint` | ตรวจโค้ดด้วย ESLint |

## Environment Variables

สร้างไฟล์ `.env.local` (ห้าม commit) โดยดูตัวอย่างจาก `.env.example`

| ตัวแปร | หน้าที่ |
| --- | --- |
| `SLIP2GO_API_URL` | `https://connect.slip2go.com` |
| `SLIP2GO_SECRET_KEY` | Secret ของ Slip2Go ส่งเป็น `Authorization: Bearer <key>` (ใช้ฝั่งเซิร์ฟเวอร์เท่านั้น) |
| `SLIP2GO_MODE` | โหมดตรวจสลิปเริ่มต้น `rest` หรือ `queue` (แอดมินสลับได้ในแดชบอร์ด) |
| `SLIP2GO_WEBHOOK_TOKEN` | token ลับใน URL ของ webhook (โหมด Queue) |
| `ADMIN_PASSWORD`, `SESSION_SECRET` | รหัสผ่านแอดมินและคีย์เซ็น cookie |
| `PROMPTPAY_ID`, `PROMPTPAY_NAME` | ข้อมูลสร้าง QR PromptPay ตามยอดออเดอร์ |
| `RECEIVER_ACCOUNT_NUMBER` | (ไม่บังคับ) รับเฉพาะสลิปที่โอนเข้าบัญชีนี้ (`checkReceiver`) |

## การเชื่อมต่อ Slip2Go

ทุกครั้งที่ตรวจสลิปจะส่ง `checkDuplicate: true` และ `checkAmount: { type: "eq", amount: <ยอดออเดอร์> }`
นอกจากนี้เซิร์ฟเวอร์ตรวจยอดซ้ำอีกชั้น และปฏิเสธ `transRef` ที่เคยใช้จ่ายออเดอร์อื่นแล้ว

**REST API** (ได้ผลทันที): `POST /api/verify-slip/qr-image/info` (ส่งรูปแบบ multipart)
ถ้ามีแค่ข้อความ QR จะ fallback ไปที่ `/api/verify-slip/qr-code/info`

**Queue API** (แบบ async): เบราว์เซอร์ถอดรหัส QR จากสลิป (jsQR) → `POST /api/queue/verify-slip/qr-code`
→ ออเดอร์เข้าสถานะ `verifying` → Slip2Go ส่งผลกลับมาที่

```
https://<public-host>/api/slip2go/webhook?token=<SLIP2GO_WEBHOOK_TOKEN>
```

ลงทะเบียน URL นี้ในแดชบอร์ด Slip2Go โดยต้องเป็น HTTPS สาธารณะ
ถ้าทดสอบในเครื่อง ให้ใช้ tunnel เช่น `npx cloudflared tunnel --url http://localhost:3000` หรือ ngrok
หากยังไม่ได้ตั้งค่า Slip2Go จะตอบกลับ `400422`

## โครงสร้างโปรเจกต์

```
src/
├── app/
│   ├── page.tsx          # หน้าร้าน
│   ├── checkout/         # หน้าสรุปออเดอร์
│   ├── pay/              # หน้าชำระเงิน + อัปโหลดสลิป
│   ├── admin/            # แดชบอร์ดแอดมิน
│   └── api/              # orders, admin, slip2go webhook
├── components/           # UI components
└── lib/                  # products, store, verify, slip2go, auth
data/                     # ข้อมูลออเดอร์ (gitignored)
public/                   # รูปแบรนด์ มาสคอต และสินค้า
```

## ข้อมูลออเดอร์

ออเดอร์ถูกเก็บใน `data/orders.json` (อยู่ใน `.gitignore`)
ถ้าจะใช้งานจริงให้เปลี่ยน `src/lib/store.ts` ไปใช้ฐานข้อมูลจริง

## Deploy

แนะนำ [Vercel](https://vercel.com/) แต่เนื่องจากตอนนี้เก็บข้อมูลเป็นไฟล์ ควรย้ายไปใช้ฐานข้อมูลก่อน deploy บนแพลตฟอร์มที่ filesystem เป็นแบบอ่านอย่างเดียว

## License

โปรเจกต์นี้เป็นโปรเจกต์ภายในของ BorntoDev
