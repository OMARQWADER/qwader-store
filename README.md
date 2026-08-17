# QWADER STORE

متجر ألعاب واشتراكات وبطاقات رقمية — واجهة React (Vite) + API (Express) + قاعدة بيانات Neon PostgreSQL.

## النشر على Vercel

| الإعداد | القيمة |
|---|---|
| Framework Preset | Other |
| Build Command | `npm run build:vercel` |
| Output Directory | `dist` |
| Install Command | `npm install` |

## متغيرات البيئة المطلوبة (Environment Variables)

| المتغير | الوصف |
|---|---|
| `NEON_DATABASE_URL` | رابط الاتصال بقاعدة بيانات Neon PostgreSQL (sslmode=require&channel_binding=require) |
| `JWT_SECRET` | مفتاح سري لتوقيع الجلسات (أي سلسلة عشوائية طويلة) |
| `GMAIL_USER` | بريد المتجر لإرسال الإشعارات (مثل omarqwader2@gmail.com) |
| `GMAIL_APP_PASSWORD` | كلمة سر تطبيق Gmail المكوّنة من 16 خانة |
| `OWNER_TEST_EMAIL` / `OWNER_TEST_PASSWORD` / `OWNER_OPEN_ID` / `OWNER_NAME` / `OWNER_TEST_2FA_CODE` | بيانات المالك (تستخدم في لوحة الإدارة) |

## بنية المشروع

- `client/` — واجهة React (Vite)
- `server/` — API (Express + legacy handlers)
- `api/vercel-handler.js` — يولَّد تلقائيًا عند البناء (Vercel Function)
- `dist/` — يولَّد تلقائيًا عند البناء (لا تعدّله يدويًا)
- `vercel.json` — إعدادات النشر

## أوامر التطوير المحلي

```
npm install
npm run dev          # تشغيل محلي
npm run check        # فحص TypeScript
npm test             # الاختبارات
```

## ملاحظات

- لا تضع أي كلمات سر داخل الملفات — استخدم متغيرات بيئة Vercel فقط.
- بعد كل تغيير، شغّل `npm run build:vercel` وتأكد من نجاحه قبل النشر.
