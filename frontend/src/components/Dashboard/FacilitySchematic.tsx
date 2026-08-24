"use client";
import { useState, useEffect, useRef, useMemo } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function FacilitySchematic({ activePath, isLockdownActive = false }: { activePath: any, isLockdownActive?: boolean }) {
  const [deviceFloors, setDeviceFloors] = useState<Record<string, number>>({});
  const [deviceTypes, setDeviceTypes] = useState<Record<string, string>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const [pathLines, setPathLines] = useState<any[]>([]);

  useEffect(() => {
    fetch(`${API_BASE}/api/graph`)
      .then(r => r.json())
      .then(data => {
        const floorMap: Record<string, number> = {};
        const typeMap: Record<string, string> = {};
        if (data.nodes) {
          data.nodes.forEach((n: any) => {
            if (n.floor !== undefined) floorMap[n.id] = n.floor;
            if (n.device_type) typeMap[n.id] = n.device_type;
          });
        }
        setDeviceFloors(floorMap);
        setDeviceTypes(typeMap);
      })
      .catch(console.error);
  }, []);

  const activePathChain = useMemo(() => {
    return activePath ? activePath.chain : [];
  }, [activePath]);

  const activeFloors = useMemo(() => {
    const floors = new Set<number>();
    if (activePath && activePath.chain) {
      activePath.chain.forEach((dev: string) => {
        if (deviceFloors[dev] !== undefined) {
          floors.add(deviceFloors[dev]);
        }
      });
    }
    return floors;
  }, [activePath, deviceFloors]);

  const getIconIdForDevice = (deviceId: string) => {
    const floor = deviceFloors[deviceId];
    const type = deviceTypes[deviceId];
    if (!floor || !type) return null;

    if (floor === 5) {
      if (type === 'camera') return 'icon-L5-camera';
      if (type === 'badge_reader') return 'icon-L5-lock';
      if (type === 'workstation' || type === 'iot_sensor') return 'icon-L5-sensor';
      return 'icon-L5-sensor';
    }
    if (floor === 4) {
      if (type === 'camera') return 'icon-L4-camera';
      if (type === 'badge_reader') return 'icon-L4-lock';
      if (type === 'workstation' || type === 'iot_sensor') return 'icon-L4-sensor';
      return 'icon-L4-sensor';
    }
    if (floor === 3) {
      if (type === 'camera') return 'icon-L3-camera';
      if (type === 'badge_reader') return 'icon-L3-lock';
      return 'icon-L3-lock'; 
    }
    if (floor === 2) {
      if (type === 'server') return 'icon-L2-server';
      if (type === 'camera') return 'icon-L2-camera';
      if (type === 'badge_reader') return 'icon-L2-lock';
      return 'icon-L2-server';
    }
    if (floor === 1) {
      if (type === 'camera') return 'icon-L1-camera';
      if (type === 'badge_reader') return 'icon-L1-lock';
      return 'icon-L1-warning'; 
    }
    return null;
  };

  useEffect(() => {
    const updateLines = () => {
      if (!containerRef.current || activePathChain.length < 2) {
        setPathLines(prev => prev.length === 0 ? prev : []);
        return;
      }
      
      const containerRect = containerRef.current.getBoundingClientRect();
      const lines: any[] = [];
      let previousValidId = null;
      let previousValidIndex = -1;

      for (let i = 0; i < activePathChain.length; i++) {
        const currentId = getIconIdForDevice(activePathChain[i]);
        if (currentId) {
          if (previousValidId && previousValidId !== currentId) {
            const el1 = document.getElementById(currentId);
            const el2 = document.getElementById(previousValidId);
            // Reverse so line goes from prev to current
            const prevEl = document.getElementById(previousValidId);
            const currEl = document.getElementById(currentId);
            
            if (prevEl && currEl) {
              const rect1 = prevEl.getBoundingClientRect();
              const rect2 = currEl.getBoundingClientRect();
              
              lines.push({
                x1: rect1.left + rect1.width / 2 - containerRect.left,
                y1: rect1.top + rect1.height / 2 - containerRect.top,
                x2: rect2.left + rect2.width / 2 - containerRect.left,
                y2: rect2.top + rect2.height / 2 - containerRect.top,
                startStep: previousValidIndex + 1,
                endStep: i + 1,
                isLast: false
              });
            }
          }
          previousValidId = currentId;
          previousValidIndex = i;
        }
      }
      
      if (lines.length > 0) {
        lines[lines.length - 1].isLast = true;
      }
      setPathLines(lines);
    };

    updateLines();
    window.addEventListener('resize', updateLines);
    const timeout = setTimeout(updateLines, 300);
    return () => {
      window.removeEventListener('resize', updateLines);
      clearTimeout(timeout);
    };
  }, [activePathChain, deviceFloors, deviceTypes]);

  const isL5Active = activeFloors.has(5);
  const isL4Active = activeFloors.has(4);
  const isL3Active = activeFloors.has(3);
  const isL2Active = activeFloors.has(2);
  const isL1Active = activeFloors.has(1);

  return (
    <div className="col-span-12 md:col-span-8 glass-panel rounded-lg p-container-padding flex flex-col relative overflow-hidden">
      <h3 className="font-label-caps text-label-caps text-on-surface-variant tracking-widest mb-4">FACILITY SCHEMATIC - WIREFRAME</h3>
      <div ref={containerRef} className="flex-1 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHBhdGggZD0iTTAgMGg0MHY0MEgwem0yMCAyMGgyMHYyMEgyMHoiIGZpbGw9IiMxOTFiMjMiIGZpbGwtb3BhY2l0eT0iMC4yIi8+PC9zdmc+')] border border-outline-variant rounded flex flex-col justify-around p-4 relative">
        
        {/* Attack Path Overlay */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#ffb4ab" />
            </marker>
          </defs>
          {pathLines.map((line, i) => {
            const dx = line.x2 - line.x1;
            const dy = line.y2 - line.y1;
            const len = Math.sqrt(dx*dx + dy*dy) || 1;
            
            const pX1 = line.x1 + (dx/len) * 15;
            const pY1 = line.y1 + (dy/len) * 15;
            const pX2 = line.x2 - (dx/len) * 20;
            const pY2 = line.y2 - (dy/len) * 20;

            return (
              <g key={i}>
                <line 
                  x1={pX1} 
                  y1={pY1} 
                  x2={pX2} 
                  y2={pY2} 
                  stroke="#ffb4ab" 
                  strokeWidth="2" 
                  strokeDasharray="4 4"
                  markerEnd="url(#arrowhead)"
                  className="pulsing-red"
                />
                
                <circle cx={line.x1 - 15} cy={line.y1 - 15} r="8" fill="#1d1f28" stroke="#ffb4ab" strokeWidth="1.5" />
                <text x={line.x1 - 15} y={line.y1 - 12} fill="#ffb4ab" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="JetBrains Mono">
                  {line.startStep}
                </text>
                
                {line.isLast && (
                  <>
                    <circle cx={line.x2 + 15} cy={line.y2 - 15} r="8" fill="#1d1f28" stroke="#ffb4ab" strokeWidth="1.5" className="pulsing-red" />
                    <text x={line.x2 + 15} y={line.y2 - 12} fill="#ffb4ab" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="JetBrains Mono">
                      {line.endStep}
                    </text>
                  </>
                )}
              </g>
            );
          })}
        </svg>

        {/* Level 05 */}
        <div className={`flex items-center gap-4 border p-3 rounded transition-colors duration-500 ${isL5Active ? 'border-[rgba(255,180,171,0.2)] bg-[rgba(147,0,10,0.1)] shadow-[0_0_15px_rgba(255,180,171,0.1)]' : 'border-[rgba(255,255,255,0.05)] bg-[rgba(10,12,16,0.5)]'}`}>
          <div className="w-32">
            <span className={`font-data-code text-data-code block ${isL5Active ? 'text-error' : 'text-on-surface-variant'}`}>LEVEL-05</span>
            <span className={`font-label-caps text-label-caps opacity-70 ${isL5Active ? 'text-error' : 'text-primary-fixed'}`}>GUEST</span>
          </div>
          <div className={`flex-1 h-px relative ${isL5Active ? 'bg-[rgba(255,180,171,0.3)]' : 'bg-[rgba(255,255,255,0.1)]'}`}>
            <div id="icon-L5-camera" className="absolute -top-3 left-[25%] flex flex-col items-center group cursor-help">
              <span className={`material-symbols-outlined text-lg ${isL5Active ? 'text-error pulsing-red' : 'text-primary-fixed'}`}>videocam</span>
              <div className="absolute bottom-full mb-1 hidden group-hover:block w-max bg-[#1d1f28] border border-outline-variant rounded px-2 py-1.5 z-20 shadow-lg pointer-events-none">
                <div className="font-label-caps text-label-caps text-on-surface">Camera - CCTV feed</div>
                <div className={`font-data-numeric text-[10px] mt-0.5 ${isLockdownActive ? 'text-error' : (isL5Active ? 'text-error' : 'text-primary-fixed')}`}>STATUS: {isLockdownActive ? 'EMERGENCY LOCKDOWN' : (isL5Active ? 'FEED DISRUPTED' : 'FEED ACTIVE')}</div>
              </div>
            </div>
            <div id="icon-L5-lock" className="absolute -top-3 left-[75%] flex flex-col items-center group cursor-help">
              <span className={`material-symbols-outlined text-lg ${isL5Active ? 'text-error' : 'text-primary-fixed'}`}>{isLockdownActive ? 'lock' : 'lock'}</span>
              <div className="absolute bottom-full mb-1 hidden group-hover:block w-max bg-[#1d1f28] border border-outline-variant rounded px-2 py-1.5 z-20 shadow-lg pointer-events-none">
                <div className="font-label-caps text-label-caps text-on-surface">Lock - access control point</div>
                <div className={`font-data-numeric text-[10px] mt-0.5 ${isLockdownActive ? 'text-error' : (isL5Active ? 'text-error' : 'text-primary-fixed')}`}>STATUS: {isLockdownActive ? 'EMERGENCY LOCKDOWN' : (isL5Active ? 'OVERRIDDEN' : 'LOCKED')}</div>
              </div>
            </div>
            <div id="icon-L5-sensor" className="absolute -top-3 left-[50%] flex flex-col items-center group cursor-help">
              <span className={`material-symbols-outlined text-lg ${isL5Active ? 'text-error' : 'text-primary-fixed'}`}>sensors</span>
              <div className="absolute bottom-full mb-1 hidden group-hover:block w-max bg-[#1d1f28] border border-outline-variant rounded px-2 py-1.5 z-20 shadow-lg pointer-events-none">
                <div className="font-label-caps text-label-caps text-on-surface">Sensor - Generic IoT</div>
                <div className={`font-data-numeric text-[10px] mt-0.5 ${isLockdownActive ? 'text-error' : (isL5Active ? 'text-error' : 'text-primary-fixed')}`}>STATUS: {isLockdownActive ? 'EMERGENCY LOCKDOWN' : (isL5Active ? 'COMPROMISED' : 'ONLINE')}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Level 04 */}
        <div className={`flex items-center gap-4 border p-3 rounded transition-colors duration-500 ${isL4Active ? 'border-[rgba(255,180,171,0.2)] bg-[rgba(147,0,10,0.1)] shadow-[0_0_15px_rgba(255,180,171,0.1)]' : 'border-[rgba(255,255,255,0.05)] bg-[rgba(10,12,16,0.5)]'}`}>
          <div className="w-32">
            <span className={`font-data-code text-data-code block ${isL4Active ? 'text-error' : 'text-on-surface-variant'}`}>LEVEL-04</span>
            <span className={`font-label-caps text-label-caps opacity-70 ${isL4Active ? 'text-error' : 'text-primary-fixed'}`}>CORP</span>
          </div>
          <div className={`flex-1 h-px relative ${isL4Active ? 'bg-[rgba(255,180,171,0.3)]' : 'bg-[rgba(255,255,255,0.1)]'}`}>
            <div id="icon-L4-camera" className="absolute -top-3 left-[15%] flex flex-col items-center group cursor-help">
              <span className={`material-symbols-outlined text-lg ${isL4Active ? 'text-error pulsing-red' : 'text-primary-fixed'}`}>videocam</span>
              <div className="absolute bottom-full mb-1 hidden group-hover:block w-max bg-[#1d1f28] border border-outline-variant rounded px-2 py-1.5 z-20 shadow-lg pointer-events-none">
                <div className="font-label-caps text-label-caps text-on-surface">Camera - CCTV feed</div>
                <div className={`font-data-numeric text-[10px] mt-0.5 ${isLockdownActive ? 'text-error' : (isL4Active ? 'text-error' : 'text-primary-fixed')}`}>STATUS: {isLockdownActive ? 'EMERGENCY LOCKDOWN' : (isL4Active ? 'FEED DISRUPTED' : 'FEED ACTIVE')}</div>
              </div>
            </div>
            <div id="icon-L4-sensor" className="absolute -top-3 left-[40%] flex flex-col items-center group cursor-help">
              <span className={`material-symbols-outlined text-lg ${isL4Active ? 'text-error' : 'text-primary-fixed'}`}>computer</span>
              <div className="absolute bottom-full mb-1 hidden group-hover:block w-max bg-[#1d1f28] border border-outline-variant rounded px-2 py-1.5 z-20 shadow-lg pointer-events-none">
                <div className="font-label-caps text-label-caps text-on-surface">Workstation - Corp</div>
                <div className={`font-data-numeric text-[10px] mt-0.5 ${isLockdownActive ? 'text-error' : (isL4Active ? 'text-error' : 'text-primary-fixed')}`}>STATUS: {isLockdownActive ? 'EMERGENCY LOCKDOWN' : (isL4Active ? 'COMPROMISED' : 'ONLINE')}</div>
              </div>
            </div>
            <div id="icon-L4-lock" className="absolute -top-3 left-[65%] flex flex-col items-center group cursor-help">
              <span className={`material-symbols-outlined text-lg ${isL4Active ? 'text-error' : 'text-primary-fixed'}`}>{isLockdownActive ? 'lock' : 'lock'}</span>
              <div className="absolute bottom-full mb-1 hidden group-hover:block w-max bg-[#1d1f28] border border-outline-variant rounded px-2 py-1.5 z-20 shadow-lg pointer-events-none">
                <div className="font-label-caps text-label-caps text-on-surface">Lock - access control point</div>
                <div className={`font-data-numeric text-[10px] mt-0.5 ${isLockdownActive ? 'text-error' : (isL4Active ? 'text-error' : 'text-primary-fixed')}`}>STATUS: {isLockdownActive ? 'EMERGENCY LOCKDOWN' : (isL4Active ? 'OVERRIDDEN' : 'LOCKED')}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Level 03 */}
        <div className={`flex items-center gap-4 border p-3 rounded transition-colors duration-500 ${isL3Active ? 'border-[rgba(255,180,171,0.2)] bg-[rgba(147,0,10,0.1)] shadow-[0_0_15px_rgba(255,180,171,0.1)]' : 'border-[rgba(255,255,255,0.05)] bg-[rgba(10,12,16,0.5)]'}`}>
          <div className="w-32">
            <span className={`font-data-code text-data-code block ${isL3Active ? 'text-error' : 'text-on-surface-variant'}`}>LEVEL-03</span>
            <span className={`font-label-caps text-label-caps opacity-70 ${isL3Active ? 'text-error' : 'text-primary-fixed'}`}>EXECUTIVE</span>
          </div>
          <div className={`flex-1 h-px relative ${isL3Active ? 'bg-[rgba(255,180,171,0.3)]' : 'bg-[rgba(255,255,255,0.1)]'}`}>
            <div id="icon-L3-camera" className="absolute -top-3 left-[20%] flex flex-col items-center group cursor-help">
              <span className={`material-symbols-outlined text-lg ${isL3Active ? 'text-error pulsing-red' : 'text-primary-fixed'}`}>videocam</span>
              <div className="absolute bottom-full mb-1 hidden group-hover:block w-max bg-[#1d1f28] border border-outline-variant rounded px-2 py-1.5 z-20 shadow-lg pointer-events-none">
                <div className="font-label-caps text-label-caps text-on-surface">Camera - CCTV feed</div>
                <div className={`font-data-numeric text-[10px] mt-0.5 ${isL3Active ? 'text-error' : 'text-primary-fixed'}`}>STATUS: {isL3Active ? 'FEED DISRUPTED' : 'FEED ACTIVE'}</div>
              </div>
            </div>
            <div id="icon-L3-lock" className="absolute -top-3 left-[60%] flex flex-col items-center group cursor-help">
              <span className={`material-symbols-outlined text-lg ${isL3Active ? 'text-error' : 'text-primary-fixed'}`}>{isLockdownActive ? 'lock' : 'lock'}</span>
              <div className="absolute bottom-full mb-1 hidden group-hover:block w-max bg-[#1d1f28] border border-outline-variant rounded px-2 py-1.5 z-20 shadow-lg pointer-events-none">
                <div className="font-label-caps text-label-caps text-on-surface">Lock - access control point</div>
                <div className={`font-data-numeric text-[10px] mt-0.5 ${isLockdownActive ? 'text-error' : (isL3Active ? 'text-error' : 'text-primary-fixed')}`}>STATUS: {isLockdownActive ? 'EMERGENCY LOCKDOWN' : (isL3Active ? 'OVERRIDDEN' : 'LOCKED')}</div>
              </div>
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
            <div id="icon-L2-server" className="absolute -top-3 left-[30%] flex flex-col items-center group cursor-help">
              <span className={`material-symbols-outlined text-lg ${isL2Active ? 'text-error pulsing-red' : 'text-[#ffb4a4]'}`}>dns</span>
              <div className="absolute bottom-full mb-1 hidden group-hover:block w-max bg-[#1d1f28] border border-outline-variant rounded px-2 py-1.5 z-20 shadow-lg pointer-events-none">
                <div className="font-label-caps text-label-caps text-on-surface">Server - server rack</div>
                <div className={`font-data-numeric text-[10px] mt-0.5 ${isL2Active ? 'text-error' : 'text-[#ffb4a4]'}`}>STATUS: {isL2Active ? 'COMPROMISED' : 'ONLINE'}</div>
              </div>
            </div>
            <div id="icon-L2-camera" className="absolute -top-3 left-[50%] flex flex-col items-center group cursor-help">
              <span className={`material-symbols-outlined text-lg ${isL2Active ? 'text-error' : 'text-primary-fixed'}`}>videocam</span>
              <div className="absolute bottom-full mb-1 hidden group-hover:block w-max bg-[#1d1f28] border border-outline-variant rounded px-2 py-1.5 z-20 shadow-lg pointer-events-none">
                <div className="font-label-caps text-label-caps text-on-surface">Camera - CCTV feed</div>
                <div className={`font-data-numeric text-[10px] mt-0.5 ${isL2Active ? 'text-error' : 'text-primary-fixed'}`}>STATUS: {isL2Active ? 'FEED DISRUPTED' : 'FEED ACTIVE'}</div>
              </div>
            </div>
            <div id="icon-L2-lock" className="absolute -top-3 left-[80%] flex flex-col items-center group cursor-help">
              <span className={`material-symbols-outlined text-lg ${isL2Active ? 'text-error' : 'text-[#ffb4a4]'}`}>{isLockdownActive ? 'lock' : 'lock_open'}</span>
              <div className="absolute bottom-full mb-1 hidden group-hover:block w-max bg-[#1d1f28] border border-outline-variant rounded px-2 py-1.5 z-20 shadow-lg pointer-events-none">
                <div className="font-label-caps text-label-caps text-on-surface">Lock - access control point</div>
                <div className={`font-data-numeric text-[10px] mt-0.5 ${isLockdownActive ? 'text-error' : (isL2Active ? 'text-error' : 'text-[#ffb4a4]')}`}>STATUS: {isLockdownActive ? 'EMERGENCY LOCKDOWN' : (isL2Active ? 'BREACHED' : 'UNLOCKED')}</div>
              </div>
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
            <div id="icon-L1-warning" className="absolute -top-3 left-[15%] flex flex-col items-center group cursor-help">
              <span className={`material-symbols-outlined text-lg ${isL1Active ? 'text-error pulsing-red' : 'text-on-surface-variant'}`}>warning</span>
              <div className="absolute bottom-full mb-1 hidden group-hover:block w-max bg-[#1d1f28] border border-outline-variant rounded px-2 py-1.5 z-20 shadow-lg pointer-events-none">
                <div className="font-label-caps text-label-caps text-on-surface">Warning - anomaly detected on this level</div>
                <div className={`font-data-numeric text-[10px] mt-0.5 ${isL1Active ? 'text-error' : 'text-on-surface-variant'}`}>STATUS: {isL1Active ? 'ACTIVE ALERT' : 'MONITORING'}</div>
              </div>
            </div>
            <div id="icon-L1-lock" className="absolute -top-3 left-[45%] flex flex-col items-center group cursor-help">
              <span className={`material-symbols-outlined text-lg ${isL1Active ? 'text-error' : 'text-on-surface-variant'}`}>{isLockdownActive ? 'lock' : 'lock_open'}</span>
              <div className="absolute bottom-full mb-1 hidden group-hover:block w-max bg-[#1d1f28] border border-outline-variant rounded px-2 py-1.5 z-20 shadow-lg pointer-events-none">
                <div className="font-label-caps text-label-caps text-on-surface">Lock - access control point</div>
                <div className={`font-data-numeric text-[10px] mt-0.5 ${isLockdownActive ? 'text-error' : (isL1Active ? 'text-error' : 'text-on-surface-variant')}`}>STATUS: {isLockdownActive ? 'EMERGENCY LOCKDOWN' : (isL1Active ? 'BREACHED' : 'UNLOCKED')}</div>
              </div>
            </div>
            <div id="icon-L1-camera" className="absolute -top-3 left-[75%] flex flex-col items-center group cursor-help">
              <span className={`material-symbols-outlined text-lg ${isL1Active ? 'text-error' : 'text-on-surface-variant'}`}>videocam_off</span>
              <div className="absolute bottom-full mb-1 hidden group-hover:block w-max bg-[#1d1f28] border border-outline-variant rounded px-2 py-1.5 z-20 shadow-lg pointer-events-none">
                <div className="font-label-caps text-label-caps text-on-surface">Camera - disabled camera</div>
                <div className={`font-data-numeric text-[10px] mt-0.5 ${isL1Active ? 'text-error' : 'text-on-surface-variant'}`}>STATUS: {isL1Active ? 'FEED DISRUPTED' : 'OFFLINE'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
