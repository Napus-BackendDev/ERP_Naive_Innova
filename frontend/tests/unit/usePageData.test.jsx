// @vitest-environment jsdom
import { beforeEach, describe, expect, test, vi } from "vitest";
import { act } from "react";
import { renderHook, waitFor } from "@testing-library/react";

import usePageData from "@/lib/usePageData";

const { push, router } = vi.hoisted(() => {
  const push = vi.fn();
  return { push, router: { push } };
});

vi.mock("next/navigation", () => ({
  useRouter: () => router
}));

describe("usePageData — โหลดข้อมูลหน้าพร้อม token guard", () => {
  beforeEach(() => {
    localStorage.clear();
    push.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("Basic Flow", () => {
    test("[Positive] มี token ในเครื่อง -> โหลดข้อมูลสำเร็จและจบด้วย loading=false", async () => {
      localStorage.setItem("token", "jwt-token");
      const fetcher = vi.fn().mockResolvedValue({ total: 3 });

      const { result } = renderHook(() => usePageData(fetcher));
      expect(result.current.loading).toBe(true);
      expect(result.current.data).toBeNull();

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(result.current.data).toEqual({ total: 3 });
      expect(result.current.error).toBe("");
      expect(push).not.toHaveBeenCalled();
    });
  });

  describe("Alternative Flow", () => {
    test("[Positive] deps เปลี่ยนจะดึงข้อมูลใหม่โดยไม่ต้อง mount หน้าใหม่", async () => {
      localStorage.setItem("token", "jwt-token");
      const fetcher = vi.fn().mockResolvedValue([]);

      const { rerender } = renderHook(
        ({ deps }) => usePageData(fetcher, { deps }),
        { initialProps: { deps: ["lot-a"] } }
      );
      await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));

      rerender({ deps: ["lot-b"] });
      await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
    });

    test("[Positive] เรียก reload เพื่อดึงข้อมูลใหม่โดยคง error ว่างอยู่", async () => {
      localStorage.setItem("token", "jwt-token");
      const fetcher = vi.fn()
        .mockResolvedValueOnce({ rows: [1] })
        .mockResolvedValueOnce({ rows: [1, 2] });

      const { result } = renderHook(() => usePageData(fetcher));
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.data).toEqual({ rows: [1] });

      await act(async () => { await result.current.reload(); });
      expect(fetcher).toHaveBeenCalledTimes(2);
      expect(result.current.data).toEqual({ rows: [1, 2] });
      expect(result.current.error).toBe("");
    });

    test("[Positive] initialData และ errorMessage ที่กำหนดเองถูกใช้แทนค่าเริ่มต้น", async () => {
      localStorage.setItem("token", "jwt-token");
      const fetcher = vi.fn().mockRejectedValue(new Error("boom"));

      const { result } = renderHook(() =>
        usePageData(fetcher, {
          initialData: { cached: true },
          errorMessage: "โหลดรายการไม่ได้"
        })
      );
      expect(result.current.data).toEqual({ cached: true });

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.error).toBe("โหลดรายการไม่ได้");
      expect(result.current.data).toEqual({ cached: true });
    });
  });

  describe("Exception Flow", () => {
    test("[Negative] ไม่มี token -> เด้งไปหน้าล็อกอินและไม่ยิง request", async () => {
      const fetcher = vi.fn();

      const { result } = renderHook(() => usePageData(fetcher));
      await waitFor(() => expect(push).toHaveBeenCalledWith("/login"));

      expect(fetcher).not.toHaveBeenCalled();
      expect(result.current.data).toBeNull();
      // ออกจากโหมดโหลดไม่ได้เพราะถูกเปลี่ยนเส้นทางก่อน
      expect(result.current.loading).toBe(true);
    });

    test("[Negative] request ล้มเหลว -> แสดงข้อความผิดพลาดตามค่าเริ่มต้น", async () => {
      localStorage.setItem("token", "jwt-token");
      const fetcher = vi.fn().mockRejectedValue(new Error("network down"));

      const { result } = renderHook(() => usePageData(fetcher));
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.error).toBe("โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่");
      expect(result.current.data).toBeNull();
    });
  });
});
