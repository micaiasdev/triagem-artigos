import JSZip from "jszip";
import { NextResponse } from "next/server";
import {
  clearAllPdfs,
  loadState,
  readPdf,
  saveState,
  writePdf,
} from "@/lib/store";
import type { AppState } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAppState(s: unknown): s is AppState {
  const o = s as AppState;
  return !!o && Array.isArray(o.articles) && Array.isArray(o.criteria);
}

// Salvar o dataset atual: ?pdfs=1 -> .zip (estado + PDFs); ?pdfs=0 -> .json (só estado).
export async function GET(req: Request) {
  const withPdfs = new URL(req.url).searchParams.get("pdfs") === "1";
  const state = await loadState();
  if (!state) return new Response("Nenhum dataset carregado.", { status: 404 });

  const stamp = new Date().toISOString().slice(0, 10);

  if (!withPdfs) {
    return new Response(JSON.stringify(state, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="dataset_${stamp}.json"`,
      },
    });
  }

  const zip = new JSZip();
  zip.file("state.json", JSON.stringify(state, null, 2));
  const pdfs = zip.folder("pdfs")!;
  for (const a of state.articles) {
    if (!a.pdfName) continue;
    try {
      pdfs.file(`${a.id}.pdf`, await readPdf(a.id));
    } catch {
      // PDF referenciado mas ausente no disco — ignora.
    }
  }
  const out = await zip.generateAsync({ type: "nodebuffer" });
  return new Response(new Uint8Array(out), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="dataset_${stamp}.zip"`,
    },
  });
}

// Restaurar dataset a partir de um .json ou .zip (substitui o dataset atual).
export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Selecione o arquivo (.zip ou .json)." }, {
      status: 400,
    });
  }

  const name = (file.name || "").toLowerCase();
  const buf = Buffer.from(await file.arrayBuffer());
  const isZip =
    name.endsWith(".zip") ||
    (buf.length >= 4 &&
      buf[0] === 0x50 &&
      buf[1] === 0x4b &&
      buf[2] === 0x03 &&
      buf[3] === 0x04);

  try {
    if (isZip) {
      const zip = await JSZip.loadAsync(buf);
      const stateEntry = zip.file("state.json");
      if (!stateEntry) {
        return NextResponse.json(
          { error: "O .zip não contém state.json." },
          { status: 400 }
        );
      }
      const state = JSON.parse(await stateEntry.async("string"));
      if (!isAppState(state)) {
        return NextResponse.json({ error: "state.json inválido." }, { status: 400 });
      }
      await saveState(state);
      await clearAllPdfs();
      let pdfs = 0;
      for (const entry of zip.file(/^pdfs\/.+\.pdf$/i)) {
        const id = entry.name.replace(/^pdfs\//, "").replace(/\.pdf$/i, "");
        await writePdf(id, await entry.async("nodebuffer"));
        pdfs++;
      }
      return NextResponse.json({
        ok: true,
        articles: state.articles.length,
        criteria: state.criteria.length,
        pdfs,
      });
    }

    const state = JSON.parse(buf.toString("utf8"));
    if (!isAppState(state)) {
      return NextResponse.json(
        { error: "Arquivo .json não é um dataset válido." },
        { status: 400 }
      );
    }
    await saveState(state);
    return NextResponse.json({
      ok: true,
      articles: state.articles.length,
      criteria: state.criteria.length,
      pdfs: 0,
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Falha ao restaurar: " + (e as Error).message },
      { status: 400 }
    );
  }
}
