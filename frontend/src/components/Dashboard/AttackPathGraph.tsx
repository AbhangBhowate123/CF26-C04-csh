import { useState, useEffect } from "react";

export default function AttackPathGraph({ attackPaths }: { attackPaths: any[] }) {
  const [scale, setScale] = useState(1);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [hoveredDevice, setHoveredDevice] = useState<string | null>(null);
  const [deviceDetails, setDeviceDetails] = useState<any>(null);
  const [graphData, setGraphData] = useState<any>(null);

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

  const nodeLevels = new Map<string, number>();
  const edges = new Set<string>();
  
  if (attackPaths && attackPaths.length > 0) {
    attackPaths.forEach(path => {
      path.chain.forEach((node: string, i: number) => {
        if (!nodeLevels.has(node) || i > nodeLevels.get(node)!) {
          nodeLevels.set(node, i);
        }
        if (i < path.chain.length - 1) {
          edges.add(`${node}|${path.chain[i+1]}`);
        }
      });
    });
  }

  const levelToNodes = new Map<number, string[]>();
  let maxLevel = -1;
  nodeLevels.forEach((level, node) => {
    if (!levelToNodes.has(level)) levelToNodes.set(level, []);
    levelToNodes.get(level)!.push(node);
    if (level > maxLevel) maxLevel = level;
  });

  const nodeCoords = new Map<string, {x: number, y: number, isTarget: boolean}>();
  const paddingX = 150;
  const paddingY = 80;
  const width = 800 - (paddingX * 2);
  
  levelToNodes.forEach((nodes, level) => {
    const x = maxLevel === 0 ? 400 : paddingX + (level * (width / maxLevel));
    nodes.forEach((node, i) => {
      const total = nodes.length;
      const yOffset = (i - (total - 1) / 2) * paddingY;
      const y = 200 + yOffset;
      
      let isTarget = false;
      let isEntry = false;
      if (attackPaths) {
        attackPaths.forEach(path => {
          if (path.chain[path.chain.length - 1] === node) {
            isTarget = true;
          }
          if (path.chain[0] === node) {
            isEntry = true;
          }
        });
      }
      nodeCoords.set(node, { x, y, isTarget, isEntry });
    });
  });

  const parsedEdges = Array.from(edges).map(e => {
    const [source, target] = e.split('|');
    return { source, target };
  });

  return (
    <div className={`col-span-12 md:col-span-8 glass-panel rounded-lg p-container-padding flex flex-col relative overflow-hidden transition-all duration-300 ${isExpanded ? 'fixed inset-4 z-50 bg-[#0A0C10] shadow-2xl border border-outline' : 'h-full'}`}>
      <div className="flex justify-between items-center mb-4 shrink-0">
        <div className="flex items-center gap-4">
          <h3 className="font-label-caps text-label-caps text-on-surface-variant tracking-widest">ATTACK PATH RECONSTRUCTION</h3>
          <div className="flex gap-1">
            <button onClick={() => setScale(s => s + 0.1)} className="px-2 py-0.5 bg-surface border border-outline-variant rounded text-on-surface-variant hover:bg-surface-variant hover:text-on-surface transition-colors" title="Zoom In">+</button>
            <button onClick={() => setScale(s => Math.max(0.1, s - 0.1))} className="px-2 py-0.5 bg-surface border border-outline-variant rounded text-on-surface-variant hover:bg-surface-variant hover:text-on-surface transition-colors" title="Zoom Out">-</button>
            <button onClick={() => setScale(1)} className="px-2 py-0.5 bg-surface border border-outline-variant rounded text-on-surface-variant hover:bg-surface-variant hover:text-on-surface transition-colors text-xs" title="Reset Zoom">Reset</button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-data-numeric text-data-numeric text-primary-fixed bg-[rgba(195,244,0,0.1)] px-2 py-0.5 rounded">
            {attackPaths && attackPaths.length > 0 ? "LIVE TRACKING" : "STANDBY"}
          </span>
          <button onClick={() => setIsExpanded(!isExpanded)} className="px-2 py-0.5 bg-surface border border-outline-variant rounded text-on-surface-variant hover:bg-surface-variant hover:text-on-surface transition-colors text-xs">
            {isExpanded ? 'Collapse' : 'Expand'}
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-[300px] relative border border-outline-variant rounded bg-[#0A0C10] overflow-hidden flex items-center justify-center p-8">
        <svg 
          style={{ transform: `scale(${scale})`, transition: 'transform 0.2s ease-out' }}
          className="w-full h-full min-w-[600px] cursor-grab active:cursor-grabbing" 
          preserveAspectRatio="xMidYMid meet" 
          viewBox="0 0 800 400"
        >
          <pattern height="40" id="grid" patternUnits="userSpaceOnUse" width="40">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1"></path>
          </pattern>
          <rect fill="url(#grid)" height="100%" width="100%"></rect>
          
          {attackPaths && attackPaths.length > 0 ? (
            <>
              {/* Draw Edges first so they are behind nodes */}
              {parsedEdges.map((edge, i) => {
                const p1 = nodeCoords.get(edge.source);
                const p2 = nodeCoords.get(edge.target);
                if (!p1 || !p2) return null;
                return (
                  <path 
                    key={`edge-${i}`} 
                    d={`M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`} 
                    fill="none" 
                    stroke="#ffb4ab" 
                    strokeWidth="3"
                    className="pulsing-red"
                  />
                );
              })}
              
              {/* Draw Nodes */}
              {Array.from(nodeCoords.entries()).map(([device, coords], i) => {
                const { x, y, isTarget, isEntry } = coords;
                
                let nodeRadius = "24";
                let strokeColor = "#8e9379";
                let strokeWidth = "2";
                let nodeClass = "group-hover:stroke-primary-fixed transition-colors";
                let textColor = "#e1e1ed";
                
                if (isTarget) {
                  nodeRadius = "32";
                  strokeColor = "#ffb4ab";
                  strokeWidth = "3";
                  nodeClass = "pulsing-red group-hover:stroke-primary-fixed transition-colors";
                  textColor = "#ffb4ab";
                } else if (isEntry) {
                  nodeRadius = "28";
                  strokeColor = "#c3f400";
                  strokeWidth = "2";
                  nodeClass = "group-hover:stroke-primary-fixed transition-colors";
                  textColor = "#c3f400";
                }

                const idLabelY = isTarget ? y + 55 : (isEntry ? y + 50 : y + 45);
                const typeLabelY = isTarget ? y + 70 : (isEntry ? y + 65 : y + 60);
                const roleLabelY = isTarget ? y - 45 : y - 40;

                return (
                  <g key={`node-${i}`} 
                     onClick={() => setSelectedDevice(selectedDevice === device ? null : device)} 
                     onMouseEnter={() => setHoveredDevice(device)}
                     onMouseLeave={() => setHoveredDevice(null)}
                     className="cursor-pointer group">
                    <circle 
                      cx={x} 
                      cy={y} 
                      fill="#1d1f28" 
                      r={nodeRadius} 
                      stroke={strokeColor} 
                      strokeWidth={strokeWidth}
                      className={nodeClass}
                      strokeDasharray={isEntry && !isTarget ? "6 3" : "none"}
                    />
                    
                    {/* Role Labels */}
                    {isTarget && (
                      <text fill="#ffb4ab" fontFamily="JetBrains Mono" fontSize="11" fontWeight="bold" textAnchor="middle" x={x} y={roleLabelY} className="tracking-widest filter drop-shadow">
                        TARGET
                      </text>
                    )}
                    {isEntry && !isTarget && (
                      <text fill="#c3f400" fontFamily="JetBrains Mono" fontSize="11" fontWeight="bold" textAnchor="middle" x={x} y={roleLabelY} className="tracking-widest">
                        ENTRY POINT
                      </text>
                    )}

                    {/* Device ID */}
                    <text fill={textColor} fontFamily="JetBrains Mono" fontSize={isTarget ? "14" : "12"} fontWeight={isTarget || isEntry ? "bold" : "normal"} textAnchor="middle" x={x} y={idLabelY}>
                      {device}
                    </text>
                    
                    {/* Device Type */}
                    {graphData && (
                      <text fill="#8e9379" fontFamily="JetBrains Mono" fontSize="9" textAnchor="middle" x={x} y={typeLabelY}>
                        {graphData.nodes.find((n: any) => n.id === device)?.device_type?.toUpperCase().replace('_', ' ')}
                      </text>
                    )}
                  </g>
                );
              })}
            </>
          ) : (
            <text fill="#8e9379" fontFamily="JetBrains Mono" fontSize="16" textAnchor="middle" x="400" y="200">
              No active attack paths detected.
            </text>
          )}
        </svg>

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
                          let isInActivePath = false;
                          if (attackPaths) {
                            attackPaths.forEach(path => {
                              if (path.chain.includes(activeDevice)) {
                                isInActivePath = true;
                              }
                            });
                          }
                          return (
                            <div className={`px-2 py-1 rounded flex items-center gap-2 ${isInActivePath ? 'bg-error-container text-on-error-container' : 'bg-primary-container text-on-primary-container'}`}>
                              <div className={`w-2 h-2 rounded-full ${isInActivePath ? 'bg-error pulsing-red' : 'bg-primary-fixed'}`}></div>
                              <span className="text-xs font-bold tracking-wider">
                                {isInActivePath ? 'COMPROMISED' : 'NORMAL'}
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
