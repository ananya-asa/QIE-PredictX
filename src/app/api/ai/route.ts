import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { selectedAsset } = await req.json();

  const prompt = `Estimate current market value for: ${selectedAsset}.
  Respond ONLY with JSON: {"value": 1250000, "confidence": 0.87}`;

  const hfRes = await fetch(
    "https://api-inference.huggingface.co/models/google/flan-t5-base",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // optional: "Authorization": `Bearer ${process.env.HF_TOKEN}`
      },
      body: JSON.stringify({ inputs: prompt, parameters: { max_new_tokens: 100 } }),
    }
  );

  const data = await hfRes.json();
  return NextResponse.json(data);
}
