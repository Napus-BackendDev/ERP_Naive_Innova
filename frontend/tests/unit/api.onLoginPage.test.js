// @vitest-environment jsdom
// @vitest-environment-options {"url":"http://localhost:3000/login"}
import { beforeEach, describe, expect, test } from "vitest";

import api from "@/lib/api";
import { getPending } from "@/lib/pendingRequests";

const rejectWith = (error) => async () => Promise.reject(error);

const unauthorized = (url) =>
  Object.assign(new Error("HTTP 401"), {
    response: { status: 401, data: {} },
    config: { url }
  });

describe("api — 401 ขณะผู้ใช้อยู่บนหน้าล็อกอินอยู่แล้ว", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  describe("Alternative Flow", () => {
    test("[Positive] pathname เป็น /login อยู่แล้ว -> ลบ token แต่ไม่พยายาม redirect ซ้ำ", async () => {
      expect(window.location.pathname).toBe("/login");
      localStorage.setItem("token", "expired");
      localStorage.setItem("user", "u1");

      await expect(
        api.get("/users", { adapter: rejectWith(unauthorized("/users")) })
      ).rejects.toThrow("HTTP 401");

      // ยังคงอยู่บน /login (jsdom ไม่ navigate จริง) และ storage ถูกเคลียร์
      expect(window.location.pathname).toBe("/login");
      expect(localStorage.getItem("token")).toBeNull();
      expect(localStorage.getItem("user")).toBeNull();
      expect(getPending()).toBe(0);
    });
  });
});
