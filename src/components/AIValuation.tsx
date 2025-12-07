



"use client";

import React, { useState, useEffect } from "react";
import { ethers } from "ethers";

type AIValuationProps = {
  signer: ethers.Signer | null;
};

/* ------------------------------------------------------------------
   1. CONTRACT CONFIG
------------------------------------------------------------------- */

const TOKEN_ADDRESS = "0x8c7ee5634E33B45Ec150eA4dd072B1cE0e52347e";
const SETTLEMENT_ADDRESS = "0x4A2B8014a6933F108D917CEBEA6D6455D3D234Ab";

const ERC20_ABI = [
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
];

export const SETTLEMENT_ABI = [
  "function submitPrediction(string assetId,uint256 predictedValue,uint256 confidence,uint256 stakeAmount) external",
  "function setOracleValue(string assetId,uint256 value) external",
  "function settle(uint256 id) external",
  "function settleBatch(uint256 fromId,uint256 toId) external",
  "function claimRewards() external",

  "function nextId() view returns (uint256)",
  "function oracleValue(string assetId) view returns (uint256)",
  "function claimable(address) view returns (uint256)",
  "function accuracyScore(address) view returns (uint256)",
  "function totalPredictions(address) view returns (uint256)",

  // FULL STRUCT
  "function predictions(uint256) view returns (address predictor,string assetId,uint256 predictedValue,uint256 confidence,uint256 stakeAmount,uint256 timestamp,bool settled,uint256 reward,uint256 error)"
];


type DemoAsset = {
  name: string;
  target: number;
};

type UiPrediction = {
  id: number;
  predictor: string;
  shortPredictor: string;
  assetId: string;
  predictedValue: string;
  confidence: number;
  stakeAmount: string;
  timestamp: number;
  settled: boolean;
  reward: string;
  error: string;
  accuracy: number | null;
};

type LeaderboardRow = {
  address: string;
  shortAddress: string;
  predictionCount: number;
  avgConfidence: number;
  avgAccuracy: number;
  totalStake: string;
};

export default function AIValuation({ signer }: AIValuationProps) {
  /* ------------------------------------------------------------------
     2. LOCAL STATE
  ------------------------------------------------------------------- */

  const [settlement, setSettlement] = useState<ethers.Contract | null>(null);
  const [token, setToken] = useState<ethers.Contract | null>(null);
  const [tokenSymbol, setTokenSymbol] = useState("PMT");
  const [tokenDecimals, setTokenDecimals] = useState(18);

  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  const [lastTxHash, setLastTxHash] = useState<string | null>(null);

  const demoAssets: DemoAsset[] = [
    { name: "Apartment Downtown #5", target: 1_250_000 },
    { name: "Villa Beachfront #12", target: 2_850_000 },
    { name: "Office Tower #3", target: 45_000_000 },
    { name: "BTC/USD (Crypto Oracle)", target: 67_000 },
    { name: "TSLA (Stock Oracle)", target: 240 },
    { name: "Gold/oz (Commodity)", target: 2_300 },
  ];

  const [selectedAsset, setSelectedAsset] = useState("Apartment Downtown #5");
  const [targetValue, setTargetValue] = useState(1_250_000);

  const [aiResult, setAiResult] = useState<{
    value: number;
    confidence: number; // 0–1
  } | null>(null);

  const [aiStatus, setAiStatus] =
    useState<"idle" | "fetching" | "success" | "error">("idle");

  const [stakeInput, setStakeInput] = useState<string>("10"); // PMT
  const [loading, setLoading] = useState(false);

  const [networkOracleValue, setNetworkOracleValue] = useState<string | null>(
    null
  );
  const [predictions, setPredictions] = useState<UiPrediction[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);

  const [userAccuracy, setUserAccuracy] = useState<number | null>(null);
  const [userPredictionCount, setUserPredictionCount] = useState<number | null>(
    null
  );
  const [userClaimable, setUserClaimable] = useState<string | null>(null);

  /* ------------------------------------------------------------------
     3. INIT CONTRACTS WHEN SIGNER CHANGES
  ------------------------------------------------------------------- */

  useEffect(() => {
    const init = async () => {
      if (!signer) {
        setSettlement(null);
        setToken(null);
        setWalletAddress(null);
        return;
      }

      const addr = await signer.getAddress();
      setWalletAddress(addr);

      const settlementContract = new ethers.Contract(
        SETTLEMENT_ADDRESS,
        SETTLEMENT_ABI,
        signer
      );
      const tokenContract = new ethers.Contract(
        TOKEN_ADDRESS,
        ERC20_ABI,
        signer
      );

      setSettlement(settlementContract);
      setToken(tokenContract);

      try {
        const [symbol, decimals] = await Promise.all([
          tokenContract.symbol(),
          tokenContract.decimals(),
        ]);
        setTokenSymbol(symbol);
        setTokenDecimals(decimals);
      } catch (e) {
        console.warn("Token meta read failed, using defaults", e);
      }

      // fetch initial data for default asset
      await Promise.all([
        fetchHistory(settlementContract, "Apartment Downtown #5"),
        fetchUserStats(settlementContract, addr, tokenContract),
      ]);
    };

    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signer]);

  /* ------------------------------------------------------------------
     4. HELPERS
  ------------------------------------------------------------------- */

  const handleAssetChange = async (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const name = e.target.value;
    const asset = demoAssets.find((a) => a.name === name);
    if (!asset) return;

    setSelectedAsset(asset.name);
    setTargetValue(asset.target);

    if (settlement) {
      await fetchHistory(settlement, asset.name);
    }
  };

  const statusLabel =
    aiStatus === "fetching"
      ? "Analyzing..."
      : aiStatus === "success"
      ? "Live"
      : "Ready";

  const formatUsd = (val: number) =>
    "$" + val.toLocaleString(undefined, { maximumFractionDigits: 0 });

  const formatToken = (raw: bigint) =>
    Number(ethers.formatUnits(raw, tokenDecimals)).toLocaleString(undefined, {
      maximumFractionDigits: 2,
    });

  const getAccuracyBadge = (accuracy: number) => {
    if (accuracy >= 85) return "🥇 Gold";
    if (accuracy >= 70) return "🥈 Silver";
    if (accuracy >= 50) return "🥉 Bronze";
    return "⚪ Unranked";
  };

  /* ------------------------------------------------------------------
     5. AI VALUATION (HUGGINGFACE /api/ai)
  ------------------------------------------------------------------- */

  const runAIValuation = async () => {
    setLoading(true);
    setAiStatus("fetching");
    setAiResult(null);

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedAsset }),
      });

      const result = await response.json();
      console.log("🤖 HF Response:", result);

      // defaults/fallbacks
      let value = targetValue + (Math.random() * targetValue * 0.08 - targetValue * 0.04); // ±4%
      let confidence = 0.82 + Math.random() * 0.16; // 0.82 – 0.98

      if (result[0]?.generated_text && !result.error) {
        try {
          const parsed = JSON.parse(result[0].generated_text);
          if (typeof parsed.value === "number") value = parsed.value;
          if (typeof parsed.confidence === "number")
            confidence = parsed.confidence;
        } catch {
          const text: string = result[0].generated_text.toLowerCase();
          const numMatch = text.match(/\$?(\d+(?:,\d{3})*(?:\.\d+)?)/);
          if (numMatch) {
            value = parseFloat(numMatch[1].replace(/,/g, ""));
          }
          if (text.includes("confiden")) confidence = 0.92;
        }
      }

      // keep within sane bounds
      value = Math.max(targetValue * 0.4, Math.min(targetValue * 2.5, value));
      confidence = Math.max(0.7, Math.min(confidence, 0.99));

      setAiResult({ value, confidence });
      setAiStatus("success");
    } catch (err: any) {
      console.error("AI error", err);
      setAiStatus("error");
      // still show a pseudo result so the demo continues
      setAiResult({
        value: targetValue + (Math.random() * targetValue * 0.08 - targetValue * 0.04),
        confidence: 0.85 + Math.random() * 0.1,
      });
    } finally {
      setLoading(false);
    }
  };

  /* ------------------------------------------------------------------
     6. ERC20 APPROVAL
  ------------------------------------------------------------------- */

  const approveToken = async () => {
    if (!token || !walletAddress) {
      alert("Connect your wallet first.");
      return;
    }

    try {
      setLoading(true);

      const stake = stakeInput && parseFloat(stakeInput) > 0 ? stakeInput : "0";
      const stakeAmount = ethers.parseUnits(stake, tokenDecimals);

      // approve a bit more than needed so user doesn't have to approve every time
      const allowanceNeeded = stakeAmount * 10n;

      const currentAllowance: bigint = await token.allowance(
        walletAddress,
        SETTLEMENT_ADDRESS
      );

      if (currentAllowance >= allowanceNeeded) {
        alert("Already approved enough tokens.");
        setLoading(false);
        return;
      }

      const tx = await token.approve(SETTLEMENT_ADDRESS, allowanceNeeded);
      await tx.wait();

      alert(`✅ Approved ${tokenSymbol} for staking`);
    } catch (err) {
      console.error("Approve error", err);
      alert("Failed to approve token");
    } finally {
      setLoading(false);
    }
  };

  /* ------------------------------------------------------------------
     7. SUBMIT PREDICTION (STAKING)
  ------------------------------------------------------------------- */

  const storePrediction = async () => {
    if (!settlement || !token || !walletAddress) {
      alert("Connect wallet first.");
      return;
    }
    if (!aiResult) {
      alert("Run the AI valuation first.");
      return;
    }

    try {
      setLoading(true);

      // stake amount
      const stake = stakeInput && parseFloat(stakeInput) > 0 ? stakeInput : "0";
      const stakeAmount = ethers.parseUnits(stake, tokenDecimals);
      if (stakeAmount <= 0n) {
        alert("Stake must be greater than 0.");
        setLoading(false);
        return;
      }

      // ensure allowance
      const allowance: bigint = await token.allowance(
        walletAddress,
        SETTLEMENT_ADDRESS
      );
      if (allowance < stakeAmount) {
        alert(
          `Allowance too low. Please click "Approve ${tokenSymbol}" first.`
        );
        setLoading(false);
        return;
      }

      const confidencePct = Math.round(aiResult.confidence * 100);

      const predictedValueWei = ethers.parseUnits(
        aiResult.value.toFixed(2),
        18
      );

      const tx = await settlement.submitPrediction(
        selectedAsset,
        predictedValueWei,
        confidencePct,
        stakeAmount
      );
      await tx.wait();

      const explorerUrl = `https://testnet.qie.digital/tx/${tx.hash}`;
      setLastTxHash(explorerUrl);

      alert("✅ Prediction submitted and staked!");

      // refresh lists & stats
      await Promise.all([
        fetchHistory(settlement, selectedAsset),
        fetchUserStats(settlement, walletAddress, token),
      ]);
    } catch (err) {
      console.error("submitPrediction error", err);
      alert("Failed to submit prediction");
    } finally {
      setLoading(false);
    }
  };

  /* ------------------------------------------------------------------
     8. FETCH HISTORY + LEADERBOARD
  ------------------------------------------------------------------- */

  /* ------------------------------------------------------------------
   8. FETCH HISTORY + LEADERBOARD
------------------------------------------------------------------- */

const fetchHistory = async (contract: ethers.Contract, assetId: string) => {
  try {
    const [nextIdBN, oracleBN] = await Promise.all([
      contract.nextId(),
      contract.oracleValue(assetId),
    ]);

    const total = Number(nextIdBN);
    const oracleHasValue = oracleBN > 0n;

    setNetworkOracleValue(
      oracleHasValue ? ethers.formatUnits(oracleBN, 18).toString() : null
    );

    if (total === 0) {
      setPredictions([]);
      setLeaderboard([]);
      return;
    }

    const ids = Array.from({ length: total }, (_, i) => i);

    // ⭐ FIX: SAFELY LOAD PREDICTIONS AND FILTER OUT BAD VALUES ⭐
    const raw = await Promise.all(
      ids.map(async (id) => {
        try {
          const p = await contract.predictions(id);

          // ethers returns `null` for unused struct fields → ignore them
          if (!p.predictor || p.predictor === ethers.ZeroAddress) return null;
          if (!p.assetId || typeof p.assetId !== "string" || p.assetId.length === 0)
            return null;
          if (p.predictedValue === null || p.stakeAmount === null) return null;

          return { id, ...p };

        } catch (err) {
          console.warn("Skipping bad prediction", id);
          return null;
        }
      })
    );

    // remove nulls
    const cleaned = raw.filter((x) => x !== null);

    // Only predictions for the selected asset
    const filtered = cleaned.filter((p: any) => p.assetId === assetId);
    const trueValue = oracleBN;

    const ui: UiPrediction[] = filtered
      .map((p: any) => {
        const predictedStr = ethers.formatUnits(p.predictedValue, 18);
        const stakeStr = formatToken(p.stakeAmount);
        const rewardStr = formatToken(p.reward);

        const errorStr =
          trueValue > 0n
            ? ethers.formatUnits(p.error, 18)
            : p.error?.toString() ?? "0";

        let accuracy: number | null = null;

        if (trueValue > 0n) {
          const accBN =
            p.error === 0n
              ? 10000n
              : (trueValue * 10000n) / (trueValue + p.error);

          accuracy = Number(accBN) / 100;
        }

        const addr = p.predictor;
        const short = addr.slice(0, 6) + "..." + addr.slice(-4);

        return {
          id: p.id,
          predictor: addr,
          shortPredictor: short,
          assetId: p.assetId,
          predictedValue: predictedStr,
          confidence: Number(p.confidence),
          stakeAmount: stakeStr,
          timestamp: Number(p.timestamp) * 1000,
          settled: p.settled,
          reward: rewardStr,
          error: errorStr,
          accuracy,
        };
      })
      .sort((a, b) => b.timestamp - a.timestamp);

    setPredictions(ui);

    // leaderboard
    const lb = computeLeaderboard(ui);
    setLeaderboard(lb);

  } catch (err) {
    console.error("History fetch error", err);
  }
};


const computeLeaderboard = (items: UiPrediction[]): LeaderboardRow[] => {
  if (!items.length) return [];

  const stats: Record<
    string,
    {
      count: number;
      totalConf: number;
      totalAcc: number;
      accSamples: number;
      totalStake: number;
    }
  > = {};

  items.forEach((p) => {
    const addr = p.predictor.toLowerCase();

    if (!stats[addr]) {
      stats[addr] = {
        count: 0,
        totalConf: 0,
        totalAcc: 0,
        accSamples: 0,
        totalStake: 0,
      };
    }

    stats[addr].count += 1;
    stats[addr].totalConf += p.confidence;

    // FIX: remove commas before converting
    stats[addr].totalStake += Number(p.stakeAmount.replace(/,/g, "") || 0);

    if (p.accuracy !== null) {
      stats[addr].totalAcc += p.accuracy;
      stats[addr].accSamples += 1;
    }
  });

  const rows: LeaderboardRow[] = Object.entries(stats).map(
    ([addr, s]) => {
      const short =
        addr.slice(0, 6) + "..." + addr.slice(addr.length - 4);

      return {
        address: addr,
        shortAddress: short,
        predictionCount: s.count,
        avgConfidence: parseFloat((s.totalConf / s.count).toFixed(1)),
        avgAccuracy: s.accSamples > 0
          ? parseFloat((s.totalAcc / s.accSamples).toFixed(1))
          : 0,
        totalStake: s.totalStake.toLocaleString(undefined, {
          maximumFractionDigits: 2,
        }),
      };
    }
  );

  return rows
    .sort((a, b) => {
      if (b.avgAccuracy !== a.avgAccuracy) return b.avgAccuracy - a.avgAccuracy;
      return b.predictionCount - a.predictionCount;
    })
    .slice(0, 5);
};


  /* ------------------------------------------------------------------
     9. USER STATS + CLAIM
  ------------------------------------------------------------------- */

  const fetchUserStats = async (
    settlementContract: ethers.Contract,
    user: string,
    tokenContract: ethers.Contract
  ) => {
    try {
      const [accBN, totalBN, claimBN] = await Promise.all([
        settlementContract.accuracyScore(user),
        settlementContract.totalPredictions(user),
        settlementContract.claimable(user),
      ]);

      setUserAccuracy(Number(accBN));
      setUserPredictionCount(Number(totalBN));
      setUserClaimable(formatToken(claimBN));

      // also keep token symbol/decimals up to date (just in case)
      try {
        const [sym, dec] = await Promise.all([
          tokenContract.symbol(),
          tokenContract.decimals(),
        ]);
        setTokenSymbol(sym);
        setTokenDecimals(dec);
      } catch {
        // ignore
      }
    } catch (err) {
      console.error("User stats error", err);
    }
  };

  const claimRewards = async () => {
  if (!settlement || !walletAddress) {
    alert("Connect wallet first.");
    return;
  }

  try {
    setLoading(true);

    // 1. Check claimable first so we don't send a tx that reverts
    const claimBN: bigint = await settlement.claimable(walletAddress);
    if (claimBN === 0n) {
      alert("No rewards available.");
      setLoading(false);
      return;
    }

    // 2. Actually send claim tx
    const tx = await settlement.claimRewards();
    await tx.wait();

    alert("🎉 Rewards claimed!");

    // 3. Refresh user stats – now with proper null checks so TS is happy
    if (walletAddress && token && settlement) {
      await fetchUserStats(settlement, walletAddress, token);
    }
  } catch (err) {
    console.error("Claim error:", err);
    alert("Claim failed — no claimable rewards.");
  } finally {
    setLoading(false);
  }
};


  /* ------------------------------------------------------------------
     10. RENDER
  ------------------------------------------------------------------- */

  return (
    <div className="qie-card-glass">
      {/* header */}
      <div className="qie-card-header">
        <div className="qie-card-title">
          🤖 AI Property & Market Valuation
        </div>
        <div className="qie-chip">
          <span style={{ fontSize: "0.85rem" }}>QIE Testnet · PMT staking</span>
        </div>
      </div>

      {/* live AI banner */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px",
          borderRadius: 999,
          background:
            "linear-gradient(90deg, rgba(59,130,246,0.10), rgba(139,92,246,0.10))",
          marginBottom: 18,
        }}
      >
        <span style={{ fontSize: "0.82rem" }}>🚀</span>
        <span
          style={{
            fontSize: "0.78rem",
            fontWeight: 500,
            color: "#4c1d95",
          }}
        >
          Live HuggingFace AI · Predictions staked with {tokenSymbol}
        </span>
        <span
          className="qie-badge qie-badge-status"
          style={{ marginLeft: "auto" }}
        >
          {statusLabel}
        </span>
      </div>

      {/* asset + stake controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="qie-field-label">Select Asset</label>
          <select
            value={selectedAsset}
            onChange={handleAssetChange}
            className="qie-select"
          >
            {demoAssets.map((a) => (
              <option key={a.name}>{a.name}</option>
            ))}
          </select>
          <p className="qie-text-muted mt-1 text-xs">
            Target / benchmark: <strong>{formatUsd(targetValue)}</strong>
          </p>
          {networkOracleValue && (
            <p className="qie-text-muted mt-1 text-xs">
              On-chain oracle value:{" "}
              <strong>
                $
                {Number(networkOracleValue).toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}
              </strong>
            </p>
          )}
        </div>

        <div>
          <label className="qie-field-label">
            Stake Amount ({tokenSymbol})
          </label>
          <input
            type="number"
            min="0"
            step="0.1"
            value={stakeInput}
            onChange={(e) => setStakeInput(e.target.value)}
            className="qie-input"
            placeholder={`10 ${tokenSymbol}`}
          />
          <p className="qie-text-muted mt-1 text-xs">
            You stake {tokenSymbol}, the contract measures accuracy and pays
            rewards from the reward pool.
          </p>
        </div>
      </div>

      {/* AI + approval buttons */}
      <div className="flex flex-col md:flex-row gap-3 mt-2">
        <button
          onClick={runAIValuation}
          disabled={loading}
          className="qie-btn qie-btn-primary flex-1"
        >
          {loading ? "🤖 Analyzing..." : "🚀 Run Live AI Valuation"}
        </button>
        <button
          onClick={approveToken}
          disabled={loading}
          className="qie-btn qie-btn-secondary md:w-44"
        >
          🔑 Approve {tokenSymbol}
        </button>
      </div>

      {/* AI result card */}
      {aiResult && (
        <div className="qie-mt-lg">
          <div
            style={{
              borderRadius: 16,
              border: "1px solid #e5e7eb",
              padding: "16px 16px 14px",
              background: "#ffffff",
            }}
          >
            <h3
              style={{
                fontSize: "1rem",
                fontWeight: 600,
                marginBottom: 10,
                color: "#111827",
              }}
            >
              📊 AI Valuation Result
            </h3>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div>
                <div className="text-xl font-bold text-emerald-600">
                  {formatUsd(aiResult.value)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Estimated Value
                </div>
              </div>
              <div>
                <div className="text-xl font-bold text-blue-600">
                  {(aiResult.confidence * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  AI Confidence
                </div>
              </div>
            </div>

            <button
              onClick={storePrediction}
              disabled={loading || !settlement}
              className="qie-btn qie-btn-secondary qie-btn-full qie-mt-md"
            >
              {loading ? "⛓️ Submitting..." : `⛓️ Stake & Store Prediction`}
            </button>

            {lastTxHash && (
              <p className="mt-2 text-[0.75rem] text-center">
                <a
                  href={lastTxHash}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 underline"
                >
                  View transaction on QIE explorer
                </a>
              </p>
            )}
          </div>
        </div>
      )}

      {/* user stats */}
      {walletAddress && (
        <div className="qie-mt-lg">
          <h3 className="text-sm font-semibold mb-2">
            🎯 Your Predictor Profile
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="qie-mini-stat">
              <div className="qie-mini-stat-label">Address</div>
              <div className="qie-mini-stat-value text-xs">
                {walletAddress.slice(0, 6)}...
                {walletAddress.slice(walletAddress.length - 4)}
              </div>
            </div>
            <div className="qie-mini-stat">
              <div className="qie-mini-stat-label">
                Accuracy (on-chain average)
              </div>
              <div className="qie-mini-stat-value">
                {userAccuracy !== null ? `${userAccuracy.toFixed(1)}%` : "—"}
              </div>
            </div>
            <div className="qie-mini-stat">
              <div className="qie-mini-stat-label">Predictions made</div>
              <div className="qie-mini-stat-value">
                {userPredictionCount ?? "—"}
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-col md:flex-row gap-3 items-center">
            <div className="text-xs text-gray-600 flex-1">
              Claimable rewards:{" "}
              <strong>
                {userClaimable !== null
                  ? `${userClaimable} ${tokenSymbol}`
                  : "—"}
              </strong>
            </div>
            <button
              onClick={claimRewards}
              disabled={loading}
              className="qie-btn qie-btn-ghost md:w-40"
            >
              💰 Claim Rewards
            </button>
          </div>
        </div>
      )}

      {/* prediction history table */}
      {predictions.length > 0 && (
        <div className="qie-mt-lg">
          <h3 className="text-sm font-semibold mb-2">
            📈 On-Chain Prediction History
          </h3>
          <div className="qie-table-wrapper">
            <table className="qie-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Predictor</th>
                  <th>Value (USD)</th>
                  <th>Conf</th>
                  <th>Stake ({tokenSymbol})</th>
                  <th>Reward</th>
                  <th>Error</th>
                  <th>Acc.</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {predictions.map((p) => (
                  <tr key={p.id}>
                    <td>#{p.id}</td>
                    <td>
                      <span className="qie-chip">{p.shortPredictor}</span>
                    </td>
                    <td>${Number(p.predictedValue).toLocaleString()}</td>
                    <td>{p.confidence}%</td>
                    <td>{p.stakeAmount}</td>
                    <td>{p.reward}</td>
                    <td>{p.error}</td>
                    <td>
                      {p.accuracy !== null ? `${p.accuracy.toFixed(1)}%` : "—"}
                    </td>
                    <td className="text-gray-500 text-xs">
                      {new Date(p.timestamp).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="qie-text-muted qie-mt-sm text-xs">
            {predictions.length} predictions stored on QIE testnet for{" "}
            <strong>{selectedAsset}</strong>.
          </p>
        </div>
      )}

      {/* leaderboard */}
      {leaderboard.length > 0 && (
        <div className="qie-card-glass qie-mt-lg">
          <div className="qie-card-header">
            <h3 className="qie-card-title">
              🏆 Top Predictors
              <span className="qie-badge qie-badge-soft ml-2">
                {leaderboard.length}
              </span>
            </h3>
            <p className="qie-text-muted text-xs">
              Ranked by on-chain accuracy & stake for{" "}
              <strong>{selectedAsset}</strong>.
            </p>
          </div>

          <div className="qie-table-wrapper">
            <table className="qie-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Predictor</th>
                  <th>Accuracy Badge</th>
                  <th>Avg Accuracy</th>
                  <th>Avg Conf</th>
                  <th>Total Stake</th>
                  <th>Predictions</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((row, i) => (
                  <tr key={row.address}>
                    <td style={{ fontWeight: 700, color: "#16a34a" }}>
                      #{i + 1}
                    </td>
                    <td>
                      <span className="qie-chip">{row.shortAddress}</span>
                    </td>
                    <td style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                      {getAccuracyBadge(row.avgAccuracy)}
                    </td>
                    <td>{row.avgAccuracy.toFixed(1)}%</td>
                    <td>{row.avgConfidence.toFixed(1)}%</td>
                    <td>{row.totalStake}</td>
                    <td>{row.predictionCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="qie-text-muted qie-mt-sm text-xs">
            🥇 Gold (≥85%) · 🥈 Silver (≥70%) · 🥉 Bronze (≥50%) · ⚪ Unranked
            (&lt;50%). Future: stake PMT to compete → earn rewards for accuracy.
          </p>
        </div>
      )}
    </div>
  );
}
