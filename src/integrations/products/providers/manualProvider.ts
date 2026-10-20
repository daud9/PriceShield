import type { ProductProvider } from "../types";

// Always available. It never invents product data, so the user enters details.
export const manualProvider: ProductProvider = {
  id: "manual",
  canHandle: () => true,
  async lookup() {
    return {
      status: "unavailable",
      reason: "Automatic price lookup is not configured. Enter the price yourself.",
    };
  },
};
