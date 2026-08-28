import React, { useState, useEffect } from 'react';
import { TrendingUp, Layers, PackageCheck, AlertTriangle, ArrowRight, DollarSign, Database, Image as ImageIcon, BarChart3 } from 'lucide-react';
import { fetchDashboardStatsApi, fetchInventory, fetchBatches, DashboardStats, InventoryProduct, ImportBatch } from '../services/api';

export const AnalyticsView: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [inventory, setInventory] = useState<InventoryProduct[]>([]);
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [isDbConnected, setIsDbConnected] = useState(false);

  const loadAnalyticsData = async () => {
    try {
      const statsData = await fetchDashboardStatsApi();
      const invData = await fetchInventory();
      const batchData = await fetchBatches();

      if (statsData) setStats(statsData);
      if (Array.isArray(invData)) setInventory(invData);
      if (Array.isArray(batchData)) setBatches(batchData);
      setIsDbConnected(true);
    } catch {
      setIsDbConnected(false);
    }
  };

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const totalSales = stats?.totalSales || 0;
  const totalStock = stats?.totalStock || 0;
  const inventoryValue = stats?.inventoryValue || 0;
  const totalImportExpenses = stats?.totalImportExpenses || 0;
  const customsTaxPaid = stats?.customsTaxPaid || 0;
  const shippingPaid = stats?.shippingPaid || 0;

  // Percentage breakdown of import expenses (Customs vs Shipping)
  const customsTaxPercentage = totalImportExpenses > 0 ? ((customsTaxPaid / totalImportExpenses) * 100).toFixed(1) : '0';
  const shippingPercentage = totalImportExpenses > 0 ? ((shippingPaid / totalImportExpenses) * 100).toFixed(1) : '0';

  // Average Landed Cost markup across all items
  const avgUnitCost = inventory.length > 0
    ? (inventory.reduce((sum, item) => sum + item.unitCost, 0) / inventory.length).toFixed(2)
    : '0.00';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-800 p-5 rounded-xl border border-slate-700">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-white flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-blue-400" />
              <span>Analíticas del Negocio & Business Intelligence</span>
            </h2>
            {isDbConnected && (
              <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Database className="w-3 h-3" />
                <span>SQLite Conectado</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">Análisis de Landed Cost, distribución de gastos de importación y salud de stock por SKU</p>
        </div>
      </div>

      {/* Top BI KPI Grid (Horizontal Scrollable Ribbon on Mobile) */}
      <div className="flex overflow-x-auto gap-4 scrollbar-none pb-2 snap-x snap-mandatory sm:grid sm:grid-cols-3 sm:overflow-visible">
        <div className="shrink-0 w-[270px] sm:w-auto snap-start bg-slate-800 p-5 rounded-xl border border-slate-700">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-slate-400 uppercase">Costo Promedio Landed</span>
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg"><DollarSign className="w-5 h-5" /></div>
          </div>
          <h3 className="text-2xl font-bold text-white mt-3">${avgUnitCost} USD</h3>
          <span className="text-xs text-blue-400">Por unidad en almacén</span>
        </div>

        <div className="shrink-0 w-[270px] sm:w-auto snap-start bg-slate-800 p-5 rounded-xl border border-slate-700">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-slate-400 uppercase">Gastos Aduana vs Flete</span>
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg"><Layers className="w-5 h-5" /></div>
          </div>
          <h3 className="text-2xl font-bold text-white mt-3">${totalImportExpenses.toFixed(2)} USD</h3>
          <div className="text-xs text-slate-400 mt-1 flex space-x-2">
            <span>🏛️ Aduana: {customsTaxPercentage}%</span>
            <span>•</span>
            <span>🚚 Flete: {shippingPercentage}%</span>
          </div>
        </div>

        <div className="shrink-0 w-[270px] sm:w-auto snap-start bg-slate-800 p-5 rounded-xl border border-slate-700">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-slate-400 uppercase">Valoración Total del Almacén</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg"><PackageCheck className="w-5 h-5" /></div>
          </div>
          <h3 className="text-2xl font-bold text-white mt-3">${inventoryValue.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD</h3>
          <span className="text-xs text-emerald-400 font-semibold">{totalStock} Unidades en Inventario</span>
        </div>
      </div>

      {/* Flujo Financiero de Mercancía (De Compra a Venta) */}
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 space-y-4">
        <h3 className="text-base font-bold text-white flex items-center space-x-2">
          <TrendingUp className="w-5 h-5 text-emerald-400" />
          <span>Flujo de Valor de Mercancía (Compra FOB ➔ Importación ➔ Inventario ➔ Venta)</span>
        </h3>

        <div className="flex overflow-x-auto gap-4 scrollbar-none pb-2 snap-x snap-mandatory md:grid md:grid-cols-4 md:overflow-visible pt-2">
          <div className="shrink-0 w-[240px] md:w-auto snap-start bg-slate-900/90 p-4 rounded-xl border border-slate-700 relative flex flex-col justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">1. Valor FOB Compra</span>
              <h4 className="text-lg font-bold text-white mt-1">${(inventoryValue - totalImportExpenses > 0 ? inventoryValue - totalImportExpenses : inventoryValue * 0.75).toFixed(2)} USD</h4>
            </div>
            <span className="text-[11px] text-slate-400 mt-3 block">Costo base de fábrica</span>
          </div>

          <div className="shrink-0 w-[240px] md:w-auto snap-start bg-slate-900/90 p-4 rounded-xl border border-indigo-500/40 relative flex flex-col justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-indigo-400">2. Gastos Importación</span>
              <h4 className="text-lg font-bold text-indigo-400 mt-1">${totalImportExpenses.toFixed(2)} USD</h4>
            </div>
            <span className="text-[11px] text-slate-400 mt-3 block">Aduana (${customsTaxPaid.toFixed(0)}) + Flete (${shippingPaid.toFixed(0)})</span>
          </div>

          <div className="shrink-0 w-[240px] md:w-auto snap-start bg-slate-900/90 p-4 rounded-xl border border-blue-500/40 relative flex flex-col justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-blue-400">3. Valor Landed en Almacén</span>
              <h4 className="text-lg font-bold text-blue-400 mt-1">${inventoryValue.toFixed(2)} USD</h4>
            </div>
            <span className="text-[11px] text-slate-400 mt-3 block">{totalStock} unidades en stock</span>
          </div>

          <div className="shrink-0 w-[240px] md:w-auto snap-start bg-slate-900/90 p-4 rounded-xl border border-emerald-500/40 relative flex flex-col justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-400">4. Ventas Realizadas</span>
              <h4 className="text-lg font-bold text-emerald-400 mt-1">${totalSales.toFixed(2)} USD</h4>
            </div>
            <span className="text-[11px] text-slate-400 mt-3 block">Ingresos por ventas de SQLite</span>
          </div>
        </div>
      </div>

      {/* Tabla de Salud y Rendimiento por SKU */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-700 flex justify-between items-center">
          <h3 className="font-bold text-white text-base">Análisis y Salud de Stock por Código SKU</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/80 text-xs uppercase text-slate-400 font-semibold border-b border-slate-700">
              <tr>
                <th className="px-6 py-3.5">Foto</th>
                <th className="px-6 py-3.5">Código SKU</th>
                <th className="px-6 py-3.5">Producto</th>
                <th className="px-6 py-3.5">Categoría</th>
                <th className="px-6 py-3.5">Costo Landed Unitario</th>
                <th className="px-6 py-3.5">Stock Físico</th>
                <th className="px-6 py-3.5">Valor Total</th>
                <th className="px-6 py-3.5 text-right">Estado de Alerta de Reorden</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60">
              {inventory.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-400">
                    No hay productos registrados en SQLite.
                  </td>
                </tr>
              ) : (
                inventory.map((prod) => {
                  let alertBadge = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                  let alertText = '🟢 Stock Saludable';
                  if (prod.stock === 0) {
                    alertBadge = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
                    alertText = '🔴 Agotado - Requiere Lote';
                  } else if (prod.stock <= 10) {
                    alertBadge = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
                    alertText = '🟡 Reordenar Pronto';
                  }

                  const itemValue = prod.stock * prod.unitCost;
                  const defaultImg = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=150&q=80';

                  return (
                    <tr key={prod.id} className="hover:bg-slate-700/40 transition">
                      <td className="px-6 py-3">
                        <img
                          src={prod.image || defaultImg}
                          alt={prod.name}
                          className="w-9 h-9 rounded-lg object-cover border border-slate-700 shadow"
                        />
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-blue-400">{prod.sku}</td>
                      <td className="px-6 py-4 font-semibold text-white">{prod.name}</td>
                      <td className="px-6 py-4 text-xs text-slate-300">{prod.category || 'General'}</td>
                      <td className="px-6 py-4 font-semibold text-emerald-400">${prod.unitCost.toFixed(2)} USD</td>
                      <td className="px-6 py-4 font-bold text-white">{prod.stock} uds</td>
                      <td className="px-6 py-4 font-bold text-slate-200">${itemValue.toFixed(2)} USD</td>
                      <td className="px-6 py-4 text-right">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${alertBadge}`}>
                          {alertText}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
