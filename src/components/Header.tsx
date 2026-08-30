import React, { useState, useRef, useEffect } from 'react';
import { Download, LogOut, User as UserIcon, ChevronDown } from 'lucide-react';
import { User } from '../services/api';

interface HeaderProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onExport: () => void;
  currentUser?: User | null;
  onLogout?: () => void;
  activeTab?: string;
}

export const Header: React.FC<HeaderProps> = ({
  onExport,
  currentUser,
  onLogout,
  activeTab = 'dashboard'
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const firstName = currentUser?.name ? currentUser.name.split(' ')[0] : 'Usuario';
  const defaultAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80';

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getExportLabel = () => {
    switch (activeTab) {
      case 'inventory': return 'Exportar PDF Inventario';
      case 'sales': return 'Exportar PDF Ventas';
      case 'batches': return 'Exportar PDF Lotes & Aduana';
      case 'analytics': return 'Exportar PDF Analíticas';
      case 'users': return 'Exportar PDF Usuarios';
      default: return 'Exportar PDF Dashboard';
    }
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case 'inventory': return 'Inventario & Stock Físico';
      case 'sales': return 'Módulo de Ventas POS';
      case 'batches': return 'Lotes de Importación & Aduana';
      case 'analytics': return 'Inteligencia de Negocios & Analítica';
      case 'users': return 'Gestión de Equipo & Usuarios';
      case 'settings': return 'Configuración de Cuenta';
      default: return 'Resumen General Dashboard';
    }
  };

  return (
    <header className="bg-slate-800/80 backdrop-blur-md border-b border-slate-700 px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3 sticky top-0 z-40">
      <div className="min-w-0 flex-1">
        <h2 className="text-base sm:text-xl font-bold text-white truncate">{getTabTitle()}</h2>
        <p className="text-[11px] sm:text-xs text-slate-400 truncate">
          ¡Hola, <span className="font-semibold text-blue-400">{firstName}</span>!
        </p>
      </div>

      <div className="flex items-center space-x-2.5 shrink-0">
        {/* Contextual Export Button (Solo visible para Administradores) */}
        {currentUser?.role !== 'Vendedor' && (
          <button
            onClick={onExport}
            title={getExportLabel()}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white font-medium px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm transition shadow-lg shadow-blue-600/20 cursor-pointer"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">{getExportLabel()}</span>
          </button>
        )}

        {/* Profile Avatar Dropdown Button & Popover */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center space-x-2 bg-slate-900/90 hover:bg-slate-700/60 p-1.5 sm:px-3 sm:py-1.5 rounded-xl border border-slate-700 transition cursor-pointer"
          >
            <img
              src={currentUser?.avatar || defaultAvatar}
              alt={currentUser?.name || 'Usuario'}
              className="w-7 h-7 rounded-full object-cover border border-slate-700 shrink-0"
            />
            <span className="text-xs font-bold text-white hidden sm:inline">{firstName}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* Profile Dropdown Popover */}
          {showProfileMenu && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 p-3 space-y-3 ring-4 ring-blue-500/10">
              <div className="flex items-center space-x-3 p-1">
                <img
                  src={currentUser?.avatar || defaultAvatar}
                  alt={currentUser?.name || 'Usuario'}
                  className="w-10 h-10 rounded-full object-cover border-2 border-blue-500 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-white truncate">{currentUser?.name || 'Usuario'}</h4>
                  <p className="text-[10px] text-slate-400 truncate">{currentUser?.email || 'usuario@empresa.com'}</p>
                  <span className="inline-block mt-0.5 text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded font-semibold">
                    {currentUser?.role || 'Administrador'}
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-800 pt-2">
                {onLogout && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      onLogout();
                    }}
                    className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 rounded-xl transition cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 shrink-0" />
                    <span>Cerrar Sesión</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
