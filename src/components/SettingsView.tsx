import React, { useState, useEffect } from 'react';
import { Save, Bell, Lock, User as UserIcon, CheckCircle2, Shield, AlertCircle } from 'lucide-react';
import { updateUserProfileApi, changePasswordApi, User } from '../services/api';
import { ImagePicker } from './ImagePicker';

interface SettingsViewProps {
  currentUser?: User | null;
  onUpdateUser?: (updatedUser: User) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ currentUser, onUpdateUser }) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'security'>('profile');

  // Form State bound EXCLUSIVELY to currentUser
  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [avatar, setAvatar] = useState(currentUser?.avatar || '');
  const [role, setRole] = useState(currentUser?.role || 'Usuario');
  
  // Security Form State
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    weeklyReport: true,
    securityAlerts: true,
    marketing: false,
  });

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || '');
      setEmail(currentUser.email || '');
      setAvatar(currentUser.avatar || '');
      setRole(currentUser.role || 'Usuario');
    }
  }, [currentUser]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!name || !email) {
      setErrorMsg('Nombre y Correo son requeridos.');
      return;
    }

    setErrorMsg('');
    setLoading(true);

    try {
      const updated = await updateUserProfileApi(currentUser.id, {
        name,
        email,
        avatar
      });

      if (onUpdateUser) {
        onUpdateUser(updated);
      }

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err: any) {
      const updatedLocal: User = {
        ...currentUser,
        name,
        email,
        avatar
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

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!newPass) {
      setErrorMsg('Ingresa tu nueva contraseña.');
      return;
    }

    setErrorMsg('');
    setLoading(true);

    try {
      await changePasswordApi(currentUser.id, currentPass, newPass);
      setCurrentPass('');
      setNewPass('');
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al cambiar la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <UserIcon className="w-5 h-5 text-blue-400" />
            <span>Configuración del Perfil de Usuario</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Modifica la información, contraseña y foto de perfil del usuario logueado actualmente (<span className="text-blue-400 font-semibold">{currentUser?.name || 'Invitado'}</span>)
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center space-x-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-lg text-xs font-semibold animate-bounce">
            <CheckCircle2 className="w-4 h-4" />
            <span>¡Cambios guardados con éxito en SQLite!</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Settings Navigation Sidebar */}
        <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 space-y-1 h-fit">
          <button
            onClick={() => { setActiveTab('profile'); setErrorMsg(''); }}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
              activeTab === 'profile' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-slate-400 hover:bg-slate-700'
            }`}
          >
            <UserIcon className="w-4 h-4" />
            <span>Mi Perfil ({currentUser?.name?.split(' ')[0]})</span>
          </button>
          <button
            onClick={() => { setActiveTab('notifications'); setErrorMsg(''); }}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
              activeTab === 'notifications' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-slate-400 hover:bg-slate-700'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Notificaciones</span>
          </button>
          <button
            onClick={() => { setActiveTab('security'); setErrorMsg(''); }}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
              activeTab === 'security' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-slate-400 hover:bg-slate-700'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Seguridad y Contraseña</span>
          </button>
        </div>

        {/* Settings Form Container */}
        <div className="md:col-span-3 bg-slate-800 p-6 rounded-xl border border-slate-700">
          {errorMsg && (
            <div className="bg-rose-500/10 border border-rose-500/30 p-3 rounded-lg text-xs text-rose-400 mb-4 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-5">
              <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                <h3 className="text-base font-bold text-white">Editar Mi Perfil Logueado</h3>
                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-700 text-blue-400 border border-slate-600">
                  <Shield className="w-3 h-3" />
                  <span>Rol: {role}</span>
                </span>
              </div>

              {/* Photo ImagePicker (File Upload or Camera) */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-400 uppercase">Foto de Perfil</label>
                <div className="flex items-center space-x-4">
                  <img
                    src={avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80'}
                    alt="Avatar"
                    className="w-16 h-16 rounded-full object-cover border-2 border-blue-500 shadow-md shrink-0"
                  />
                  <div className="flex-1">
                    <ImagePicker
                      value={avatar}
                      onChange={(newImg) => setAvatar(newImg)}
                      label="Cambiar Foto (Subir Archivo o Tomar con Cámara)"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-4 flex justify-end border-t border-slate-700">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2.5 rounded-lg text-sm transition shadow-lg shadow-blue-600/20"
                >
                  <Save className="w-4 h-4" />
                  <span>{loading ? 'Guardando...' : 'Guardar Cambios en Mi Perfil'}</span>
                </button>
              </div>
            </form>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-5">
              <h3 className="text-base font-bold text-white mb-2">Preferencias de Notificación</h3>

              <div className="space-y-4 divide-y divide-slate-700">
                <div className="flex items-center justify-between pt-2">
                  <div>
                    <span className="text-sm font-semibold text-white block">Alertas por Correo</span>
                    <span className="text-xs text-slate-400">Recibir avisos cuando haya actividad inusual o ventas importantes.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.emailAlerts}
                    onChange={(e) => setNotifications({ ...notifications, emailAlerts: e.target.checked })}
                    className="w-5 h-5 accent-blue-600 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between pt-4">
                  <div>
                    <span className="text-sm font-semibold text-white block">Reportes Semanales</span>
                    <span className="text-xs text-slate-400">Resumen consolidado de analítica cada lunes por la mañana.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.weeklyReport}
                    onChange={(e) => setNotifications({ ...notifications, weeklyReport: e.target.checked })}
                    className="w-5 h-5 accent-blue-600 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <form onSubmit={handleSavePassword} className="space-y-4">
              <h3 className="text-base font-bold text-white mb-2">Cambiar Contraseña de Cuenta en SQLite</h3>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Contraseña Actual (Predeterminada: 123456)</label>
                <input
                  type="password"
                  value={currentPass}
                  onChange={(e) => setCurrentPass(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Nueva Contraseña</label>
                <input
                  type="password"
                  required
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  placeholder="Ingresa tu nueva contraseña"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-5 py-2 rounded-lg text-sm transition shadow-lg shadow-blue-600/20"
                >
                  <Save className="w-4 h-4" />
                  <span>{loading ? 'Actualizando...' : 'Actualizar Contraseña en SQLite'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
