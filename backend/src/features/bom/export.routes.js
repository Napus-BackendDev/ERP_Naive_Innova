import express from "express";
import ExcelJS from "exceljs";
import Ingredient from "./ingredient.model.js";
import { checkAuth } from "../../middleware/auth.js";

const router = express.Router();

router.use(checkAuth);

// Export ingredient stock to Excel using ExcelJS
router.get("/stock/excel", async (req, res) => {
  try {
    const isAdmin = req.user.role && (req.user.role.name === "Admin" || req.user.role === "Admin");
    const ingredients = await Ingredient.find(isAdmin ? {} : { ownerId: req.user._id });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Raw Materials Stock");

    // Define columns
    worksheet.columns = [
      { header: "#", key: "index", width: 5 },
      { header: "ชื่อวัตถุดิบ (Ingredient)", key: "name", width: 30 },
      { header: "สต๊อกเปิด (ก.)", key: "openingStock", width: 15 },
      { header: "Supplier", key: "supplier", width: 25 },
      { header: "ราคา/กก. (บาท)", key: "pricePerKg", width: 15 }
    ];

    // Style headers
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF2E7D32" } // Bio-Green
      };
      cell.alignment = { horizontal: "center" };
    });

    // Populate rows
    ingredients.forEach((ing, i) => {
      worksheet.addRow({
        index: i + 1,
        name: ing.name,
        openingStock: ing.openingStock,
        supplier: ing.supplier || "—",
        pricePerKg: ing.pricePerKg || 0
      });
    });

    // Formatting cell borders
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin", color: { argb: "FFCCCCCC" } },
          bottom: { style: "thin", color: { argb: "FFCCCCCC" } },
          left: { style: "thin", color: { argb: "FFCCCCCC" } },
          right: { style: "thin", color: { argb: "FFCCCCCC" } }
        };
      });
    });

    // Set Response Headers
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=" + "raw_materials_stock.xlsx"
    );

    await workbook.xlsx.write(res);
    return res.end();
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Export stock to CSV format
router.get("/stock/csv", async (req, res) => {
  try {
    const isAdmin = req.user.role && (req.user.role.name === "Admin" || req.user.role === "Admin");
    const ingredients = await Ingredient.find(isAdmin ? {} : { ownerId: req.user._id });
    
    let csvContent = "\ufeff#,ชื่อวัตถุดิบ (Ingredient),สต๊อกเปิด (ก.),Supplier,ราคา/กก. (บาท)\n";
    ingredients.forEach((ing, i) => {
      csvContent += `${i + 1},"${ing.name}",${ing.openingStock},"${ing.supplier || "—"}",${ing.pricePerKg}\n`;
    });

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=raw_materials_stock.csv");
    return res.status(200).send(csvContent);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
