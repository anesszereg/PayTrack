import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminPass = await bcrypt.hash("admin123", 10);
  const clientPass = await bcrypt.hash("client123", 10);

  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: { name: "Admin", email: "admin@example.com", password: adminPass, role: "ADMIN" },
  });

  const client = await prisma.user.upsert({
    where: { email: "client@example.com" },
    update: {},
    create: {
      name: "John Doe",
      email: "client@example.com",
      phone: "+15551234567",
      password: clientPass,
      role: "CLIENT",
    },
  });

  const phone = await prisma.product.upsert({
    where: { id: "seed-product-1" },
    update: {},
    create: { id: "seed-product-1", name: "iPhone 15 Pro", price: 1199, stock: 10 },
  });
  await prisma.product.upsert({
    where: { id: "seed-product-2" },
    update: {},
    create: { id: "seed-product-2", name: 'MacBook Air 15"', price: 1499, stock: 5 },
  });

  const existing = await prisma.sale.findFirst({ where: { id: "seed-sale-1" } });
  if (!existing) {
    await prisma.sale.create({
      data: {
        id: "seed-sale-1",
        clientId: client.id,
        productId: phone.id,
        totalPrice: 1199,
        initialPayment: 200,
        frequency: "MONTHLY",
        installments: {
          create: [
            { number: 1, amount: 333, dueDate: new Date("2026-11-01") },
            { number: 2, amount: 333, dueDate: new Date("2026-12-01") },
            { number: 3, amount: 333, dueDate: new Date("2027-01-01") },
          ],
        },
      },
    });
  }
  console.log("Seed complete. admin@example.com/admin123 · client@example.com/client123");
}

main().finally(() => prisma.$disconnect());
