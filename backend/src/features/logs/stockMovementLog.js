import ActivityLog from "./activityLog.model.js";

// Keep all stock audit writes in one place so every workflow records the same
// fields and the UI never has to infer movement from free-form text.
export async function writeStockMovementLog({
  ownerId,
  operator,
  actionType = "STOCK",
  description,
  itemType,
  itemId,
  itemName,
  direction,
  amount,
  unit,
  beforeQuantity,
  afterQuantity,
  source,
  stage,
  note,
  relatedOrderId,
  relatedOrderName,
  relatedLotId
}) {
  return ActivityLog.create({
    ownerId,
    actionType,
    description,
    operator,
    stockMovement: {
      itemType,
      itemId,
      itemName: itemName || "",
      direction,
      amount,
      unit: unit || "",
      beforeQuantity,
      afterQuantity,
      source: source || "",
      stage: stage || "",
      note: note || "",
      relatedOrderId,
      relatedOrderName: relatedOrderName || "",
      relatedLotId
    }
  });
}

export function stockMovementDescription({
  itemName,
  direction,
  amount,
  unit,
  afterQuantity,
  note = ""
}) {
  const action = direction === "in" ? "รับเข้า" : "เบิกออก";
  const remark = note ? ` | หมายเหตุ: ${note}` : "";
  return `ปรับปรุงสต็อก "${itemName}": ${action} ${amount} ${unit} (สต็อกคงเหลือปัจจุบัน: ${afterQuantity} ${unit})${remark}`;
}
