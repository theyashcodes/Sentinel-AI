export interface WhoisData {
  raw: string;
  ageDays?: number;
  creationDate?: string;
  registrar?: string;
}

export interface IWhoisProvider {
  name: string;
  lookup(domain: string): Promise<WhoisData | null>;
}
