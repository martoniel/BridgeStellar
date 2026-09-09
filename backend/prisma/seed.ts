import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Clean existing data
  await prisma.notification.deleteMany();
  await prisma.settlement.deleteMany();
  await prisma.share.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.user.deleteMany();

  // Create users
  const passwordHash = await bcrypt.hash("password123", 12);

  const alice = await prisma.user.create({
    data: {
      email: "alice@factbridge.io",
      name: "Alice Chen",
      passwordHash,
      stellarAddress: "GALABCDEF1234567890ABCDEFGHIJKLMNO",
      role: "USER",
    },
  });

  const bob = await prisma.user.create({
    data: {
      email: "bob@factbridge.io",
      name: "Bob Martinez",
      passwordHash,
      stellarAddress: "GBOBABCDEF1234567890ABCDEFGHIJKLMNO",
      role: "USER",
    },
  });

  const charlie = await prisma.user.create({
    data: {
      email: "charlie@factbridge.io",
      name: "Charlie LP",
      passwordHash,
      stellarAddress: "GCARLDEF1234567890ABCDEFGHIJKLMNO",
      role: "LIQUIDITY_PROVIDER",
    },
  });

  const admin = await prisma.user.create({
    data: {
      email: "admin@factbridge.io",
      name: "Admin User",
      passwordHash,
      stellarAddress: "GADMNABCDEF1234567890ABCDEFGHIJKLMNO",
      role: "ADMIN",
    },
  });

  console.log("Created 4 users");

  // Create invoices
  const invoice1 = await prisma.invoice.create({
    data: {
      creatorId: alice.id,
      buyerAddress: "GBUYER1234567890ABCDEFGHIJKLMNO",
      amount: 50000,
      denomination: "USDC",
      status: "ACTIVE",
      fundedAmount: 30000,
      sharesTotal: 100,
      sharesSold: 40,
      maturityDate: new Date("2026-12-31"),
      contractInvoiceId: "INV-001-CHAIN",
    },
  });

  const invoice2 = await prisma.invoice.create({
    data: {
      creatorId: bob.id,
      buyerAddress: "GBUYER4567890ABCDEFGHIJKLMNO",
      amount: 25000,
      denomination: "USDC",
      status: "FUNDED",
      fundedAmount: 25000,
      sharesTotal: 50,
      sharesSold: 50,
      maturityDate: new Date("2026-09-15"),
      contractInvoiceId: "INV-002-CHAIN",
    },
  });

  const invoice3 = await prisma.invoice.create({
    data: {
      creatorId: alice.id,
      buyerAddress: "GBUYER7890ABCDEFGHIJKLMNO",
      amount: 100000,
      denomination: "USDC",
      status: "PENDING",
      fundedAmount: 0,
      sharesTotal: 200,
      sharesSold: 0,
      maturityDate: new Date("2027-03-01"),
    },
  });

  console.log("Created 3 invoices");

  // Create shares
  await prisma.share.createMany({
    data: [
      { invoiceId: invoice1.id, holderId: charlie.id, shareCount: 20, purchasePrice: 10000 },
      { invoiceId: invoice1.id, holderId: bob.id, shareCount: 20, purchasePrice: 10000 },
      { invoiceId: invoice2.id, holderId: charlie.id, shareCount: 25, purchasePrice: 12500 },
      { invoiceId: invoice2.id, holderId: alice.id, shareCount: 25, purchasePrice: 12500 },
    ],
  });

  console.log("Created share records");

  // Create settlements
  await prisma.settlement.create({
    data: {
      invoiceId: invoice2.id,
      settlementAmount: 27500,
      txHash: "SETTLE-TX-HASH-001",
    },
  });

  console.log("Created settlement");

  // Create notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: alice.id,
        type: "INVOICE_FUNDED",
        message: "Your invoice INV-001 received funding of 30,000 USDC",
      },
      {
        userId: bob.id,
        type: "INVOICE_SETTLED",
        message: "Your invoice INV-002 has been settled for 27,500 USDC",
      },
      {
        userId: charlie.id,
        type: "SHARES_PURCHASED",
        message: "You purchased 20 shares of invoice INV-001",
      },
    ],
  });

  console.log("Created notifications");
  console.log("Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
