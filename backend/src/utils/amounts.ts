// Amount helpers. Amounts travel as strings of stroops; math happens in bigint.

export function toBig(amount: string, field = 'amount'): bigint {
  let value: bigint;
  try {
    value = BigInt(amount);
  } catch {
    throw new Error(`${field} is not a valid integer amount: ${amount}`);
  }
  if (value < 0n) throw new Error(`${field} must be non-negative`);
  return value;
}

export function addAmounts(a: string, b: string): string {
  return (toBig(a) + toBig(b)).toString();
}

export function subAmounts(a: string, b: string): string {
  const result = toBig(a) - toBig(b);
  if (result < 0n) throw new Error('amount underflow');
  return result.toString();
}

/** shares = assets * totalShares / totalAssets (1:1 on first deposit) */
export function sharesForAssets(assets: string, totalShares: string, totalAssets: string): string {
  const a = toBig(assets);
  const ts = toBig(totalShares);
  const ta = toBig(totalAssets);
  if (ts === 0n || ta === 0n) return a.toString();
  return ((a * ts) / ta).toString();
}

/** assets = shares * totalAssets / totalShares */
export function assetsForShares(shares: string, totalShares: string, totalAssets: string): string {
  const s = toBig(shares);
  const ts = toBig(totalShares);
  const ta = toBig(totalAssets);
  if (ts === 0n) return '0';
  return ((s * ta) / ts).toString();
}
