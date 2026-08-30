import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { KPICard } from './components/KPICard';
import { AnalyticsCharts } from './components/AnalyticsCharts';
import { RecentTransactions } from './components/RecentTransactions';
import { UsersView } from './components/UsersView';
import { SettingsView } from './components/SettingsView';
import { SalesView } from './components/SalesView';
import { AnalyticsView } from './components/AnalyticsView';
import { ImportBatchesView } from './components/ImportBatchesView';
import { InventoryView } from './components/InventoryView';
import { LoginView } from './components/LoginView';
import { fetchDashboardStatsApi, fetchInventory, fetchTransactions, fetchBatches, fetchUsers, verifySessionApi, DashboardStats, User } from './services/api';
import { exportViewPdf } from './utils/pdfExport';
import { DollarSign, Boxes, Layers, PackageCheck, CheckCircle } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('nexus_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [darkMode, setDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState('inventory');
  const [searchTerm, setSearchTerm] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Temporarily redirect dashboard and analytics to inventory
  useEffect(() => {
    if (activeTab === 'dashboard' || activeTab === 'analytics') {
      setActiveTab('inventory');
    }
  }, [activeTab]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalSales: 0,
    completedSalesCount: 0,
    totalSkus: 0,
    totalStock: 0,
    inventoryValue: 0,
    totalImportExpenses: 0,
    customsTaxPaid: 0,
    shippingPaid: 0,
    totalBatchesCount: 0
  });

  // Strict Security Session Guard: Check if profile exists and is active in SQLite
  useEffect(() => {
    const checkSecuritySession = async () => {
      if (!currentUser) return;
      const res = await verifySessionApi(currentUser.id, currentUser.email || currentUser.name);
      if (!res.valid) {
        localStorage.removeItem('nexus_user');
        setCurrentUser(null);
        setShowToast(false);
      } else if (res.user) {
        if (JSON.stringify(res.user) !== JSON.stringify(currentUser)) {
          setCurrentUser(res.user);
          localStorage.setItem('nexus_user', JSON.stringify(res.user));
        }
      }
    };

    checkSecuritySession();
  }, [activeTab]);

  const loadDashboardStats = async () => {
    try {
      const stats = await fetchDashboardStatsApi();
      if (stats) {
        setDashboardStats(stats);
      }
    } catch {
      // fallback
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadDashboardStats();
    }
  }, [activeTab, currentUser]);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  // Auto-switch Vendedor user to inventory if on an unauthorized tab
  useEffect(() => {
    if (currentUser?.role === 'Vendedor') {
      if (activeTab !== 'inventory' && activeTab !== 'sales') {
        setActiveTab('inventory');
      }
    }
  }, [currentUser, activeTab]);

  const handleLoginSuccess = (user: User) => {
    setShowToast(false);
    setToastMessage('');
    setCurrentUser(user);
    if (user.role === 'Vendedor') {
      setActiveTab('inventory');
    }
    try {
      localStorage.setItem('nexus_user', JSON.stringify(user));
    } catch {}
  };

  const handleUpdateUser = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    try {
      localStorage.setItem('nexus_user', JSON.stringify(updatedUser));
    } catch {}
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('nexus_user');
    } catch {}
  };

  const handleExportPDF = async () => {
    try {
      const [invData, trxsData, batchesData, usersData] = await Promise.all([
        fetchInventory().catch(() => []),
        fetchTransactions().catch(() => []),
        fetchBatches().catch(() => []),
        fetchUsers().catch(() => [])
      ]);

      exportViewPdf({
        activeTab,
        user: currentUser,
        stats: dashboardStats,
        inventory: Array.isArray(invData) ? invData : [],
        transactions: Array.isArray(trxsData) ? trxsData : [],
        batches: Array.isArray(batchesData) ? batchesData : [],
        users: Array.isArray(usersData) ? usersData : []
      });

      setToastMessage(`¡Reporte PDF de ${activeTab.toUpperCase()} listo para imprimir!`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
    } catch {
      exportViewPdf({
        activeTab,
        user: currentUser,
        stats: dashboardStats,
        inventory: [],
        transactions: [],
        batches: [],
        users: []
      });
    }
  };

  // Render Login Screen if No User Logged In
  if (!currentUser) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className={`min-h-screen flex flex-col md:flex-row transition-colors duration-200 ${darkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-100 text-slate-800'}`}>
      
      {/* Sidebar Navigation */}
      <Sidebar
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        <Header
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          onExport={handleExportPDF}
          currentUser={currentUser}
          onLogout={handleLogout}
          activeTab={activeTab}
        />

        {/* Global Toast Notification */}
        {showToast && (
          <div className="fixed bottom-6 right-6 z-50 bg-blue-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center space-x-3 border border-blue-400/30 animate-bounce">
            <CheckCircle className="w-5 h-5 text-emerald-300" />
            <span className="text-sm font-semibold">{toastMessage}</span>
          </div>
        )}

        <div className="p-4 sm:p-6 pb-24 md:pb-6 space-y-6 min-h-[calc(100vh-80px)]">
          
          {/* TAB 1: DASHBOARD DINÁMICO DESDE SQLITE */}
          {activeTab === 'dashboard' && (
            <>
              {/* Dynamic Live KPI Metrics (Horizontal Scrollable Ribbon on Mobile) */}
              <div className="flex overflow-x-auto gap-4 scrollbar-none pb-2 snap-x snap-mandatory md:grid md:grid-cols-2 lg:grid-cols-4 md:overflow-visible">
                <div className="shrink-0 w-[270px] sm:w-auto snap-start">
                  <KPICard
                    title="Ventas Totales (Ingresos)"
                    value={`$${dashboardStats.totalSales.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD`}
                    change={`${dashboardStats.completedSalesCount} Ventas`}
                    isPositive={true}
                    comparisonText="registradas en SQLite"
                    icon={DollarSign}
                    iconBgColor="bg-emerald-500/10"
                    iconTextColor="text-emerald-400"
                  />
                </div>
                <div className="shrink-0 w-[270px] sm:w-auto snap-start">
                  <KPICard
                    title="Stock Total en Almacén"
                    value={`${dashboardStats.totalStock} Unidades`}
                    change="Disponible"
                    isPositive={true}
                    comparisonText="físico en inventario"
                    icon={PackageCheck}
                    iconBgColor="bg-indigo-500/10"
                    iconTextColor="text-indigo-400"
                  />
                </div>
                <div className="shrink-0 w-[270px] sm:w-auto snap-start">
                  <KPICard
                    title="Gastos Importación (Aduana+Flete)"
                    value={`$${dashboardStats.totalImportExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD`}
                    change={`${dashboardStats.totalBatchesCount} Lotes`}
                    isPositive={false}
                    comparisonText={`Aduana: $${dashboardStats.customsTaxPaid} | Flete: $${dashboardStats.shippingPaid}`}
                    icon={Layers}
                    iconBgColor="bg-blue-500/10"
                    iconTextColor="text-blue-400"
                  />
                </div>
                <div className="shrink-0 w-[270px] sm:w-auto snap-start">
                  <KPICard
                    title="Productos / SKUs Únicos"
                    value={`${dashboardStats.totalSkus} SKUs`}
                    change="Catálogos"
                    isPositive={true}
                    comparisonText="sin duplicados en la BD"
                    icon={Boxes}
                    iconBgColor="bg-amber-500/10"
                    iconTextColor="text-amber-400"
                  />
                </div>
              </div>

              {/* Charts Section */}
              <AnalyticsCharts stats={dashboardStats} />

              {/* Recent Transactions Table */}
              <RecentTransactions searchTerm={searchTerm} />
            </>
          )}

          {/* TAB: INVENTARIO & STOCK */}
          {activeTab === 'inventory' && <InventoryView currentUser={currentUser} />}

          {/* TAB: LOTES & ADUANA */}
          {activeTab === 'batches' && <ImportBatchesView />}

          {/* TAB 2: ANALÍTICAS */}
          {activeTab === 'analytics' && <AnalyticsView />}

          {/* TAB 3: USUARIOS */}
          {activeTab === 'users' && <UsersView />}

          {/* TAB 4: VENTAS */}
          {activeTab === 'sales' && <SalesView />}

          {/* TAB 5: CONFIGURACIÓN EXCLUSIVA PARA EL USUARIO LOGUEADO */}
          {activeTab === 'settings' && <SettingsView currentUser={currentUser} onUpdateUser={handleUpdateUser} />}

        </div>
      </main>
    </div>
  );
}
