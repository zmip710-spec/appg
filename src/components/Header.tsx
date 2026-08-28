import React from 'react';
import { Search, Download, LogOut } from 'lucide-react';
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
  searchTerm,
  setSearchTerm,
  onExport,
  currentUser,
  onLogout,
  activeTab = 'dashboard'
}) => {
  const firstName = currentUser?.name ? currentUser.name.split(' ')[0] : 'Usuario';
  const defaultAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80';

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
    <header className="bg-slate-800/80 backdrop-blur-md border-b border-slate-700 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sticky top-0 z-10">
      <div>
        <h2 className="text-xl font-bold text-white">{getTabTitle()}</h2>
        <p className="text-xs text-slate-400">
          ¡Bienvenido de nuevo, <span className="font-semibold text-blue-400">{firstName}</span>! Estás gestionando AppG.
        </p>
      </div>

      <div className="flex items-center space-x-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar en el sistema..."
            className="pl-9 pr-4 py-2 bg-slate-900/80 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition w-48 sm:w-64"
          />
        </div>

        {/* User Avatar Badge */}
        <div className="flex items-center space-x-2 bg-slate-900/80 p-1.5 rounded-lg border border-slate-700">
          <img
            src={currentUser?.avatar || defaultAvatar}
            alt={currentUser?.name || 'Usuario'}
            className="w-7 h-7 rounded-full object-cover border border-slate-700"
          />
          <span className="text-xs font-bold text-white hidden sm:inline px-1">{firstName}</span>
        </div>

        {/* Contextual Export Button */}
        <button
          onClick={onExport}
          title={getExportLabel()}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-lg text-sm transition shadow-lg shadow-blue-600/20"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">{getExportLabel()}</span>
        </button>

        {/* Logout Icon Button */}
        {onLogout && (
          <button
            onClick={onLogout}
            className="p-2 rounded-lg bg-slate-900/80 border border-slate-700 text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 transition"
            title="Cerrar Sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
};
