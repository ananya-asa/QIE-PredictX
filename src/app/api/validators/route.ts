import { NextResponse } from "next/server";

export async function GET() {
  // Dummy validator list (same as your frontend)
  const validators = [
    {
      id: 1,
      name: "Alpha Node",
      stakeQIE: 152340,
      blocksValidated: 2245,
      performanceScore: 98.4,
      trustScore: 9.1,
    },
    {
      id: 2,
      name: "Beta Secure",
      stakeQIE: 101200,
      blocksValidated: 1988,
      performanceScore: 95.2,
      trustScore: 8.7,
    },
    {
      id: 3,
      name: "Gamma Guardian",
      stakeQIE: 84300,
      blocksValidated: 1504,
      performanceScore: 92.1,
      trustScore: 8.2,
    },
    {
      id: 4,
      name: "Delta Stake",
      stakeQIE: 55600,
      blocksValidated: 1200,
      performanceScore: 88.5,
      trustScore: 7.9,
    },
    {
      id: 5,
      name: "Omega Vault",
      stakeQIE: 40210,
      blocksValidated: 900,
      performanceScore: 86.4,
      trustScore: 7.5,
    }
  ];

  return NextResponse.json({ validators });
}
