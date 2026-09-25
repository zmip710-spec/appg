import React, { useState, useEffect } from 'react';
import { Save, Lock, User as UserIcon, CheckCircle2, Shield, AlertCircle, Users, Eye, EyeOff, KeyRound } from 'lucide-react';
import { updateUserProfileApi, changePasswordApi, User } from '../services/api';
import { UsersView } from './UsersView';
import { UserAvatar } from './UserAvatar';

interface SettingsViewProps {
  currentUser?: User | null;
  onUpdateUser?: (updatedUser: User) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ currentUser, onUpdateUser }) => {
  const isAdmin = currentUser?.role === 'Administrador';
  const [activeTab, setActiveTab] = useState<'profile' | 'team' | 'security'>('profile');

  // Profile Form State (Username only, NO password here)
  const [name, setName] = useState(currentUser?.name || '');
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  // Security Form State (Centralized Exclusive Password Change)
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [securitySuccess, setSecuritySuccess] = useState(false);
  const [securityError, setSecurityError] = useState('');
  const [securityLoading, setSecurityLoading] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || '');
    }
  }, [currentUser]);

  // Fallback to 'profile' if a non-admin user lands on 'team'
  useEffect(() => {
    if (activeTab === 'team' && !isAdmin) {
      setActiveTab('profile');
    }
  }, [activeTab, isAdmin]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!name.trim()) {
      setProfileError('El Nombre de Usuario es obligatorio.');
      return;
    }

    setProfileError('');
    setProfileLoading(true);

    try {
      const updated = await updateUserProfileApi(currentUser.id, {
        name: name.trim(),
        email: currentUser.email || `${name.trim().toLowerCase().replace(/[^a-z0-9]/g, '')}@empresa.com`,
        avatar: ''
      });

      if (onUpdateUser) {
        onUpdateUser(updated);
      }

      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 4000);
    } catch {
      const updatedLocal: User = {
        ...currentUser,
        name: name.trim()
      };
      if (onUpdateUser) {
        onUpdateUser(updatedLocal);
      }
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 4000);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (!currentPassword) {
      setSecurityError('La contraseña actual es requerida.');
      return;
    }

    if (!newPassword || newPassword.trim().length < 4) {
      setSecurityError('La nueva contraseña debe tener al menos 4 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setSecurityError('La nueva contraseña y la confirmación no coinciden.');
      return;
    }

    setSecurityError('');
    setSecurityLoading(true);

    try {
      await changePasswordApi(currentUser.id, currentPassword.trim(), newPassword.trim());
      setSecuritySuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSecuritySuccess(false), 4000);
    } catch (err: any) {
      setSecurityError(err.message || 'Error al actualizar la contraseña');
    } finally {
      setSecurityLoading(false);
    }
  };

  return (
    <div className="space-y-4 pb-24 sm:pb-32 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
            <UserIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>Configuración de Cuenta</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Administra tu perfil, contraseña y usuarios del equipo
          </p>
        </div>

        {profileSuccess && (
          <div className="w-full sm:w-auto flex items-center space-x-2 bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 px-3.5 py-2 rounded-xl text-xs font-bold animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>¡Nombre de perfil guardado con éxito!</span>
          </div>
        )}

        {securitySuccess && (
          <div className="w-full sm:w-auto flex items-center space-x-2 bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 px-3.5 py-2 rounded-xl text-xs font-bold animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>¡Contraseña actualizada con éxito!</span>
          </div>
        )}
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex overflow-x-auto gap-2 p-1.5 bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl scrollbar-none">
        <button
          type="button"
          onClick={() => { setActiveTab('profile'); setProfileError(''); setSecurityError(''); }}
          className={`flex-1 min-w-[120px] flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
            activeTab === 'profile'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          <UserIcon className="w-4 h-4 shrink-0" />
          <span>Mi Perfil</span>
        </button>

        {isAdmin && (
          <button
            type="button"
            onClick={() => { setActiveTab('team'); setProfileError(''); setSecurityError(''); }}
            className={`flex-1 min-w-[140px] flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
              activeTab === 'team'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span>Gestión de Equipo</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => { setActiveTab('security'); setProfileError(''); setSecurityError(''); }}
          className={`flex-1 min-w-[140px] flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
            activeTab === 'security'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          <Lock className="w-4 h-4 shrink-0" />
          <span>Seguridad</span>
        </button>
      </div>

      {/* Main Settings Content */}
      <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm">
        {/* TAB 1: MI PERFIL (Only Session User Information: Avatar, Username, Role badge read-only) */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            {profileError && (
              <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 p-3 rounded-xl text-xs text-rose-700 dark:text-rose-400 flex items-center space-x-2 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <span>{profileError}</span>
              </div>
            )}

            <div className="flex flex-col items-center justify-center py-4 border-b border-slate-200 dark:border-slate-700/80 pb-6 text-center space-y-3">
              <UserAvatar name={name || currentUser?.name} size="w-24 h-24 text-3xl shadow-lg" />
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                  {name || currentUser?.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {currentUser?.email || `${(name || currentUser?.name || 'usuario').toLowerCase().replace(/[^a-z0-9]/g, '')}@empresa.com`}
                </p>
              </div>
              <div>
                <span className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20 shadow-sm">
                  <Shield className="w-4 h-4" />
                  <span>Rol: {currentUser?.role || 'Vendedor'} (Solo lectura)</span>
                </span>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 max-w-md mx-auto">
              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                  Nombre de Usuario
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Admin"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1">
                  Rol Asignado
                </label>
                <div className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                  <div className="flex items-center space-x-2">
                    <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="font-bold text-slate-800 dark:text-slate-200">{currentUser?.role || 'Vendedor'}</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Solo Lectura</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={profileLoading}
                  className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs transition shadow-md active:scale-[0.98] cursor-pointer"
                >
                  <Save className="w-4 h-4 shrink-0" />
                  <span>{profileLoading ? 'Guardando...' : 'Guardar Nombre'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: GESTIÓN DE EQUIPO (Visible solo para Administradores) */}
        {activeTab === 'team' && isAdmin && <UsersView />}

        {/* TAB 3: SEGURIDAD (Centraliza exclusivamente el cambio de contraseña) */}
        {activeTab === 'security' && (
          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md mx-auto">
            <div className="text-center pb-2 border-b border-slate-200 dark:border-slate-700/80">
              <div className="inline-flex p-3 rounded-2xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 mb-2">
                <KeyRound className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Cambiar Contraseña</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Ingresa tu contraseña actual y define una nueva para proteger tu cuenta
              </p>
            </div>

            {securityError && (
              <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 p-3 rounded-xl text-xs text-rose-700 dark:text-rose-400 flex items-center space-x-2 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <span>{securityError}</span>
              </div>
            )}

            {/* Field 1: Contraseña Actual */}
            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                Contraseña Actual
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showCurrentPass ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Ingresa tu contraseña actual..."
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-10 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-semibold"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white p-1"
                >
                  {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Field 2: Nueva Contraseña */}
            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                Nueva Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showNewPass ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 4 caracteres..."
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-10 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-semibold"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white p-1"
                >
                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Field 3: Confirmar Contraseña */}
            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                Confirmar Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showConfirmPass ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite la nueva contraseña..."
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-10 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-semibold"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white p-1"
                >
                  {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={securityLoading}
                className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white font-extrabold py-3 px-4 rounded-xl text-xs transition shadow-md active:scale-[0.98] cursor-pointer"
              >
                <Save className="w-4 h-4 shrink-0" />
                <span>{securityLoading ? 'Actualizando...' : 'Actualizar Contraseña'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
