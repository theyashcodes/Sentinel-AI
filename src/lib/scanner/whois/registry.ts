import { IWhoisProvider } from './base';
import { NativeWhoisProvider } from './native';

class WhoisRegistry {
  private provider: IWhoisProvider;

  constructor() {
    this.provider = new NativeWhoisProvider(); // Default
  }

  setProvider(provider: IWhoisProvider) {
    this.provider = provider;
  }

  getProvider(): IWhoisProvider {
    return this.provider;
  }
}

export const whoisRegistry = new WhoisRegistry();
