"use client";

import React, { useEffect, useState } from "react";

type Tx = {
  hash: string;
  timeStamp: string;
  from: string;
  to: string;
  value: string; // in wei
  input: string;
};

type RecentActivityProps = {
  walletAddress: string;
};

const RecentActivity: React.FC<RecentActivityProps> = ({ walletAddress }) => {
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!walletAddress) return;

    const fetchTxs = async () => {
      try {
        setLoading(true);
        setError("");

        const url =
          `https://testnet.qie.digital/api` +
          `?module=account&action=txlist` +
          `&address=${walletAddress}` +
          `&page=1&offset=10&sort=desc`;

        const res = await fetch(url);
        const data = await res.json();

        if (data.status !== "1" || !Array.isArray(data.result)) {
          setError("No transactions found or API error.");
          setTxs([]);
          return;
        }

        setTxs(data.result as Tx[]);
      } catch (e: any) {
        setError("Failed to load transactions.");
      } finally {
        setLoading(false);
      }
    };

    fetchTxs();
  }, [walletAddress]);

  const shorten = (addr: string) =>
    addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "-";

  const formatTime = (ts: string) => {
    const d = new Date(Number(ts) * 1000);
    return d.toLocaleTimeString();
  };

  const formatQIE = (wei: string) => {
    const v = Number(wei) / 1e18;
    if (!v) return "0";
    return v.toFixed(4);
  };

  return (
    <div className="qie-card-glass">
      <div className="qie-card-header">
        <div className="qie-card-title">📜 Recent Activity</div>
      </div>

      {loading && (
        <p className="qie-text-muted">Loading transactions...</p>
      )}
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

      {!loading && !error && txs.length === 0 && (
        <p className="qie-text-muted">No recent transactions.</p>
      )}

      {txs.length > 0 && (
        <div
          style={{ maxHeight: "220px", overflowY: "auto", marginTop: "8px" }}
        >
          <div className="qie-table-wrapper">
            <table className="qie-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Type</th>
                  <th style={{ textAlign: "right" }}>Amount</th>
                  <th>Counterparty</th>
                </tr>
              </thead>
              <tbody>
                {txs.map((tx) => {
                  const isSender =
                    tx.from.toLowerCase() === walletAddress.toLowerCase();
                  const type = isSender ? "Sent" : "Received";
                  const counterparty = isSender ? tx.to : tx.from;

                  return (
                    <tr key={tx.hash}>
                      <td>{formatTime(tx.timeStamp)}</td>
                      <td>{type}</td>
                      <td style={{ textAlign: "right" }}>
                        {formatQIE(tx.value)} QIE
                      </td>
                      <td>{shorten(counterparty)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecentActivity;
