"use client";

import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import WalletDashboard from "../components/WalletDashboard";

const queryClient = new QueryClient();

export default function Home() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="qie-app-root">
        <div className="qie-page-shell qie-animate-fade-in">
          <WalletDashboard />
        </div>
      </div>
    </QueryClientProvider>
  );
}
