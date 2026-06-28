import { NextResponse } from "next/server";
import { updateState } from "@/lib/store";
import type { CriterionType } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TYPES: CriterionType[] = ["inclusion", "exclusion"];

// Adiciona um novo critério.
export async function POST(req: Request) {
  let body: { code?: unknown; type?: unknown; description?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const code = String(body.code ?? "").trim();
  const type = body.type as CriterionType;
  const description = String(body.description ?? "").trim();

  if (!code) {
    return NextResponse.json({ error: "Informe o código do critério." }, { status: 400 });
  }
  if (!TYPES.includes(type)) {
    return NextResponse.json(
      { error: "Tipo inválido (use inclusão ou exclusão)." },
      { status: 400 }
    );
  }

  let conflict = false;
  const updated = await updateState((state) => {
    if (state.criteria.some((c) => c.code === code)) {
      conflict = true;
      return;
    }
    state.criteria.push({ code, type, description });
  });

  if (updated === null) {
    return NextResponse.json({ error: "Nenhum dataset carregado." }, { status: 404 });
  }
  if (conflict) {
    return NextResponse.json(
      { error: `Já existe um critério com o código '${code}'.` },
      { status: 409 }
    );
  }
  return NextResponse.json({ criteria: updated.criteria });
}

// Exclui um critério (?code=...) e o remove das marcações dos artigos.
export async function DELETE(req: Request) {
  const code = new URL(req.url).searchParams.get("code")?.trim();
  if (!code) {
    return NextResponse.json({ error: "Informe o código do critério." }, { status: 400 });
  }

  const updated = await updateState((state) => {
    state.criteria = state.criteria.filter((c) => c.code !== code);
    for (const a of state.articles) {
      if (a.criteriaCodes.includes(code)) {
        a.criteriaCodes = a.criteriaCodes.filter((x) => x !== code);
      }
    }
  });

  if (updated === null) {
    return NextResponse.json({ error: "Nenhum dataset carregado." }, { status: 404 });
  }
  return NextResponse.json({ criteria: updated.criteria });
}
