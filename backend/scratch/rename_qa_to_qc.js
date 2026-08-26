import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const filesToPatch = [
  'C:/Users/asus/Desktop/naive/MES/frontend/src/app/admin/production/kanban/page.js',
  'C:/Users/asus/Desktop/naive/MES/frontend/src/components/dashboard/ProductionDetailView.js',
  'C:/Users/asus/Desktop/naive/MES/frontend/src/components/dashboard/ProductionView.js',
  'C:/Users/asus/Desktop/naive/MES/backend/src/features/production/production.routes.js',
  'C:/Users/asus/Desktop/naive/MES/backend/src/features/users/user.model.js'
];

// 1. Perform replacements in the code files
filesToPatch.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Normalize line endings
    content = content.replace(/\r\n/g, '\n');

    // Replace uppercase QA with QC
    content = content.replace(/\bQA\b/g, 'QC');
    // Replace inline text translations like "QA รอบที่" -> "QC รอบที่"
    content = content.replace(/QA รอบที่/g, 'QC รอบที่');
    content = content.replace(/ผลตรวจ QA/g, 'ผลตรวจ QC');
    content = content.replace(/ตรวจ QA/g, 'ตรวจ QC');
    content = content.replace(/ขั้นตอน QA/g, 'ขั้นตอน QC');
    content = content.replace(/สเตตัส QA/g, 'สเตตัส QC');
    content = content.replace(/ส่งผลตรวจ QC/g, 'ส่งผลตรวจ QC');

    // Replace camelCase keys starting with qa
    content = content.replace(/qa1/g, 'qc1');
    content = content.replace(/\bqa/g, 'qc');
    content = content.replace(/qaPackaging/g, 'qcPackaging');
    content = content.replace(/qaPump/g, 'qcPump');
    content = content.replace(/qaSticker/g, 'qcSticker');
    content = content.replace(/qaAssembled/g, 'qcAssembled');
    content = content.replace(/qaStatus/g, 'qcStatus');

    // Write back file
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Successfully replaced QA -> QC in: ${filePath}`);
  } else {
    console.log(`File not found: ${filePath}`);
  }
});

// 2. Perform MongoDB field renaming migration
const runMigration = async () => {
  if (!process.env.MONGODB_URI) {
    console.log("No MONGODB_URI in environment, skipping database migration.");
    return;
  }
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB for QA -> QC migration.");

    // Retrieve active connection and collection
    const db = mongoose.connection.db;
    const result = await db.collection("users").updateMany(
      {},
      {
        $rename: {
          "qa1BulkPhoto": "qc1BulkPhoto",
          "qa1EmptyPackPhoto": "qc1EmptyPackPhoto",
          "qa1PackagingPhoto": "qc1PackagingPhoto",
          "qa1PumpPhoto": "qc1PumpPhoto",
          "qa1StickerPhoto": "qc1StickerPhoto",
          "qa1AssembledVideo": "qc1AssembledVideo",
          "qaPackagingPhoto": "qcPackagingPhoto",
          "qaPumpPhoto": "qcPumpPhoto",
          "qaStickerPhoto": "qcStickerPhoto",
          "qaAssembledVideo": "qcAssembledVideo",
          "qaStatus": "qcStatus"
        }
      }
    );
    console.log(`Database migration complete. Renamed fields in ${result.modifiedCount} customer documents.`);
  } catch (err) {
    console.error("Database migration error:", err);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
};

runMigration();
