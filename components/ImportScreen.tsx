"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Archive,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Upload,
} from "lucide-react";
import ThemeToggle from "./ThemeToggle";

type Mode = "import" | "restore";

export default function ImportScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("import");

  const [articlesFile, setArticlesFile] = useState<File | null>(null);
  const [criteriaFile, setCriteriaFile] = useState<File | null>(null);
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  async function post(url: string, form: FormData) {
    setError(null);
    setWarnings([]);
    setLoading(true);
    try {
      const res = await fetch(url, { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Falha na operação.");
        setWarnings(data.warnings ?? []);
        return;
      }
      router.refresh();
    } catch (err) {
      setError("Erro de rede: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    if (!articlesFile) {
      setError("Selecione a planilha de artigos.");
      return;
    }
    const form = new FormData();
    form.append("articles", articlesFile);
    if (criteriaFile) form.append("criteria", criteriaFile);
    for (const f of pdfFiles) form.append("pdfs", f);
    await post("/api/import", form);
  }

  async function handleRestore(e: React.FormEvent) {
    e.preventDefault();
    if (!restoreFile) {
      setError("Selecione o arquivo do dataset (.zip ou .json).");
      return;
    }
    const form = new FormData();
    form.append("file", restoreFile);
    await post("/api/project", form);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-12">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Triagem de Artigos
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Importe uma nova base (planilhas + PDFs) ou restaure um dataset salvo.
          </p>
        </div>
        <ThemeToggle className="shrink-0" />
      </div>

      {/* Abas */}
      <div className="mb-4 flex w-fit rounded-lg border border-slate-200 p-0.5 dark:border-slate-700">
        {(
          [
            ["import", "Nova importação"],
            ["restore", "Restaurar dataset"],
          ] as [Mode, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => {
              setMode(key);
              setError(null);
              setWarnings([]);
            }}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              mode === key
                ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "import" ? (
        <form
          onSubmit={handleImport}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <FileField
            label="1. Planilha de artigos"
            hint="title, abstract, keywords, authors, doi, url, included (.xlsx / .csv). Aceita também a planilha rica (com decision, criteria_codes, justification, pdf_file_name…)."
            files={articlesFile ? [articlesFile] : []}
            accept=".xlsx,.xls,.csv"
            onChange={(fs) => setArticlesFile(fs[0] ?? null)}
          />

          <div className="my-5 h-px bg-slate-100 dark:bg-slate-800" />

          <FileField
            label="2. Planilha de critérios (opcional)"
            hint="code, type (inclusao/exclusao), description. Se omitida, os critérios da planilha rica são reconstruídos e você pode editá-los depois."
            files={criteriaFile ? [criteriaFile] : []}
            accept=".xlsx,.xls,.csv"
            onChange={(fs) => setCriteriaFile(fs[0] ?? null)}
            extra={
              <a
                href="/api/criteria-template"
                className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-sky-700 hover:text-sky-900 hover:underline dark:text-sky-400 dark:hover:text-sky-300"
              >
                <Download className="h-4 w-4" />
                Baixar modelo de critérios
              </a>
            }
          />

          <div className="my-5 h-px bg-slate-100 dark:bg-slate-800" />

          <FileField
            label="3. Lista de PDFs (opcional)"
            hint="Selecione vários PDFs. Cada um é anexado à linha cujo pdf_file_name bate com o nome do arquivo."
            files={pdfFiles}
            accept="application/pdf,.pdf"
            multiple
            icon={<FileText className="h-5 w-5 shrink-0 text-slate-500 dark:text-slate-400" />}
            onChange={setPdfFiles}
          />

          <Feedback error={error} warnings={warnings} />

          <SubmitButton loading={loading} label="Importar e começar a triagem" />
        </form>
      ) : (
        <form
          onSubmit={handleRestore}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <FileField
            label="Arquivo do dataset salvo"
            hint="Selecione o .zip (estado + PDFs) ou .json (só o estado) gerado em “Salvar dataset”. Isto substitui o dataset atual."
            files={restoreFile ? [restoreFile] : []}
            accept=".zip,.json"
            icon={<Archive className="h-5 w-5 shrink-0 text-slate-500 dark:text-slate-400" />}
            onChange={(fs) => setRestoreFile(fs[0] ?? null)}
          />

          <Feedback error={error} warnings={warnings} />

          <SubmitButton loading={loading} label="Restaurar dataset" />
        </form>
      )}
    </main>
  );
}

function FileField({
  label,
  hint,
  files,
  accept,
  multiple,
  icon,
  onChange,
  extra,
}: {
  label: string;
  hint: string;
  files: File[];
  accept: string;
  multiple?: boolean;
  icon?: React.ReactNode;
  onChange: (files: File[]) => void;
  extra?: React.ReactNode;
}) {
  const summary =
    files.length === 0
      ? multiple
        ? "Escolher arquivos"
        : "Escolher arquivo"
      : multiple
        ? `${files.length} arquivo(s) selecionado(s)`
        : files[0].name;

  return (
    <div>
      <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
        {label}
      </label>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>
      <label className="mt-3 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 transition hover:border-slate-400 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-slate-600 dark:hover:bg-slate-800">
        {icon ?? (
          <FileSpreadsheet className="h-5 w-5 shrink-0 text-slate-500 dark:text-slate-400" />
        )}
        <span className="truncate text-sm text-slate-700 dark:text-slate-300">
          {summary}
        </span>
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={(e) => onChange(Array.from(e.target.files ?? []))}
        />
      </label>
      {extra}
    </div>
  );
}

function Feedback({
  error,
  warnings,
}: {
  error: string | null;
  warnings: string[];
}) {
  return (
    <>
      {error && (
        <div className="mt-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300">
          {error}
        </div>
      )}
      {warnings.length > 0 && (
        <ul className="mt-3 list-inside list-disc rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300">
          {warnings.slice(0, 8).map((w, i) => (
            <li key={i}>{w}</li>
          ))}
          {warnings.length > 8 && <li>… e mais {warnings.length - 8}.</li>}
        </ul>
      )}
    </>
  );
}

function SubmitButton({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <Upload className="h-5 w-5" />
      )}
      {loading ? "Processando…" : label}
    </button>
  );
}
