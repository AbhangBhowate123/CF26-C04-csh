"use client";

import { useState, useEffect, useRef } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import ThreatAssessment from "./ThreatAssessment";
import AttackPathGraph from "./AttackPathGraph";
import FacilitySchematic from "./FacilitySchematic";
import SystemTerminal from "./SystemTerminal";

export type AppNotification = {
  id: string;
  type: 'attack' | 'lockdown_on' | 'lockdown_off';
  title: string;
  message: string;
  timestamp: string;
};

export default function DashboardLayout() {
  const [activeView, setActiveView] = useState("Command");
  const [attackPaths, setAttackPaths] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSimulating, setIsSimulating] = useState(false);
  const [isLockdownActive, setIsLockdownActive] = useState(false);
  const [customLogs, setCustomLogs] = useState<any[]>([]);
  
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [activeToasts, setActiveToasts] = useState<AppNotification[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const originalTitle = useRef("Aegis Mission Control");
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playAlertSound = (type: 'attack' | 'lockdown_on' | 'lockdown_off') => {
    if (isMuted) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'attack') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } else if (type === 'lockdown_on') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch (e) {
      console.warn("Audio play failed", e);
    }
  };

  const addNotification = (type: 'attack' | 'lockdown_on' | 'lockdown_off', title: string, message: string) => {
    const newNotif: AppNotification = {
      id: `notif-${Date.now()}-${Math.random()}`,
      type,
      title,
      message,
      timestamp: new Date().toISOString()
    };
    setNotifications(prev => [newNotif, ...prev]);
    setActiveToasts(prev => [newNotif, ...prev]);
    playAlertSound(type);

    if (type === 'attack') {
      let flashes = 0;
      const interval = setInterval(() => {
        document.title = flashes % 2 === 0 ? "⚠ CRITICAL ALERT" : originalTitle.current;
        flashes++;
        if (flashes > 10) {
          clearInterval(interval);
          document.title = originalTitle.current;
        }
      }, 500);
    }
    
    // Auto dismiss toast after 5s
    setTimeout(() => {
      setActiveToasts(prev => prev.filter(t => t.id !== newNotif.id));
    }, 5000);
  };

  const handleToggleLockdown = () => {
    const willBeLocked = !isLockdownActive;
    setIsLockdownActive(willBeLocked);
    
    if (willBeLocked) {
      setCustomLogs(prev => [...prev, {
        event_id: `sys-lock-${Date.now()}`,
        event_type: 'system_log',
        timestamp: new Date().toISOString(),
        message: '[SYS] Emergency lockdown initiated by Operator Alpha-1'
      }]);
      addNotification('lockdown_on', 'EMERGENCY LOCKDOWN ACTIVE', 'Facility secured by Operator Alpha-1.');
    } else {
      setCustomLogs(prev => [...prev, {
        event_id: `sys-unlock-${Date.now()}`,
        event_type: 'system_log',
        timestamp: new Date().toISOString(),
        message: '[SYS] Emergency lockdown disengaged by Operator Alpha-1'
      }]);
      addNotification('lockdown_off', 'LOCKDOWN DISENGAGED', 'Systems Normal. Awaiting orders.');
    }
  };

  const fetchData = async () => {
    try {
      const response = await fetch("/api/attack-paths?top_n=3");
      if (response.ok) {
        const data = await response.json();
        if (data.attack_paths && data.attack_paths.length > 0) {
          setAttackPaths(data.attack_paths);
          return data.attack_paths;
        } else {
          setAttackPaths([]);
          return [];
        }
      }
    } catch (error) {
      console.error("Failed to fetch attack paths", error);
    }
    return null;
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
        const newPaths = await fetchData();
        if (newPaths && newPaths.length > 0) {
          const score = (newPaths[0].score.total_score * 10).toFixed(1);
          addNotification('attack', 'CRITICAL THREAT DETECTED', `Lateral movement detected. Threat Score: ${score}/10`);
        }
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
      <Header 
        searchQuery={searchQuery} 
        setSearchQuery={setSearchQuery} 
        onSimulateClick={handleSimulateAttack} 
        isSimulating={isSimulating} 
        isLockdownActive={isLockdownActive} 
        notifications={notifications}
        isMuted={isMuted}
        setIsMuted={setIsMuted}
      />
      <div className="flex flex-1 pt-16 min-h-screen">
        <Sidebar activeView={activeView} setActiveView={setActiveView} isLockdownActive={isLockdownActive} onToggleLockdown={handleToggleLockdown} />
        <main className="flex-1 ml-20 p-gutter bg-[#0A0C10] flex flex-col gap-gutter">
          {activeView === "Command" ? (
            <>
              {(() => {
                const activePath = attackPaths && attackPaths.length > 0 ? attackPaths[0] : null;
                return (
                  <>
                    <div className="grid grid-cols-12 gap-gutter h-1/2 min-h-[400px]">
                      <ThreatAssessment activePath={activePath} />
                      <AttackPathGraph activePath={activePath} isLockdownActive={isLockdownActive} />
                    </div>
                    <div className="grid grid-cols-12 gap-gutter h-1/2 min-h-[400px]">
                      <FacilitySchematic activePath={activePath} isLockdownActive={isLockdownActive} />
                      <SystemTerminal activePath={activePath} searchQuery={searchQuery} customLogs={customLogs} />
                    </div>
                  </>
                );
              })()}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center border border-outline-variant border-dashed rounded-lg text-on-surface-variant font-data-code">
              {activeView} module is currently offline.
            </div>
          )}
        </main>
      </div>

      {/* Floating Toasts */}
      <div className="fixed top-20 right-8 z-[100] flex flex-col gap-4 w-96 pointer-events-none">
        {activeToasts.map(toast => {
          const isAttack = toast.type === 'attack';
          const isLockdownOn = toast.type === 'lockdown_on';
          
          return (
            <div 
              key={toast.id} 
              className={`p-4 rounded-lg shadow-2xl border pointer-events-auto transition-all animate-slide-in-right backdrop-blur-md bg-opacity-90 ${
                isAttack 
                  ? 'bg-[rgba(147,0,10,0.85)] border-error text-error' 
                  : isLockdownOn
                    ? 'bg-[rgba(255,180,0,0.15)] border-[#ffb400] text-[#ffb400]'
                    : 'bg-[rgba(195,244,0,0.1)] border-primary-fixed text-primary-fixed'
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <h4 className="font-label-caps text-label-caps font-bold tracking-widest">{toast.title}</h4>
                <button 
                  onClick={() => setActiveToasts(prev => prev.filter(t => t.id !== toast.id))}
                  className="opacity-70 hover:opacity-100 transition-opacity"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
              <p className="font-data-code text-sm opacity-90">{toast.message}</p>
            </div>
          );
        })}
      </div>
    </>
  );
}
