// Roda `fn` para cada item de `items` com no máximo `concurrency` chamadas em
// paralelo por vez — evita tanto a serialização total (lenta) quanto disparar
// tudo de uma vez via Promise.all (pode estourar rate limit de APIs externas).
export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await fn(items[index], index);
    }
  }

  const workerCount = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: workerCount }, worker));

  return results;
}

// Divide um array em blocos de tamanho `size` — usado para manter upserts em
// lote dentro do teto de payload/parâmetros do Postgres em contas com volume
// grande de linhas.
export function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}
