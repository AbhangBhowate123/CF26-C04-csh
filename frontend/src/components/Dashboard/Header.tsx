"use client";
import { useState } from "react";

export default function Header({ 
  searchQuery, 
  setSearchQuery,
  onSimulateClick,
  isSimulating,
  isLockdownActive,
  notifications = [],
  isMuted = false,
  setIsMuted
}: { 
  searchQuery?: string, 
  setSearchQuery?: (val: string) => void,
  onSimulateClick?: () => void,
  isSimulating?: boolean,
  isLockdownActive?: boolean,
  notifications?: any[],
  isMuted?: boolean,
  setIsMuted?: (val: boolean) => void
}) {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  
  const toggleDropdown = (name: string) => {
    setActiveDropdown(prev => prev === name ? null : name);
  };

  const unreadCount = notifications.length;

  return (
    <header className="fixed top-0 w-full z-50 flex justify-between items-center px-gutter h-16 bg-surface-container-lowest dark:bg-surface-container-lowest border-b border-outline-variant bg-opacity-70 backdrop-blur-md shadow-[0_0_15px_rgba(195,244,0,0.1)]">
      <div className="flex items-center gap-4">
        <h1 className="font-display-lg text-display-lg font-black text-primary-fixed dark:text-primary-fixed tracking-tighter">Aegis Mission Control</h1>
      </div>
      <div className="flex items-center gap-6 relative">
        {/* Search Bar */}
        <div className="hidden md:flex bg-[#0A0C10] border border-outline-variant rounded px-3 py-1 items-center focus-within:border-primary-fixed focus-within:shadow-[0_0_8px_rgba(204,255,0,0.3)] transition-all">
          <span className="material-symbols-outlined text-on-surface-variant text-sm mr-2">search</span>
          <input 
            className="bg-transparent border-none text-on-surface font-data-code text-data-code focus:ring-0 w-48 placeholder-outline outline-none" 
            placeholder="QUERY DATABASE..." 
            type="text"
            value={searchQuery || ""}
            onChange={(e) => setSearchQuery && setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex gap-4 relative items-center">
          <button 
            onClick={onSimulateClick} 
            disabled={isSimulating || isLockdownActive}
            className={`flex items-center gap-2 px-4 py-1.5 rounded font-label-caps text-label-caps tracking-widest transition-all ${
              isLockdownActive 
                ? 'bg-surface-variant text-on-surface-variant cursor-not-allowed opacity-50'
                : isSimulating 
                  ? 'bg-surface-variant text-on-surface-variant cursor-not-allowed'
                  : 'bg-[rgba(255,180,171,0.1)] text-error hover:bg-error hover:text-on-error border border-error'
            }`}
          >
            {isLockdownActive ? (
              <span className="material-symbols-outlined text-sm">lock</span>
            ) : isSimulating ? (
              <span className="material-symbols-outlined text-sm animate-spin">sync</span>
            ) : (
              <span className="material-symbols-outlined text-sm">bolt</span>
            )}
            {isLockdownActive ? 'LOCKED — DISENGAGE TO SIMULATE' : (isSimulating ? 'SIMULATING...' : 'SIMULATE ATTACK')}
          </button>
          
          <div className="relative border-l border-outline-variant pl-4 ml-2">
            <button onClick={() => toggleDropdown('clock')} className="text-on-surface-variant hover:text-primary-fixed transition-colors duration-200">
              <span className="material-symbols-outlined">schedule</span>
            </button>
            {activeDropdown === 'clock' && (
              <div className="absolute right-0 mt-2 w-48 bg-[#0c0e16] border border-outline-variant rounded-md shadow-lg p-3 z-50">
                <p className="font-data-code text-sm text-on-surface-variant text-center">No active timers.</p>
              </div>
            )}
          </div>
          
          <div className="relative">
            <button onClick={() => toggleDropdown('shield')} className="text-on-surface-variant hover:text-primary-fixed transition-colors duration-200">
              <span className="material-symbols-outlined">shield</span>
            </button>
            {activeDropdown === 'shield' && (
              <div className="absolute right-0 mt-2 w-48 bg-[#0c0e16] border border-outline-variant rounded-md shadow-lg p-3 z-50">
                <p className="font-data-code text-sm text-primary-fixed text-center">Defenses are nominal.</p>
              </div>
            )}
          </div>
          
          <div className="relative flex items-center gap-2 border-l border-outline-variant pl-4">
            <button 
              onClick={() => setIsMuted && setIsMuted(!isMuted)} 
              className="text-on-surface-variant hover:text-primary-fixed transition-colors duration-200"
              title={isMuted ? "Unmute alerts" : "Mute alerts"}
            >
              <span className="material-symbols-outlined text-lg">{isMuted ? 'volume_off' : 'volume_up'}</span>
            </button>

            <button onClick={() => toggleDropdown('bell')} className="text-on-surface-variant hover:text-primary-fixed transition-colors duration-200 relative ml-2">
              <span className="material-symbols-outlined">notifications</span>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-error text-[8px] font-bold text-on-error rounded-full flex items-center justify-center animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {activeDropdown === 'bell' && (
              <div className="absolute right-0 mt-8 w-80 max-h-96 overflow-y-auto custom-scrollbar bg-[#0c0e16] border border-outline-variant rounded-md shadow-lg p-3 z-50">
                <p className="font-label-caps text-xs text-on-surface-variant mb-2">NOTIFICATIONS ({unreadCount})</p>
                <div className="flex flex-col gap-2">
                  {notifications.length === 0 ? (
                    <p className="text-sm text-on-surface-variant italic text-center my-4">No recent alerts</p>
                  ) : (
                    notifications.map(n => {
                      const isAttack = n.type === 'attack';
                      const isLockdownOn = n.type === 'lockdown_on';
                      return (
                        <div key={n.id} className={`border-l-2 pl-2 py-1 ${isAttack ? 'border-error' : isLockdownOn ? 'border-[#ffb400]' : 'border-primary-fixed'}`}>
                          <p className={`font-data-code text-sm ${isAttack ? 'text-error' : isLockdownOn ? 'text-[#ffb400]' : 'text-primary-fixed'}`}>{n.title}</p>
                          <p className="font-data-code text-xs text-on-surface mb-1">{n.message}</p>
                          <p className="font-data-code text-[10px] text-on-surface-variant">{new Date(n.timestamp).toLocaleTimeString()}</p>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2 border-l border-outline-variant pl-6">
          <span className="font-data-code text-data-code text-primary-fixed">Operator Alpha-1</span>
          <img alt="Operator Profile" className="w-8 h-8 rounded-full border border-primary-fixed object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAPjpKW4u0mEiKr5kd9NybimJii5XkvM5yCv7ziI3LYSw6Kn36wAnHR_G0w4rZWn0CzUnApOvZHpX0pC6RNH80ciUe6piIc_2Qh_puhFfSSrrGvk5g8mbMXOkWUIRe8I0Vkjeq3NkjbCmdYqfan5nXEn04YNsZq1Xb_5b2D6ZBJmKuKYxCCL232HxFcKrlXLY_V8Gpd1nLaP6XKymtcPiap5E1nsRzPjdTfWl2kVFf8yGxcrvK8dsgz"/>
        </div>
      </div>
    </header>
  );
}
