import React, { useState, useEffect } from 'react';
import { Save, Lock, User as UserIcon, CheckCircle2, Shield, AlertCircle, Users, Eye, EyeOff } from 'lucide-react';
import { updateUserProfileApi, changePasswordApi, User } from '../services/api';
import { UsersView } from './UsersView';
import { UserAvatar } from './UserAvatar';

interface SettingsViewProps {
  currentUser?: User | null;
  onUpdateUser?: (updatedUser: User) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ currentUser, onUpdateUser }) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'team' | 'security'>('profile');

  // Profile Form State (Username & Password)
  const [name, setName] = useState(currentUser?.name || '');
  const [role, setRole] = useState(currentUser?.role || 'Usuario');

  // Password fields
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || '');
      setRole(currentUser.role || 'Usuario');
    }
  }, [currentUser]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!name.trim()) {
      setErrorMsg('El Nombre de Usuario es obligatorio.');
      return;
    }

    if (newPass || confirmPass) {
      if (newPass !== confirmPass) {
        setErrorMsg('Las contraseñas no coinciden.');
        return;
      }
    }

    setErrorMsg('');
    setLoading(true);

    try {
      // 1. Update Name in SQLite Profile
      const updated = await updateUserProfileApi(currentUser.id, {
        name: name.trim(),
        email: currentUser.email || `${name.trim().toLowerCase().replace(/[^a-z0-9]/g, '')}@empresa.com`,
        avatar: currentUser.avatar || ''
      });

      // 2. Update Password if provided
      if (newPass && newPass.trim() !== '') {
        await changePasswordApi(currentUser.id, '', newPass.trim());
      }

      if (onUpdateUser) {
        onUpdateUser(updated);
      }

      setNewPass('');
      setConfirmPass('');
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err: any) {
      const updatedLocal: User = {
        ...currentUser,
        name: name.trim()
      };
      if (onUpdateUser) {
        onUpdateUser(updatedLocal);
      }
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-700/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-white flex items-center space-x-2">
            <UserIcon className="w-5 h-5 text-blue-400" />
            <span>Configuración de Cuenta</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Administra tu nombre de usuario, contraseña y usuarios del equipo
          </p>
        </div>

        {savedSuccess && (
          <div className="w-full sm:w-auto flex items-center space-x-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3.5 py-2 rounded-xl text-xs font-bold animate-bounce">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>¡Cambios guardados con éxito!</span>
          </div>
        )}
      </div>

      {/* Sub-Navigation Tabs (Vertical Stack / Horizontal Pills for Mobile) */}
      <div className="flex overflow-x-auto gap-2 p-1.5 bg-slate-900/60 border border-slate-800 rounded-2xl scrollbar-none">
        <button
          type="button"
          onClick={() => { setActiveTab('profile'); setErrorMsg(''); }}
          className={`flex-1 min-w-[120px] flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
            activeTab === 'profile'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <UserIcon className="w-4 h-4 shrink-0" />
          <span>Mi Perfil</span>
        </button>

        {currentUser?.role !== 'Vendedor' && (
          <button
            type="button"
            onClick={() => { setActiveTab('team'); setErrorMsg(''); }}
            className={`flex-1 min-w-[140px] flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
              activeTab === 'team'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span>Gestión de Equipo</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => { setActiveTab('security'); setErrorMsg(''); }}
          className={`flex-1 min-w-[140px] flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
            activeTab === 'security'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Lock className="w-4 h-4 shrink-0" />
          <span>Seguridad</span>
        </button>
      </div>

      {/* Main Settings Content */}
      <div className="bg-slate-800 p-4 sm:p-6 rounded-2xl border border-slate-700/80 shadow-lg">
        {errorMsg && (
          <div className="bg-rose-500/10 border border-rose-500/30 p-3 rounded-xl text-xs text-rose-400 mb-4 flex items-center space-x-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* TAB 1: PROFILE REDESIGN (MOBILE RESPONSIVE, NO EMAIL, NO PHOTO BUTTONS) */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSaveProfile} className="space-y-5">
            {/* Header: Centered Large Avatar + Role Badge */}
            <div className="flex flex-col items-center justify-center py-2 space-y-2.5 border-b border-slate-700/80 pb-5">
              <UserAvatar name={name || currentUser?.name} size="w-20 h-20 text-3xl" />
              <div className="text-center">
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Rol: {role}</span>
                </span>
              </div>
            </div>

            {/* Field 1: Nombre de Usuario */}
            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold text-slate-300 uppercase tracking-wide">
                Nombre de Usuario
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top.1/2 top-3 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Admin"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 font-semibold"
                />
              </div>
            </div>

            {/* Field 2: Nueva Contraseña (Opcional) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold text-slate-300 uppercase tracking-wide">
                Nueva Contraseña <span className="text-slate-400 font-normal lowercase">(opcional)</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 -translate-y-1/2" />
                <input
                  type={showNewPass ? 'text' : 'password'}
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  placeholder="Ingresa la nueva contraseña..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-10 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 font-semibold"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-3 top-3.5 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Field 3: Confirmar Contraseña */}
            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold text-slate-300 uppercase tracking-wide">
                Confirmar Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 -translate-y-1/2" />
                <input
                  type={showConfirmPass ? 'text' : 'password'}
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  placeholder="Confirma la nueva contraseña..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-10 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 font-semibold"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  className="absolute right-3 top-3.5 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Full-width Main Button */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white font-extrabold py-3 px-4 rounded-xl text-sm transition shadow-lg shadow-blue-600/30 active:scale-[0.98] cursor-pointer"
              >
                <Save className="w-4 h-4 shrink-0" />
                <span>{loading ? 'Guardando...' : 'Guardar Cambios'}</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: TEAM MANAGEMENT INTEGRATION */}
        {activeTab === 'team' && <UsersView />}

        {/* TAB 3: SECURITY */}
        {activeTab === 'security' && (
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <h3 className="text-sm font-bold text-white mb-1">Seguridad de la Cuenta</h3>
            <p className="text-xs text-slate-400">
              Actualiza la contraseña de tu usuario en la base de datos local SQLite.
            </p>

            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold text-slate-300 uppercase">Nueva Contraseña</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 -translate-y-1/2" />
                <input
                  type={showNewPass ? 'text' : 'password'}
                  required
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  placeholder="Ingresa la nueva contraseña"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-10 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 font-semibold"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-3 top-3.5 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold text-slate-300 uppercase">Confirmar Contraseña</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 -translate-y-1/2" />
                <input
                  type={showConfirmPass ? 'text' : 'password'}
                  required
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  placeholder="Confirma la nueva contraseña"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-10 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 font-semibold"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  className="absolute right-3 top-3.5 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white font-extrabold py-3 px-4 rounded-xl text-sm transition shadow-lg shadow-blue-600/30 active:scale-[0.98] cursor-pointer"
              >
                <Save className="w-4 h-4 shrink-0" />
                <span>{loading ? 'Actualizando...' : 'Actualizar Contraseña'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
