"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

type LockdownState = "loading" | "success" | "error" | "no-token";

function EmergencyLockdownContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [state, setState] = useState<LockdownState>("loading");
  const [message, setMessage] = useState("");
  const [activatedAt, setActivatedAt] = useState("");

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

  useEffect(() => {
    if (!token) {
      setState("no-token");
      setMessage("No lockdown token provided.");
      return;
    }

    const triggerLockdown = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/emergency-lockdown`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();

        if (res.ok && data.status === "success") {
          setState("success");
          setMessage(data.message);
          setActivatedAt(data.activated_at || new Date().toISOString());
        } else {
          setState("error");
          setMessage(data.message || "Lockdown failed.");
        }
      } catch (err) {
        setState("error");
        setMessage("Network error — could not reach Aegis backend.");
      }
    };

    triggerLockdown();
  }, [token, API_BASE]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#060810] relative overflow-hidden">
      {/* Background animated grid */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(195,244,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(195,244,0,0.1) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      {/* Radial glow */}
      {state === "success" && (
        <div
          className="absolute inset-0 animate-pulse"
          style={{
            background:
              "radial-gradient(circle at center, rgba(147,0,10,0.15) 0%, transparent 60%)",
          }}
        />
      )}
      {state === "loading" && (
        <div
          className="absolute inset-0 animate-pulse"
          style={{
            background:
              "radial-gradient(circle at center, rgba(195,244,0,0.08) 0%, transparent 60%)",
          }}
        />
      )}

      <div className="relative z-10 text-center max-w-lg mx-auto px-6">
        {/* Logo */}
        <div className="mb-8">
          <h1
            className="text-2xl font-black tracking-tighter"
            style={{ color: "#C3F400" }}
          >
            AEGIS MISSION CONTROL
          </h1>
          <p className="text-xs tracking-[0.3em] text-gray-500 mt-1 font-mono">
            EMERGENCY LOCKDOWN SYSTEM
          </p>
        </div>

        {/* Status Card */}
        <div
          className="rounded-xl border p-8 backdrop-blur-md"
          style={{
            backgroundColor: "rgba(10,12,16,0.9)",
            borderColor:
              state === "success"
                ? "rgba(147,0,10,0.6)"
                : state === "error" || state === "no-token"
                ? "rgba(255,180,0,0.4)"
                : "rgba(195,244,0,0.2)",
            boxShadow:
              state === "success"
                ? "0 0 40px rgba(147,0,10,0.2), inset 0 0 40px rgba(147,0,10,0.05)"
                : state === "error"
                ? "0 0 40px rgba(255,180,0,0.1)"
                : "0 0 40px rgba(195,244,0,0.05)",
          }}
        >
          {/* Loading State */}
          {state === "loading" && (
            <>
              <div className="flex justify-center mb-6">
                <div
                  className="w-16 h-16 rounded-full border-4 border-t-transparent animate-spin"
                  style={{ borderColor: "#C3F400", borderTopColor: "transparent" }}
                />
              </div>
              <h2
                className="text-xl font-bold tracking-wider mb-2 font-mono"
                style={{ color: "#C3F400" }}
              >
                INITIATING LOCKDOWN...
              </h2>
              <p className="text-sm text-gray-400 font-mono">
                Validating authorization token
              </p>
            </>
          )}

          {/* Success State */}
          {state === "success" && (
            <>
              <div className="flex justify-center mb-6">
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center animate-pulse"
                  style={{
                    backgroundColor: "rgba(147,0,10,0.2)",
                    border: "2px solid rgba(255,70,70,0.6)",
                    boxShadow: "0 0 30px rgba(147,0,10,0.4)",
                  }}
                >
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#ff4646"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
              </div>
              <h2
                className="text-2xl font-black tracking-wider mb-3 font-mono"
                style={{ color: "#ff4646" }}
              >
                LOCKDOWN ACTIVATED
              </h2>
              <p className="text-sm text-gray-300 font-mono mb-4">{message}</p>
              <div
                className="inline-block rounded px-4 py-2 text-xs font-mono tracking-wider"
                style={{
                  backgroundColor: "rgba(147,0,10,0.15)",
                  border: "1px solid rgba(255,70,70,0.3)",
                  color: "#ff8888",
                }}
              >
                ACTIVATED AT:{" "}
                {activatedAt
                  ? new Date(activatedAt).toLocaleString()
                  : "\u2014"}
              </div>
              <p className="text-xs text-gray-500 mt-6 font-mono">
                All facility access points have been secured.
                <br />
                Open the dashboard to disengage when safe.
              </p>
            </>
          )}

          {/* Error State */}
          {(state === "error" || state === "no-token") && (
            <>
              <div className="flex justify-center mb-6">
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: "rgba(255,180,0,0.1)",
                    border: "2px solid rgba(255,180,0,0.4)",
                  }}
                >
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#ffb400"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                </div>
              </div>
              <h2
                className="text-xl font-bold tracking-wider mb-3 font-mono"
                style={{ color: "#ffb400" }}
              >
                AUTHORIZATION FAILED
              </h2>
              <p className="text-sm text-gray-300 font-mono mb-4">{message}</p>
              <div
                className="rounded px-4 py-3 text-xs font-mono text-left"
                style={{
                  backgroundColor: "rgba(255,180,0,0.05)",
                  border: "1px solid rgba(255,180,0,0.2)",
                  color: "#999",
                }}
              >
                <p>Possible reasons:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Token has already been used</li>
                  <li>Token has expired (30 min limit)</li>
                  <li>Invalid or tampered link</li>
                </ul>
              </div>
              <p className="text-xs text-gray-500 mt-6 font-mono">
                Use the Aegis dashboard for manual lockdown control.
              </p>
            </>
          )}
        </div>

        {/* Footer */}
        <p className="text-[10px] text-gray-600 mt-8 font-mono tracking-widest">
          AEGIS SECURITY SYSTEMS &bull; SECTOR-07
        </p>
      </div>
    </div>
  );
}

export default function EmergencyLockdownPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#060810]">
          <div
            className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin"
            style={{ borderColor: "#C3F400", borderTopColor: "transparent" }}
          />
        </div>
      }
    >
      <EmergencyLockdownContent />
    </Suspense>
  );
}
