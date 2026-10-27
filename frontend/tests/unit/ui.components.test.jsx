// @vitest-environment jsdom
import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Select from "@/components/ui/Select";
import { AutoGrowingTextarea, Input, Textarea } from "@/components/ui/Input";

const IconStub = (props) => <svg data-testid="icon-stub" {...props} />;

describe("Badge — แท็กสถานะ", () => {
  describe("Basic Flow", () => {
    test("[Positive] แสดงข้อความ children พร้อม dot ของ variant เริ่มต้น (success)", () => {
      const { container } = render(<Badge>In Production</Badge>);
      expect(screen.getByText("In Production")).toBeTruthy();
      const root = container.querySelector("span");
      expect(root.className).toContain("bg-green-50");
      expect(root.querySelector("span.h-1\\.5")).toBeTruthy();
    });
  });

  describe("Alternative Flow", () => {
    test("[Positive] variant danger เปลี่ยนเป็นชุดสีแดง", () => {
      const { container } = render(<Badge variant="danger">Out of Stock</Badge>);
      const root = container.querySelector("span");
      expect(root.className).toContain("bg-red-50");
      expect(root.className).toContain("text-red-700");
    });

    test("[Positive] showDot=false ซ่อนจุดสีแต่ยังแสดงข้อความ", () => {
      const { container } = render(
        <Badge variant="warning" showDot={false}>Low Stock</Badge>
      );
      expect(screen.getByText("Low Stock")).toBeTruthy();
      expect(container.querySelector("span.h-1\\.5")).toBeNull();
    });

    test("[Positive] className ที่ส่งมาถูกรวมเข้ากับคลาสของ Badge", () => {
      const { container } = render(<Badge className="mt-2">Lot A</Badge>);
      expect(container.querySelector("span").className).toContain("mt-2");
    });
  });

  describe("Exception Flow", () => {
    test("[Negative] variant ที่ไม่มีในรายการไม่ตกทอดชุดสี success และไม่ทำให้ render ล่ม", () => {
      const { container } = render(<Badge variant="unknown">X</Badge>);
      expect(screen.getByText("X")).toBeTruthy();
      const root = container.querySelector("span");
      expect(root.className).not.toContain("bg-green-50");
    });
  });
});

describe("Button — ปุ่มกด", () => {
  describe("Basic Flow", () => {
    test("[Positive] ใช้ type=button ตามค่าเริ่มต้นและเรียก onClick เมื่อคลิก", () => {
      const onClick = vi.fn();
      render(<Button onClick={onClick}>บันทึก</Button>);
      const btn = screen.getByRole("button", { name: "บันทึก" });
      expect(btn.getAttribute("type")).toBe("button");
      expect(btn.getAttribute("disabled")).toBeNull();
      fireEvent.click(btn);
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe("Alternative Flow", () => {
    test("[Positive] variant และ size ที่กำหนดถูกนำไปใช้กับ className", () => {
      render(<Button variant="danger" size="lg">ลบ</Button>);
      const btn = screen.getByRole("button", { name: "ลบ" });
      expect(btn.className).toContain("bg-red-600");
      expect(btn.className).toContain("px-5 py-3");
    });

    test("[Positive] isLoading=true ทำให้ปุ่มไม่สามารถกดได้และติด aria-busy", () => {
      render(<Button isLoading>กำลังบันทึก</Button>);
      const btn = screen.getByRole("button", { name: /กำลังบันทึก/ });
      expect(btn.getAttribute("disabled")).not.toBeNull();
      expect(btn.getAttribute("aria-busy")).toBe("true");
    });

    test("[Positive] onClick ที่คืน Promise ทำให้ปุ่มยุ่งอัตโนมัติจนกว่าจะเสร็จ", async () => {
      let resolve;
      const onClick = vi.fn(() => new Promise((r) => { resolve = r; }));
      render(<Button onClick={onClick}>ส่ง</Button>);
      const btn = screen.getByRole("button", { name: "ส่ง" });

      fireEvent.click(btn);
      expect(onClick).toHaveBeenCalledTimes(1);
      await waitFor(() => expect(btn.getAttribute("aria-busy")).toBe("true"));
      expect(btn.getAttribute("disabled")).not.toBeNull();

      resolve();
      await waitFor(() => expect(btn.getAttribute("aria-busy")).toBeNull());
      expect(btn.getAttribute("disabled")).toBeNull();
    });
  });

  describe("Exception Flow", () => {
    test("[Negative] disabled=true ไม่ส่ง event ไปยัง onClick", () => {
      const onClick = vi.fn();
      render(<Button disabled onClick={onClick}>ปิด</Button>);
      fireEvent.click(screen.getByRole("button", { name: "ปิด" }));
      expect(onClick).not.toHaveBeenCalled();
    });

    test("[Negative] ไม่ส่ง onClick มาด้วย การคลิกไม่ทำให้เกิดข้อผิดพลาด", () => {
      render(<Button>เฉยๆ</Button>);
      const btn = screen.getByRole("button", { name: "เฉยๆ" });
      expect(() => fireEvent.click(btn)).not.toThrow();
    });
  });
});

describe("Card — การ์ดพื้นฐาน", () => {
  describe("Basic Flow", () => {
    test("[Positive] แสดงเนื้อหาภายในพร้อมสไตล์พื้นฐาน", () => {
      const { container } = render(<Card>ยอดขายวันนี้</Card>);
      expect(screen.getByText("ยอดขายวันนี้")).toBeTruthy();
      expect(container.firstChild.className).toContain("rounded-2xl");
      expect(container.firstChild.className).not.toContain("hover:border-slate-300");
    });
  });

  describe("Alternative Flow", () => {
    test("[Positive] hoverable=true เพิ่มเอฟเฟกต์ hover และ padding ที่กำหนดแทนค่าเดิม", () => {
      const { container } = render(
        <Card hoverable padding="p-8">รายละเอียด</Card>
      );
      const root = container.firstChild;
      expect(root.className).toContain("hover:border-slate-300");
      expect(root.className).toContain("p-8");
      expect(root.className).not.toContain("p-4");
    });
  });

  describe("Exception Flow", () => {
    test("[Negative] ไม่ส่ง children ก็ยัง render ได้โดยไม่ล่ม", () => {
      const { container } = render(<Card />);
      expect(container.firstChild).toBeTruthy();
      expect(container.firstChild.textContent).toBe("");
    });
  });
});

describe("Input — ช่องกรอกข้อความ", () => {
  describe("Basic Flow", () => {
    test("[Positive] แสดง label, placeholder และค่าที่กรอก", () => {
      render(
        <Input label="ชื่อลูกค้า" placeholder="กรอกชื่อ" value="บริษัท A" onChange={() => {}} />
      );
      expect(screen.getByText(/ชื่อลูกค้า/)).toBeTruthy();
      const input = screen.getByPlaceholderText("กรอกชื่อ");
      expect(input.value).toBe("บริษัท A");
    });
  });

  describe("Alternative Flow", () => {
    test("[Positive] required=true แสดงเครื่องหมาย * กำกับ label", () => {
      render(<Input label="อีเมล" required value="" onChange={() => {}} />);
      expect(screen.getByText(/\*/)).toBeTruthy();
    });

    test("[Positive] suffix ที่ส่งมาแสดงผลในช่องกรอก", () => {
      render(<Input label="จำนวน" value="10" onChange={() => {}} suffix="ชิ้น" />);
      expect(screen.getByText("ชิ้น")).toBeTruthy();
    });

    test("[Positive] icon ที่ส่งมาแสดงด้านซ้ายและเว้นพื้นที่ให้ข้อความ", () => {
      render(<Input label="ค้นหา" placeholder="ค้น..." value="" onChange={() => {}} icon={IconStub} />);
      expect(screen.getByTestId("icon-stub")).toBeTruthy();
      expect(screen.getByPlaceholderText("ค้น...").className).toContain("pl-9");
    });
  });

  describe("Exception Flow", () => {
    test("[Negative] error แสดงข้อความผิดพลาดและแทนที่ helperText", () => {
      render(
        <Input
          label="อีเมล"
          value="abc"
          onChange={() => {}}
          error="อีเมลไม่ถูกต้อง"
          helperText="ตัวอย่าง: a@b.com"
        />
      );
      expect(screen.getByText("อีเมลไม่ถูกต้อง")).toBeTruthy();
      expect(screen.queryByText("ตัวอย่าง: a@b.com")).toBeNull();
      const input = screen.getByDisplayValue("abc");
      expect(input.className).toContain("border-red-500");
    });

    test("[Negative] ไม่มี error และไม่มี helperText จะไม่แสดงข้อความกำกับด้านล่าง", () => {
      render(<Input label="หมายเหตุ" value="" onChange={() => {}} />);
      const helper = document.querySelector("span.text-slate-400");
      expect(helper).toBeNull();
    });
  });
});

describe("Select — ช่องเลือกแบบ dropdown", () => {
  const options = [
    { value: "s1", label: "Lead" },
    { value: "s11", label: "Closed Won" }
  ];

  describe("Basic Flow", () => {
    test("[Positive] แสดง placeholder เป็นตัวเลือกแรกและ list ครบทุกตัวเลือก", () => {
      render(
        <Select label="ด่านงาน" placeholder="เลือกด่าน" options={options} value="" onChange={() => {}} />
      );
      const select = screen.getByRole("combobox");
      const values = [...select.options].map((o) => o.value);
      expect(values).toEqual(["", "s1", "s11"]);
      expect([...select.options].map((o) => o.text)).toEqual([
        "เลือกด่าน",
        "Lead",
        "Closed Won"
      ]);
    });
  });

  describe("Alternative Flow", () => {
    test("[Positive] options เป็น array ของ string ก็แปลงเป็น value/label ได้", () => {
      render(<Select options={["kg", "ชิ้น"]} value="kg" onChange={() => {}} />);
      const select = screen.getByRole("combobox");
      expect([...select.options].map((o) => o.value)).toEqual(["kg", "ชิ้น"]);
      expect(select.value).toBe("kg");
    });
  });

  describe("Exception Flow", () => {
    test("[Negative] error แสดงข้อความผิดพลาดใต้ช่องเลือก", () => {
      render(
        <Select
          label="เลือกสูตร"
          options={options}
          value=""
          onChange={() => {}}
          error="กรุณาเลือกสูตร"
        />
      );
      expect(screen.getByText("กรุณาเลือกสูตร")).toBeTruthy();
    });

    test("[Negative] ไม่มี options และไม่มี placeholder แสดง dropdown ว่างโดยไม่ล่ม", () => {
      render(<Select value="" onChange={() => {}} />);
      const select = screen.getByRole("combobox");
      expect(select.options.length).toBe(0);
    });
  });
});

describe("Textarea — ช่องกรอกข้อความหลายบรรทัด", () => {
  describe("Basic Flow", () => {
    test("[Positive] แสดง label, placeholder, ค่าที่กรอก และจำนวนแถวเริ่มต้น 3", () => {
      render(<Textarea label="รายละเอียด" placeholder="พิมพ์รายละเอียด" value="ข้อความ" onChange={() => {}} />);
      expect(screen.getByText(/รายละเอียด/)).toBeTruthy();
      const area = screen.getByPlaceholderText("พิมพ์รายละเอียด");
      expect(area.value).toBe("ข้อความ");
      expect(area.rows).toBe(3);
    });
  });

  describe("Alternative Flow", () => {
    test("[Positive] rows และ required ที่กำหนดถูกนำไปใช้แทนค่าเริ่มต้น", () => {
      render(<Textarea label="หมายเหตุ" value="" onChange={() => {}} rows={6} required />);
      const area = document.querySelector("textarea");
      expect(area.rows).toBe(6);
      expect(screen.getByText(/\*/)).toBeTruthy();
    });

    test("[Positive] พิมพ์ข้อความใหม่จะเรียก onChange พร้อมค่าล่าสุด", () => {
      const seen = [];
      render(<Textarea label="โน้ต" value="" onChange={(e) => seen.push(e.target.value)} />);
      fireEvent.change(document.querySelector("textarea"), { target: { value: "ใหม่" } });
      expect(seen).toEqual(["ใหม่"]);
      // ช่องแบบ controlled คงค่าเดิมไว้เพราะ state ยังไม่เปลี่ยน
      expect(document.querySelector("textarea").value).toBe("");
    });
  });

  describe("Exception Flow", () => {
    test("[Negative] ไม่ส่ง label มาก็ยังแสดงช่องกรอกได้โดยไม่ล่ม", () => {
      render(<Textarea value="อย่างเดียว" onChange={() => {}} />);
      const area = document.querySelector("textarea");
      expect(area.value).toBe("อย่างเดียว");
      expect(document.querySelector("label")).toBeNull();
    });
  });
});

describe("AutoGrowingTextarea — ช่องกรอกที่ขยายความสูงเอง", () => {
  describe("Basic Flow", () => {
    test("[Positive] render ได้พร้อมค่าที่กรอกและปรับความสูงหลัง mount", () => {
      render(<AutoGrowingTextarea label="คำอธิบาย" value="บรรทัดเดียว" onChange={() => {}} />);
      const area = document.querySelector("textarea");
      expect(area.value).toBe("บรรทัดเดียว");
      // useEffect ตั้ง style.height หลัง mount (jsdom ให้ scrollHeight = 0)
      expect(area.style.height).not.toBe("");
    });
  });

  describe("Alternative Flow", () => {
    test("[Positive] เปลี่ยนค่าใหม่จะปรับความสูงซ้ำและส่ง event ให้ onChange", () => {
      const onChange = vi.fn();
      const { rerender } = render(
        <AutoGrowingTextarea label="คำอธิบาย" value="" onChange={onChange} />
      );
      fireEvent.change(document.querySelector("textarea"), { target: { value: "เพิ่มข้อความ" } });
      expect(onChange).toHaveBeenCalledTimes(1);

      rerender(<AutoGrowingTextarea label="คำอธิบาย" value="เพิ่มข้อความ" onChange={onChange} />);
      const area = document.querySelector("textarea");
      expect(area.value).toBe("เพิ่มข้อความ");
      expect(area.style.height).not.toBe("");
    });
  });

  describe("Exception Flow", () => {
    test("[Negative] ไม่มี onChange มาก็พิมพ์ได้โดยไม่ทำให้ render ล่ม", () => {
      render(<AutoGrowingTextarea value="คงเดิม" />);
      const area = document.querySelector("textarea");
      expect(() =>
        fireEvent.change(area, { target: { value: "พิมพ์เพิ่ม" } })
      ).not.toThrow();
    });

    test("[Negative] ไม่ส่ง value/label เลยก็ยังแสดงช่องกรอกว่างได้", () => {
      render(<AutoGrowingTextarea />);
      const area = document.querySelector("textarea");
      expect(area.value).toBe("");
      expect(document.querySelector("label")).toBeNull();
    });
  });
});
