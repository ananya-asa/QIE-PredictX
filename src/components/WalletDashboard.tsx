"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import ReactModal from "react-modal";

import StakingPanel from "./StakingPanel";
import AIValuation from "./AIValuation";
import RecentActivity from "./RecentActivity";
import SettlementPanel from "./SettlementPanel";
import OraclePanel from "./OraclePanel";
import ValidatorAnalytics from "./ValidatorAnalytics";
import OracleIntegrityPanel from "./OracleIntegrityPanel";
import PortfolioSimulator from "./PortfolioSimulator";

const QIEDEX_TOKEN_ADDRESS = "0x5ce8bEccFC859f5d923b14cFEB7c9dCd3FF9551E";
const QIEDEX_TOKEN_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function approve(address,uint256)",
  "function transfer(address,uint256)",
];

export default function WalletDashboard() {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [account, setAccount] = useState("");
  const [chainId, setChainId] = useState(0);

  const [balance, setBalance] = useState(0);
  const [pmtBalance, setPmtBalance] = useState(0);

  const [tokenContract, setTokenContract] = useState<ethers.Contract | null>(null);

  const [loading, setLoading] = useState({
    connect: false,
    approve: false,
    transfer: false,
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");

  // Init modal
  useEffect(() => {
    if (typeof document !== "undefined") {
      ReactModal.setAppElement(document.body);
    }
  }, []);

  /* -----------------------------------------
   * CONNECT WALLET
   * ----------------------------------------- */
  const connectWallet = useCallback(async () => {
    const anyWindow: any = window;
    if (!anyWindow.ethereum) {
      alert("QIE-compatible wallet not found.");
      return;
    }

    try {
      setLoading((p) => ({ ...p, connect: true }));

      const browserProvider = new ethers.BrowserProvider(anyWindow.ethereum);
      await browserProvider.send("eth_requestAccounts", []);

      const signer = await browserProvider.getSigner();
      const addr = await signer.getAddress();
      const network = await browserProvider.getNetwork();

      setProvider(browserProvider);
      setSigner(signer);
      setAccount(addr);
      setChainId(Number(network.chainId));

      anyWindow.ethereum.on("accountsChanged", () => window.location.reload());
      anyWindow.ethereum.on("chainChanged", () => window.location.reload());
    } catch (error) {
      console.error(error);
      setModalMessage("Failed to connect wallet");
      setIsModalOpen(true);
    } finally {
      setLoading((p) => ({ ...p, connect: false }));
    }
  }, []);

  /* -----------------------------------------
   * LOAD BALANCES
   * ----------------------------------------- */
  useEffect(() => {
    if (!provider || !account) return;

    const load = async () => {
      const bal = await provider.getBalance(account);
      setBalance(Number(ethers.formatEther(bal)));

      if (tokenContract) {
        const tb = await tokenContract.balanceOf(account);
        setPmtBalance(Number(ethers.formatEther(tb)));
      }
    };
    load();
  }, [provider, account, tokenContract]);

  /* -----------------------------------------
   * INIT TOKEN CONTRACT
   * ----------------------------------------- */
  useEffect(() => {
    if (signer) {
      setTokenContract(
        new ethers.Contract(QIEDEX_TOKEN_ADDRESS, QIEDEX_TOKEN_ABI, signer)
      );
    }
  }, [signer]);

  /* -----------------------------------------
   * APPROVE & TRANSFER DEMO ACTIONS
   * ----------------------------------------- */
  const approvePMT = async () => {
    if (!tokenContract) return;
    try {
      setLoading((p) => ({ ...p, approve: true }));
      const tx = await tokenContract.approve(
        QIEDEX_TOKEN_ADDRESS,
        ethers.parseEther("1000")
      );
      await tx.wait();
      setModalMessage("✅ PMT tokens approved");
    } catch {
      setModalMessage("❌ Approval failed");
    } finally {
      setIsModalOpen(true);
      setLoading((p) => ({ ...p, approve: false }));
    }
  };

  const transferPMT = async () => {
    if (!tokenContract) return;
    try {
      setLoading((p) => ({ ...p, transfer: true }));
      const tx = await tokenContract.transfer(
        QIEDEX_TOKEN_ADDRESS,
        ethers.parseEther("10")
      );
      await tx.wait();
      setModalMessage("✅ PMT transferred");
    } catch {
      setModalMessage("❌ Transfer failed");
    } finally {
      setIsModalOpen(true);
      setLoading((p) => ({ ...p, transfer: false }));
    }
  };

  const closeModal = () => setIsModalOpen(false);

  const handleLocalPmtChange = (val: number) => setPmtBalance(val);

  /* -----------------------------------------
   *        DASHBOARD LAYOUT FIXED 💎
   * ----------------------------------------- */
  return (
    <div className="qie-layout">
      {/* HEADER */}
      <header className="qie-header">
        <h1 className="qie-header-title">QIE PredictX</h1>
        <p className="qie-header-subtitle">
          On-chain AI valuation & prediction registry for the QIE ecosystem
        </p>
      </header>

      {/* WALLET CARD */}
      <div className="qie-card-glass qie-animate-slide-up">
        {!account ? (
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: "1.05rem", fontWeight: 600, marginBottom: "10px" }}>
              Connect your wallet
            </p>
            <p className="qie-text-muted">
              Access staking, AI valuations, on-chain predictions, and analytics.
            </p>

            <button
              className="qie-btn qie-btn-primary qie-btn-full qie-mt-lg"
              onClick={connectWallet}
            >
              {loading.connect ? "Connecting..." : "🔗 Connect Wallet"}
            </button>
          </div>
        ) : (
          <div className="qie-wallet-grid">
            {/* Wallet Address */}
            <div>
              <div className="wallet-label">Connected wallet</div>
              <div className="wallet-address">
                {account.slice(0, 6)}...{account.slice(-4)}
              </div>
              <div className="wallet-chain">Chain ID: {chainId}</div>
            </div>

            {/* Balances */}
            <div className="qie-balance-grid">
              <div>
                <div className="wallet-sub-label">QIE Balance</div>
                <div className="wallet-balance">{balance.toFixed(4)} QIE</div>
              </div>

              <div>
                <div className="wallet-sub-label">PMT Tokens</div>
                <div className="wallet-balance" style={{ color: "#22d3ee" }}>
                  {pmtBalance.toFixed(4)} PMT
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="wallet-actions">
              <button
                className="qie-btn qie-btn-secondary"
                disabled={loading.approve}
                onClick={approvePMT}
              >
                {loading.approve ? "Approving..." : "Approve"}
              </button>

              <button
                className="qie-btn qie-btn-primary"
                disabled={loading.transfer}
                onClick={transferPMT}
              >
                {loading.transfer ? "Sending..." : "Transfer"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* -----------------------------------------
       * MAIN DASHBOARD GRID LAYOUT
       * ----------------------------------------- */}
      {account && (
        <div className="qie-dashboard-grid">
          {/* LEFT COLUMN */}
          <div className="qie-col">
            <AIValuation signer={signer} />
            <OracleIntegrityPanel />
            <ValidatorAnalytics />
          </div>

          {/* RIGHT COLUMN */}
          <div className="qie-col">
            <PortfolioSimulator />
            <StakingPanel
              signer={signer}
              pmtBalance={pmtBalance}
              onBalanceChange={handleLocalPmtChange}
            />
            <SettlementPanel signer={signer} />
            <OraclePanel signer={signer} />
            <RecentActivity walletAddress={account} />
          </div>
        </div>
      )}

      {/* MODAL */}
      <ReactModal
        isOpen={isModalOpen}
        onRequestClose={closeModal}
        className="ReactModal__Content"
        overlayClassName="ReactModal__Overlay"
      >
        <div style={{ textAlign: "center" }}>
          <h3 style={{ fontSize: "1.3rem", marginBottom: "10px" }}>Status</h3>
          <p style={{ marginBottom: "16px" }}>{modalMessage}</p>
          <button onClick={closeModal} className="qie-btn qie-btn-primary qie-btn-full">
            Close
          </button>
        </div>
      </ReactModal>
    </div>
  );
}
