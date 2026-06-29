import { NextResponse } from "next/server";
import { updateState } from "@/lib/store";
import type { AppState, Decision, ArticlePatch } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DECISIONS: Decision[] = ["pending", "included", "excluded"];

// Mantém apenas critérios cujo tipo bate com a decisão (inclusão/exclusão).
function filterCriteria(
  state: AppState,
  decision: Decision,
  codes: string[]
): string[] {
  const type =
    decision === "included"
      ? "inclusion"
      : decision === "excluded"
        ? "exclusion"
        : null;
  if (type === null) return [];
  const allowed = new Set(
    state.criteria.filter((c) => c.type === type).map((c) => c.code)
  );
  return codes.filter((code) => allowed.has(code));
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  let body: ArticlePatch;
  try {
    body = (await req.json()) as ArticlePatch;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  let notFound = false;
  const updated = await updateState((state) => {
    const art = state.articles.find((a) => a.id === id);
    if (!art) {
      notFound = true;
      return;
    }

    if (typeof body.decision === "string" && DECISIONS.includes(body.decision)) {
      art.decision = body.decision;
    }
    if (Array.isArray(body.criteriaCodes)) {
      art.criteriaCodes = body.criteriaCodes.map(String);
    }
    if (typeof body.justification === "string") {
      art.justification = body.justification;
    }
    if (typeof body.favorite === "boolean") {
      art.favorite = body.favorite;
    }

    // --- Etapa 2: full-text ---
    if (typeof body.fullTextDecision === "string" && DECISIONS.includes(body.fullTextDecision)) {
      art.fullTextDecision = body.fullTextDecision;
    }
    if (Array.isArray(body.fullTextCriteriaCodes)) {
      art.fullTextCriteriaCodes = body.fullTextCriteriaCodes.map(String);
    }
    if (typeof body.fullTextJustification === "string") {
      art.fullTextJustification = body.fullTextJustification;
    }
    if (typeof body.fullTextLink === "string") {
      art.fullTextLink = body.fullTextLink;
    }

    // Integridade: critérios só do tipo correspondente à decisão (triagem e full-text).
    art.criteriaCodes = filterCriteria(state, art.decision, art.criteriaCodes);
    art.fullTextCriteriaCodes = filterCriteria(
      state,
      art.fullTextDecision,
      art.fullTextCriteriaCodes
    );
  });

  if (updated === null) {
    return NextResponse.json({ error: "Nenhum dataset carregado." }, { status: 404 });
  }
  if (notFound) {
    return NextResponse.json({ error: "Artigo não encontrado." }, { status: 404 });
  }

  const art = updated.articles.find((a) => a.id === id);
  return NextResponse.json({ article: art });
}
