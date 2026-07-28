import { IAIProvider } from "./base";
import { MockProvider } from "./mock";
import { LocalProvider } from "./local";
import { GeminiProvider } from "./gemini";

export type ProviderName = "MOCK" | "OPENAI" | "GEMINI" | "CLAUDE" | "LOCAL";

class ProviderRegistry {
  private providers: Map<ProviderName, IAIProvider> = new Map();
  private activeProvider: ProviderName = "GEMINI";

  constructor() {
    this.register("MOCK", new MockProvider());
    this.register("LOCAL", new LocalProvider());
    this.register("GEMINI", new GeminiProvider());
  }

  register(name: ProviderName, provider: IAIProvider) {
    this.providers.set(name, provider);
  }

  setActive(name: ProviderName) {
    if (!this.providers.has(name)) {
      throw new Error(`Provider ${name} is not registered.`);
    }
    this.activeProvider = name;
  }

  get(name: ProviderName): IAIProvider | undefined {
    return this.providers.get(name);
  }

  getActive(): IAIProvider {
    const provider = this.providers.get(this.activeProvider);
    if (!provider) throw new Error("No active provider set.");
    return provider;
  }
}

export const aiRegistry = new ProviderRegistry();
