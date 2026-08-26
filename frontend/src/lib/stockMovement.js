export const stockItemTypeForTab = (tab) => {
  switch (tab) {
    case "ingredients": return "ingredient";
    case "packagings": return "packaging";
    case "sampleProducts": return "sampleProduct";
    case "fglots": return "fgLot";
    default: return "";
  }
};

export const formatThaiStockDateTime = (value) => {
  if (!value) return "-";
  try {
    return `${new Intl.DateTimeFormat("th-TH-u-nu-latn", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      hourCycle: "h23"
    }).format(new Date(value))} น.`;
  } catch {
    return new Date(value).toLocaleString("th-TH");
  }
};

export const formatStructuredMovement = (movement) => {
  if (!movement) return "";
  const direction = movement.direction === "in" ? "รับเข้า" : "ตัดออก";
  const amount = Number(movement.amount || 0).toLocaleString("th-TH");
  const before = Number(movement.beforeQuantity || 0).toLocaleString("th-TH");
  const after = Number(movement.afterQuantity || 0).toLocaleString("th-TH");
  const unit = movement.unit || "ชิ้น";
  const parts = [
    `${direction} ${amount} ${unit}`,
    `ก่อนหน้า: ${before} ${unit}`,
    `คงเหลือ: ${after} ${unit}`
  ];
  if (movement.stage) parts.push(`ขั้นตอน: ${movement.stage}`);
  if (movement.note) parts.push(`หมายเหตุ: ${movement.note}`);
  return parts.join(" | ");
};
