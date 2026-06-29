import { NextResponse } from "next/server";
import { parseArticles, parseCriteria } from "@/lib/spreadsheet";
import { clearAllPdfs, saveState, writePdf } from "@/lib/store";
import type { AppState, Criterion } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Requisição inválida (esperado multipart/form-data)." },
      { status: 400 }
    );
  }

  const articlesFile = form.get("articles");
  const criteriaFile = form.get("criteria");
  const pdfFiles = form
    .getAll("pdfs")
    .filter((f): f is File => f instanceof File);

  if (!(articlesFile instanceof File)) {
    return NextResponse.json(
      { error: "Envie a planilha de artigos." },
      { status: 400 }
    );
  }

  let articlesRes;
  let criteria: Criterion[] = [];
  const warnings: string[] = [];
  try {
    articlesRes = parseArticles(Buffer.from(await articlesFile.arrayBuffer()));
    warnings.push(...articlesRes.warnings);
    if (criteriaFile instanceof File) {
      const cr = parseCriteria(Buffer.from(await criteriaFile.arrayBuffer()));
      criteria = cr.criteria;
      warnings.push(...cr.warnings);
    }
  } catch (e) {
    return NextResponse.json(
      { error: "Falha ao ler as planilhas: " + (e as Error).message },
      { status: 400 }
    );
  }

  if (articlesRes.articles.length === 0) {
    return NextResponse.json(
      {
        error:
          "Nenhum artigo válido encontrado. Verifique se há as colunas 'title' e 'abstract'.",
        warnings,
      },
      { status: 400 }
    );
  }

  // Mescla critérios referenciados na planilha (reconstruídos) que não estão no catálogo.
  const haveCodes = new Set(criteria.map((c) => c.code));
  for (const rc of articlesRes.referencedCriteria) {
    if (!haveCodes.has(rc.code)) {
      criteria.push(rc);
      haveCodes.add(rc.code);
    }
  }

  // Nova importação = dataset novo: limpa PDFs antigos antes de anexar os desta importação.
  await clearAllPdfs();

  let attached = 0;
  if (pdfFiles.length > 0) {
    const byName = new Map<string, File>();
    for (const f of pdfFiles) byName.set((f.name || "").toLowerCase(), f);

    for (const a of articlesRes.articles) {
      const fname = articlesRes.pdfFileNames[a.id];
      if (!fname) continue;
      const f = byName.get(fname.toLowerCase());
      if (f) {
        await writePdf(a.id, Buffer.from(await f.arrayBuffer()));
        a.pdfName = fname;
        attached++;
      } else {
        warnings.push(`PDF "${fname}" não foi enviado na lista.`);
      }
    }
  }

  const now = new Date().toISOString();
  const state: AppState = {
    createdAt: now,
    updatedAt: now,
    sourceArticlesName: articlesFile.name,
    sourceCriteriaName: criteriaFile instanceof File ? criteriaFile.name : "",
    articles: articlesRes.articles,
    criteria,
  };
  await saveState(state);

  return NextResponse.json({
    ok: true,
    articles: state.articles.length,
    inclusion: state.criteria.filter((c) => c.type === "inclusion").length,
    exclusion: state.criteria.filter((c) => c.type === "exclusion").length,
    pdfsAttached: attached,
    warnings: warnings.slice(0, 20),
  });
}
