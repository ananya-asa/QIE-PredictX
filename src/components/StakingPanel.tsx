"use client";

import React, { useEffect, useState } from "react";
import { ethers } from "ethers";

type StakingPanelProps = {
  signer: ethers.Signer | null;
  pmtBalance: number;
  onBalanceChange?: (newBalance: number) => void;
};

const PMT_TOKEN_ADDRESS = "0x5ce8bEccFC859f5d923b14cFEB7c9dCd3FF9551E";
const PMT_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
];

const STAKING_ADDRESS = "0x32dB90785c400deAD53D48b2C810228c1BbAbA8d";
const STAKING_ABI = [
  "function stake(uint256 amount) external",
  "function unstake(uint256 amount) external",
  "function stakedBalance(address user) view returns (uint256)",
];

const StakingPanel: React.FC<StakingPanelProps> = ({
  signer,
  pmtBalance,
  onBalanceChange,
}) => {
  const [stakeAmount, setStakeAmount] = useState<string>("0");
  const [unstakeAmount, setUnstakeAmount] = useState<string>("0");

  const [staked, setStaked] = useState<number>(0); // on-chain staked PMT
  const [rewards, setRewards] = useState<number>(0); // still simulated
  const [apr] = useState<number>(12); // demo APR

  const [pmtContract, setPmtContract] = useState<ethers.Contract | null>(null);
  const [stakingContract, setStakingContract] =
    useState<ethers.Contract | null>(null);
  const [loading, setLoading] = useState({
    approve: false,
    stake: false,
    unstake: false,
  });

  // init contracts
  useEffect(() => {
    if (signer) {
      setPmtContract(new ethers.Contract(PMT_TOKEN_ADDRESS, PMT_ABI, signer));
      setStakingContract(
        new ethers.Contract(STAKING_ADDRESS, STAKING_ABI, signer)
      );
    }
  }, [signer]);

  // load on-chain staked balance
  useEffect(() => {
    const loadStaked = async () => {
      if (!stakingContract || !signer) return;
      try {
        const addr = await signer.getAddress();
        const bal = await stakingContract.stakedBalance(addr);
        setStaked(Number(ethers.formatEther(bal)));
      } catch (err) {
        console.error("Error loading staked balance:", err);
      }
    };
    loadStaked();
  }, [stakingContract, signer]);

  // simulated rewards
  useEffect(() => {
    const interval = setInterval(() => {
      if (staked > 0) {
        const yearlyReward = (staked * apr) / 100;
        const perSecond = yearlyReward / (365 * 24 * 60 * 60);
        setRewards((r) => r + perSecond);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [staked, apr]);

  const ensureApproval = async (amount: bigint) => {
    if (!pmtContract || !signer) return false;
    try {
      const addr = await signer.getAddress();
      const current: bigint = await pmtContract.allowance(
        addr,
        STAKING_ADDRESS
      );
      if (current >= amount) return true;

      setLoading((l) => ({ ...l, approve: true }));
      const tx = await pmtContract.approve(STAKING_ADDRESS, amount);
      await tx.wait();
      return true;
    } catch (err) {
      console.error("Approve failed:", err);
      alert("Approval failed");
      return false;
    } finally {
      setLoading((l) => ({ ...l, approve: false }));
    }
  };

  const handleStake = async () => {
    if (!stakingContract || !signer) return;
    const amt = Number(stakeAmount);
    if (!amt || amt <= 0) return;
    if (amt > pmtBalance) {
      alert("Not enough PMT in wallet to stake.");
      return;
    }

    try {
      const parsed = ethers.parseEther(amt.toString());
      const ok = await ensureApproval(parsed);
      if (!ok) return;

      setLoading((l) => ({ ...l, stake: true }));
      const tx = await stakingContract.stake(parsed);
      await tx.wait();

      setStaked((s) => s + amt);
      if (onBalanceChange) onBalanceChange(pmtBalance - amt);
      setStakeAmount("0");
    } catch (err) {
      console.error("Stake failed:", err);
      alert("Stake transaction failed");
    } finally {
      setLoading((l) => ({ ...l, stake: false }));
    }
  };

  const handleUnstake = async () => {
    if (!stakingContract) return;
    const amt = Number(unstakeAmount);
    if (!amt || amt <= 0) return;
    if (amt > staked) {
      alert("You cannot unstake more than you have staked.");
      return;
    }

    try {
      const parsed = ethers.parseEther(amt.toString());
      setLoading((l) => ({ ...l, unstake: true }));
      const tx = await stakingContract.unstake(parsed);
      await tx.wait();

      setStaked((s) => s - amt);
      if (onBalanceChange) onBalanceChange(pmtBalance + amt);
      setUnstakeAmount("0");
    } catch (err) {
      console.error("Unstake failed:", err);
      alert("Unstake transaction failed");
    } finally {
      setLoading((l) => ({ ...l, unstake: false }));
    }
  };

  const handleClaim = () => {
    if (rewards <= 0) return;
    if (onBalanceChange) onBalanceChange(pmtBalance + rewards);
    setRewards(0);
  };

  return (
    <div className="qie-card-glass">
      <div className="qie-card-header">
        <div className="qie-card-title">🪙 PMT Staking</div>
        <span className="qie-badge qie-badge-soft">
          On-chain staking + demo rewards
        </span>
      </div>

      <p className="qie-text-muted">
        Stake PMT into a real QIE staking contract. APR and rewards are
        simulated in the UI.
      </p>

      <div className="qie-mt-md" style={{ fontSize: "0.86rem" }}>
        <p>
          <strong>Wallet PMT:</strong> {pmtBalance.toFixed(4)} PMT
        </p>
        <p>
          <strong>Staked PMT:</strong> {staked.toFixed(4)} PMT
        </p>
        <p>
          <strong>Pending Rewards:</strong> {rewards.toFixed(4)} PMT (APR ~
          {apr}%)
        </p>
      </div>

      {/* Stake */}
      <div
        className="qie-mt-md"
        style={{ display: "flex", gap: "8px", alignItems: "center" }}
      >
        <input
          type="number"
          min="0"
          placeholder="Amount to stake"
          value={stakeAmount}
          onChange={(e) => setStakeAmount(e.target.value)}
          className="qie-input"
        />
        <button
          onClick={handleStake}
          disabled={loading.stake || !signer}
          className="qie-btn qie-btn-primary qie-btn-sm"
        >
          {loading.approve
            ? "Approving..."
            : loading.stake
            ? "Staking..."
            : "Stake"}
        </button>
      </div>

      {/* Unstake */}
      <div
        className="qie-mt-sm"
        style={{ display: "flex", gap: "8px", alignItems: "center" }}
      >
        <input
          type="number"
          min="0"
          placeholder="Amount to unstake"
          value={unstakeAmount}
          onChange={(e) => setUnstakeAmount(e.target.value)}
          className="qie-input"
        />
        <button
          onClick={handleUnstake}
          disabled={loading.unstake || !signer}
          className="qie-btn qie-btn-secondary qie-btn-sm"
        >
          {loading.unstake ? "Unstaking..." : "Unstake"}
        </button>
      </div>

      {/* Claim */}
      <button
        onClick={handleClaim}
        disabled={rewards <= 0}
        className="qie-btn qie-btn-primary qie-btn-full qie-mt-md"
      >
        Claim Rewards (Demo)
      </button>
    </div>
  );
};

export default StakingPanel;
