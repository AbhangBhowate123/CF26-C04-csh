"use client";

import { useState, useEffect } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import ThreatAssessment from "./ThreatAssessment";
import AttackPathGraph from "./AttackPathGraph";
import FacilitySchematic from "./FacilitySchematic";
import SystemTerminal from "./SystemTerminal";

export default function DashboardLayout() {
  const [activeView, setActiveView] = useState("Command");
  const [attackPaths, setAttackPaths] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSimulating, setIsSimulating] = useState(false);

  const fetchData = async () => {
    try {
      const response = await fetch("/api/attack-paths?top_n=3");
      if (response.ok) {
        const data = await response.json();
        if (data.attack_paths && data.attack_paths.length > 0) {
          setAttackPaths(data.attack_paths);
        } else {
          setAttackPaths([]);
        }
      }
    } catch (error) {
      console.error("Failed to fetch attack paths", error);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 120000); // Poll every 120s due to heavy backend compute
    return () => clearInterval(interval);
  }, []);

  const handleSimulateAttack = async () => {
    setIsSimulating(true);
    try {
      const res = await fetch("/api/trigger-attack", { method: "POST" });
      if (res.ok) {
        // Fetch new data immediately
        await fetchData();
      } else {
        console.error("Simulation failed with status", res.status);
      }
    } catch (error) {
      console.error("Failed to simulate attack", error);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <>
      <Header searchQuery={searchQuery} setSearchQuery={setSearchQuery} onSimulateClick={handleSimulateAttack} isSimulating={isSimulating} />
      <div className="flex flex-1 pt-16 min-h-screen">
        <Sidebar activeView={activeView} setActiveView={setActiveView} />
        <main className="flex-1 ml-20 p-gutter bg-[#0A0C10] flex flex-col gap-gutter">
          {activeView === "Command" ? (
            <>
              <div className="grid grid-cols-12 gap-gutter h-1/2 min-h-[400px]">
                <ThreatAssessment attackPaths={attackPaths} />
                <AttackPathGraph attackPaths={attackPaths} />
              </div>
              <div className="grid grid-cols-12 gap-gutter h-1/2 min-h-[400px]">
                <FacilitySchematic attackPaths={attackPaths} />
                <SystemTerminal attackPaths={attackPaths} searchQuery={searchQuery} />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center border border-outline-variant border-dashed rounded-lg text-on-surface-variant font-data-code">
              {activeView} module is currently offline.
            </div>
          )}
        </main>
      </div>
    </>
  );
}
