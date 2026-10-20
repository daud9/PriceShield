import { manualProvider } from "./providers/manualProvider";
import type { LookupResult, ProductProvider } from "./types";

// Add supported providers here. The manual provider is the fallback.
const providers: ProductProvider[] = [manualProvider];

export async function lookupProduct(url: string): Promise<LookupResult> {
  const provider = providers.find((p) => p.canHandle(url)) ?? manualProvider;
  try {
    return await provider.lookup(url);
  } catch {
    return { status: "unavailable", reason: "Product lookup failed." };
  }
}
