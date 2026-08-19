import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
const token = process.env.TURSO_AUTH_TOKEN;
const c = createClient({ url, authToken: token });

const products = [
  { id: "lgp_basic7", name: "Logic Gate Pack: Basic 7", category: "Logic Gates", price: 250, rating: 4.8, sales: 1240, gradient: "linear-gradient(135deg,#3b82f6,#1e3a8a)" },
  { id: "gear_spur32", name: "Gear Set: Spur 32-pack", category: "Gears", price: 180, rating: 4.6, sales: 890, gradient: "linear-gradient(135deg,#fb923c,#7c2d12)" },
  { id: "lnk_4bar", name: "Linkage Blueprint: 4-Bar", category: "Linkages", price: 120, rating: 4.7, sales: 640, gradient: "linear-gradient(135deg,#818cf8,#312e81)" },
  { id: "cnv_circuit", name: "Canvas Template: Circuit Board", category: "Canvas", price: 320, rating: 4.9, sales: 2150, gradient: "linear-gradient(135deg,#a78bfa,#4c1d95)" },
  { id: "lgp_halfadd", name: "Half Adder Module", category: "Logic Gates", price: 200, rating: 4.5, sales: 480, gradient: "linear-gradient(135deg,#06b6d4,#0e7490)" },
  { id: "lgp_fulladd", name: "Full Adder IC Block", category: "Logic Gates", price: 450, rating: 4.9, sales: 1820, gradient: "linear-gradient(135deg,#10b981,#064e3b)" },
  { id: "lgp_mux4", name: "Multiplexer 4:1 Schematic", category: "Logic Gates", price: 280, rating: 4.7, sales: 720, gradient: "linear-gradient(135deg,#f59e0b,#78350f)" },
  { id: "lgp_srlatch", name: "SR Latch Starter Kit", category: "Logic Gates", price: 350, rating: 4.8, sales: 990, gradient: "linear-gradient(135deg,#ef4444,#7f1d1d)" },
  { id: "lgp_dlatch", name: "Gated D Latch Module", category: "Logic Gates", price: 380, rating: 4.6, sales: 540, gradient: "linear-gradient(135deg,#ec4899,#831843)" },
  { id: "tool_clock", name: "Clock Pulse Generator", category: "Tools", price: 220, rating: 4.7, sales: 1100, gradient: "linear-gradient(135deg,#84cc16,#365314)" },
  { id: "tool_probe", name: "Logic Probe Tool", category: "Tools", price: 90, rating: 4.4, sales: 320, gradient: "linear-gradient(135deg,#06b6d4,#155e75)" },
  { id: "tool_wire", name: "Wire Bundle (100m)", category: "Tools", price: 60, rating: 4.3, sales: 410, gradient: "linear-gradient(135deg,#a3a3a3,#262626)" },
];

const now = Date.now();
let inserted = 0;
for (const p of products) {
  const r = await c.execute({
    sql: `INSERT INTO marketplace_products (id, name, category, price, rating, sales, gradient, active, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            category = excluded.category,
            price = excluded.price,
            rating = excluded.rating,
            sales = excluded.sales,
            gradient = excluded.gradient,
            active = 1,
            updatedAt = excluded.updatedAt`,
    args: [p.id, p.name, p.category, p.price, p.rating, p.sales, p.gradient, now, now],
  });
  if (r.rowsAffected > 0) inserted++;
}

const count = await c.execute("SELECT COUNT(*) as n FROM marketplace_products");
console.log(`Seeded ${inserted} products. Total in DB: ${count.rows[0].n}`);

const sample = await c.execute("SELECT id, name, category, price FROM marketplace_products LIMIT 5");
console.log("\nSample products:");
for (const r of sample.rows) {
  console.log(`  - ${r.id} | ${r.name} | ${r.category} | ${r.price} coins`);
}
