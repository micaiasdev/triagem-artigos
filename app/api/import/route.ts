import { NextResponse } from "next/server";
import { parseArticles, parseCriteria } from "@/lib/spreadsheet";
import { saveState } from "@/lib/store";
import type { AppState } from "@/lib/types";

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
  if (!(articlesFile instanceof File) || !(criteriaFile instanceof File)) {
    return NextResponse.json(
      { error: "Envie os dois arquivos: planilha de artigos e planilha de critérios." },
      { status: 400 }
    );
  }

  let articlesRes;
  let criteriaRes;
  try {
    articlesRes = parseArticles(Buffer.from(await articlesFile.arrayBuffer()));
    criteriaRes = parseCriteria(Buffer.from(await criteriaFile.arrayBuffer()));
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
        warnings: articlesRes.warnings,
      },
      { status: 400 }
    );
  }
  if (criteriaRes.criteria.length === 0) {
    return NextResponse.json(
      {
        error:
          "Nenhum critério válido encontrado. Verifique as colunas 'code', 'type' (inclusao/exclusao) e 'description'.",
        warnings: criteriaRes.warnings,
      },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const state: AppState = {
    createdAt: now,
    updatedAt: now,
    sourceArticlesName: articlesFile.name,
    sourceCriteriaName: criteriaFile.name,
    articles: articlesRes.articles,
    criteria: criteriaRes.criteria,
  };
  await saveState(state);

  return NextResponse.json({
    ok: true,
    articles: state.articles.length,
    inclusion: state.criteria.filter((c) => c.type === "inclusion").length,
    exclusion: state.criteria.filter((c) => c.type === "exclusion").length,
    warnings: [...articlesRes.warnings, ...criteriaRes.warnings],
  });
}
