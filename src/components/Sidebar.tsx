import React, { useState } from 'react';
import {
  LayoutDashboard,
  Boxes,
  Users,
  Settings,
  ShoppingCart,
  BarChart3,
  LogOut,
  Sun,
  Moon,
  TrendingUp,
  Layers,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { User } from '../services/api';

interface SidebarProps {
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser?: User | null;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  darkMode,
  setDarkMode,
  activeTab,
  setActiveTab,
  currentUser,
  onLogout,
}) => {
  const isVendedor = currentUser?.role === 'Vendedor';

  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const allNavItems = [
    { id: 'inventory', label: 'Stock', icon: Boxes },
    { id: 'batches', label: 'Lotes', icon: Layers },
    { id: 'users', label: 'Equipo', icon: Users },
    { id: 'sales', label: 'Ventas', icon: ShoppingCart },
    { id: 'settings', label: 'Config', icon: Settings },
  ];

  const navItems = isVendedor
    ? allNavItems.filter((item) => item.id === 'inventory' || item.id === 'sales')
    : allNavItems;

  const defaultAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80';

  return (
    <>
      {/* DESKTOP SIDEBAR (Collapsible w-64 / w-20) */}
      <aside
        className={`hidden md:flex ${
          isCollapsed ? 'w-20' : 'w-64'
        } bg-slate-800 border-r border-slate-700 p-3 sm:p-4 flex-col justify-between shrink-0 min-h-screen transition-all duration-300 ease-in-out relative z-30`}
      >
        <div>
          {/* Brand Logo & Collapse Button Header */}
          <div className="flex items-center justify-between px-1 py-2 mb-6">
            {!isCollapsed ? (
              <div className="flex items-center space-x-3 truncate">
                <div className="p-2.5 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-xl shadow-lg shadow-blue-500/30 shrink-0">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <div className="truncate">
                  <h1 className="font-bold text-lg text-white leading-tight">AppG</h1>
                  <span className="text-xs text-slate-400">v0.1 (beta)</span>
                </div>
              </div>
            ) : (
              <div className="mx-auto p-2 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-xl shadow-lg shadow-blue-500/30">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
            )}

            <button
              type="button"
              onClick={toggleCollapse}
              className={`p-1.5 rounded-xl bg-slate-900/60 hover:bg-slate-700 text-slate-300 border border-slate-700/80 transition cursor-pointer ${
                isCollapsed ? 'mt-2 mx-auto block' : ''
              }`}
              title={isCollapsed ? 'Desplegar Menú' : 'Plegar Menú'}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  title={isCollapsed ? item.label : undefined}
                  className={`w-full flex items-center ${
                    isCollapsed ? 'justify-center px-2' : 'space-x-3 px-3.5'
                  } py-2.5 rounded-xl font-medium text-sm transition ${
                    isActive
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 font-semibold shadow-sm'
                      : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
                  }`}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Controls */}
        <div className="space-y-3 pt-4 border-t border-slate-700/80">
          {/* Active User Badge */}
          {currentUser && (
            <div
              className={`flex items-center ${
                isCollapsed ? 'justify-center p-1.5' : 'justify-between p-2'
              } rounded-xl bg-slate-900/60 border border-slate-700/60`}
              title={isCollapsed ? `${currentUser.name} (${currentUser.role})` : undefined}
            >
              <div className="flex items-center space-x-2.5 overflow-hidden">
                <img
                  src={currentUser.avatar || defaultAvatar}
                  alt={currentUser.name}
                  className="w-8 h-8 rounded-full object-cover border border-blue-500 shrink-0"
                />
                {!isCollapsed && (
                  <div className="truncate">
                    <span className="text-xs font-bold text-white block truncate">{currentUser.name}</span>
                    <span className="text-[10px] text-slate-400 block truncate">{currentUser.role}</span>
                  </div>
                )}
              </div>
              {!isCollapsed && onLogout && (
                <button
                  onClick={onLogout}
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                  title="Cerrar Sesión"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* Dark Mode Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            title={isCollapsed ? (darkMode ? 'Modo Claro' : 'Modo Oscuro') : undefined}
            className={`w-full flex items-center ${
              isCollapsed ? 'justify-center px-2 py-2.5' : 'justify-between px-3.5 py-2'
            } rounded-xl text-xs font-medium bg-slate-900/40 text-slate-400 hover:bg-slate-700/40 transition`}
          >
            <span className="flex items-center space-x-2">
              {darkMode ? <Sun className="w-4 h-4 text-amber-400 shrink-0" /> : <Moon className="w-4 h-4 text-indigo-400 shrink-0" />}
              {!isCollapsed && <span>{darkMode ? 'Modo Claro' : 'Modo Oscuro'}</span>}
            </span>
            {!isCollapsed && (
              <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                {darkMode ? 'Dark' : 'Light'}
              </span>
            )}
          </button>
        </div>
      </aside>

      {/* MOBILE TOP BRAND BAR (Visible only on small screens) */}
      <div className="md:hidden bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-lg shadow-md shadow-blue-500/20">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-base text-white leading-none">AppG</h1>
            <span className="text-[10px] text-slate-400">v0.1 (beta)</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {currentUser && (
            <img
              src={currentUser.avatar || defaultAvatar}
              alt={currentUser.name}
              className="w-7 h-7 rounded-full object-cover border border-blue-500"
            />
          )}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-lg bg-slate-900 text-slate-300"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
          </button>
          {onLogout && (
            <button onClick={onLogout} className="p-2 rounded-lg bg-slate-900 text-rose-400">
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR (Fixed at bottom with smooth horizontal scroll) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800 flex items-center overflow-x-auto whitespace-nowrap px-2 py-2 gap-1.5 shadow-2xl scrollbar-none">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center min-w-[60px] flex-1 py-1 px-1.5 rounded-xl transition ${
                isActive ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className={`p-1.5 rounded-xl transition ${isActive ? 'bg-blue-600/20 border border-blue-500/40 shadow-sm' : ''}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[11px] mt-0.5 font-medium truncate max-w-[68px]">{item.label}</span>
            </button>
          );
        })}
      </div>
    </>
  );
};
