import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  const filePath = path.join(process.cwd(), "public", "data", "population_summary.json");
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "not_generated" }, { status: 404 });
  }
  const raw = fs.readFileSync(filePath, "utf8");
  return NextResponse.json(JSON.parse(raw));
}
