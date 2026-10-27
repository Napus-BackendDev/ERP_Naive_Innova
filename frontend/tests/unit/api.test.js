import { describe, expect, test } from "vitest";
import { assetUrl } from "@/lib/api";

describe("assetUrl — /uploads path ไปยัง backend root", () => {
  describe("Basic Flow", () => {
    test("[Positive] path ภายในถูกต่อท้าย base URL โดยตัด /api ออก", () => {
      expect(assetUrl("/uploads/qc-photo.jpg")).toBe(
        "http://localhost:5000/uploads/qc-photo.jpg"
      );
    });
  });

  describe("Alternative Flow", () => {
    test("[Positive] URL ที่ขึ้นต้นด้วย http ถูกส่งผ่านโดยไม่แก้ไข", () => {
      expect(assetUrl("https://cdn.example.com/img.png")).toBe(
        "https://cdn.example.com/img.png"
      );
      expect(assetUrl("http://intranet.local/a.webp")).toBe(
        "http://intranet.local/a.webp"
      );
    });

    test("[Positive] data: URL (base64) ถูกส่งผ่านโดยไม่แต่งเติม", () => {
      const dataUrl = "data:image/png;base64,iVBORw0KGgo=";
      expect(assetUrl(dataUrl)).toBe(dataUrl);
    });

    test("[Positive] path ที่มีโฟลเดอร์ย่อยหลายชั้นถูกต่อท้ายครบ", () => {
      expect(assetUrl("/uploads/2026/10/lot-a/video.mp4")).toBe(
        "http://localhost:5000/uploads/2026/10/lot-a/video.mp4"
      );
    });
  });

  describe("Exception Flow", () => {
    test("[Negative] ค่าว่าง (empty string) คืนค่าเป็นสตริงว่าง", () => {
      expect(assetUrl("")).toBe("");
    });

    test("[Negative] null / undefined ไม่ทำให้เกิด TypeError และคืนค่าว่าง", () => {
      expect(assetUrl(null)).toBe("");
      expect(assetUrl(undefined)).toBe("");
    });

    test("[Negative] ค่าประเภทอื่น (ตัวเลข 0) ถูกจัดเป็นค่าว่าง ไม่ทำให้ระบบล่ม", () => {
      expect(assetUrl(0)).toBe("");
    });
  });
});
