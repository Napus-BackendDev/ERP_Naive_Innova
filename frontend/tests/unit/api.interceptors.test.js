// @vitest-environment jsdom
import { beforeEach, describe, expect, test } from "vitest";

import api from "@/lib/api";
import { getPending } from "@/lib/pendingRequests";

const readAuth = (config) => {
  const h = config.headers;
  if (!h) return undefined;
  if (typeof h.get === "function") {
    const value = h.get("Authorization");
    if (value !== undefined && value !== null) return value;
  }
  return h.Authorization ?? h.authorization;
};

const resolveWith = (data) => async (config) => ({
  data,
  status: 200,
  statusText: "OK",
  headers: {},
  config
});

const rejectWith = (error) => async () => Promise.reject(error);

const makeError = ({ status, data = {}, url }) =>
  Object.assign(new Error(`HTTP ${status}`), {
    response: { status, data },
    config: { url }
  });

describe("api — interceptor สอดแทรก token, ตัวนับ pending และตาข่าย 401", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  describe("Basic Flow", () => {
    test("[Positive] มี token ในเครื่อง -> แนบ Authorization และปลดตัวนับ pending เมื่อจบ", async () => {
      localStorage.setItem("token", "jwt-abc");
      let authDuringRequest = null;
      let pendingDuringRequest = null;

      const res = await api.get("/ping", {
        adapter: async (config) => {
          authDuringRequest = readAuth(config);
          pendingDuringRequest = getPending();
          return { data: { ok: true }, status: 200, statusText: "OK", headers: {}, config };
        }
      });

      expect(res.data).toEqual({ ok: true });
      expect(authDuringRequest).toBe("Bearer jwt-abc");
      expect(pendingDuringRequest).toBeGreaterThan(0);
      expect(getPending()).toBe(0);
    });
  });

  describe("Alternative Flow", () => {
    test("[Positive] ไม่มี token -> ไม่แนบ Authorization แต่ยังนับ pending ตามปกติ", async () => {
      let authDuringRequest = "unset";
      let pendingDuringRequest = 0;

      await api.get("/ping", {
        adapter: async (config) => {
          authDuringRequest = readAuth(config);
          pendingDuringRequest = getPending();
          return { data: {}, status: 200, statusText: "OK", headers: {}, config };
        }
      });

      expect(authDuringRequest == null || authDuringRequest === "").toBe(true);
      expect(pendingDuringRequest).toBe(1);
      expect(getPending()).toBe(0);
    });

    test("[Positive] token ที่เพิ่งล็อกอินใหม่ถูกอ่านทุกครั้งที่ยิง request", async () => {
      const first = [];
      await api.get("/a", {
        adapter: async (config) => {
          first.push(readAuth(config));
          return { data: {}, status: 200, statusText: "OK", headers: {}, config };
        }
      });
      localStorage.setItem("token", "jwt-new");
      await api.get("/b", {
        adapter: async (config) => {
          first.push(readAuth(config));
          return { data: {}, status: 200, statusText: "OK", headers: {}, config };
        }
      });

      expect(first[0] == null).toBe(true);
      expect(first[1]).toBe("Bearer jwt-new");
    });
  });

  describe("Exception Flow", () => {
    test("[Negative] 401 จาก endpoint ทั่วไป -> ลบ token ทั้ง local และ session แล้ว reject", async () => {
      localStorage.setItem("token", "dead-token");
      localStorage.setItem("user", "u1");
      sessionStorage.setItem("token", "dead-token");
      sessionStorage.setItem("user", "u1");

      await expect(
        api.get("/users", { adapter: rejectWith(makeError({ status: 401, url: "/users" })) })
      ).rejects.toThrow("HTTP 401");

      expect(localStorage.getItem("token")).toBeNull();
      expect(localStorage.getItem("user")).toBeNull();
      expect(sessionStorage.getItem("token")).toBeNull();
      expect(sessionStorage.getItem("user")).toBeNull();
      expect(getPending()).toBe(0);
    });

    test("[Negative] 401 จาก /auth/login ไม่ลบ token เพราะข้อความผิดพลาดต้องอยู่กับฟอร์ม", async () => {
      localStorage.setItem("token", "still-valid");
      localStorage.setItem("user", "u1");

      await expect(
        api.post("/auth/login", { email: "a@b.com" }, {
          adapter: rejectWith(makeError({ status: 401, url: "/auth/login" }))
        })
      ).rejects.toThrow("HTTP 401");

      expect(localStorage.getItem("token")).toBe("still-valid");
      expect(localStorage.getItem("user")).toBe("u1");
      expect(getPending()).toBe(0);
    });

    test("[Negative] code PENDING_APPROVAL -> ลบ token และพาไปหน้ารอการอนุมัติ", async () => {
      localStorage.setItem("token", "pending-token");

      await expect(
        api.get("/me", {
          adapter: rejectWith(makeError({
            status: 403,
            data: { code: "PENDING_APPROVAL" },
            url: "/me"
          }))
        })
      ).rejects.toThrow("HTTP 403");

      expect(localStorage.getItem("token")).toBeNull();
      expect(getPending()).toBe(0);
    });

    test("[Negative] code ACCESS_REJECTED -> ลบ token และพาไปหน้าแจ้งผลปฏิเสธ", async () => {
      localStorage.setItem("token", "rejected-token");
      sessionStorage.setItem("token", "rejected-token");

      await expect(
        api.get("/me", {
          adapter: rejectWith(makeError({
            status: 403,
            data: { code: "ACCESS_REJECTED" },
            url: "/me"
          }))
        })
      ).rejects.toThrow("HTTP 403");

      expect(localStorage.getItem("token")).toBeNull();
      expect(sessionStorage.getItem("token")).toBeNull();
      expect(getPending()).toBe(0);
    });

    test("[Negative] 401 ที่ไม่ใช่เรื่องระบบ login ก็ยัง reject ต่อให้หน้าจอไม่ได้เปลี่ยน", async () => {
      await expect(
        api.get("/anything", { adapter: rejectWith(makeError({ status: 401, url: "/anything" })) })
      ).rejects.toThrow("HTTP 401");
      expect(getPending()).toBe(0);
    });
  });
});
