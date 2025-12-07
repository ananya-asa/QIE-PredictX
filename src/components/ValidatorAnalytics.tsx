// "use client";

// import React, { useEffect, useState } from "react";

// type RawValidator = {
//   name: string;
//   address: string;
//   stakeQIE: number;
//   blocksValidated: number;
// };

// type ValidatorStats = RawValidator & {
//   performanceScore: number;
//   trustScore: number;
// };

// const ValidatorAnalytics: React.FC = () => {
//   const [stats, setStats] = useState<ValidatorStats[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string>("");

//   useEffect(() => {
//     const fetchValidators = async () => {
//       try {
//         setLoading(true);
//         setError("");

//         const res = await fetch("http://localhost:3001/api/validators");
//         if (!res.ok) throw new Error(`Backend returned ${res.status}`);

//         const data = await res.json();

//         // Type-safe mapping
//         const cleaned: RawValidator[] = (data.validators as RawValidator[]).map(
//           (v: RawValidator): RawValidator => ({
//             name: v.name ?? "Unknown",
//             address: v.address ?? "0x0000",
//             stakeQIE: Number(v.stakeQIE ?? 0),
//             blocksValidated: Number(v.blocksValidated ?? 0),
//           })
//         );

//         // Compute max for scoring
//         const maxBlocks = Math.max(
//           ...cleaned.map((v) => v.blocksValidated),
//           1
//         );
//         const maxStake = Math.max(...cleaned.map((v) => v.stakeQIE), 1);

//         const scored: ValidatorStats[] = cleaned.map(
//           (v: RawValidator): ValidatorStats => {
//             const performanceScore = (v.blocksValidated / maxBlocks) * 100;
//             const stakeScore = (v.stakeQIE / maxStake) * 100;
//             const trustScore = 0.6 * stakeScore + 0.4 * performanceScore;

//             return {
//               ...v,
//               performanceScore,
//               trustScore,
//             };
//           }
//         );

//         // Sort by trust score
//         scored.sort((a: ValidatorStats, b: ValidatorStats) => b.trustScore - a.trustScore);

//         setStats(scored);
//       } catch (err) {
//         console.error(err);
//         setError("Error fetching validator data");
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchValidators();
//   }, []);

//   const totalStake = stats.reduce((sum, v) => sum + v.stakeQIE, 0);
//   const top1 = stats[0];
//   const top3 = stats.slice(0, 3);

//   const top1Share = top1 ? (top1.stakeQIE / totalStake) * 100 : 0;
//   const top3Share =
//     totalStake > 0
//       ? (top3.reduce((s, v) => s + v.stakeQIE, 0) / totalStake) * 100
//       : 0;

//   let decentralizationLabel = "Balanced";
//   if (top1Share > 40) decentralizationLabel = "Highly Concentrated";
//   else if (top1Share < 20) decentralizationLabel = "Well Distributed";

//   const avgTrust =
//     stats.length > 0
//       ? stats.reduce((s, v) => s + v.trustScore, 0) / stats.length
//       : 0;

//   return (
//     <div className="qie-card-glass">
//       <div className="qie-card-header">
//         <div className="qie-card-title">🧱 QIE Validator Analytics</div>
//         <span className="qie-badge qie-badge-soft">
//           Consensus & Security
//         </span>
//       </div>

//       {loading && <p className="qie-text-muted">Loading validators…</p>}
//       {error && <p style={{ color: "#b91c1c" }}>{error}</p>}

//       {stats.length > 0 && (
//         <>
//           <div
//             style={{
//               border: "1px solid #e5e7eb",
//               borderRadius: 16,
//               padding: 16,
//               marginBottom: 20,
//               background: "#fff",
//             }}
//           >
//             <p style={{ fontWeight: 600 }}>Network Health Summary</p>
//             <p>Total tracked stake: <strong>{totalStake.toLocaleString()} QIE</strong></p>

//             {top1 && (
//               <p>
//                 Top validator <strong>{top1.name}</strong> holds{" "}
//                 <strong>{top1.stakeQIE.toLocaleString()} QIE</strong> (
//                 {top1Share.toFixed(1)}%)
//               </p>
//             )}

//             <p>
//               Top 3 control <strong>{top3Share.toFixed(1)}%</strong> →{" "}
//               <strong>{decentralizationLabel}</strong>
//             </p>

//             <p>
//               Avg trust score: <strong>{avgTrust.toFixed(1)}/100</strong>
//             </p>
//           </div>

//           <table className="qie-table">
//             <thead>
//               <tr>
//                 <th>Rank</th>
//                 <th>Validator</th>
//                 <th>Stake</th>
//                 <th>Blocks</th>
//                 <th>Perf</th>
//                 <th>Trust</th>
//               </tr>
//             </thead>

//             <tbody>
//               {stats.map((v, idx) => (
//                 <tr key={v.address}>
//                   <td>#{idx + 1}</td>
//                   <td>{v.name}</td>
//                   <td>{v.stakeQIE.toLocaleString()}</td>
//                   <td>{v.blocksValidated}</td>
//                   <td>{v.performanceScore.toFixed(1)}%</td>
//                   <td>{v.trustScore.toFixed(1)}</td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </>
//       )}
//     </div>
//   );
// };

// export default ValidatorAnalytics;


"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

type Validator = {
  id: number;
  name: string;
  stakeQIE: number;
  blocksValidated: number;
  performanceScore: number; // 0–100
  trustScore: number; // 0–100
};

type ApiResponse = {
  validators: Validator[];
};

type ModalProps = {
  validator: Validator | null;
  onClose: () => void;
};

const PIE_COLORS = ["#3b82f6", "#22c55e", "#a855f7", "#f97316", "#ec4899", "#14b8a6"];


// =============================================================
// FIXED MODAL — NO nested AnimatePresence (causes bugs)
// =============================================================
const ValidatorModal: React.FC<ModalProps> = ({ validator, onClose }) => {
  if (!validator) return null;

  return (
    <motion.div
      key="modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        key="modal-content"
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 24, opacity: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className="relative w-full max-w-lg rounded-2xl bg-slate-900/95 p-6 text-slate-50 shadow-xl ring-1 ring-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-300 hover:bg-slate-700"
        >
          ✕
        </button>

        <h2 className="mb-2 text-xl font-semibold">
          {validator.name} — Validator Profile
        </h2>

        <p className="mb-4 text-sm text-slate-300">
          Deep dive into this validator used inside <b>QIE PredictX</b>.
        </p>

        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div className="rounded-xl bg-slate-800/80 p-3">
            <dt className="text-slate-400">Stake</dt>
            <dd className="text-lg font-semibold">
              {validator.stakeQIE.toLocaleString()} QIE
            </dd>
          </div>
          <div className="rounded-xl bg-slate-800/80 p-3">
            <dt className="text-slate-400">Blocks</dt>
            <dd className="text-lg font-semibold">
              {validator.blocksValidated.toLocaleString()}
            </dd>
          </div>
          <div className="rounded-xl bg-slate-800/80 p-3">
            <dt className="text-slate-400">Performance</dt>
            <dd className="text-lg font-semibold">
              {validator.performanceScore.toFixed(1)} / 100
            </dd>
          </div>
          <div className="rounded-xl bg-slate-800/80 p-3">
            <dt className="text-slate-400">Trust Score</dt>
            <dd className="text-lg font-semibold">
              {validator.trustScore.toFixed(1)} / 100
            </dd>
          </div>
        </dl>

        <p className="mt-4 text-xs text-slate-400">
          “Our AI doesn’t just rate predictions — it rates validators by stake,
          uptime, and block performance (trust index).”
        </p>
      </motion.div>
    </motion.div>
  );
};


// =============================================================
// MAIN COMPONENT
// =============================================================
const ValidatorAnalytics: React.FC = () => {
  const [validators, setValidators] = useState<Validator[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Validator | null>(null);

  // ======================
  // Fetch validators
  // ======================
  useEffect(() => {
    const fetchValidators = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/validators");

        if (!res.ok) throw new Error("API error");

        const data = (await res.json()) as ApiResponse;
        setValidators(data.validators ?? []);
      } catch (err) {
        setError("Failed to load validator data");
      } finally {
        setLoading(false);
      }
    };

    fetchValidators();
  }, []);

  // ======================
  // Derived metrics
  // ======================
  const {
    totalStake,
    top1,
    top3Share,
    top1Share,
    avgTrust,
    decentralizationLabel,
    nakamotoCoefficient,
  } = useMemo(() => {
    if (validators.length === 0)
      return {
        totalStake: 0,
        top1: undefined,
        top3Share: 0,
        top1Share: 0,
        avgTrust: 0,
        decentralizationLabel: "—",
        nakamotoCoefficient: 0,
      };

    const total = validators.reduce((s, v) => s + v.stakeQIE, 0);
    const sorted = [...validators].sort((a, b) => b.stakeQIE - a.stakeQIE);

    const topOne = sorted[0];
    const top3Stake = sorted.slice(0, 3).reduce((s, v) => s + v.stakeQIE, 0);

    const t1Share = (topOne.stakeQIE / total) * 100;
    const t3Share = (top3Stake / total) * 100;

    let label = "Balanced";
    if (t1Share > 40) label = "Highly Concentrated";
    else if (t1Share < 20) label = "Well Distributed";

    const avgT = validators.reduce((s, v) => s + v.trustScore, 0) / validators.length;

    let cumulative = 0;
    let n = 0;
    for (const v of sorted) {
      cumulative += v.stakeQIE;
      n++;
      if (cumulative / total >= 0.51) break;
    }

    return {
      totalStake: total,
      top1: topOne,
      top3Share: t3Share,
      top1Share: t1Share,
      avgTrust: avgT,
      decentralizationLabel: label,
      nakamotoCoefficient: n,
    };
  }, [validators]);


  // ======================
  // Chart Data
  // ======================
  const pieData = validators.map((v) => ({
    name: v.name,
    value: v.stakeQIE,
  }));

  const perfData = validators.map((v) => ({
    name: v.name,
    performance: Number(v.performanceScore.toFixed(1)),
    trust: Number(v.trustScore.toFixed(1)),
  }));


  // ======================
  // CSV Export
  // ======================
  const handleExportCSV = () => {
    if (validators.length === 0) return;

    const header = [
      "id",
      "name",
      "stakeQIE",
      "blocksValidated",
      "performanceScore",
      "trustScore",
    ].join(",");

    const rows = validators.map((v) =>
      [
        v.id,
        `"${v.name.replace(/"/g, '""')}"`,
        v.stakeQIE,
        v.blocksValidated,
        v.performanceScore.toFixed(2),
        v.trustScore.toFixed(2),
      ].join(",")
    );

    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = "qie-validator-analytics.csv";
    a.click();

    URL.revokeObjectURL(url);
  };


  // =============================================================
  // RENDER
  // =============================================================
  return (
    <>
      <motion.div
        className="qie-card-glass relative flex flex-col gap-4"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-200">QIE Validator Analytics</h3>
            <p className="text-xs text-slate-400">
              Consensus & security layer backing <b>QIE PredictX</b>.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-full bg-indigo-500/15 px-3 py-1 text-[10px] font-medium text-indigo-300 ring-1 ring-indigo-500/40">
              Realtime network snapshot
            </span>
            <button
              onClick={handleExportCSV}
              className="rounded-full bg-slate-800 px-3 py-1 text-[10px] font-medium text-slate-200 hover:bg-slate-700"
            >
              ⬇ Export CSV
            </button>
          </div>
        </div>

        {/* Loading / Error */}
        {loading && <p className="text-xs text-slate-400">Loading validator data…</p>}
        {error && <p className="text-xs text-rose-400">{error}</p>}

        {/* CONTENT */}
        {!loading && !error && validators.length > 0 && (
          <div className="flex flex-col gap-4 lg:flex-row">
            {/* LEFT SIDE */}
            <div className="flex-1 space-y-3">
              {/* Network Summary */}
              <div className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-3">
                <p className="text-xs font-semibold text-slate-200">Network Health Summary</p>

                <p className="mt-1 text-xs text-slate-400">
                  Total tracked stake:{" "}
                  <b className="text-slate-100">{totalStake.toLocaleString()} QIE</b>
                </p>

                {top1 && (
                  <p className="mt-1 text-xs text-slate-400">
                    Top validator <b className="text-slate-100">{top1.name}</b> holds{" "}
                    <b>{top1.stakeQIE.toLocaleString()} QIE</b> (
                    <b>{top1Share.toFixed(1)}%</b> of stake).
                  </p>
                )}

                <p className="mt-1 text-xs text-slate-400">
                  Top 3 validators control <b>{top3Share.toFixed(1)}%</b> →{" "}
                  <b>{decentralizationLabel}</b>.
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Avg trust score: <b>{avgTrust.toFixed(1)}</b> / 100
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Nakamoto coefficient: <b>{nakamotoCoefficient}</b>
                </p>
              </div>

              {/* Table */}
              <div className="max-h-56 overflow-y-auto rounded-2xl border border-slate-700/70 bg-slate-900/70">
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-900/80 text-[10px] uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="px-3 py-2 text-left">Rank</th>
                      <th className="px-3 py-2 text-left">Validator</th>
                      <th className="px-3 py-2 text-right">Stake (QIE)</th>
                      <th className="px-3 py-2 text-right">Blocks</th>
                      <th className="px-3 py-2 text-right">Perf</th>
                      <th className="px-3 py-2 text-right">Trust</th>
                    </tr>
                  </thead>

                  <tbody>
                    {validators
                      .slice()
                      .sort((a, b) => b.trustScore - a.trustScore)
                      .map((v, i) => (
                        <tr
                          key={v.id}
                          className="cursor-pointer border-t border-slate-800/70 hover:bg-slate-800/60"
                          onClick={() => setSelected(v)}
                        >
                          <td className="px-3 py-1 text-[11px] font-semibold text-slate-200">
                            #{i + 1}
                          </td>
                          <td className="px-3 py-1 text-[11px] text-slate-200">{v.name}</td>
                          <td className="px-3 py-1 text-right text-[11px] text-slate-100">
                            {v.stakeQIE.toLocaleString()}
                          </td>
                          <td className="px-3 py-1 text-right text-[11px] text-slate-100">
                            {v.blocksValidated.toLocaleString()}
                          </td>
                          <td className="px-3 py-1 text-right text-[11px] text-slate-100">
                            {v.performanceScore.toFixed(1)}%
                          </td>
                          <td className="px-3 py-1 text-right text-[11px] text-slate-100">
                            {v.trustScore.toFixed(1)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* RIGHT SIDE */}
            <div className="flex-1 space-y-3">
              {/* Stake Pie Chart */}
              <div className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-3">
                <p className="mb-1 text-xs font-semibold text-slate-200">Stake Distribution</p>
                <p className="mb-2 text-[11px] text-slate-400">
                  Visualizing how much economic power each validator holds.
                </p>

                {/* FIXED HEIGHT FOR RECHARTS */}
                <div style={{ width: "100%", height: 200 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={65}
                        innerRadius={30}
                        paddingAngle={2}
                      >
                        {pieData.map((_, index) => (
                          <Cell
                            key={index}
                            fill={PIE_COLORS[index % PIE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(v: number) => `${v.toLocaleString()} QIE`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Bar Chart */}
              <div className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-3">
                <p className="mb-1 text-xs font-semibold text-slate-200">
                  Performance vs Trust
                </p>
                <p className="mb-2 text-[11px] text-slate-400">
                  Comparing raw performance vs trust index.
                </p>

                {/* FIXED HEIGHT AGAIN */}
                <div style={{ width: "100%", height: 220 }}>
                  <ResponsiveContainer>
                    <BarChart data={perfData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10, fill: "#9ca3af" }}
                      />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#9ca3af" }} />
                      <RechartsTooltip />

                      <Bar dataKey="performance" fill="#3b82f6" radius={4} />
                      <Bar dataKey="trust" fill="#22c55e" radius={4} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Pitch Line */}
        {!loading && validators.length > 0 && (
          <p className="mt-1 text-[10px] text-slate-500">
            🧠 <b className="text-slate-300">How to sell this to judges:</b> “PredictX is
            powered by a transparent validator analytics layer that quantifies decentralization,
            stake concentration, and validator trust.”
          </p>
        )}
      </motion.div>

      {/* FIXED AnimatePresence for modal */}
      <AnimatePresence>
        {selected && (
          <ValidatorModal validator={selected} onClose={() => setSelected(null)} />
        )}
      </AnimatePresence>
    </>
  );
};

export default ValidatorAnalytics;
