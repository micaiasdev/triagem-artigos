import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { PDF_DIR, updateState } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function pdfPath(id: string): string {
  const safe = id.replace(/[^a-zA-Z0-9_-]/g, "_");
  return path.join(PDF_DIR, `${safe}.pdf`);
}

// Serve o PDF enviado (para exibir no iframe).
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  try {
    const buf = await fs.readFile(pdfPath(id));
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response("PDF não encontrado.", { status: 404 });
  }
}

// Envia/atualiza o PDF do artigo.
export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }
  const file = form.get("pdf");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Arquivo PDF ausente." }, { status: 400 });
  }
  const name = file.name || "documento.pdf";
  if (!/\.pdf$/i.test(name) && file.type !== "application/pdf") {
    return NextResponse.json({ error: "Envie um arquivo .pdf." }, { status: 400 });
  }

  await fs.mkdir(PDF_DIR, { recursive: true });
  await fs.writeFile(pdfPath(id), Buffer.from(await file.arrayBuffer()));

  let notFound = false;
  const updated = await updateState((state) => {
    const a = state.articles.find((x) => x.id === id);
    if (!a) {
      notFound = true;
      return;
    }
    a.pdfName = name;
  });
  if (updated === null)
    return NextResponse.json({ error: "Nenhum dataset carregado." }, { status: 404 });
  if (notFound)
    return NextResponse.json({ error: "Artigo não encontrado." }, { status: 404 });

  return NextResponse.json({ article: updated.articles.find((a) => a.id === id) });
}

// Remove o PDF do artigo.
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  await fs.rm(pdfPath(id), { force: true });

  const updated = await updateState((state) => {
    const a = state.articles.find((x) => x.id === id);
    if (a) a.pdfName = "";
  });
  if (updated === null)
    return NextResponse.json({ error: "Nenhum dataset carregado." }, { status: 404 });

  return NextResponse.json({ article: updated.articles.find((a) => a.id === id) });
}
