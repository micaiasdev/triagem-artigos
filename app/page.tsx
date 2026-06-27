import ImportScreen from "@/components/ImportScreen";
import TriageScreen from "@/components/TriageScreen";
import { loadState } from "@/lib/store";

// Lê o estado do disco a cada carregamento (nada é cacheado).
export const dynamic = "force-dynamic";

export default async function Home() {
  const state = await loadState();
  if (!state || state.articles.length === 0) {
    return <ImportScreen />;
  }
  return <TriageScreen initialState={state} />;
}
