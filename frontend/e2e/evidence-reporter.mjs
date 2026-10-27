import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultManifest = path.resolve(__dirname, "../../docs/02-testing/evidence/screenshot-manifest.json");
const defaultOutput = path.resolve(__dirname, "../../docs/02-testing/evidence/screenshots/e2e");

export default class EvidenceReporter {
  constructor(options = {}) {
    this.manifestPath = options.manifestPath || process.env.E2E_EVIDENCE_MANIFEST || defaultManifest;
    this.outputDir = options.outputDir || process.env.E2E_EVIDENCE_DIR || defaultOutput;
    const manifest = JSON.parse(fs.readFileSync(this.manifestPath, "utf8"));
    this.cases = manifest.levels?.e2e || [];
    this.written = [];
    fs.mkdirSync(this.outputDir, { recursive: true });
  }

  onTestEnd(test, result) {
    const title = test.title.toLowerCase();
    const entry = this.cases.find(
      (item) =>
        item.title.toLowerCase() === title ||
        item.script.toLowerCase().endsWith(` › ${title}`)
    );
    if (!entry) return;

    const screenshot = (result.attachments || []).find(
      (attachment) => attachment.path && /image\/png/i.test(attachment.contentType || "")
    );
    if (!screenshot) return;

    const target = path.join(this.outputDir, `${entry.id}.png`);
    fs.copyFileSync(screenshot.path, target);
    this.written.push(target);
  }

  onEnd() {
    const missing = this.cases.filter(
      (item) => !this.written.some((target) => target.endsWith(`${item.id}.png`))
    );
    console.log(`\nE2E evidence screenshots: ${this.written.length}/${this.cases.length}`);
    if (missing.length) {
      console.log(`Missing screenshots: ${missing.map((item) => item.id).join(", ")}`);
    }
  }
}
