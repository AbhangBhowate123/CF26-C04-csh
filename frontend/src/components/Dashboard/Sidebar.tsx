import React from 'react';

const MENU_ITEMS = [
  { id: 'Command', icon: 'dashboard', label: 'Command' },
  { id: 'Sectors', icon: 'domain', label: 'Sectors' },
  { id: 'Floors', icon: 'layers', label: 'Floors' },
  { id: 'Arsenal', icon: 'security', label: 'Arsenal' },
  { id: 'Logs', icon: 'terminal', label: 'Logs' },
];

export default function Sidebar({ 
  activeView, 
  setActiveView 
}: { 
  activeView: string; 
  setActiveView: (view: string) => void;
}) {
  return (
    <nav className="fixed left-0 top-16 h-[calc(100vh-64px)] z-40 flex flex-col py-4 bg-surface-container-low dark:bg-surface-container-low border-r border-outline-variant bg-opacity-80 backdrop-blur-xl docked w-20 hover:w-64 transition-all duration-300 group overflow-hidden">
      <div className="px-4 mb-8 flex items-center gap-4 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
        <img alt="System Status" className="w-10 h-10 rounded-full border border-outline-variant object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDNS3vV7MUie3GAAethS9z8pkAf4YC_oagW6m_P-4CwjRhpzpPPATox6qT5vZ1-eK5pVlT2kP-ZIjgirsoQ9MrQwo25SYAtxIazNL667jZTOjwuLjh8BBqtvFW1ah9Wkb_t_JDCL6CPgvL4XR0yPnpXTSbP9XzjBUVi5RE4bxQxFo8Xt-P8JSYT7zuuK4ToBu6zso46Nsqjtw-LveNB1o4mJTcecWgyFswEyBGb4R8STdAFiqpG2SFh"/>
        <div>
          <h2 className="font-data-code text-data-code text-on-surface font-bold">Sector-07</h2>
          <p className="font-data-numeric text-data-numeric text-primary-fixed">Vigilance Active</p>
        </div>
      </div>
      <ul className="flex flex-col gap-2 px-2 flex-1">
        {MENU_ITEMS.map((item) => {
          const isDisabled = item.id !== 'Command';
          return (
            <li key={item.id}>
              <button 
                onClick={() => !isDisabled && setActiveView(item.id)}
                title={isDisabled ? "Coming soon" : ""}
                className={`w-full flex items-center gap-4 px-3 py-3 rounded-lg whitespace-nowrap overflow-hidden transition-all duration-150 ${
                  isDisabled ? "opacity-40 cursor-not-allowed" : "hover:translate-x-1"
                } ${
                  activeView === item.id 
                    ? "bg-primary-container text-on-primary-container shadow-[0_0_8px_rgba(195,244,0,0.3)] scale-95" 
                    : !isDisabled ? "text-on-surface-variant hover:text-on-surface hover:bg-surface-variant" : "text-on-surface-variant"
                }`}
              >
                <span className="material-symbols-outlined min-w-[24px] flex justify-center">{item.icon}</span>
                <span className="font-label-caps text-label-caps tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-300">{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="px-4 mt-auto mb-4">
        <button title="Coming soon" className="w-full flex items-center justify-center gap-2 py-2 border border-error text-error transition-colors rounded whitespace-nowrap overflow-hidden font-label-caps text-label-caps opacity-0 group-hover:opacity-100 opacity-40 cursor-not-allowed">
          <span className="material-symbols-outlined text-sm">lock</span>
          Emergency Lock
        </button>
      </div>
      <ul className="flex flex-col gap-2 px-2 mt-4 border-t border-outline-variant pt-4">
        <li>
          <button title="Coming soon" className="w-full flex items-center gap-4 px-3 py-2 text-on-surface-variant transition-all duration-150 rounded-lg whitespace-nowrap overflow-hidden opacity-40 cursor-not-allowed">
            <span className="material-symbols-outlined min-w-[24px] flex justify-center">settings</span>
            <span className="font-label-caps text-label-caps tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-300">Settings</span>
          </button>
        </li>
        <li>
          <button title="Coming soon" className="w-full flex items-center gap-4 px-3 py-2 text-on-surface-variant transition-all duration-150 rounded-lg whitespace-nowrap overflow-hidden opacity-40 cursor-not-allowed">
            <span className="material-symbols-outlined min-w-[24px] flex justify-center">help</span>
            <span className="font-label-caps text-label-caps tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-300">Support</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
