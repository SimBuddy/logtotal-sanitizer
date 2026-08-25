export function shannonEntropy(value: string): number {
  const { length } = value;

  if (length === 0) {
    return 0;
  }

  const freq: Record<string, number> = {};

  for (let i = 0; i < length; i += 1) {
    const char = value[i];
    freq[char] = (freq[char] ?? 0) + 1;
  }

  return Object.values(freq).reduce((entropy, count) => {
    const p = count / length;

    return entropy - p * Math.log2(p);
  }, 0);
}
