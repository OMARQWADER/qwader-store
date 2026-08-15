import { sql } from "../server/legacy/db.js";

const PAYMENT_INFO = {
  bankAccountName: "أعمار وليد قوادري",
  bankAccountNumber: "JO94CBJO0010000000001234567890",
  bankName: "كابيتال بنك",
  cliqName: "QWADER GAME",
  cliqNumber: "0779538304",
  zainCashName: "أعمار قوادري",
  zainCashNumber: "0779538304",
  stcPayName: "أعمار قوادري",
  stcPayNumber: "0779538304",
  orangeMoneyName: "أعمار قوادري",
  orangeMoneyNumber: "0779538304",
  codEnabled: true,
  notes:
    "حوّل المبلغ بالضبط وتجنب الرسوم الزائدة. بعد التحويل أرسل إيصال الدفع مع رقم الطلب على واتساب المتجر لتأكيد طلبك.",
};
const SOCIAL_LINKS = { whatsapp: "0779538304" };

const s = sql();
await s`
  insert into site_content (key, value)
  values ('paymentInfo', ${JSON.stringify(PAYMENT_INFO)}::jsonb), ('socialLinks', ${JSON.stringify(SOCIAL_LINKS)}::jsonb)
  on conflict (key) do update set value = excluded.value
`;
const rows = await s`select key from site_content where key in ('paymentInfo','socialLinks')`;
console.log("seeded:", rows.map(r => r.key).join(", "));
process.exit(0);
