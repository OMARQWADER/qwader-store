// One-off: apply delivery columns to orders on the Neon legacy DB and seed default shipping config
import dotenv from "dotenv";
dotenv.config();
import { sql } from "../server/legacy/db.js";

const s = sql();

await s`alter table orders add column if not exists delivery_company text`;
await s`alter table orders add column if not exists delivery_city text`;
await s`alter table orders add column if not exists delivery_fee numeric(10,2) not null default 0`;
console.log("columns ok");

// Default shipping config: enabled, one company placeholder with sample city prices.
// The owner will edit everything from the admin panel (settings > shipping).
const seed = {
  enabled: true,
  companies: [
    {
      id: "comp-default-1",
      name: "شركة التوصيل",
      phone: "",
      enabled: true,
      regions: [
        { city: "عمّان", price: 2.5, enabled: true },
        { city: "الزرقاء", price: 3, enabled: true },
        { city: "إربد", price: 3.5, enabled: true },
      ],
    },
  ],
};

const existing = await s`select value from site_content where key = 'shipping'`;
if (existing.length === 0) {
  await s`insert into site_content (key, value) values ('shipping', ${JSON.stringify(seed)}::jsonb)`;
  console.log("shipping seeded");
} else {
  console.log("shipping already exists, untouched");
}

process.exit(0);
