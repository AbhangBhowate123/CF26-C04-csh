export default function SystemTerminal({ attackPaths, searchQuery = "" }: { attackPaths: any[], searchQuery?: string }) {
  const formatTime = (ts: string) => {
    try {
      const date = new Date(ts);
      return date.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return ts;
    }
  };

  const getEventStyle = (eventType: string) => {
    if (eventType === 'privilege_escalation' || eventType === 'lateral_movement') {
      return "text-error font-bold bg-[rgba(147,0,10,0.2)] p-1 rounded pulsing-red";
    }
    if (eventType === 'suspicious_auth_attempt' || eventType === 'anomalous_outbound_connection') {
      return "text-error font-bold";
    }
    if (eventType === 'login' || eventType === 'badge_swipe') {
      return "text-[#ffb4a4]";
    }
    return "text-primary-fixed opacity-70";
  };

  const formatEventName = (str: string) => {
    return str.split('_').map(w => w.toUpperCase()).join(' ');
  };

  let events: any[] = [];
  if (attackPaths) {
    attackPaths.forEach((path: any) => {
      events = events.concat(path.events);
    });
  }
  // Deduplicate
  const uniqueEventsMap = new Map();
  events.forEach(e => {
    uniqueEventsMap.set(e.event_id, e);
  });
  events = Array.from(uniqueEventsMap.values());
  // Sort
  events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    events = events.filter((ev: any) => 
      ev.event_type.toLowerCase().includes(q) || 
      ev.device_id.toLowerCase().includes(q)
    );
  }

  return (
    <div className="col-span-12 md:col-span-4 glass-panel rounded-lg p-0 flex flex-col overflow-hidden">
      <div className="p-4 border-b border-outline-variant bg-[#0c0e16] flex justify-between items-center">
        <h3 className="font-label-caps text-label-caps text-on-surface-variant tracking-widest">SYSTEM TERMINAL</h3>
        <span className="flex items-center gap-1 font-data-numeric text-data-numeric text-on-surface-variant">
          <span className="w-2 h-2 rounded-full bg-primary-fixed"></span> LIVE UTC
        </span>
      </div>
      <div className="flex-1 p-4 font-data-code text-data-code terminal-scroll overflow-y-auto bg-[#0A0C10]">
        {events.length > 0 ? (
          events.map((ev: any, i: number) => {
            const isCritical = ev.event_type === 'privilege_escalation' || ev.event_type === 'lateral_movement';
            return (
              <div key={i} className={`mb-2 flex gap-4 ${getEventStyle(ev.event_type)}`}>
                <span className="shrink-0 w-20">{formatTime(ev.timestamp)}</span>
                <span>[{isCritical ? 'CRIT' : 'INFO'}] {formatEventName(ev.event_type)} on {ev.device_id}</span>
              </div>
            );
          })
        ) : (
          <div className="mb-2 text-primary-fixed opacity-70 flex gap-4">
            <span className="shrink-0 w-20">--:--:--</span>
            <span>[SYS] Awaiting telemetry stream...</span>
          </div>
        )}
        {/* Terminal Cursor */}
        <div className="w-2 h-4 bg-primary-fixed animate-pulse mt-2"></div>
      </div>
    </div>
  );
}
