"use client";
import { useState, useEffect } from "react";

export default function FacilitySchematic({ attackPaths }: { attackPaths: any[] }) {
  const [deviceFloors, setDeviceFloors] = useState<Record<string, number>>({});

  useEffect(() => {
    fetch("/api/graph")
      .then(r => r.json())
      .then(data => {
        const mapping: Record<string, number> = {};
        if (data.nodes) {
          data.nodes.forEach((n: any) => {
            if (n.floor !== undefined) mapping[n.id] = n.floor;
          });
        }
        setDeviceFloors(mapping);
      })
      .catch(console.error);
  }, []);

  const activeFloors = new Set<number>();
  if (attackPaths && attackPaths.length > 0) {
    attackPaths.forEach((path: any) => {
      if (path.chain) {
        path.chain.forEach((dev: string) => {
          if (deviceFloors[dev] !== undefined) {
            activeFloors.add(deviceFloors[dev]);
          }
        });
      }
    });
  }

  // The original floors are Level 1, 2, 3.
  const isL3Active = activeFloors.has(3);
  const isL2Active = activeFloors.has(2);
  const isL1Active = activeFloors.has(1);

  return (
    <div className="col-span-12 md:col-span-8 glass-panel rounded-lg p-container-padding flex flex-col relative overflow-hidden">
      <h3 className="font-label-caps text-label-caps text-on-surface-variant tracking-widest mb-4">FACILITY SCHEMATIC - WIREFRAME</h3>
      <div className="flex-1 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHBhdGggZD0iTTAgMGg0MHY0MEgwem0yMCAyMGgyMHYyMEgyMHoiIGZpbGw9IiMxOTFiMjMiIGZpbGwtb3BhY2l0eT0iMC4yIi8+PC9zdmc+')] border border-outline-variant rounded flex flex-col justify-around p-4 relative">
        {/* Level 03 */}
        <div className={`flex items-center gap-4 border p-3 rounded transition-colors duration-500 ${isL3Active ? 'border-[rgba(255,180,171,0.2)] bg-[rgba(147,0,10,0.1)] shadow-[0_0_15px_rgba(255,180,171,0.1)]' : 'border-[rgba(255,255,255,0.05)] bg-[rgba(10,12,16,0.5)]'}`}>
          <div className="w-32">
            <span className={`font-data-code text-data-code block ${isL3Active ? 'text-error' : 'text-on-surface-variant'}`}>LEVEL-03</span>
            <span className={`font-label-caps text-label-caps opacity-70 ${isL3Active ? 'text-error' : 'text-primary-fixed'}`}>EXECUTIVE</span>
          </div>
          <div className={`flex-1 h-px relative ${isL3Active ? 'bg-[rgba(255,180,171,0.3)]' : 'bg-[rgba(255,255,255,0.1)]'}`}>
            <div className="absolute -top-3 left-[20%] flex flex-col items-center">
              <span className={`material-symbols-outlined text-lg ${isL3Active ? 'text-error pulsing-red' : 'text-primary-fixed'}`}>videocam</span>
            </div>
            <div className="absolute -top-3 left-[60%] flex flex-col items-center">
              <span className={`material-symbols-outlined text-lg ${isL3Active ? 'text-error' : 'text-primary-fixed'}`}>lock</span>
            </div>
          </div>
        </div>
        {/* Level 02 */}
        <div className={`flex items-center gap-4 border p-3 rounded transition-colors duration-500 ${isL2Active ? 'border-[rgba(255,180,171,0.2)] bg-[rgba(147,0,10,0.1)] shadow-[0_0_15px_rgba(255,180,171,0.1)]' : 'border-[rgba(255,255,255,0.05)] bg-[rgba(10,12,16,0.5)]'}`}>
          <div className="w-32">
            <span className={`font-data-code text-data-code block ${isL2Active ? 'text-error' : 'text-on-surface-variant'}`}>LEVEL-02</span>
            <span className={`font-label-caps text-label-caps opacity-70 ${isL2Active ? 'text-error' : 'text-[#ffb4a4]'}`}>SERVER FARM</span>
          </div>
          <div className={`flex-1 h-px relative ${isL2Active ? 'bg-[rgba(255,180,171,0.3)]' : 'bg-[rgba(255,255,255,0.1)]'}`}>
            <div className="absolute -top-3 left-[30%] flex flex-col items-center">
              <span className={`material-symbols-outlined text-lg ${isL2Active ? 'text-error pulsing-red' : 'text-[#ffb4a4]'}`}>dns</span>
            </div>
            <div className="absolute -top-3 left-[50%] flex flex-col items-center">
              <span className={`material-symbols-outlined text-lg ${isL2Active ? 'text-error' : 'text-primary-fixed'}`}>videocam</span>
            </div>
            <div className="absolute -top-3 left-[80%] flex flex-col items-center">
              <span className={`material-symbols-outlined text-lg ${isL2Active ? 'text-error' : 'text-[#ffb4a4]'}`}>lock_open</span>
            </div>
          </div>
        </div>
        {/* Level 01 */}
        <div className={`flex items-center gap-4 border p-3 rounded transition-colors duration-500 ${isL1Active ? 'border-[rgba(255,180,171,0.2)] bg-[rgba(147,0,10,0.1)] shadow-[0_0_15px_rgba(255,180,171,0.1)]' : 'border-[rgba(255,255,255,0.05)] bg-[rgba(10,12,16,0.5)]'}`}>
          <div className="w-32">
            <span className={`font-data-code text-data-code block ${isL1Active ? 'text-error' : 'text-on-surface-variant'}`}>LEVEL-01</span>
            <span className={`font-label-caps text-label-caps opacity-70 ${isL1Active ? 'text-error' : 'text-on-surface-variant'}`}>RESEARCH ADJACENT</span>
          </div>
          <div className={`flex-1 h-px relative ${isL1Active ? 'bg-[rgba(255,180,171,0.3)]' : 'bg-[rgba(255,255,255,0.1)]'}`}>
            <div className="absolute -top-3 left-[15%] flex flex-col items-center">
              <span className={`material-symbols-outlined text-lg ${isL1Active ? 'text-error pulsing-red' : 'text-on-surface-variant'}`}>warning</span>
            </div>
            <div className="absolute -top-3 left-[45%] flex flex-col items-center">
              <span className={`material-symbols-outlined text-lg ${isL1Active ? 'text-error' : 'text-on-surface-variant'}`}>lock_open</span>
            </div>
            <div className="absolute -top-3 left-[75%] flex flex-col items-center">
              <span className={`material-symbols-outlined text-lg ${isL1Active ? 'text-error' : 'text-on-surface-variant'}`}>videocam_off</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
