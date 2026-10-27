import ExcelJS from "exceljs";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";

import app from "./testApp.js";
import { asUser, resetDb, seedUsers, startDb, stopDb } from "./helpers.js";
import { makeIngredient } from "./factories.js";
import PackagingItem from "../../src/features/packaging/packagingItem.model.js";

let ctx;

beforeAll(startDb);
afterAll(stopDb);

beforeEach(async () => {
  await resetDb();
  ctx = await seedUsers();
});

const binaryParser = (res, cb) => {
  const chunks = [];
  res.on("data", (chunk) => chunks.push(chunk));
  res.on("end", () => cb(null, Buffer.concat(chunks)));
};

const getBinary = (path, token) =>
  asUser(request(app).get(path).buffer(true).parse(binaryParser), token);

const oversizedImage = () =>
  `data:image/png;base64,${Buffer.alloc(1024 * 1024 + 16).toString("base64")}`;

describe("Export — raw-material workbook", () => {
  test("rejects unauthenticated exports", async () => {
    const res = await request(app).get("/api/export/stock/excel");
    expect(res.status).toBe(401);
  });

  test("returns an xlsx workbook containing the owner's ingredients", async () => {
    await makeIngredient(ctx.user._id, { name: "Water", openingStock: 1500, supplier: "A" });
    await makeIngredient(ctx.otherUser._id, { name: "Hidden", openingStock: 10 });

    const res = await getBinary("/api/export/stock/excel", ctx.token);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/spreadsheetml/);
    expect(res.headers["content-disposition"]).toContain("raw_materials_stock.xlsx");

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(res.body);
    const sheet = workbook.getWorksheet("Raw Materials Stock");
    expect(sheet).toBeTruthy();
    expect(sheet.getRow(1).getCell(2).value).toBe("ชื่อวัตถุดิบ (Ingredient)");
    expect(sheet.getRow(2).getCell(2).value).toBe("Water");
    expect(sheet.rowCount).toBe(2);
  });

  test("gives an admin every owner's ingredients in the workbook", async () => {
    await makeIngredient(ctx.user._id, { name: "Water" });
    await makeIngredient(ctx.otherUser._id, { name: "Glycerin" });

    const res = await getBinary("/api/export/stock/excel", ctx.adminToken);
    expect(res.status).toBe(200);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(res.body);
    const sheet = workbook.getWorksheet("Raw Materials Stock");
    expect(sheet.rowCount).toBe(3);
  });
});

describe("Export — raw-material CSV", () => {
  test("returns a UTF-8 BOM CSV with the owner's rows", async () => {
    await makeIngredient(ctx.user._id, { name: "Water", openingStock: 500, supplier: "A", pricePerKg: 10 });
    await makeIngredient(ctx.otherUser._id, { name: "Hidden" });

    const res = await getBinary("/api/export/stock/csv", ctx.token);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/text\/csv/);
    expect(res.headers["content-disposition"]).toContain("raw_materials_stock.csv");

    const text = res.body.toString("utf8");
    expect(text.startsWith("\ufeff")).toBe(true);
    expect(text).toContain('"Water",500,"A",10');
    expect(text).not.toContain("Hidden");
  });

  test("gives an admin every owner's rows in CSV", async () => {
    await makeIngredient(ctx.user._id, { name: "Water" });
    await makeIngredient(ctx.otherUser._id, { name: "Glycerin" });

    const res = await getBinary("/api/export/stock/csv", ctx.adminToken);
    const text = res.body.toString("utf8");
    expect(text).toContain("Water");
    expect(text).toContain("Glycerin");
  });
});

describe("Image size guard", () => {
  test("rejects an oversized base64 image body before it reaches the route", async () => {
    const res = await asUser(request(app).post("/api/packaging"), ctx.token).send({
      name: "Oversized Bottle",
      customer: "ระบบ",
      image: oversizedImage()
    });

    expect(res.status).toBe(413);
    expect(res.body.error).toMatch(/1 MB/);
    expect(await PackagingItem.countDocuments({})).toBe(0);
  });

  test("rejects oversized images nested inside arrays", async () => {
    const res = await asUser(request(app).post("/api/products"), ctx.token).send({
      name: "Nested Image",
      gallery: [{ image: oversizedImage() }]
    });

    expect(res.status).toBe(413);
    expect(res.body.error).toMatch(/gallery\[0\]\.image/);
  });

  test("allows a small base64 image through to the route", async () => {
    const res = await asUser(request(app).post("/api/packaging"), ctx.token).send({
      name: "Small Bottle",
      customer: "ระบบ",
      image: "data:image/png;base64,AAAA"
    });

    expect(res.status).toBe(201);
    expect(res.body.image).toBe("data:image/png;base64,AAAA");
  });
});
