declare module "pg" {
  export interface QueryResult<T = Record<string, unknown>> {
    rows: T[];
    rowCount: number | null;
  }

  export class Pool {
    constructor(config?: Record<string, unknown>);
    query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<QueryResult<T>>;
  }
}
