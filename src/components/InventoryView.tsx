import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Plus,
  Trash2,
  Search,
  PackageCheck,
  DollarSign,
  Minus,
  Database,
  Camera,
  Eye,
  TrendingUp,
  Tag,
  Info,
  Calendar,
  Sliders,
  ShieldAlert,
  AlertTriangle,
  Settings
} from 'lucide-react';
import { InventoryProduct, fetchInventory, createInventoryApi, deleteInventoryApi, updateStockApi, updateProductImageApi, PriceHistoryEntry, fetchPriceHistoryApi } from '../services/api';
import { ImagePicker } from './ImagePicker';

const fallbackInventory: InventoryProduct[] = [];

export const InventoryView: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isDbConnected, setIsDbConnected] = useState(false);
  const [editingProduct, setEditingProduct] = useState<InventoryProduct | null>(null);
  const [selectedDetailProduct, setSelectedDetailProduct] = useState<InventoryProduct | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [historyProduct, setHistoryProduct] = useState<InventoryProduct | null>(null);
  const [stockManageProduct, setStockManageProduct] = useState<InventoryProduct | null>(null);
  const [stockChangeAmount, setStockChangeAmount] = useState<string>('1');
  const [deleteConfirmProduct, setDeleteConfirmProduct] = useState<InventoryProduct | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryEntry[]>([]);
  const [editImageUrl, setEditImageUrl] = useState<string>('');

  // Form State for new SKU/Product
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('General');
  const [stock, setStock] = useState<string>('10');
  const [unitCost, setUnitCost] = useState<string>('10.0');
  const [image, setImage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState('');

  const loadInventory = async () => {
    setIsLoading(true);
    try {
      const data = await fetchInventory();
      if (Array.isArray(data)) {
        setInventory(data);
        setIsDbConnected(true);
      }
    } catch {
      setIsDbConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenPriceHistory = async (product: InventoryProduct) => {
    setHistoryProduct(product);
    setShowHistoryModal(true);
    try {
      const data = await fetchPriceHistoryApi(product.sku, product.name);
      if (Array.isArray(data) && data.length > 0) {
        setPriceHistory(data);
      } else {
        const fallbackEntry: PriceHistoryEntry = {
          id: 1,
          sku: product.sku,
          batchId: 'Registro de Inventario',
          oldCost: product.previousUnitCost || product.unitCost,
          newCost: product.unitCost,
          delta: product.priceChangeDelta || 0,
          pct: product.priceChangePct || 0,
          changeDate: product.lastUpdated || 'Reciente'
        };
        setPriceHistory([fallbackEntry]);
      }
    } catch {
      const fallbackEntry: PriceHistoryEntry = {
        id: 1,
        sku: product.sku,
        batchId: 'Registro de Inventario',
        oldCost: product.previousUnitCost || product.unitCost,
        newCost: product.unitCost,
        delta: product.priceChangeDelta || 0,
        pct: product.priceChangePct || 0,
        changeDate: product.lastUpdated || 'Reciente'
      };
      setPriceHistory([fallbackEntry]);
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  useEffect(() => {
    if (selectedDetailProduct) {
      fetchPriceHistoryApi(selectedDetailProduct.sku).then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setPriceHistory(data);
        } else {
          const fallbackEntry: PriceHistoryEntry = {
            id: 1,
            sku: selectedDetailProduct.sku,
            batchId: 'Registro de Inventario',
            oldCost: selectedDetailProduct.previousUnitCost || selectedDetailProduct.unitCost,
            newCost: selectedDetailProduct.unitCost,
            delta: selectedDetailProduct.priceChangeDelta || 0,
            pct: selectedDetailProduct.priceChangePct || 0,
            changeDate: selectedDetailProduct.lastUpdated || 'Reciente'
          };
          setPriceHistory([fallbackEntry]);
        }
      }).catch(() => {
        const fallbackEntry: PriceHistoryEntry = {
          id: 1,
          sku: selectedDetailProduct.sku,
          batchId: 'Registro de Inventario',
          oldCost: selectedDetailProduct.previousUnitCost || selectedDetailProduct.unitCost,
          newCost: selectedDetailProduct.unitCost,
          delta: selectedDetailProduct.priceChangeDelta || 0,
          pct: selectedDetailProduct.priceChangePct || 0,
          changeDate: selectedDetailProduct.lastUpdated || 'Reciente'
        };
        setPriceHistory([fallbackEntry]);
      });
    } else {
      setPriceHistory([]);
    }
  }, [selectedDetailProduct]);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!sku || !name) {
      setErrorMessage('El Código SKU y el Nombre del producto son requeridos.');
      return;
    }

    try {
      const created = await createInventoryApi({
        sku: sku.trim().toUpperCase(),
        name: name.trim(),
        category: category.trim() || 'General',
        stock: Math.max(0, parseInt(stock) || 0),
        unitCost: Math.max(0, parseFloat(unitCost) || 0),
        image: image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=150&q=80'
      });
      setInventory([...inventory, created]);
      setShowAddModal(false);
      resetForm();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al guardar producto en SQLite.');
    }
  };

  const handleAdjustStock = async (id: number | string, delta: number) => {
    try {
      const updated = await updateStockApi(id, delta);
      setInventory(inventory.map(i => i.id === id ? { ...i, stock: updated.stock } : i));
    } catch {
      setInventory(inventory.map(i => i.id === id ? { ...i, stock: Math.max(0, i.stock + delta) } : i));
    }
  };

  const handleDeleteProduct = async (id: number | string) => {
    try {
      await deleteInventoryApi(id);
    } catch {
      // fallback
    }
    setInventory(inventory.filter(i => i.id !== id));
  };

  const handleSaveProductImage = async () => {
    if (!editingProduct) return;
    try {
      await updateProductImageApi(editingProduct.id, editImageUrl);
      setInventory(inventory.map(p => p.id === editingProduct.id ? { ...p, image: editImageUrl } : p));
    } catch (err) {
      console.error('Error al actualizar imagen:', err);
    }
    setEditingProduct(null);
  };

  const resetForm = () => {
    setSku('');
    setName('');
    setCategory('General');
    setStock('10');
    setUnitCost('10.0');
    setImage('');
    setErrorMessage('');
  };

  const filteredInventory = inventory.filter(
    (item) =>
      item.sku.toLowerCase().includes(search.toLowerCase()) ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.category && item.category.toLowerCase().includes(search.toLowerCase()))
  );

  const totalStockUnits = inventory.reduce((sum, item) => sum + item.stock, 0);
  const totalInventoryValue = inventory.reduce((sum, item) => sum + item.stock * item.unitCost, 0);
  const totalInventoryValueGtq = totalInventoryValue * 7.80;
  const totalUniqueSkus = inventory.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-800 p-5 rounded-xl border border-slate-700">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-white">Inventario Consolidado & Detalle de Stock</h2>
            {isDbConnected && (
              <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Database className="w-3 h-3" />
                <span>Base de Datos SQLite Conectada</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">Ficha técnica detallada por producto: Costo Landed, Precio Venta Sugerido (+15%), Variación % y Valoración GTQ/USD</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por SKU o Nombre..."
              className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>

          <button
            onClick={() => {
              setErrorMessage('');
              setShowAddModal(true);
            }}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded-lg text-sm transition shadow-lg shadow-blue-600/20 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nuevo Producto / SKU</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards (Horizontal Scrollable Ribbon on Mobile) */}
      <div className="flex overflow-x-auto gap-4 scrollbar-none pb-2 snap-x snap-mandatory sm:grid sm:grid-cols-3 sm:overflow-visible">
        <div className="shrink-0 w-[270px] sm:w-auto snap-start bg-slate-800 p-5 rounded-xl border border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase">Productos Únicos (SKUs)</span>
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg"><Boxes className="w-5 h-5" /></div>
          </div>
          <h3 className="text-2xl font-bold text-white mt-3">{totalUniqueSkus} Catálogos</h3>
          <span className="text-xs text-slate-400">Sin duplicados en la BD</span>
        </div>

        <div className="shrink-0 w-[270px] sm:w-auto snap-start bg-slate-800 p-5 rounded-xl border border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase">Stock Total en Almacén</span>
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg"><PackageCheck className="w-5 h-5" /></div>
          </div>
          <h3 className="text-2xl font-bold text-white mt-3">{totalStockUnits} Unidades</h3>
          <span className="text-xs text-indigo-400 font-medium">Acumuladas en SQLite</span>
        </div>

        <div className="shrink-0 w-[270px] sm:w-auto snap-start bg-slate-800 p-5 rounded-xl border border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase">Valor Total del Inventario</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg"><DollarSign className="w-5 h-5" /></div>
          </div>
          <h3 className="text-xl font-bold text-white mt-2">${totalInventoryValue.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD</h3>
          <span className="font-mono text-xs font-extrabold text-emerald-400 block mt-0.5">
            Q {totalInventoryValueGtq.toLocaleString('en-US', { minimumFractionDigits: 2 })} GTQ
          </span>
          <span className="text-[10px] text-slate-400 block mt-1">Calculado a costo promedio (Tasa Q 7.80/USD)</span>
        </div>
      </div>

      {/* MOBILE CARDS VIEW (Visible only on small screens md:hidden) */}
      <div className="md:hidden space-y-4">
        <h3 className="font-bold text-white text-base px-1">Catálogo Detallado ({filteredInventory.length})</h3>
        {isLoading ? (
          <div className="space-y-3 animate-pulse">
            <div className="bg-slate-800 border border-slate-700 rounded-xl h-24 w-full"></div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl h-24 w-full"></div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl h-24 w-full"></div>
          </div>
        ) : filteredInventory.length === 0 ? (
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 text-center text-slate-400 text-sm">
            No se encontraron productos en el inventario. Haz clic en "+ Nuevo Producto / SKU" para agregar uno.
          </div>
        ) : (
          filteredInventory.map((item) => {
            let stockBadge = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            let stockLabel = 'En Stock';
            if (item.stock === 0) {
              stockBadge = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
              stockLabel = 'Agotado';
            } else if (item.stock <= 10) {
              stockBadge = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
              stockLabel = 'Stock Bajo';
            }

            const totalValueUsd = item.stock * item.unitCost;
            const totalValueGtq = totalValueUsd * 7.80;
            const unitCostGtq = item.unitCost * 7.80;
            const sellingPriceUsd = item.unitCost * 1.15;
            const sellingPriceGtq = sellingPriceUsd * 7.80;
            const defaultImg = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=150&q=80';

            return (
              <div key={item.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3 shadow-md">
                <div className="flex items-center space-x-3">
                  <div className="relative group shrink-0">
                    <img
                      src={item.image || defaultImg}
                      alt={item.name}
                      className="w-16 h-16 rounded-xl object-cover border border-slate-600 shadow cursor-pointer"
                      onClick={() => setSelectedDetailProduct(item)}
                    />
                    <button
                      onClick={() => {
                        setEditingProduct(item);
                        setEditImageUrl(item.image || defaultImg);
                      }}
                      className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center text-white"
                      title="Cambiar Foto"
                    >
                      <Camera className="w-5 h-5 text-white" />
                    </button>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-mono text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                        {item.sku}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${stockBadge}`}>
                        {stockLabel}
                      </span>
                    </div>
                    <h4 className="font-bold text-white text-sm truncate">{item.name}</h4>
                    <span className="text-xs text-slate-400 block">{item.category || 'General'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-slate-900/60 p-2.5 rounded-lg border border-slate-700/60 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Existencias</span>
                    <span className="font-bold text-white text-sm">{item.stock} uds</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Costo Landed Unitario</span>
                    <span className="font-bold text-white text-xs block">${item.unitCost.toFixed(2)} USD</span>
                    <span className="font-mono font-extrabold text-emerald-400 text-[11px] block">Q {unitCostGtq.toFixed(2)} GTQ</span>
                  </div>
                  <div className="col-span-2 bg-emerald-950/40 p-2 rounded border border-emerald-500/30 flex justify-between items-center">
                    <div>
                      <span className="text-emerald-400 block text-[10px] font-bold uppercase">🏷️ Precio Venta Sugerido (+15%)</span>
                      <span className="font-bold text-white text-xs">${sellingPriceUsd.toFixed(2)} USD</span>
                    </div>
                    <span className="font-mono font-extrabold text-emerald-400 text-sm">Q {sellingPriceGtq.toFixed(2)} GTQ</span>
                  </div>
                  {item.priceChangeDelta !== undefined && item.priceChangeDelta !== 0 && (
                    <div className="col-span-2">
                      <span className={`inline-block w-full px-2 py-1 rounded text-[10px] font-bold border text-center ${
                        item.priceChangeDelta > 0 
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}>
                        {item.priceChangeDelta > 0 ? `📈 Variación de Costo: +$${item.priceChangeDelta.toFixed(2)} (+${item.priceChangePct}%)` : `📉 Variación de Costo: -$${Math.abs(item.priceChangeDelta).toFixed(2)} (${item.priceChangePct}%)`}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-700/60">
                  <button
                    onClick={() => handleOpenPriceHistory(item)}
                    className="p-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg border border-blue-500/40 transition shadow-sm active:scale-95 flex items-center justify-center"
                    title="Ver Histórico de Variaciones de Precios"
                  >
                    <Eye className="w-4 h-4 text-blue-400" />
                  </button>

                  <button
                    onClick={() => {
                      setStockManageProduct(item);
                      setStockChangeAmount('1');
                    }}
                    className="p-2 bg-slate-700 hover:bg-slate-600 text-amber-400 border border-slate-600/80 rounded-lg transition shadow-sm active:scale-95 flex items-center justify-center"
                    title="Ajustar Stock y Opciones"
                  >
                    <Sliders className="w-4 h-4 text-amber-400" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* DESKTOP TABLE VIEW (Visible only on md and larger) */}
      <div className="hidden md:block bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-700 flex justify-between items-center">
          <h3 className="font-bold text-white text-base">Catálogo de Productos ({filteredInventory.length})</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/80 text-xs uppercase text-slate-400 font-semibold border-b border-slate-700">
              <tr>
                <th className="px-5 py-3">Foto</th>
                <th className="px-5 py-3">SKU</th>
                <th className="px-5 py-3">Producto</th>
                <th className="px-5 py-3">Categoría</th>
                <th className="px-5 py-3">Stock</th>
                <th className="px-5 py-3">Costo Landed</th>
                <th className="px-5 py-3 bg-emerald-950/30 border-l border-emerald-500/20 text-emerald-400">Precio Venta (+15%)</th>
                <th className="px-5 py-3">Valoración Total</th>
                <th className="px-5 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-8 text-center text-slate-400">
                    No se encontraron productos en el inventario.
                  </td>
                </tr>
              ) : (
                filteredInventory.map((item) => {
                  let stockBadge = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                  let stockLabel = 'Disponible';
                  if (item.stock === 0) {
                    stockBadge = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
                    stockLabel = 'Agotado';
                  } else if (item.stock <= 5) {
                    stockBadge = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
                    stockLabel = 'Bajo Stock';
                  }

                  const totalValueUsd = item.stock * item.unitCost;
                  const totalValueGtq = totalValueUsd * 7.80;
                  const unitCostGtq = item.unitCost * 7.80;
                  const sellingPriceUsd = item.unitCost * 1.15;
                  const sellingPriceGtq = sellingPriceUsd * 7.80;
                  const defaultImg = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=150&q=80';

                  return (
                    <tr key={item.id} className="hover:bg-slate-700/40 transition">
                      <td className="px-5 py-3">
                        <div className="relative group w-11 h-11">
                          <img
                            src={item.image || defaultImg}
                            alt={item.name}
                            className="w-11 h-11 rounded-lg object-cover border border-slate-600 shadow cursor-pointer"
                            onClick={() => handleOpenPriceHistory(item)}
                          />
                          <button
                            onClick={() => {
                              setEditingProduct(item);
                              setEditImageUrl(item.image || defaultImg);
                            }}
                            className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-white"
                            title="Cambiar imagen"
                          >
                            <Camera className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-mono font-bold text-blue-400">{item.sku}</td>
                      <td className="px-5 py-4 font-semibold text-white cursor-pointer hover:text-blue-400 transition" onClick={() => handleOpenPriceHistory(item)}>
                        {item.name}
                      </td>
                      <td className="px-5 py-4">
                        <span className="px-2.5 py-1 bg-slate-700 text-slate-300 text-xs rounded-md font-medium">
                          {item.category || 'General'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-white text-base">{item.stock}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${stockBadge}`}>
                            {stockLabel}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-semibold text-white">
                        <span className="block font-bold text-white">${item.unitCost.toFixed(2)} USD</span>
                        <span className="font-mono text-xs font-bold text-emerald-400 block">Q {unitCostGtq.toFixed(2)} GTQ</span>
                        {item.priceChangeDelta !== undefined && item.priceChangeDelta !== 0 && (
                          <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                            item.priceChangeDelta > 0 
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          }`} title={`Costo anterior: $${item.previousUnitCost?.toFixed(2)} USD`}>
                            {item.priceChangeDelta > 0 ? `📈 Variación: +$${item.priceChangeDelta.toFixed(2)} (+${item.priceChangePct}%)` : `📉 Variación: -$${Math.abs(item.priceChangeDelta).toFixed(2)} (${item.priceChangePct}%)`}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 bg-emerald-950/20 border-l border-emerald-500/20">
                        <span className="font-extrabold text-white text-xs block">${sellingPriceUsd.toFixed(2)} USD</span>
                        <span className="font-mono font-extrabold text-emerald-400 text-xs block">Q {sellingPriceGtq.toFixed(2)} GTQ</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="block font-bold text-white">${totalValueUsd.toFixed(2)} USD</span>
                        <span className="font-mono text-xs font-extrabold text-emerald-400 block">Q {totalValueGtq.toLocaleString('en-US', { minimumFractionDigits: 2 })} GTQ</span>
                      </td>
                      <td className="px-5 py-4 text-right flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleOpenPriceHistory(item)}
                          className="p-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/40 rounded-lg transition shadow-sm active:scale-95 flex items-center justify-center"
                          title="Ver Histórico Completo de Variaciones de Precios"
                        >
                          <Eye className="w-4 h-4 text-blue-400" />
                        </button>
                        <button
                          onClick={() => {
                            setStockManageProduct(item);
                            setStockChangeAmount('1');
                          }}
                          className="p-1.5 bg-slate-700 hover:bg-slate-600 text-amber-400 border border-slate-600/80 rounded-lg transition shadow-sm active:scale-95 flex items-center justify-center"
                          title="Ajustar Stock y Opciones"
                        >
                          <Sliders className="w-4 h-4 text-amber-400" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detailed Product Sheet */}
      {selectedDetailProduct && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100000] flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[92vh] flex flex-col p-4 sm:p-6 shadow-2xl overflow-hidden">
            <div className="flex justify-between items-start border-b border-slate-700 pb-3 shrink-0">
              <div className="flex items-center space-x-3">
                <img
                  src={selectedDetailProduct.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=150&q=80'}
                  alt={selectedDetailProduct.name}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover border border-slate-600 shadow"
                />
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded border border-blue-500/20">
                      {selectedDetailProduct.sku}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-700 text-slate-300">
                      {selectedDetailProduct.category || 'General'}
                    </span>
                  </div>
                  <h3 className="font-bold text-white text-base mt-1">{selectedDetailProduct.name}</h3>
                </div>
              </div>
              <button onClick={() => setSelectedDetailProduct(null)} className="text-slate-400 hover:text-white p-1 text-base font-bold">✕</button>
            </div>

            <div className="overflow-y-auto max-h-[calc(92vh-100px)] space-y-4 pt-3 pr-1">

            {/* Metrics Matrix Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-700/80 space-y-1">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Existencias en Almacén</span>
                <span className="font-bold text-white text-base">{selectedDetailProduct.stock} Unidades</span>
                <span className="text-[10px] text-emerald-400 block">✓ Disponible para despacho</span>
              </div>

              <div className="bg-slate-900 p-3 rounded-xl border border-slate-700/80 space-y-1">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Valoración Total Stock</span>
                <span className="font-bold text-white text-sm block">${(selectedDetailProduct.stock * selectedDetailProduct.unitCost).toFixed(2)} USD</span>
                <span className="font-mono font-extrabold text-emerald-400 text-xs block">Q {(selectedDetailProduct.stock * selectedDetailProduct.unitCost * 7.80).toLocaleString('en-US', { minimumFractionDigits: 2 })} GTQ</span>
              </div>

              <div className="bg-slate-900 p-3 rounded-xl border border-slate-700/80 space-y-1">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Costo Landed Unitario</span>
                <span className="font-bold text-white text-sm block">${selectedDetailProduct.unitCost.toFixed(2)} USD</span>
                <span className="font-mono font-extrabold text-emerald-400 text-xs block">Q {(selectedDetailProduct.unitCost * 7.80).toFixed(2)} GTQ</span>
              </div>

              <div className="bg-emerald-950/60 p-3 rounded-xl border border-emerald-500/40 space-y-1">
                <span className="text-emerald-400 block text-[10px] uppercase font-bold">🏷️ Precio Venta Sugerido (+15%)</span>
                <span className="font-extrabold text-white text-sm block">${(selectedDetailProduct.unitCost * 1.15).toFixed(2)} USD</span>
                <span className="font-mono font-extrabold text-emerald-400 text-xs block">Q {(selectedDetailProduct.unitCost * 1.15 * 7.80).toFixed(2)} GTQ</span>
              </div>
            </div>

            {/* Price Change Variation History Timeline */}
            <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-700 space-y-3 text-xs">
              <div className="flex justify-between items-center border-b border-slate-700/80 pb-2">
                <span className="font-bold text-white flex items-center space-x-1.5 text-xs">
                  <TrendingUp className="w-4 h-4 text-blue-400" />
                  <span>Histórico Completo de Variaciones de Costo</span>
                </span>
                <span className="text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded font-mono font-bold border border-blue-500/20">
                  {priceHistory.length} Registros Detallados
                </span>
              </div>

              {priceHistory.length > 0 ? (
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {priceHistory.map((hist, idx) => {
                    const deltaGtq = hist.delta * 7.80;
                    return (
                      <div key={hist.id || idx} className="bg-slate-800/90 p-3 rounded-xl border border-slate-700 space-y-2 text-xs shadow-md">
                        {/* Header row: Batch ID & Date */}
                        <div className="flex items-center justify-between border-b border-slate-700/60 pb-1.5">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-[11px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                              {hist.batchId || 'Lote Directo'}
                            </span>
                            <span className="text-[11px] text-slate-400 flex items-center space-x-1">
                              <Calendar className="w-3 h-3 text-slate-500" />
                              <span>{hist.changeDate}</span>
                            </span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                            hist.delta > 0
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : hist.delta < 0
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-slate-700/50 text-slate-400 border-slate-600'
                          }`}>
                            {hist.delta > 0 ? `📈 Incrementó +${hist.pct}%` : hist.delta < 0 ? `📉 Disminuyó ${hist.pct}%` : '⚪ Precio Inicial'}
                          </span>
                        </div>

                        {/* 3-Column Detailed Price Matrix */}
                        <div className="grid grid-cols-3 gap-2 text-center pt-0.5">
                          {/* 1. Costo Anterior */}
                          <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-700/50 space-y-0.5">
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">Costo Anterior</span>
                            <span className="font-bold text-slate-300 block text-xs">${hist.oldCost.toFixed(2)} USD</span>
                            <span className="font-mono text-[10px] text-slate-400 block">Q {(hist.oldCost * 7.80).toFixed(2)} GTQ</span>
                          </div>

                          {/* 2. Costo Actual */}
                          <div className="bg-slate-900/90 p-2 rounded-lg border border-blue-500/40 space-y-0.5">
                            <span className="text-[10px] text-blue-400 uppercase font-bold block">Costo Actual</span>
                            <span className="font-bold text-white block text-xs">${hist.newCost.toFixed(2)} USD</span>
                            <span className="font-mono text-[10px] text-emerald-400 font-extrabold block">Q {(hist.newCost * 7.80).toFixed(2)} GTQ</span>
                          </div>

                          {/* 3. Diferencia de Variación */}
                          <div className={`p-2 rounded-lg border space-y-0.5 ${
                            hist.delta > 0
                              ? 'bg-amber-950/40 border-amber-500/40'
                              : hist.delta < 0
                                ? 'bg-emerald-950/40 border-emerald-500/40'
                                : 'bg-slate-900/60 border-slate-700/50'
                          }`}>
                            <span className={`text-[10px] uppercase font-bold block ${
                              hist.delta > 0 ? 'text-amber-400' : hist.delta < 0 ? 'text-emerald-400' : 'text-slate-400'
                            }`}>
                              Diferencia
                            </span>
                            <span className={`font-extrabold block text-xs ${
                              hist.delta > 0 ? 'text-amber-400' : hist.delta < 0 ? 'text-emerald-400' : 'text-slate-400'
                            }`}>
                              {hist.delta > 0 ? `+$${hist.delta.toFixed(2)}` : hist.delta < 0 ? `-$${Math.abs(hist.delta).toFixed(2)}` : '$0.00'} USD
                            </span>
                            <span className="font-mono text-[10px] font-bold text-slate-300 block">
                              {hist.delta > 0 ? `+Q ${deltaGtq.toFixed(2)}` : hist.delta < 0 ? `-Q ${Math.abs(deltaGtq).toFixed(2)}` : 'Q 0.00'} GTQ
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-slate-400 text-center py-2 bg-slate-800/50 rounded-lg text-[11px]">
                  El precio de este producto se ha mantenido estable sin variaciones registradas.
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-700">
              <button
                onClick={() => setSelectedDetailProduct(null)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition shadow-lg shadow-blue-600/20"
              >
                Cerrar Ficha
              </button>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Modal Add New Product / SKU directly */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-[100000] flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md max-h-[92vh] flex flex-col p-4 sm:p-6 shadow-2xl overflow-hidden space-y-4">
            <div className="flex justify-between items-center border-b border-slate-700 pb-3 shrink-0">
              <h3 className="font-bold text-white text-base">Registrar Nuevo Producto / SKU</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white text-base font-bold">✕</button>
            </div>

            {errorMessage && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-3 rounded-lg font-medium shrink-0">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleCreateProduct} className="space-y-3 text-xs overflow-y-auto max-h-[calc(92vh-120px)] pr-1">
              <div>
                <label className="block text-slate-400 font-semibold uppercase mb-1">Código SKU Único</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. PROD-005"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-blue-400 font-mono font-bold uppercase focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold uppercase mb-1">Nombre del Producto</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Camisa Formal Manga Larga"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold uppercase mb-1">Categoría</label>
                  <input
                    type="text"
                    placeholder="Ej. Ropa"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold uppercase mb-1">Stock Inic.</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold uppercase mb-1">Costo ($USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0"
                    value={unitCost}
                    onChange={(e) => setUnitCost(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="pt-2">
                <ImagePicker
                  value={image}
                  onChange={(val) => setImage(val)}
                  label="Foto del Producto (Adjuntar o Tomar Foto con Cámara)"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition shadow-lg shadow-blue-600/20"
                >
                  Guardar en SQLite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Quick Change Image */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-700 pb-3">
              <h3 className="font-bold text-white text-base">Actualizar Foto: {editingProduct.name}</h3>
              <button onClick={() => setEditingProduct(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <ImagePicker
              value={editImageUrl}
              onChange={(val) => setEditImageUrl(val)}
              label="Adjuntar archivo de imagen o Usar Cámara Web"
            />

            <div className="flex justify-end space-x-3 pt-3 border-t border-slate-700">
              <button
                onClick={() => setEditingProduct(null)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs rounded-lg font-semibold transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveProductImage}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition shadow-lg shadow-blue-600/20"
              >
                Guardar Foto en BD
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Standalone Dedicated Modal for Price History & Variations */}
      {showHistoryModal && historyProduct && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[100000] flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-800 border-2 border-amber-500/50 rounded-2xl w-full max-w-xl max-h-[92vh] flex flex-col p-4 sm:p-6 shadow-[0_25px_60px_rgba(0,0,0,0.9)] overflow-hidden space-y-4">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-slate-700 pb-3 shrink-0">
              <div className="flex items-center space-x-3">
                <img
                  src={historyProduct.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=150&q=80'}
                  alt={historyProduct.name}
                  className="w-14 h-14 rounded-xl object-cover border border-slate-600 shadow"
                />
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/20">
                      SKU: {historyProduct.sku}
                    </span>
                    <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                      {priceHistory.length} Variaciones Registradas
                    </span>
                  </div>
                  <h3 className="font-bold text-white text-base mt-1 flex items-center space-x-2">
                    <TrendingUp className="w-5 h-5 text-amber-400" />
                    <span>Historial de Variaciones: {historyProduct.name}</span>
                  </h3>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowHistoryModal(false);
                  setHistoryProduct(null);
                }}
                className="text-slate-400 hover:text-white p-1 text-base font-bold"
              >
                ✕
              </button>
            </div>

            {/* Current Price Summary Card */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-900/90 p-3 rounded-xl border border-slate-700/80">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Costo Actual en Inventario</span>
                <span className="font-bold text-white text-sm block">${historyProduct.unitCost.toFixed(2)} USD</span>
                <span className="font-mono font-extrabold text-emerald-400 text-xs block">Q {(historyProduct.unitCost * 7.80).toFixed(2)} GTQ</span>
              </div>
              <div>
                <span className="text-[10px] text-emerald-400 uppercase font-bold block">🏷️ Precio Venta Sugerido (+15%)</span>
                <span className="font-bold text-white text-sm block">${(historyProduct.unitCost * 1.15).toFixed(2)} USD</span>
                <span className="font-mono font-extrabold text-emerald-400 text-xs block">Q {(historyProduct.unitCost * 1.15 * 7.80).toFixed(2)} GTQ</span>
              </div>
            </div>

            {/* Timeline Cards Container */}
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {priceHistory.map((hist, idx) => {
                const totalCount = priceHistory.length;
                const batchNum = totalCount - idx;
                const deltaGtq = hist.delta * 7.80;
                return (
                  <div key={hist.id || idx} className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-700 space-y-2.5 text-xs shadow-md">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/30">
                          Ingreso #{batchNum} de {totalCount}
                        </span>
                        <span className="font-mono text-[11px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                          {hist.batchId || `Lote #${batchNum}`}
                        </span>
                        <span className="text-[11px] text-slate-400 flex items-center space-x-1">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          <span>{hist.changeDate}</span>
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                        hist.delta > 0
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : hist.delta < 0
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-slate-700/50 text-slate-400 border-slate-600'
                      }`}>
                        {hist.delta > 0 ? `📈 Incrementó +${hist.pct}%` : hist.delta < 0 ? `📉 Disminuyó ${hist.pct}%` : '⚪ Costo Base'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center pt-0.5">
                      <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700/60 space-y-0.5">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Costo Anterior</span>
                        <span className="font-bold text-slate-300 block text-xs">${hist.oldCost.toFixed(2)} USD</span>
                        <span className="font-mono text-[10px] text-slate-400 block">Q {(hist.oldCost * 7.80).toFixed(2)} GTQ</span>
                      </div>

                      <div className="bg-slate-800/90 p-2 rounded-lg border border-blue-500/40 space-y-0.5">
                        <span className="text-[10px] text-blue-400 uppercase font-bold block">Costo del Lote</span>
                        <span className="font-bold text-white block text-xs">${hist.newCost.toFixed(2)} USD</span>
                        <span className="font-mono text-[10px] text-emerald-400 font-extrabold block">Q {(hist.newCost * 7.80).toFixed(2)} GTQ</span>
                      </div>

                      <div className={`p-2 rounded-lg border space-y-0.5 ${
                        hist.delta > 0
                          ? 'bg-amber-950/40 border-amber-500/40'
                          : hist.delta < 0
                            ? 'bg-emerald-950/40 border-emerald-500/40'
                            : 'bg-slate-800/80 border-slate-700/60'
                      }`}>
                        <span className={`text-[10px] uppercase font-bold block ${
                          hist.delta > 0 ? 'text-amber-400' : hist.delta < 0 ? 'text-emerald-400' : 'text-slate-400'
                        }`}>
                          Diferencia
                        </span>
                        <span className={`font-extrabold block text-xs ${
                          hist.delta > 0 ? 'text-amber-400' : hist.delta < 0 ? 'text-emerald-400' : 'text-slate-400'
                        }`}>
                          {hist.delta > 0 ? `+$${hist.delta.toFixed(2)}` : hist.delta < 0 ? `-$${Math.abs(hist.delta).toFixed(2)}` : '$0.00'} USD
                        </span>
                        <span className="font-mono text-[10px] font-bold text-slate-300 block">
                          {hist.delta > 0 ? `+Q ${deltaGtq.toFixed(2)}` : hist.delta < 0 ? `-Q ${Math.abs(deltaGtq).toFixed(2)}` : 'Q 0.00'} GTQ
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-700">
              <button
                onClick={() => {
                  setShowHistoryModal(false);
                  setHistoryProduct(null);
                }}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg transition shadow-lg shadow-amber-600/20"
              >
                Cerrar Histórico
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Centro de Gestión Segura de Stock */}
      {stockManageProduct && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[100000] flex items-center justify-center p-4">
          <div className="bg-slate-800 border-2 border-blue-500/50 rounded-2xl w-full max-w-md p-6 shadow-[0_25px_60px_rgba(0,0,0,0.9)] space-y-4 text-xs">
            <div className="flex justify-between items-start border-b border-slate-700 pb-3">
              <div className="flex items-center space-x-3">
                <img
                  src={stockManageProduct.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=150&q=80'}
                  alt={stockManageProduct.name}
                  className="w-12 h-12 rounded-xl object-cover border border-slate-600 shadow"
                />
                <div>
                  <span className="font-mono text-[11px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                    SKU: {stockManageProduct.sku}
                  </span>
                  <h3 className="font-bold text-white text-base mt-0.5 leading-tight">{stockManageProduct.name}</h3>
                </div>
              </div>
              <button onClick={() => setStockManageProduct(null)} className="text-slate-400 hover:text-white text-base font-bold">✕</button>
            </div>

            {/* Current Stock Banner */}
            <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-700 flex justify-between items-center">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Existencias Actuales en SQLite</span>
                <span className="text-xl font-extrabold text-white block">{stockManageProduct.stock} Unidades</span>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                stockManageProduct.stock > 5
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : stockManageProduct.stock > 0
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              }`}>
                {stockManageProduct.stock > 5 ? '✓ Disponible' : stockManageProduct.stock > 0 ? '⚠️ Bajo Stock' : '❌ Agotado'}
              </span>
            </div>

            {/* Adjustment Controls Section */}
            <div className="space-y-3 bg-slate-900/60 p-4 rounded-xl border border-slate-700/80">
              <label className="block text-slate-300 font-bold text-xs uppercase">Cantidad a Modificar / Ajustar</label>
              
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="1"
                  value={stockChangeAmount}
                  onChange={(e) => setStockChangeAmount(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-base text-white font-bold text-center focus:outline-none focus:border-blue-500"
                  placeholder="Cant"
                />
              </div>

              {/* Quick Preset Badges */}
              <div className="flex justify-between gap-1.5 pt-1">
                {[1, 5, 10, 50].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setStockChangeAmount(amt.toString())}
                    className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-mono font-bold border border-slate-700 transition"
                  >
                    +{amt}
                  </button>
                ))}
              </div>

              {/* Action Buttons: Add / Remove */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={async () => {
                    const amt = Math.max(1, parseInt(stockChangeAmount) || 1);
                    await handleAdjustStock(stockManageProduct.id, amt);
                    setStockManageProduct(prev => prev ? { ...prev, stock: prev.stock + amt } : null);
                  }}
                  className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-md transition active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>➕ Agregar +{parseInt(stockChangeAmount) || 1}</span>
                </button>
                <button
                  onClick={async () => {
                    const amt = Math.max(1, parseInt(stockChangeAmount) || 1);
                    await handleAdjustStock(stockManageProduct.id, -amt);
                    setStockManageProduct(prev => prev ? { ...prev, stock: Math.max(0, prev.stock - amt) } : null);
                  }}
                  className="py-2.5 px-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-md transition active:scale-95"
                >
                  <Minus className="w-4 h-4" />
                  <span>➖ Restar -{parseInt(stockChangeAmount) || 1}</span>
                </button>
              </div>
            </div>

            {/* Danger Zone: Protected Deletion */}
            <div className="pt-2 border-t border-slate-700/80 flex justify-between items-center">
              <button
                onClick={() => {
                  setDeleteConfirmProduct(stockManageProduct);
                  setStockManageProduct(null);
                }}
                className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold transition flex items-center space-x-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>🗑️ Eliminar Registro de SQLite</span>
              </button>
              <button
                onClick={() => setStockManageProduct(null)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-xl transition"
              >
                Listo / Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmación de Eliminación de Seguridad */}
      {deleteConfirmProduct && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[100001] flex items-center justify-center p-4">
          <div className="bg-slate-800 border-2 border-rose-500/60 rounded-2xl w-full max-w-md p-6 shadow-[0_25px_60px_rgba(0,0,0,0.9)] space-y-4 text-xs">
            <div className="flex items-center space-x-3 border-b border-slate-700 pb-3">
              <div className="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white leading-tight">Confirmar Eliminación Definitiva</h3>
                <p className="text-[11px] text-rose-400 font-semibold">Advertencia de Seguridad en SQLite</p>
              </div>
            </div>

            <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-700/80 space-y-2 text-slate-300">
              <p>¿Estás seguro de que deseas eliminar permanentemente el siguiente producto del inventario?</p>
              <div className="bg-slate-800 p-2.5 rounded-lg border border-slate-700 font-medium space-y-1">
                <div className="font-bold text-white text-sm">{deleteConfirmProduct.name}</div>
                <div className="font-mono text-xs text-blue-400">SKU: {deleteConfirmProduct.sku}</div>
              </div>
              <p className="text-[11px] text-rose-400 font-semibold pt-1">⚠️ Esta acción no se puede deshacer y borrará el registro en la base de datos.</p>
            </div>

            <div className="flex justify-end space-x-3 pt-2 border-t border-slate-700">
              <button
                onClick={() => setDeleteConfirmProduct(null)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  await handleDeleteProduct(deleteConfirmProduct.id);
                  setDeleteConfirmProduct(null);
                }}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition shadow-lg shadow-rose-600/20"
              >
                ✅ Sí, Eliminar Definitivamente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
