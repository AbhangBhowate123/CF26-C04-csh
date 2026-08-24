export default function ThreatAssessment({ attackPaths }: { attackPaths: any[] }) {
  const primaryPath = attackPaths && attackPaths.length > 0 ? attackPaths[0] : null;
  const score = primaryPath ? (primaryPath.score.total_score * 10).toFixed(1) : "0.0";
  const isCritical = primaryPath && primaryPath.score.total_score > 0.7;

  // Extract unique event types for vectors from ALL paths
  let allEventTypes = new Set<string>();
  if (attackPaths) {
    attackPaths.forEach((path: any) => {
      path.events.forEach((e: any) => allEventTypes.add(e.event_type));
    });
  }
  const uniqueEventTypes = Array.from(allEventTypes);

  const formatEventName = (str: string) => {
    return (str as string).split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  return (
    <div className={`col-span-12 md:col-span-4 glass-panel rounded-lg p-container-padding flex flex-col relative overflow-y-auto h-full ${isCritical ? 'active-glow' : 'border-outline-variant'}`}>
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <span className={`material-symbols-outlined text-9xl ${isCritical ? 'text-error' : 'text-primary-fixed'}`}>warning</span>
      </div>
      <h3 className="font-label-caps text-label-caps text-on-surface-variant tracking-widest mb-4">THREAT ASSESSMENT</h3>
      <div className="flex-1 flex flex-col justify-center items-center">
        <div className={`${isCritical ? 'text-error pulsing-red' : 'text-primary-fixed'} font-data-code text-5xl font-bold mb-2`}>
          {score}<span className="text-2xl text-on-surface-variant">/10</span>
        </div>
        {isCritical ? (
          <div className="bg-[rgba(255,180,171,0.1)] text-error border border-error px-4 py-1 rounded font-label-caps text-label-caps uppercase tracking-widest animate-pulse">
            CRITICAL
          </div>
        ) : (
          <div className="bg-[rgba(195,244,0,0.1)] text-primary-fixed border border-primary-fixed px-4 py-1 rounded font-label-caps text-label-caps uppercase tracking-widest">
            MONITORING
          </div>
        )}
      </div>
      <div className="mt-auto relative z-10">
        <h4 className="font-label-caps text-label-caps text-on-surface-variant mb-2 border-b border-outline-variant pb-1">ANALYSIS VECTORS</h4>
        <ul className="font-data-code text-data-code text-on-surface flex flex-col gap-2">
          {uniqueEventTypes.length > 0 ? (
            uniqueEventTypes.map((type: any, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className={`material-symbols-outlined text-sm mt-0.5 ${isCritical ? 'text-error' : 'text-primary-fixed'}`}>chevron_right</span>
                {formatEventName(type as string)}
              </li>
            ))
          ) : (
            <li className="flex items-start gap-2 text-on-surface-variant">
              No active vectors detected.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
