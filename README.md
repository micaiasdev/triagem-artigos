# Triagem de Artigos

App web para triagem de artigos por **título e abstract** (incluso / não incluso),
com marcação de critérios de inclusão/exclusão e justificativa, para produzir uma
base bem estruturada de exemplos (RAG / few-shot) para um LLM.

Os dados são **persistidos no servidor** em `data/state.json` — sobrevivem a fechar o
navegador, fechar a aplicação e até limpar os dados do navegador.

## Como rodar

### Opção A — desenvolvimento (Node)

```bash
npm install
npm run dev
# abre http://localhost:3000
```

### Opção B — Docker (passo a passo, dados persistidos em ./data no host)

**Pré-requisito:** abra o **Docker Desktop** e espere o status ficar *Running*.

1. Abra o PowerShell na pasta do projeto:
   ```powershell
   cd "C:\Users\micia\OneDrive\Documentos\Faculdade\IC\classification_app"
   ```
2. Suba o container (na 1ª vez ele builda a imagem; depois é instantâneo):
   ```powershell
   docker compose up -d --build
   ```
3. Abra no navegador: <http://localhost:3000>
4. Para **parar**: `docker compose down`

Comandos do dia a dia:

```powershell
docker compose ps               # ver se está rodando
docker compose logs -f          # acompanhar os logs (Ctrl+C sai dos logs, sem parar o app)
docker compose up -d            # subir de novo (sem rebuild)
docker compose up -d --build    # subir rebuildando (após mudar o código)
docker compose down             # parar e remover o container
```

> Os dados ficam em `data/state.json` (volume montado no host) e **sobrevivem** ao
> `docker compose down`. Para zerar, use **Reimportar** no app ou apague `data/state.json`.
> Se preferir ver os logs ao vivo, use `docker compose up --build` (sem `-d`) e pare com **Ctrl+C**.

## Fluxo de uso

1. **Importar** duas planilhas:
   - **Artigos** — colunas `title, abstract, keywords, authors, doi, url, included`
     (obrigatórias: `title`, `abstract`; `included` = `1`/`0`/vazio para retomar triagens).
   - **Critérios** — colunas `code, type (inclusao/exclusao), description`
     (use o botão **Baixar modelo de critérios**).
2. **Triar** artigo por artigo: ler o abstract, marcar **Incluso**/**Não incluso**,
   selecionar os critérios correspondentes e (opcional) escrever a justificativa.
   - Atalhos: `←`/`→` navega, `I` incluso, `E` não incluso, `1`–`9` marca critério.
3. **Exportar** a qualquer momento em **XLSX** ou **CSV**. O export inclui todos os
   artigos com `included`, `decision`, `criteria_codes`, `criteria_descriptions` e
   `justification`.

## Estrutura do export (foco em RAG)

| coluna | conteúdo |
|---|---|
| `title, abstract, keywords, authors, doi, url` | dados originais do artigo |
| `included` | `1` (incluso) / `0` (não incluso) / vazio (pendente) |
| `decision` | `incluso` / `nao_incluso` / `pendente` |
| `criteria_codes` | códigos marcados, ex.: `E2; E5` |
| `criteria_descriptions` | `E2 - <texto>; E5 - <texto>` |
| `justification` | texto livre da decisão |
