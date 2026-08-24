export default function AttackPathGraph({ attackPaths }: { attackPaths: any[] }) {
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
      if (attackPaths) {
        attackPaths.forEach(path => {
          if (path.chain[path.chain.length - 1] === node) {
            isTarget = true;
          }
        });
      }
      nodeCoords.set(node, { x, y, isTarget });
    });
  });

  const parsedEdges = Array.from(edges).map(e => {
    const [source, target] = e.split('|');
    return { source, target };
  });

  return (
    <div className="col-span-12 md:col-span-8 glass-panel rounded-lg p-container-padding flex flex-col relative overflow-y-auto h-full">
      <div className="flex justify-between items-center mb-4 shrink-0">
        <h3 className="font-label-caps text-label-caps text-on-surface-variant tracking-widest">ATTACK PATH RECONSTRUCTION</h3>
        <span className="font-data-numeric text-data-numeric text-primary-fixed bg-[rgba(195,244,0,0.1)] px-2 py-0.5 rounded">
          {attackPaths && attackPaths.length > 0 ? "LIVE TRACKING" : "STANDBY"}
        </span>
      </div>
      <div className="flex-1 min-h-[300px] relative border border-outline-variant rounded bg-[#0A0C10] overflow-auto flex items-center justify-center p-8">
        <svg className="w-full h-full min-w-[600px]" preserveAspectRatio="xMidYMid meet" viewBox="0 0 800 400">
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
                const { x, y, isTarget } = coords;
                return (
                  <g key={`node-${i}`}>
                    <circle 
                      cx={x} 
                      cy={y} 
                      fill="#1d1f28" 
                      r={isTarget ? "32" : "24"} 
                      stroke={isTarget ? "#ffb4ab" : "#8e9379"} 
                      strokeWidth={isTarget ? "3" : "2"}
                      className={isTarget ? "pulsing-red" : ""}
                    />
                    <text fill={isTarget ? "#ffb4ab" : "#e1e1ed"} fontFamily="JetBrains Mono" fontSize={isTarget ? "14" : "12"} fontWeight={isTarget ? "bold" : "normal"} textAnchor="middle" x={x} y={isTarget ? (y + 55) : (y + 40)}>
                      {device}
                    </text>
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
      </div>
    </div>
  );
}
