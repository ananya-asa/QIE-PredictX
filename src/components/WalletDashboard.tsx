"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import ReactModal from "react-modal";
import StakingPanel from "./StakingPanel";
import AIValuation from "./AIValuation";
import RecentActivity from "./RecentActivity";
import SettlementPanel from "./SettlementPanel";

const QIEDEX_TOKEN_ADDRESS = "0x5ce8bEccFC859f5d923b14cFEB7c9dCd3FF9551E";
const QIEDEX_TOKEN_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function approve(address,uint256)",
  "function transfer(address,uint256)",
];

export default function WalletDashboard() {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [account, setAccount] = useState<string>("");
  const [chainId, setChainId] = useState<number>(0);

  const [balance, setBalance] = useState<number>(0); // QIE balance
  const [pmtBalance, setPmtBalance] = useState<number>(0); // PMT balance as number

  const [tokenContract, setTokenContract] = useState<ethers.Contract | null>(
    null
  );

  const [loading, setLoading] = useState({
    connect: false,
    approve: false,
    transfer: false,
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");

  // react-modal init
  useEffect(() => {
    if (typeof document !== "undefined") {
      ReactModal.setAppElement(document.body);
    }
  }, []);

  const connectWallet = useCallback(async () => {
    const anyWindow: any = window;
    if (!anyWindow.ethereum) {
      alert("QIE / MetaMask wallet not found");
      return;
    }
    try {
      setLoading((p) => ({ ...p, connect: true }));
      const browserProvider = new ethers.BrowserProvider(anyWindow.ethereum);
      await browserProvider.send("eth_requestAccounts", []);
      const s = await browserProvider.getSigner();
      const addr = await s.getAddress();
      const network = await browserProvider.getNetwork();

      setProvider(browserProvider);
      setSigner(s);
      setAccount(addr);
      setChainId(Number(network.chainId));

      anyWindow.ethereum.on("accountsChanged", () => window.location.reload());
      anyWindow.ethereum.on("chainChanged", () => window.location.reload());
    } catch (err) {
      console.error(err);
      setModalMessage("Failed to connect wallet");
      setIsModalOpen(true);
    } finally {
      setLoading((p) => ({ ...p, connect: false }));
    }
  }, []);

  // load balances
  useEffect(() => {
    const loadBalances = async () => {
      if (!provider || !account) return;
      const bal = await provider.getBalance(account);
      setBalance(Number(ethers.formatEther(bal)));

      if (tokenContract) {
        const tb = await tokenContract.balanceOf(account);
        setPmtBalance(Number(ethers.formatEther(tb)));
      }
    };
    loadBalances();
  }, [provider, account, tokenContract]);

  // init token contract
  useEffect(() => {
  if (signer) {
    setTokenContract(
      new ethers.Contract(QIEDEX_TOKEN_ADDRESS, QIEDEX_TOKEN_ABI, signer)
    );
  }
}, [signer]);


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
    } catch (err) {
      console.error(err);
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
        "0x5ce8bEccFC859f5d923b14cFEB7c9dCd3FF9551E",
        ethers.parseEther("10")
      );
      await tx.wait();
      setModalMessage("✅ PMT transferred");
    } catch (err) {
      console.error(err);
      setModalMessage("❌ Transfer failed");
    } finally {
      setIsModalOpen(true);
      setLoading((p) => ({ ...p, transfer: false }));
    }
  };

  const closeModal = () => setIsModalOpen(false);

  // callback from StakingPanel when local PMT changes
  const handleLocalPmtChange = (newBalance: number) => {
    setPmtBalance(newBalance);
  };

  return (
    <div className="qie-layout">
      {/* Header */}
      <header className="qie-header">
        <h1 className="qie-header-title">QIE PredictX</h1>
        <p className="qie-header-subtitle">
          On-chain AI valuation & prediction registry on QIE Testnet
        </p>
      </header>

      {/* Wallet card */}
      <div className="qie-card-glass qie-mt-md">
        {!account ? (
          <div style={{ textAlign: "center" }}>
            <p
              style={{
                fontSize: "1.05rem",
                fontWeight: 600,
                marginBottom: "10px",
              }}
            >
              Connect your QIE wallet
            </p>
            <p className="qie-text-muted qie-mt-sm">
              Start interacting with AI valuations, staking and on-chain
              predictions.
            </p>
            <button
              onClick={connectWallet}
              disabled={loading.connect}
              className="qie-btn qie-btn-primary qie-btn-full qie-mt-lg"
            >
              {loading.connect ? "Connecting..." : "🔗 Connect Wallet"}
            </button>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1.2fr) auto",
              gap: "18px",
              alignItems: "center",
            }}
          >
            <div>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  color: "#6b7280",
                  marginBottom: "4px",
                }}
              >
                Connected wallet
              </div>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: "1.05rem",
                  color: "#111827",
                }}
              >
                {account.slice(0, 6)}...{account.slice(-4)}
              </div>
              <div
                style={{
                  marginTop: "4px",
                  fontSize: "0.8rem",
                  color: "#6b7280",
                }}
              >
                Chain ID: {chainId}
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: "12px",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "0.78rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "#9ca3af",
                    marginBottom: "4px",
                  }}
                >
                  QIE Balance
                </div>
                <div
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: 700,
                    color: "#111827",
                  }}
                >
                  {balance.toFixed(4)} QIE
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: "0.78rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "#9ca3af",
                    marginBottom: "4px",
                  }}
                >
                  PMT Tokens
                </div>
                <div
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: 700,
                    color: "#16a34a",
                  }}
                >
                  {pmtBalance.toFixed(4)} PMT
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                minWidth: "190px",
              }}
            >
              <button
                onClick={approvePMT}
                disabled={loading.approve || !tokenContract}
                className="qie-btn qie-btn-secondary"
              >
                {loading.approve ? "Approving..." : "✅ Approve"}
              </button>
              <button
                onClick={transferPMT}
                disabled={loading.transfer || !tokenContract}
                className="qie-btn qie-btn-primary"
              >
                {loading.transfer ? "Sending..." : "💸 Transfer"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main panels */}
      {account && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1.2fr)",
            gap: "20px",
            marginTop: "20px",
          }}
        >
          <div>
            <AIValuation signer={signer} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <StakingPanel
  signer={signer}
  pmtBalance={pmtBalance}
  onBalanceChange={handleLocalPmtChange}
/>
 <SettlementPanel signer={signer} />

            <RecentActivity walletAddress={account} />
          </div>
        </div>
      )}

      {/* Modal */}
      <ReactModal
        isOpen={isModalOpen}
        onRequestClose={closeModal}
        className="ReactModal__Content"
        overlayClassName="ReactModal__Overlay"
      >
        <div style={{ textAlign: "center" }}>
          <h3 style={{ fontSize: "1.3rem", marginBottom: "10px" }}>Status</h3>
          <p style={{ fontSize: "0.95rem", marginBottom: "18px" }}>
            {modalMessage}
          </p>
          <button
            onClick={closeModal}
            className="qie-btn qie-btn-primary qie-btn-full"
          >
            Close
          </button>
        </div>
      </ReactModal>
    </div>
  );
}
