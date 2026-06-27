import { NextResponse } from "next/server";
import { updateState } from "@/lib/store";
import type { ArticlePatch, Decision } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DECISIONS: Decision[] = ["pending", "included", "excluded"];

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

    // Integridade: só mantém critérios cujo tipo bate com a decisão atual.
    const allowedType =
      art.decision === "included"
        ? "inclusion"
        : art.decision === "excluded"
          ? "exclusion"
          : null;
    if (allowedType === null) {
      art.criteriaCodes = [];
    } else {
      const allowed = new Set(
        state.criteria.filter((c) => c.type === allowedType).map((c) => c.code)
      );
      art.criteriaCodes = art.criteriaCodes.filter((code) => allowed.has(code));
    }
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
