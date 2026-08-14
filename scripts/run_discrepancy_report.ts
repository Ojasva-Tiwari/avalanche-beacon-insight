import fs from "fs";
import path from "path";
import { PilotDataHarness } from "../src/lib/api/pilotDataHarness";
import phase7eDataset from "../data/real_pilot/real_observation_phase7e_records.json";

console.log("[Phase 7E] Ingesting real physical field dataset...");
const report = PilotDataHarness.processPhase7EDataset(phase7eDataset);

const outputPath = path.resolve("scratch/phase7e_real_sensor_discrepancy_report.json");
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), "utf-8");

console.log(`[Phase 7E] Real physical field validation report saved to -> ${outputPath}`);
console.log(JSON.stringify(report, null, 2));

