export async function getOraclePrice(symbol: string, fallback?: number) {
  try {
    const url = fallback
      ? `/api/oracle?symbol=${symbol}&fallback=${fallback}`
      : `/api/oracle?symbol=${symbol}`;

    const res = await fetch(url);

    if (!res.ok) return null;

    return await res.json();
  } catch (err) {
    console.error("Oracle fetch failed:", err);
    return null;
  }
}
