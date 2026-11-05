// A URL may repeat the same parameter. Accept one value instead of crashing on arrays.
export type QueryParams = Record<string, string | string[] | undefined>;
export function queryValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}
