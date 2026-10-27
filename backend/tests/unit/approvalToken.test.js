import { createHash } from "crypto";
import { describe, expect, test } from "vitest";
import { hashApprovalToken } from "../../src/features/auth/approvalEmail.js";

const sha256 = (value) =>
  createHash("sha256").update(value).digest("hex");

describe("hashApprovalToken — SHA-256 ของ token อนุมัติเข้าใช้", () => {
  function expected(token) {
    return sha256(token);
  }

  describe("Basic Flow", () => {
    test("[Positive] คืนค่าเป็น hexadecimal ความยาว 64 ตัวอักษร", () => {
      const hash = hashApprovalToken("nvi-approval-token-001");
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    test("[Positive] ผลลัพธ์ตรงกับ SHA-256 ที่คำนวณจาก crypto มาตรฐาน", () => {
      const token = "nvi-approval-token-001";
      expect(hashApprovalToken(token)).toBe(expected(token));
    });
  });

  describe("Alternative Flow", () => {
    test("[Positive] token ต่างกันได้คนละ hash", () => {
      const a = hashApprovalToken("token-aaa");
      const b = hashApprovalToken("token-bbb");
      expect(a).not.toBe(b);
      expect(a).toMatch(/^[0-9a-f]{64}$/);
      expect(b).toMatch(/^[0-9a-f]{64}$/);
    });

    test("[Positive] token เดิมให้ผลลัพธ์เดิมทุกครั้ง ( deterministic )", () => {
      const token = " repeatable ";
      expect(hashApprovalToken(token)).toBe(hashApprovalToken(token));
    });

    test("[Positive] ข้อความไทย/อักขระพิเศษถูก hash ได้โดยไม่ผิดเพี้ยน", () => {
      const token = "อนุมัติเข้าใช้-๒๕๖๙/!";
      expect(hashApprovalToken(token)).toBe(expected(token));
    });
  });

  describe("Exception Flow", () => {
    test("[Negative] ไม่รองรับ null / undefined และโยนข้อผิดพลาด", () => {
      expect(() => hashApprovalToken(null)).toThrow();
      expect(() => hashApprovalToken(undefined)).toThrow();
    });

    test("[Negative] ไม่รองรับตัวเลขและ object และโยนข้อผิดพลาด", () => {
      expect(() => hashApprovalToken(123456)).toThrow();
      expect(() => hashApprovalToken({ token: "x" })).toThrow();
    });
  });
});
