import { buildCriteriaTemplate } from "@/lib/spreadsheet";

export const runtime = "nodejs";

export async function GET() {
  const buf = buildCriteriaTemplate();
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="modelo_criterios.xlsx"`,
    },
  });
}
