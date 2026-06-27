import { buildExportCsv, buildExportXlsx } from "@/lib/spreadsheet";
import { loadState } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const format =
    new URL(req.url).searchParams.get("format") === "csv" ? "csv" : "xlsx";
  const state = await loadState();
  if (!state) {
    return new Response("Nenhum dataset carregado.", { status: 404 });
  }

  const stamp = new Date().toISOString().slice(0, 10);

  if (format === "csv") {
    // BOM para o Excel reconhecer UTF-8.
    const body = "﻿" + buildExportCsv(state);
    return new Response(body, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="triagem_${stamp}.csv"`,
      },
    });
  }

  const buf = buildExportXlsx(state);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="triagem_${stamp}.xlsx"`,
    },
  });
}
