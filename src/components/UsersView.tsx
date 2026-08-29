import React, { useState, useEffect } from 'react';
import { Search, Plus, Filter, Shield, Database, Trash2, UserPlus, Lock } from 'lucide-react';
import { fetchUsers, createUser, toggleUserStatusApi, deleteUserApi, User } from '../services/api';
import { ImagePicker } from './ImagePicker';

export const UsersView: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'Desarrollador', avatar: '' });
  const [isDbConnected, setIsDbConnected] = useState(false);

  const loadDataFromDb = async () => {
    setIsLoading(true);
    try {
      const dbUsers = await fetchUsers();
      if (Array.isArray(dbUsers)) {
        setUsers(dbUsers);
        setIsDbConnected(true);
      }
    } catch {
      setIsDbConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDataFromDb();
  }, []);

  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = filterRole === 'all' || u.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const toggleUserStatus = async (id: string | number) => {
    try {
      await toggleUserStatusApi(id);
      await loadDataFromDb();
    } catch {
      setUsers(users.map(u => u.id === id ? { ...u, status: u.status === 'Activo' ? 'Inactivo' : 'Activo' } : u));
    }
  };

  const handleDeleteUser = async (id: string | number) => {
    try {
      await deleteUserApi(id);
      await loadDataFromDb();
    } catch {
      setUsers(users.filter(u => u.id !== id));
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name || !newUser.email) return;

    try {
      await createUser({
        ...newUser,
        password: newUser.password || '123456'
      });
      await loadDataFromDb();
      setIsDbConnected(true);
    } catch {
      const localCreated: User = {
        id: Date.now(),
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        status: 'Activo',
        avatar: newUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&q=80',
        lastLogin: 'Ahora mismo',
      };
      setUsers([localCreated, ...users]);
    }

    setNewUser({ name: '', email: '', password: '', role: 'Desarrollador', avatar: '' });
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6 min-h-[500px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-800 p-5 rounded-xl border border-slate-700">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-white">Gestión de Usuarios & Equipo</h2>
            {isDbConnected && (
              <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Database className="w-3 h-3" />
                <span>Base de Datos SQLite Conectada</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">Administra los miembros de tu equipo con contraseñas de acceso y fotos de perfil</p>
        </div>
        <button
          onClick={() => {
            setNewUser({ name: '', email: '', password: '', role: 'Desarrollador', avatar: '' });
            setShowAddModal(true);
          }}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded-lg text-sm transition shadow-lg shadow-blue-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>+ Agregar Usuario</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o correo..."
            className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none"
          >
            <option value="all">Todos los Roles</option>
            <option value="Administrador">Administrador</option>
            <option value="Desarrollador">Desarrollador</option>
            <option value="Diseñadora UI/UX">Diseñadora UI/UX</option>
            <option value="Marketing Manager">Marketing Manager</option>
          </select>
        </div>
      </div>

      {/* MOBILE CARDS VIEW (Visible only on small screens md:hidden) */}
      <div className="md:hidden space-y-3">
        <h3 className="font-bold text-white text-base px-1">Equipo de Trabajo ({filteredUsers.length})</h3>
        {isLoading ? (
          <div className="space-y-3 animate-pulse">
            <div className="bg-slate-800 border border-slate-700 rounded-xl h-20 w-full"></div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl h-20 w-full"></div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 text-center text-slate-400 text-sm">
            No se encontraron usuarios. Haz clic en "+ Agregar Usuario" para registrar uno.
          </div>
        ) : (
          filteredUsers.map((u) => (
            <div key={u.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3 shadow-md">
              <div className="flex items-center space-x-3">
                <img src={u.avatar} alt={u.name} className="w-12 h-12 rounded-full object-cover border-2 border-blue-500 shadow shrink-0" />
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-white text-sm truncate">{u.name}</h4>
                  <span className="text-xs text-slate-400 block truncate">{u.email}</span>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-700 text-slate-200">
                      <Shield className="w-3 h-3 text-blue-400" />
                      <span>{u.role}</span>
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${u.status === 'Activo' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                      {u.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-700/60 text-xs">
                <span className="text-slate-400 text-[10px]">Acceso: {u.lastLogin}</span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => toggleUserStatus(u.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      u.status === 'Activo' ? 'bg-slate-700 text-rose-400 hover:bg-rose-500/20' : 'bg-slate-700 text-emerald-400 hover:bg-emerald-500/20'
                    }`}
                  >
                    {u.status === 'Activo' ? 'Desactivar' : 'Activar'}
                  </button>
                  <button
                    onClick={() => handleDeleteUser(u.id)}
                    className="p-1.5 rounded-lg bg-slate-700 text-slate-400 hover:text-rose-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* DESKTOP TABLE VIEW (Visible on md and larger) */}
      <div className="hidden md:block bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-900/80 text-xs uppercase text-slate-400 font-semibold border-b border-slate-700">
            <tr>
              <th className="px-6 py-3.5">Usuario</th>
              <th className="px-6 py-3.5">Rol</th>
              <th className="px-6 py-3.5">Estado</th>
              <th className="px-6 py-3.5">Último Acceso</th>
              <th className="px-6 py-3.5 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/60">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                  No se encontraron usuarios. Haz clic en "+ Agregar Usuario" para registrar uno.
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-700/40 transition">
                  <td className="px-6 py-4 flex items-center space-x-3">
                    <img src={u.avatar} alt={u.name} className="w-10 h-10 rounded-full object-cover border border-slate-600 shadow" />
                    <div>
                      <span className="font-semibold text-white block">{u.name}</span>
                      <span className="text-xs text-slate-400">{u.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-700 text-slate-200">
                      <Shield className="w-3 h-3 text-blue-400" />
                      <span>{u.role}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${u.status === 'Activo' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-400">{u.lastLogin}</td>
                  <td className="px-6 py-4 text-right flex items-center justify-end space-x-2">
                    <button
                      onClick={() => toggleUserStatus(u.id)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                        u.status === 'Activo' ? 'bg-slate-700 text-rose-400 hover:bg-rose-500/20' : 'bg-slate-700 text-emerald-400 hover:bg-emerald-500/20'
                      }`}
                    >
                      {u.status === 'Activo' ? 'Desactivar' : 'Activar'}
                    </button>
                    <button
                      onClick={() => handleDeleteUser(u.id)}
                      className="p-1.5 rounded-lg bg-slate-700 text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 transition"
                      title="Eliminar usuario de SQLite"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add User Modal with Password Input & ImagePicker */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-700 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-blue-400" />
                <span>Agregar Nuevo Usuario a SQLite</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="Ej. Juan Pérez"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="juan@empresa.com"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Contraseña Inicial</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="Predeterminada: 123456"
                    className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Rol en el Equipo</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Desarrollador">Desarrollador</option>
                  <option value="Administrador">Administrador</option>
                  <option value="Vendedor">Vendedor</option>
                  <option value="Diseñadora UI/UX">Diseñadora UI/UX</option>
                  <option value="Marketing Manager">Marketing Manager</option>
                  <option value="Soporte Técnico">Soporte Técnico</option>
                </select>
              </div>

              {/* Photo Picker for User Profile Avatar */}
              <ImagePicker
                value={newUser.avatar}
                onChange={(img) => setNewUser({ ...newUser, avatar: img })}
                label="Foto de Perfil (Subir Foto o Tomar con Cámara)"
              />

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-700 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-sm transition shadow-lg shadow-blue-600/20"
                >
                  Guardar en SQLite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
