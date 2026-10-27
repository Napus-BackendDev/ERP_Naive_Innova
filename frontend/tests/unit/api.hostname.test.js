// @vitest-environment jsdom
// @vitest-environment-options {"url":"http://erp.internal:3000/"}
import { describe, expect, test } from "vitest";

import api, { assetUrl } from "@/lib/api";

describe("api — baseURL เขียนทับ localhost ตาม hostname ของเครื่องผู้ใช้", () => {
  describe("Alternative Flow", () => {
    test("[Positive] เปิดระบบจากเครื่องอื่นในเน็ตเวิร์ก -> baseURL ชี้ไปยัง host นั้น", () => {
      expect(window.location.hostname).toBe("erp.internal");
      expect(api.defaults.baseURL).toBe("http://erp.internal:5000/api");
    });

    test("[Positive] assetUrl ต่อ baseURL ที่ถูกเขียนทับ ไม่ใช่ localhost", () => {
      expect(assetUrl("/uploads/qc-photo.jpg")).toBe(
        "http://erp.internal:5000/uploads/qc-photo.jpg"
      );
    });
  });
});
