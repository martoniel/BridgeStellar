import request from "supertest";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import app from "../src/index";

jest.mock("../src/services/stellar");
jest.mock("../src/services/redis");

const prisma = new PrismaClient();

const testUser = {
  email: "test@factbridge.io",
  name: "Test User",
  password: "password123",
  stellarAddress: "GTESTTESTTESTTESTTESTTESTTESTTEST",
};

const testUser2 = {
  email: "test2@factbridge.io",
  name: "Test Buyer",
  password: "password123",
  stellarAddress: "GTEST2TESTTESTTESTTESTTESTTESTTEST",
};

let userId: string;
let token: string;
let invoiceId: string;

beforeAll(async () => {
  await prisma.notification.deleteMany();
  await prisma.settlement.deleteMany();
  await prisma.share.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash(testUser.password, 12);
  const user = await prisma.user.create({
    data: {
      email: testUser.email,
      name: testUser.name,
      passwordHash,
      stellarAddress: testUser.stellarAddress,
    },
  });
  userId = user.id;
  token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET || "test-secret"
  );
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Invoice CRUD", () => {
  describe("POST /api/v1/invoices", () => {
    it("should create an invoice", async () => {
      const res = await request(app)
        .post("/api/v1/invoices")
        .set("Authorization", `Bearer ${token}`)
        .send({
          buyerAddress: testUser2.stellarAddress,
          amount: 100000,
          denomination: "USDC",
          sharesTotal: 100,
          maturityDate: "2027-01-01T00:00:00.000Z",
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("id");
      expect(res.body.amount).toBe(100000);
      expect(res.body.status).toBe("ACTIVE");
      invoiceId = res.body.id;
    });

    it("should reject unauthorized requests", async () => {
      const res = await request(app)
        .post("/api/v1/invoices")
        .send({
          buyerAddress: testUser2.stellarAddress,
          amount: 100000,
          sharesTotal: 100,
          maturityDate: "2027-01-01T00:00:00.000Z",
        });

      expect(res.status).toBe(401);
    });

    it("should reject invalid payload", async () => {
      const res = await request(app)
        .post("/api/v1/invoices")
        .set("Authorization", `Bearer ${token}`)
        .send({ amount: -500 });

      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/v1/invoices", () => {
    it("should list invoices with pagination", async () => {
      const res = await request(app).get("/api/v1/invoices");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("data");
      expect(res.body).toHaveProperty("meta");
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it("should filter invoices by status", async () => {
      const res = await request(app)
        .get("/api/v1/invoices")
        .query({ status: "ACTIVE" });

      expect(res.status).toBe(200);
      expect(res.body.data.every((i: any) => i.status === "ACTIVE")).toBe(true);
    });

    it("should filter by search term", async () => {
      const res = await request(app)
        .get("/api/v1/invoices")
        .query({ search: testUser2.stellarAddress });

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  describe("GET /api/v1/invoices/:id", () => {
    it("should get invoice by id", async () => {
      const res = await request(app).get(`/api/v1/invoices/${invoiceId}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(invoiceId);
      expect(res.body.creator).toBeDefined();
    });

    it("should return 404 for unknown invoice", async () => {
      const res = await request(app).get("/api/v1/invoices/nonexistent-id");

      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/v1/invoices/:id/fund", () => {
    it("should fund an invoice", async () => {
      const res = await request(app)
        .post(`/api/v1/invoices/${invoiceId}/fund`)
        .set("Authorization", `Bearer ${token}`)
        .send({ amount: 50000 });

      expect(res.status).toBe(200);
      expect(res.body.invoice.fundedAmount).toBe(50000);
    });

    it("should reject over-funding", async () => {
      const res = await request(app)
        .post(`/api/v1/invoices/${invoiceId}/fund`)
        .set("Authorization", `Bearer ${token}`)
        .send({ amount: 200000 });

      expect(res.status).toBe(400);
    });

    it("should reject invalid funding amount", async () => {
      const res = await request(app)
        .post(`/api/v1/invoices/${invoiceId}/fund`)
        .set("Authorization", `Bearer ${token}`)
        .send({ amount: -100 });

      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/v1/invoices/:id/shares", () => {
    it("should purchase shares", async () => {
      const res = await request(app)
        .post(`/api/v1/invoices/${invoiceId}/shares`)
        .set("Authorization", `Bearer ${token}`)
        .send({ shareCount: 10, pricePerShare: 1000 });

      expect(res.status).toBe(201);
      expect(res.body.share.shareCount).toBe(10);
    });

    it("should reject excessive share purchase", async () => {
      const res = await request(app)
        .post(`/api/v1/invoices/${invoiceId}/shares`)
        .set("Authorization", `Bearer ${token}`)
        .send({ shareCount: 9999, pricePerShare: 1000 });

      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/v1/invoices/:id/settle", () => {
    it("should settle a fully funded invoice", async () => {
      await request(app)
        .post(`/api/v1/invoices/${invoiceId}/fund`)
        .set("Authorization", `Bearer ${token}`)
        .send({ amount: 50000 });

      const res = await request(app)
        .post(`/api/v1/invoices/${invoiceId}/settle`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.invoice.status).toBe("SETTLED");
      expect(res.body.settlement).toBeDefined();
    });

    it("should reject settlement of non-funded invoice", async () => {
      const createRes = await request(app)
        .post("/api/v1/invoices")
        .set("Authorization", `Bearer ${token}`)
        .send({
          buyerAddress: testUser2.stellarAddress,
          amount: 100000,
          sharesTotal: 100,
          maturityDate: "2027-02-01T00:00:00.000Z",
        });

      const pendingInvoiceId = createRes.body.id;

      const res = await request(app)
        .post(`/api/v1/invoices/${pendingInvoiceId}/settle`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(400);
    });
  });
});