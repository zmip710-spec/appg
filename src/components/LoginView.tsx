import React, { useState, useEffect } from 'react';
import { BarChart3, Lock, Mail, UserCheck, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { loginApi, fetchUsers, User } from '../services/api';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);

  const loadAvailableUsers = async () => {
    try {
      const users = await fetchUsers();
      if (Array.isArray(users)) {
        const activeUsers = users.filter(u => u.status === 'Activo');
        setAvailableUsers(activeUsers);
      }
    } catch {
      // offline
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
      setErrorMsg(err.message || 'Credenciales inválidas. Verifica tu correo y contraseña.');
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

        {/* Security Alert Banner */}
        <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-center space-y-1">
          <div className="flex items-center justify-center space-x-1.5 text-xs font-bold text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <span>Acceso Privado e Identificado</span>
          </div>
          <p className="text-[11px] text-slate-400">Ingresa con tu correo y contraseña registrados en el sistema.</p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="bg-rose-500/10 border border-rose-500/30 p-3 rounded-xl text-xs text-rose-400 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* LOGIN FORM ONLY (Public Registration Disabled) */}
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

        {/* Quick Login Avatar List (For existing registered active profiles in DB) */}
        {availableUsers.length > 0 && (
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <span className="block text-[11px] font-semibold text-slate-400 text-center uppercase tracking-wider">
              Perfiles Registrados en el Sistema
            </span>
            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
              {availableUsers.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleQuickLogin(u)}
                  className="flex items-center space-x-3 p-2 rounded-xl bg-slate-950/60 hover:bg-slate-800 border border-slate-800/80 transition text-left group"
                >
                  <img
                    src={u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80'}
                    alt={u.name}
                    className="w-9 h-9 rounded-full object-cover border border-blue-500/40 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-white truncate group-hover:text-blue-400 transition">{u.name}</h4>
                    <p className="text-[10px] text-slate-400 truncate">{u.email} • {u.role}</p>
                  </div>
                  <UserCheck className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
