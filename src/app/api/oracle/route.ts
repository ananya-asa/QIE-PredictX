import { NextResponse } from "next/server";

const COINGECKO = "https://api.coingecko.com/api/v3/simple/price";

async function fetchCrypto(symbol: string) {
  const map: Record<string, string> = {
    btc: "bitcoin",
    eth: "ethereum",
    sol: "solana",
  };

  const id = map[symbol];
  if (!id) return null;

  const url = `${COINGECKO}?ids=${id}&vs_currencies=usd`;
  const res = await fetch(url);

  if (!res.ok) return null;

  const data = await res.json();
  return {
    price: data[id]?.usd,
    source: "Coingecko (Crypto)",
    confidence: 0.98,
  };
}

async function fetchGold() {
  const url = `${COINGECKO}?ids=pax-gold&vs_currencies=usd`;
  const res = await fetch(url);

  if (!res.ok) return null;

  const data = await res.json();

  return {
    price: data["pax-gold"].usd, // PAXG = 1oz physical gold
    source: "Coingecko (Gold via PAXG)",
    confidence: 0.95,
  };
}

async function fetchStock(symbol: string) {
  if (symbol !== "tsla") return null;

  const yahoo = `https://query1.finance.yahoo.com/v8/finance/chart/TSLA?interval=1m`;

  const res = await fetch(yahoo);
  if (!res.ok) return null;

  const json = await res.json();
  const price = json.chart.result[0].meta.regularMarketPrice;

  return {
    price,
    source: "Yahoo Finance (Stock)",
    confidence: 0.90,
  };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get("symbol")?.toLowerCase();
    const fallbackValue = Number(searchParams.get("fallback") || 0);

    if (!symbol) {
      return NextResponse.json(
        { error: "Missing ?symbol=" },
        { status: 400 }
      );
    }

    let result = null;

    if (["btc", "eth", "sol"].includes(symbol)) {
      result = await fetchCrypto(symbol);
    } else if (symbol === "gold") {
      result = await fetchGold();
    } else if (symbol === "tsla") {
      result = await fetchStock(symbol);
    }

    // Smart fallback for Real Estate or unsupported assets
    if (!result) {
      return NextResponse.json({
        price: fallbackValue,
        source: "AI Fallback (off-chain)",
        confidence: 0.70,
        timestamp: Date.now(),
      });
    }

    return NextResponse.json({
      ...result,
      timestamp: Date.now(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Oracle failure" },
      { status: 500 }
    );
  }
}
