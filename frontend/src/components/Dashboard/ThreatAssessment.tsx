import { useState } from "react";

export default function ThreatAssessment({ activePath }: { activePath: any }) {
  const [expandedVector, setExpandedVector] = useState<string | null>(null);

  const primaryPath = activePath;
  const score = primaryPath ? (primaryPath.score.total_score * 10).toFixed(1) : "0.0";
  const isCritical = primaryPath && primaryPath.score.total_score > 0.7;

  // Extract unique event types and keep the first event as an example for descriptions
  const eventExamples = new Map<string, any>();
  if (activePath && activePath.events) {
    activePath.events.forEach((e: any) => {
      if (!eventExamples.has(e.event_type)) {
        eventExamples.set(e.event_type, e);
      }
    });
  }
  const uniqueEventTypes = Array.from(eventExamples.keys());

  const formatEventName = (str: string) => {
    return (str as string).split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const generateDescription = (eventType: string, event: any) => {
    if (!event) return "No details available.";
    const time = new Date(event.timestamp).toLocaleTimeString();
    switch(eventType) {
      case 'lateral_movement':
        return `${event.device_id} (Floor ${event.floor}) connected across a shared network segment to ${event.target_device_id || 'another device'} at ${time} — this crosses a VLAN boundary that should normally be isolated.`;
      case 'suspicious_auth_attempt':
        return `${event.device_id} recorded ${event.attempts || 'multiple'} failed login attempts followed by a successful login at ${time} — a pattern consistent with credential brute-forcing.`;
      case 'privilege_escalation':
        return `${event.device_id} access level escalated to ${event.escalated_to || 'admin'} at ${time}, shortly after the suspicious auth attempt.`;
      case 'anomalous_outbound_connection':
        return `${event.device_id} initiated ${event.note || 'unexpected outbound connection volume'} at ${time}.`;
      default:
        return `${event.device_id} (Floor ${event.floor}) recorded routine background telemetry at ${time} — not a threat indicator.`;
    }
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
      <div className="mt-auto relative z-10 w-full">
        {primaryPath && primaryPath.users && primaryPath.users.length > 0 && (
          <div className="mb-4">
            <h4 className="font-label-caps text-label-caps text-on-surface-variant mb-2 border-b border-outline-variant pb-1">INVOLVED OPERATORS</h4>
            <div className="flex flex-wrap gap-2">
              {primaryPath.users.map((user: string, idx: number) => (
                <span key={idx} className="bg-[rgba(255,255,255,0.05)] text-primary-fixed px-2 py-1 rounded text-xs font-data-code border border-outline-variant flex items-center">
                  <span className="material-symbols-outlined text-[12px] mr-1">person</span>
                  {user}
                </span>
              ))}
            </div>
          </div>
        )}

        <h4 className="font-label-caps text-label-caps text-on-surface-variant mb-2 border-b border-outline-variant pb-1">ANALYSIS VECTORS</h4>
        <ul className="font-data-code text-data-code text-on-surface flex flex-col gap-2 w-full">
          {uniqueEventTypes.length > 0 ? (
            uniqueEventTypes.map((type: string, i) => {
              const isExpanded = expandedVector === type;
              const eventData = eventExamples.get(type);
              return (
                <li key={i} className="flex flex-col">
                  <div 
                    className="flex items-center gap-2 cursor-pointer hover:text-primary-fixed transition-colors py-1"
                    onClick={() => setExpandedVector(isExpanded ? null : type)}
                  >
                    <span className={`material-symbols-outlined text-sm transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''} ${isCritical ? 'text-error' : 'text-primary-fixed'}`}>chevron_right</span>
                    {formatEventName(type)}
                  </div>
                  {isExpanded && (
                    <div className="ml-6 mt-1 mb-2 p-2 bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.05)] rounded text-xs font-sans text-on-surface-variant leading-relaxed">
                      {generateDescription(type, eventData)}
                    </div>
                  )}
                </li>
              );
            })
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
