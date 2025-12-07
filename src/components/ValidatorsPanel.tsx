"use client";

import React, { useEffect, useState } from "react";

type RawValidator = {
  // ⚠️ Adjust these keys to match the real API response
  name: string;
  rank: string | number;
  stakedAmount: string; // e.g. "739,928.9997 QIE"
  address?: string;
};

type Validator = {
  name: string;
  rank: number;
  staked: number; // numeric QIE
  address?: string;
};

const ValidatorsPanel: React.FC = () => {
  const [validators, setValidators] = useState<Validator[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const fetchValidators = async () => {
      try {
        setLoading(true);
        setError("");

        // ⚠️ IMPORTANT:
        // This URL pattern matches the account tx API you already use.
        // If it returns an error, open testnet.qie.digital → API section
        // and adjust module/action to the correct values.
        const url =
          "https://testnet.qie.digital/api" +
          "?module=validator&action=list"; // <-- verify this in the explorer API docs

        const res = await fetch(url);
        const data = await res.json();

        if (data.status !== "1" || !Array.isArray(data.result)) {
          setError("No validator data or API error.");
          setValidators([]);
          return;
        }

        const parsed: Validator[] = (data.result as RawValidator[]).map(
          (v, idx) => {
            // rank may be "#1" or "1" etc.
            let numericRank = typeof v.rank === "string"
              ? parseInt(v.rank.replace("#", "").trim(), 10)
              : Number(v.rank);

            if (Number.isNaN(numericRank)) numericRank = idx + 1;

            // stakedAmount might be like "739,928.9997 QIE"
            const numericStake = parseFloat(
              v.stakedAmount.replace(/[^\d.]/g, "")
            );

            return {
              name: v.name,
              rank: numericRank,
              staked: numericStake,
              address: v.address,
            };
          }
        );

        // sort just in case
        parsed.sort((a, b) => a.rank - b.rank);

        setValidators(parsed.slice(0, 10)); // Top 10
      } catch (e: any) {
        console.error("Validator fetch error:", e);
        setError("Failed to load validators.");
      } finally {
        setLoading(false);
      }
    };

    fetchValidators();
  }, []);

  // === Insights calculations ===
  const totalStake = validators.reduce((sum, v) => sum + v.staked, 0);
  const top1 = validators[0];
  const top3 = validators.slice(0, 3);
  const top1Share =
    totalStake > 0 && top1 ? (top1.staked / totalStake) * 100 : 0;
  const top3Share =
    totalStake > 0 && top3.length > 0
      ? (top3.reduce((s, v) => s + v.staked, 0) / totalStake) * 100
      : 0;

  let decentralizationLabel = "Balanced";
  if (top1Share > 40) decentralizationLabel = "Highly Concentrated";
  else if (top1Share < 20) decentralizationLabel = "Well Distributed";

  return (
    <div className="qie-card-glass">
      <div className="qie-card-header">
        <div className="qie-card-title">
          🧱 QIE Validators
        </div>
        <span className="qie-badge qie-badge-soft">
          Network security insights
        </span>
      </div>

      {loading && <p className="qie-text-muted">Loading validators…</p>}
      {error && (
        <p
          style={{
            fontSize: "0.82rem",
            color: "#b91c1c",
            marginBottom: "8px",
          }}
        >
          {error}
        </p>
      )}

      {!loading && !error && validators.length === 0 && (
        <p className="qie-text-muted">No validator data available.</p>
      )}

      {validators.length > 0 && (
        <>
          {/* Top line insights */}
          <div
            style={{
              borderRadius: 16,
              border: "1px solid #e5e7eb",
              padding: "10px 14px",
              marginBottom: 14,
              background: "#ffffff",
            }}
          >
            <p
              style={{
                fontSize: "0.86rem",
                margin: 0,
                color: "#111827",
                fontWeight: 600,
              }}
            >
              Network Overview
            </p>
            <p className="qie-text-muted" style={{ marginTop: 4 }}>
              Total stake (top {validators.length}):{" "}
              <strong>{totalStake.toLocaleString()} QIE</strong>
            </p>
            {top1 && (
              <p className="qie-text-muted" style={{ marginTop: 2 }}>
                Top validator <strong>{top1.name}</strong> holds{" "}
                <strong>{top1.staked.toLocaleString()} QIE</strong> (
                {top1Share.toFixed(1)}% of this set)
              </p>
            )}
            <p className="qie-text-muted" style={{ marginTop: 2 }}>
              Top 3 validators control{" "}
              <strong>{top3Share.toFixed(1)}%</strong> of stake →{" "}
              <strong>{decentralizationLabel}</strong> network.
            </p>
          </div>

          {/* Table of validators */}
          <div className="qie-table-wrapper">
            <table className="qie-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Name</th>
                  <th style={{ textAlign: "right" }}>Staked</th>
                </tr>
              </thead>
              <tbody>
                {validators.map((v) => (
                  <tr key={v.name}>
                    <td style={{ fontWeight: 600 }}>#{v.rank}</td>
                    <td>{v.name}</td>
                    <td style={{ textAlign: "right" }}>
                      {v.staked.toLocaleString()} QIE
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* “Insight” footer – this is your C: Validator Insights Dashboard */}
          <p className="qie-text-muted qie-mt-sm">
            🔍 <strong>Insight:</strong> Use validator stake & rank as a
            proxy for network security. In your pitch you can say:
            “Our AI predictions run on top of a validator set with{" "}
            {totalStake.toLocaleString()} QIE staked, with a{" "}
            {decentralizationLabel.toLowerCase()} distribution of power.”
          </p>
        </>
      )}
    </div>
  );
};

export default ValidatorsPanel;
