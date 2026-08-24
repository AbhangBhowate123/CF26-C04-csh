import { useState, useEffect } from "react";

export default function AttackPathGraph({ activePath, isLockdownActive = false }: { activePath: any, isLockdownActive?: boolean }) {
  const [scale, setScale] = useState(1);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [hoveredDevice, setHoveredDevice] = useState<string | null>(null);
  const [deviceDetails, setDeviceDetails] = useState<any>(null);
  const [graphData, setGraphData] = useState<{ nodes: any[], edges: any[] } | null>(null);

  // Re-fetch graph when attackPaths change (e.g., on simulation)
  useEffect(() => {
    fetch('/api/graph')
      .then(res => res.json())
      .then(data => setGraphData(data))
      .catch(console.error);
  }, []);

  const activeDevice = selectedDevice || hoveredDevice;

  useEffect(() => {
    if (activeDevice) {
      fetch(`/api/device/${activeDevice}`)
        .then(res => res.json())
        .then(data => setDeviceDetails(data))
        .catch(console.error);
    } else {
      setDeviceDetails(null);
    }
  }, [activeDevice]);

  // The activePath is already passed as the single source of truth
  const bestPath = activePath;

  // Compute Attack Path Overlays
  const compromisedNodes = new Set<string>();
  const entryNodes = new Set<string>();
  const targetNodes = new Set<string>();
  
  // Map of "source|target" -> sequence step number (1-based)
  const attackEdges = new Map<string, number>();

  if (bestPath) {
    bestPath.chain.forEach((node: string, i: number) => {
      compromisedNodes.add(node);
      if (i === 0) entryNodes.add(node);
      if (i === bestPath.chain.length - 1) targetNodes.add(node);
      
      if (i < bestPath.chain.length - 1) {
        const edgeKey = `${node}|${bestPath.chain[i+1]}`;
        if (!attackEdges.has(edgeKey)) {
          attackEdges.set(edgeKey, i + 1); // step number
        }
      }
    });
  }

  // Layout Configuration
  const SVG_WIDTH = 1000;
  const SVG_HEIGHT = 800;
  const PADDING_X = 140;
  
  const floorYPositions: Record<number, number> = {
    5: 120,
    4: 260,
    3: 400,
    2: 540,
    1: 680,
  };

  const nodeCoords = new Map<string, {x: number, y: number, floor: number, type: string}>();

  if (graphData && graphData.nodes) {
    // Group nodes by floor
    const nodesByFloor = new Map<number, any[]>();
    graphData.nodes.forEach(node => {
      const floor = node.floor || 1;
      if (!nodesByFloor.has(floor)) nodesByFloor.set(floor, []);
      nodesByFloor.get(floor)!.push(node);
    });

    // Assign coordinates
    nodesByFloor.forEach((nodes, floor) => {
      const y = floorYPositions[floor] || 400;
      const count = nodes.length;
      
      // Sort nodes deterministically (e.g., by ID) for stable layout
      nodes.sort((a, b) => a.id.localeCompare(b.id));

      nodes.forEach((node, i) => {
        let x = SVG_WIDTH / 2; // Default for single node
        if (count > 1) {
          const availableWidth = SVG_WIDTH - 2 * PADDING_X;
          x = PADDING_X + (i * (availableWidth / (count - 1)));
        }
        nodeCoords.set(node.id, { x, y, floor, type: node.device_type });
      });
    });
  }

  // Helper to safely format labels
  const formatType = (type: string) => type?.toUpperCase().replace(/_/g, ' ') || 'UNKNOWN';

  return (
    <div className={`col-span-12 md:col-span-8 glass-panel rounded-lg p-container-padding flex flex-col relative overflow-hidden transition-all duration-300 ${isExpanded ? 'fixed inset-4 z-50 bg-[#0A0C10] shadow-2xl border border-outline' : 'h-full'}`}>
      <div className="flex justify-between items-center mb-4 shrink-0">
        <div className="flex items-center gap-4">
          <h3 className="font-label-caps text-label-caps text-on-surface-variant tracking-widest">BUILDING NETWORK TOPOLOGY</h3>
          <div className="flex gap-1">
            <button onClick={() => setScale(s => s + 0.1)} className="px-2 py-0.5 bg-surface border border-outline-variant rounded text-on-surface-variant hover:bg-surface-variant hover:text-on-surface transition-colors" title="Zoom In">+</button>
            <button onClick={() => setScale(s => Math.max(0.1, s - 0.1))} className="px-2 py-0.5 bg-surface border border-outline-variant rounded text-on-surface-variant hover:bg-surface-variant hover:text-on-surface transition-colors" title="Zoom Out">-</button>
            <button onClick={() => setScale(1)} className="px-2 py-0.5 bg-surface border border-outline-variant rounded text-on-surface-variant hover:bg-surface-variant hover:text-on-surface transition-colors text-xs" title="Reset Zoom">Reset</button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-data-numeric text-data-numeric text-primary-fixed bg-[rgba(195,244,0,0.1)] px-2 py-0.5 rounded">
            {activePath ? "ATTACK DETECTED" : "SYSTEM SECURE"}
          </span>
          <button onClick={() => setIsExpanded(!isExpanded)} className="px-2 py-0.5 bg-surface border border-outline-variant rounded text-on-surface-variant hover:bg-surface-variant hover:text-on-surface transition-colors text-xs">
            {isExpanded ? 'Collapse' : 'Expand'}
          </button>
        </div>
      </div>
      
      <div className={`flex-1 min-h-[400px] relative border border-outline-variant rounded bg-[#0A0C10] overflow-hidden flex items-center justify-center p-4 transition-colors duration-500 ${isLockdownActive ? 'after:content-[""] after:absolute after:inset-0 after:bg-[rgba(147,0,10,0.15)] after:pointer-events-none' : ''}`}>
        
        {/* SVG Container */}
        <div className="w-full h-full overflow-auto flex items-center justify-center custom-scrollbar">
          <svg 
            style={{ transform: `scale(${scale})`, transition: 'transform 0.2s ease-out', transformOrigin: 'center' }}
            className="w-full h-full min-w-[800px] min-h-[600px] cursor-grab active:cursor-grabbing" 
            preserveAspectRatio="xMidYMid meet" 
            viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          >
            <defs>
              <pattern height="40" id="grid" patternUnits="userSpaceOnUse" width="40">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1"></path>
              </pattern>
              
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="32" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#ffb4ab" />
              </marker>
            </defs>
            
            <rect fill="url(#grid)" height="100%" width="100%"></rect>

            {/* Floor Labels */}
            {Object.entries(floorYPositions).map(([floor, y]) => (
              <text key={`floor-label-${floor}`} fill="rgba(255,255,255,0.1)" fontFamily="JetBrains Mono" fontSize="80" fontWeight="bold" textAnchor="middle" x="40" y={y + 30} className="pointer-events-none">
                F{floor}
              </text>
            ))}

            {graphData && (
              <>
                {/* Draw Attack Path Edges with Arrows */}
                {Array.from(attackEdges.entries()).map(([edgeKey, stepNum], i) => {
                  const [source, target] = edgeKey.split('|');
                  const p1 = nodeCoords.get(source);
                  const p2 = nodeCoords.get(target);
                  if (!p1 || !p2) return null;

                  // Midpoint for step number label
                  const midX = (p1.x + p2.x) / 2;
                  const midY = (p1.y + p2.y) / 2;

                  return (
                    <g key={`attack-edge-${i}`}>
                      <path 
                        d={`M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`} 
                        fill="none" 
                        stroke="#ffb4ab" 
                        strokeWidth="3"
                        className={isLockdownActive ? "" : "pulsing-red"}
                        markerEnd="url(#arrowhead)"
                      />
                      {/* Step Number Badge */}
                      <circle cx={midX} cy={midY - 10} r="10" fill="#2d1514" stroke="#ffb4ab" strokeWidth="1" />
                      <text fill="#ffb4ab" fontFamily="JetBrains Mono" fontSize="10" fontWeight="bold" textAnchor="middle" x={midX} y={midY - 6.5}>
                        {stepNum}
                      </text>
                    </g>
                  );
                })}
                
                {/* Draw All Nodes */}
                {Array.from(nodeCoords.entries()).map(([deviceId, coords], i) => {
                  const { x, y, type } = coords;
                  const isCompromised = compromisedNodes.has(deviceId);
                  const isTarget = targetNodes.has(deviceId);
                  const isEntry = entryNodes.has(deviceId);
                  
                  let nodeRadius = "24";
                  let strokeColor = "#8e9379"; // default dim border
                  let fillColor = "#1d1f28";   // default dim fill
                  let strokeWidth = "2";
                  let nodeClass = "group-hover:stroke-primary-fixed transition-colors";
                  let textColor = "#e1e1ed";
                  let typeColor = "#8e9379";
                  
                  if (isLockdownActive) {
                    strokeColor = "#ffb400"; // Amber for locked down
                    nodeClass = "group-hover:fill-[#ffb400] group-hover:fill-opacity-20 transition-colors";
                    if (isCompromised) {
                      nodeRadius = isTarget ? "32" : "28";
                      strokeWidth = "3";
                      textColor = "#ffb4ab";
                      typeColor = "#ffb4ab";
                    }
                  } else if (isCompromised) {
                    nodeRadius = isTarget ? "32" : "28";
                    strokeColor = "#ffb4ab";
                    strokeWidth = "3";
                    nodeClass = "pulsing-red group-hover:stroke-primary-fixed transition-colors";
                    textColor = "#ffb4ab";
                    typeColor = "#ffb4ab";
                  } else {
                    // Safe / Online nodes
                    strokeColor = "#c3f400"; // Green
                    nodeClass = "group-hover:fill-[#c3f400] group-hover:fill-opacity-20 transition-colors"; 
                  }

                  const idLabelY = y + 45;
                  const typeLabelY = y + 60;
                  const roleLabelY = y - 35;

                  return (
                    <g key={`node-${i}`} 
                       onClick={() => setSelectedDevice(selectedDevice === deviceId ? null : deviceId)} 
                       onMouseEnter={() => setHoveredDevice(deviceId)}
                       onMouseLeave={() => setHoveredDevice(null)}
                       className="cursor-pointer group">
                      
                      <circle 
                        cx={x} 
                        cy={y} 
                        fill={fillColor} 
                        r={nodeRadius} 
                        stroke={strokeColor} 
                        strokeWidth={strokeWidth}
                        className={nodeClass}
                      />
                      
                      {/* Role Labels for Attack Paths */}
                      {isTarget && (
                        <text fill="#ffb4ab" fontFamily="JetBrains Mono" fontSize="11" fontWeight="bold" textAnchor="middle" x={x} y={y - 45} className="tracking-widest filter drop-shadow">
                          TARGET
                        </text>
                      )}
                      {isEntry && !isTarget && (
                        <text fill="#ffb4ab" fontFamily="JetBrains Mono" fontSize="11" fontWeight="bold" textAnchor="middle" x={x} y={roleLabelY} className="tracking-widest">
                          ENTRY
                        </text>
                      )}

                      {/* Device ID */}
                      <text fill={textColor} fontFamily="JetBrains Mono" fontSize={isCompromised ? "14" : "12"} fontWeight={isCompromised ? "bold" : "normal"} textAnchor="middle" x={x} y={idLabelY}>
                        {deviceId}
                      </text>
                      
                      {/* Device Type */}
                      <text fill={typeColor} fontFamily="JetBrains Mono" fontSize="9" textAnchor="middle" x={x} y={typeLabelY}>
                        {formatType(type)}
                      </text>
                    </g>
                  );
                })}
              </>
            )}
          </svg>
        </div>

        {/* Side Panel for Device Info */}
        <div className={`absolute top-0 right-0 h-full w-80 bg-surface-container-high border-l border-outline-variant transform transition-transform duration-300 z-20 ${activeDevice ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="p-6 relative h-full overflow-y-auto">
            <button 
              onClick={() => { setSelectedDevice(null); setHoveredDevice(null); }}
              className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface text-xl cursor-pointer"
            >×</button>
            
            <h4 className="font-label-caps text-label-caps tracking-widest text-on-surface-variant mb-6 border-b border-outline-variant pb-2">DEVICE INFO</h4>
            
            {activeDevice ? (
              <div className="flex flex-col gap-4">
                <div>
                  <div className="text-xs text-on-surface-variant mb-1 uppercase">Device ID</div>
                  <div className="font-data-code text-on-surface text-lg">{activeDevice}</div>
                </div>
                
                {deviceDetails ? (
                  <>
                    <div>
                      <div className="text-xs text-on-surface-variant mb-1 uppercase">Type</div>
                      <div className="text-on-surface capitalize bg-surface-variant px-2 py-1 rounded inline-block text-sm">{deviceDetails.device?.type || 'Unknown'}</div>
                    </div>
                    
                    <div>
                      <div className="text-xs text-on-surface-variant mb-1 uppercase">Location</div>
                      <div className="text-on-surface flex items-center gap-2">
                        <span className="text-on-surface-variant border border-outline-variant rounded px-1.5 py-0.5 text-xs">Floor {deviceDetails.device?.floor}</span>
                        <span className="text-on-surface-variant border border-outline-variant rounded px-1.5 py-0.5 text-xs">{deviceDetails.device?.network_segment}</span>
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-xs text-on-surface-variant mb-1 uppercase">Last Access</div>
                      <div className="font-data-numeric text-primary-fixed bg-[rgba(195,244,0,0.1)] px-2 py-1 rounded inline-block text-sm">
                        {deviceDetails.events?.length > 0 
                          ? new Date(deviceDetails.events[deviceDetails.events.length - 1].timestamp).toLocaleString() 
                          : 'NO EVENTS'}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-xs text-on-surface-variant mb-1 uppercase">Status</div>
                      <div className="flex items-center gap-2 mt-1">
                        {(() => {
                          const isInActivePath = compromisedNodes.has(activeDevice);
                          return (
                            <div className={`px-2 py-1 rounded flex items-center gap-2 ${
                              isLockdownActive 
                                ? 'bg-[rgba(255,180,0,0.15)] text-[#ffb400] border border-[#ffb400]' 
                                : (isInActivePath ? 'bg-error-container text-on-error-container' : 'bg-primary-container text-on-primary-container')
                            }`}>
                              <div className={`w-2 h-2 rounded-full ${
                                isLockdownActive 
                                  ? 'bg-[#ffb400]' 
                                  : (isInActivePath ? 'bg-error pulsing-red' : 'bg-primary-fixed')
                              }`}></div>
                              <span className="text-xs font-bold tracking-wider">
                                {isLockdownActive ? 'LOCKED DOWN' : (isInActivePath ? 'COMPROMISED' : 'ONLINE')}
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-on-surface-variant text-sm mt-4 animate-pulse">Establishing connection...</div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
