import React, { useState, useEffect } from 'react';
import { BarChart3, Lock, Mail, UserCheck, AlertCircle, ArrowRight, UserPlus } from 'lucide-react';
import { loginApi, fetchUsers, createUser, User } from '../services/api';
import { ImagePicker } from './ImagePicker';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  // Login Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);

  // Register Form State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState('Desarrollador');
  const [regAvatar, setRegAvatar] = useState('');

  const loadAvailableUsers = async () => {
    try {
      const users = await fetchUsers();
      if (Array.isArray(users)) {
        const activeUsers = users.filter(u => u.status === 'Activo');
        setAvailableUsers(activeUsers);
        if (activeUsers.length === 0) {
          setIsRegisterMode(true);
        }
      } else {
        setIsRegisterMode(true);
      }
    } catch {
      setIsRegisterMode(true);
    }
  };

  useEffect(() => {
    loadAvailableUsers();
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrorMsg('Por favor ingresa tu correo electrónico.');
      return;
    }

    setErrorMsg('');
    setLoading(true);

    try {
      const loggedUser = await loginApi(email, password);
      onLoginSuccess(loggedUser);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regEmail || !regPassword) {
      setErrorMsg('Nombre, correo y contraseña son requeridos.');
      return;
    }

    setErrorMsg('');
    setLoading(true);

    try {
      // 1. Create User Profile with Password in SQLite
      const newUser = await createUser({
        name: regName,
        email: regEmail,
        role: regRole,
        avatar: regAvatar,
        password: regPassword
      });

      // 2. Auto-login with the newly created profile
      onLoginSuccess(newUser);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al crear perfil de usuario.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (user: User) => {
    setErrorMsg('');
    setLoading(true);

    try {
      const loggedUser = await loginApi(user.email, '123456');
      onLoginSuccess(loggedUser);
    } catch {
      onLoginSuccess(user);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-2xl shadow-xl shadow-blue-500/20 mb-1">
            <BarChart3 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">AppG</h1>
          <p className="text-xs text-slate-400">Sistema de Gestión de Inventario & Ventas</p>
        </div>

        {/* Tab Toggle: Iniciar Sesión vs Registrar Perfil */}
        <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setIsRegisterMode(false);
              setErrorMsg('');
            }}
            className={`py-2 rounded-lg transition ${!isRegisterMode ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegisterMode(true);
              setErrorMsg('');
            }}
            className={`py-2 rounded-lg transition ${isRegisterMode ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            + Registrar Perfil
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="bg-rose-500/10 border border-rose-500/30 p-3 rounded-xl text-xs text-rose-400 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* MODE 1: LOGIN FORM */}
        {!isRegisterMode ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Correo Electrónico</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu.correo@empresa.com"
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Contraseña</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl text-sm transition shadow-lg shadow-blue-600/25 flex items-center justify-center space-x-2"
            >
              <span>{loading ? 'Verificando...' : 'Iniciar Sesión'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          /* MODE 2: REGISTER NEW PROFILE FORM WITH PASSWORD */
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Nombre Completo</label>
              <input
                type="text"
                required
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="Ej. Juan Pérez"
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Correo Electrónico</label>
              <input
                type="email"
                required
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="juan@empresa.com"
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Contraseña para Iniciar Sesión</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Crea tu contraseña (ej. miClave123)"
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Rol en el Equipo</label>
              <select
                value={regRole}
                onChange={(e) => setRegRole(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="Desarrollador">Desarrollador</option>
                <option value="Administrador">Administrador</option>
                <option value="Vendedor">Vendedor</option>
                <option value="Diseñadora UI/UX">Diseñadora UI/UX</option>
                <option value="Marketing Manager">Marketing Manager</option>
              </select>
            </div>

            {/* Photo Attachment / Webcam Capture */}
            <ImagePicker
              value={regAvatar}
              onChange={(img) => setRegAvatar(img)}
              label="Foto de Perfil (Subir Foto o Tomar Foto)"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl text-sm transition shadow-lg shadow-emerald-600/25 flex items-center justify-center space-x-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>{loading ? 'Registrando...' : 'Crear Perfil e Iniciar Sesión'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
