import * as validUrl from "valid-url";

export async function anySeries<T, U>(items: T[], mapper: (item: T) => Promise<U | void>): Promise<U | void> {
  const clone = items.slice();
  while (clone.length) {
    const value = await mapper(clone.shift()!);

    if (value) {
      return value;
    }
  }
}

export function isValidUrl(url: string): boolean {
  return typeof validUrl.isWebUri(url) === "string";
}
