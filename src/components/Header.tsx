import React from 'react';
import { User } from '../services/api';

interface HeaderProps {
  searchTerm?: string;
  setSearchTerm?: (term: string) => void;
  onExport?: () => void;
  currentUser?: User | null;
  onLogout?: () => void;
  activeTab?: string;
  isOffline?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onExport,
  currentUser,
  activeTab = 'inventory',
  isOffline = false
}) => {
  const firstName = currentUser?.name ? currentUser.name.split(' ')[0] : 'Usuario';

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
    <header className="bg-white/90 dark:bg-slate-800/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3 sticky top-0 z-40 shadow-sm">
      <div className="min-w-0 flex-1">
        <div className="flex items-center space-x-2 truncate">
          <h2 className="text-base sm:text-xl font-bold text-slate-900 dark:text-white truncate">{getTabTitle()}</h2>
          {isOffline && (
            <span className="text-[10px] font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 shrink-0 animate-pulse">
              ⚠️ Desconectado
            </span>
          )}
        </div>
        <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
          ¡Hola, <span className="font-semibold text-blue-600 dark:text-blue-400">{firstName}</span>!
        </p>
      </div>

      <div className="flex items-center space-x-2.5 shrink-0">
      </div>
    </header>
  );
};
