// src/components/validatorsConfig.ts

export type TrackedValidator = {
  name: string;
  address: string;
  manualStakeQIE: number;
  blocksValidated: number;
};

export const TRACKED_VALIDATORS: TrackedValidator[] = [
  // Realistic QIE-style names
  {
    name: "QIEforever",
    address: "0xab72c3f1d9eB12D4F0c98A93D87b209375122Fa1",
    manualStakeQIE: 3_658_386,
    blocksValidated: 12_894,
  },
  {
    name: "validator3",
    address: "0x3A91C92cFe1487b9C3d74B5f3B07B0F21F4B3103",
    manualStakeQIE: 740_010,
    blocksValidated: 8_412,
  },
  {
    name: "validator4",
    address: "0x947B8E0bFf3E76D1231B0eD2E4F87893D6bE5a22",
    manualStakeQIE: 740_000,
    blocksValidated: 8_350,
  },
  {
    name: "leonboth-validator",
    address: "0x5F1C9C1f6b2BE2A785F3C343aA0A51F49E5c88c7",
    manualStakeQIE: 510_949,
    blocksValidated: 6_102,
  },
  {
    name: "wiktor",
    address: "0x81F37DEeDcbF1e1D76083b2E7FfCB26c78e65F1a",
    manualStakeQIE: 129_732,
    blocksValidated: 3_144,
  },

  // Custom / “AI-flavoured” validators
  {
    name: "NovaGuard",
    address: "0x8924EeC5f1B1bD1F6C9D0Ff9E532a918c0A3E91F",
    manualStakeQIE: 220_000,
    blocksValidated: 4_980,
  },
  {
    name: "QuantumStake",
    address: "0x1C2D3E4F5061728394aBcDEF0011223344556677",
    manualStakeQIE: 185_500,
    blocksValidated: 4_102,
  },
  {
    name: "AtlasNode",
    address: "0xF0E1D2C3B4A5968778695A4B3C2D1E0F9A8B7C6D",
    manualStakeQIE: 150_000,
    blocksValidated: 3_780,
  },
  {
    name: "SentinelX",
    address: "0xB3cA72a9F42E77D81b8b8A2D44e1D59E73A06f92",
    manualStakeQIE: 99_900,
    blocksValidated: 2_211,
  },
  {
    name: "LunaWatch",
    address: "0x0aF14C99A7cD521E022F8D6642d7837B4e509a12",
    manualStakeQIE: 75_000,
    blocksValidated: 1_892,
  },
];
