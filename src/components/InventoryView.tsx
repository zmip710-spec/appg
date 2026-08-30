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
  ChevronLeft,
  ChevronRight,
  CheckCircle
} from 'lucide-react';
import {
  InventoryProduct,
  fetchInventory,
  createInventoryApi,
  deleteInventoryApi,
  updateStockApi,
  updateProductImageApi,
  PriceHistoryEntry,
  fetchPriceHistoryApi,
  User
} from '../services/api';
import { ImagePicker } from './ImagePicker';

interface InventoryViewProps {
  currentUser?: User | null;
  readOnly?: boolean;
}

export const InventoryView: React.FC<InventoryViewProps> = ({ currentUser, readOnly }) => {
  const isVendedor = readOnly || currentUser?.role === 'Vendedor';
  const [inventory, setInventory] = useState<InventoryProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

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

  useEffect(() => {
    loadInventory();
  }, []);

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

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sku.trim() || !name.trim()) {
      setErrorMessage('El código SKU y el Nombre son obligatorios.');
      return;
    }

    try {
      await createInventoryApi({
        sku: sku.trim().toUpperCase(),
        name: name.trim(),
        category: category.trim() || 'General',
        stock: parseInt(stock, 10) || 0,
        unitCost: parseFloat(unitCost) || 0.0,
        image: image || ''
      });

      setShowAddModal(false);
      resetForm();
      await loadInventory();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al guardar el producto.');
    }
  };

  const handleDeleteProduct = async (product: InventoryProduct) => {
    try {
      await deleteInventoryApi(product.id, product.sku);
      setDeleteConfirmProduct(null);
      if (selectedDetailProduct?.id === product.id) setSelectedDetailProduct(null);
      await loadInventory();
    } catch {
      setInventory(inventory.filter((i) => i.id !== product.id));
      setDeleteConfirmProduct(null);
      if (selectedDetailProduct?.id === product.id) setSelectedDetailProduct(null);
    }
  };

  const handleStockAdjustment = async (delta: number) => {
    if (!stockManageProduct) return;
    const newStock = Math.max(0, stockManageProduct.stock + delta);
    try {
      await updateStockApi(stockManageProduct.id, newStock, stockManageProduct.sku);
      setInventory(inventory.map((item) => (item.id === stockManageProduct.id ? { ...item, stock: newStock } : item)));
      setStockManageProduct({ ...stockManageProduct, stock: newStock });
      if (selectedDetailProduct?.id === stockManageProduct.id) {
        setSelectedDetailProduct({ ...selectedDetailProduct, stock: newStock });
      }
    } catch {
      setInventory(inventory.map((item) => (item.id === stockManageProduct.id ? { ...item, stock: newStock } : item)));
    }
  };

  const handleSaveProductImage = async () => {
    if (!editingProduct) return;
    try {
      await updateProductImageApi(editingProduct.id, editImageUrl, editingProduct.sku);
      setInventory(inventory.map((item) => (item.id === editingProduct.id ? { ...item, image: editImageUrl } : item)));
      if (selectedDetailProduct?.id === editingProduct.id) {
        setSelectedDetailProduct({ ...selectedDetailProduct, image: editImageUrl });
      }
      setEditingProduct(null);
    } catch {
      setInventory(inventory.map((item) => (item.id === editingProduct.id ? { ...item, image: editImageUrl } : item)));
      if (selectedDetailProduct?.id === editingProduct.id) {
        setSelectedDetailProduct({ ...selectedDetailProduct, image: editImageUrl });
      }
      setEditingProduct(null);
    }
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

  // Real-time Search & Filter Chips
  const filteredInventory = inventory.filter((item) => {
    const matchesSearch =
      item.sku.toLowerCase().includes(search.toLowerCase()) ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.category && item.category.toLowerCase().includes(search.toLowerCase()));

    let matchesFilter = true;
    if (filterStatus === 'in_stock') matchesFilter = item.stock > 10;
    else if (filterStatus === 'low_stock') matchesFilter = item.stock > 0 && item.stock <= 10;
    else if (filterStatus === 'out_of_stock') matchesFilter = item.stock === 0;

    return matchesSearch && matchesFilter;
  });

  // Performance Pagination (25 items per page)
  const totalPages = Math.ceil(filteredInventory.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedInventory = filteredInventory.slice(startIndex, startIndex + itemsPerPage);

  const totalStockUnits = inventory.reduce((sum, item) => sum + item.stock, 0);
  const totalInventoryValue = inventory.reduce((sum, item) => sum + item.stock * item.unitCost, 0);
  const totalInventoryValueGtq = totalInventoryValue * 7.80;
  const totalUniqueSkus = inventory.length;

  if (isLoading) {
    return (
      <div className="space-y-6 min-h-[500px] animate-pulse">
        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 h-24 w-full"></div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 h-28 w-full"></div>
          <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 h-28 w-full"></div>
          <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 h-28 w-full"></div>
        </div>
        <div className="space-y-3">
          <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 h-24 w-full"></div>
          <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 h-24 w-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 min-h-[500px]">
      {/* Compact Minimal Header */}
      <div className="flex items-center justify-between py-2 px-1 border-b border-slate-800 shrink-0">
        <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">Stock e Inventario</h2>
        {!isVendedor && (
          <button
            onClick={() => {
              setErrorMessage('');
              setShowAddModal(true);
            }}
            className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition shadow-md shadow-blue-600/20 active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nuevo SKU</span>
          </button>
        )}
      </div>

      {/* Mini KPI Cards (~70px Height) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/80 flex flex-col justify-between h-[72px]">
          <span className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase truncate">SKUs Únicos</span>
          <div className="flex items-baseline justify-between">
            <h3 className="text-base sm:text-lg font-extrabold text-white font-mono">{totalUniqueSkus}</h3>
            <span className="text-[10px] text-blue-400 font-medium">catálogos</span>
          </div>
        </div>

        <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/80 flex flex-col justify-between h-[72px]">
          <span className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase truncate">Stock Total</span>
          <div className="flex items-baseline justify-between">
            <h3 className="text-base sm:text-lg font-extrabold text-indigo-300 font-mono">{totalStockUnits}</h3>
            <span className="text-[10px] text-indigo-400 font-medium">unidades</span>
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-slate-800/80 p-3 rounded-xl border border-slate-700/80 flex flex-col justify-between h-[72px]">
          <span className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase truncate">Valoración Total</span>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-white font-mono">${totalInventoryValue.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD</h3>
            <span className="text-[10px] font-mono text-emerald-400 font-semibold block">Q {totalInventoryValueGtq.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      {/* Sticky Header Search & Quick Filter Chips */}
      <div className="sticky top-0 sm:top-[57px] z-30 bg-slate-900/95 backdrop-blur py-3 px-3 rounded-xl border border-slate-800 space-y-3 shadow-md">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Buscar por SKU o Nombre de Producto en tiempo real..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Quick Filter Chips */}
        <div className="flex items-center space-x-2 overflow-x-auto scrollbar-none pb-0.5 text-xs">
          <button
            onClick={() => {
              setFilterStatus('all');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg transition shrink-0 font-bold ${
              filterStatus === 'all'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
            }`}
          >
            Todos ({inventory.length})
          </button>

          <button
            onClick={() => {
              setFilterStatus('in_stock');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg transition shrink-0 font-bold ${
              filterStatus === 'in_stock'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-800 text-emerald-400 hover:text-white border border-slate-700'
            }`}
          >
            En Stock ({inventory.filter((i) => i.stock > 10).length})
          </button>

          <button
            onClick={() => {
              setFilterStatus('low_stock');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg transition shrink-0 font-bold ${
              filterStatus === 'low_stock'
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-slate-800 text-amber-400 hover:text-white border border-slate-700'
            }`}
          >
            Stock Bajo ({inventory.filter((i) => i.stock > 0 && i.stock <= 10).length})
          </button>

          <button
            onClick={() => {
              setFilterStatus('out_of_stock');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg transition shrink-0 font-bold ${
              filterStatus === 'out_of_stock'
                ? 'bg-rose-600 text-white shadow-md'
                : 'bg-slate-800 text-rose-400 hover:text-white border border-slate-700'
            }`}
          >
            Agotados ({inventory.filter((i) => i.stock === 0).length})
          </button>
        </div>
      </div>

      {/* MOBILE COMPACT LIST VIEW (Visible on small screens md:hidden) */}
      <div className="md:hidden space-y-2">
        <div className="flex justify-between items-center px-1">
          <h3 className="font-bold text-white text-xs">Productos ({filteredInventory.length})</h3>
          <span className="text-[10px] text-slate-400">Toca una fila para ver detalles</span>
        </div>

        {paginatedInventory.length === 0 ? (
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 text-center text-slate-400 text-xs">
            No se encontraron productos en el inventario.
          </div>
        ) : (
          paginatedInventory.map((item) => {
            const sellingPriceGtq = (item.unitCost * 1.15 * 7.80).toFixed(2);
            let stockBadge = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            let stockText = `${item.stock} uds`;

            if (item.stock === 0) {
              stockBadge = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
              stockText = 'Agotado';
            } else if (item.stock <= 10) {
              stockBadge = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
              stockText = `${item.stock} uds`;
            }

            const defaultImg = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=150&q=80';

            return (
              <div
                key={item.id}
                onClick={() => setSelectedDetailProduct(item)}
                className="bg-slate-800 border border-slate-700/80 rounded-xl p-2.5 flex items-center justify-between gap-3 h-[65px] active:bg-slate-700/60 cursor-pointer shadow-sm transition"
              >
                {/* Left: 40x40 Thumbnail */}
                <img
                  src={item.image || defaultImg}
                  alt={item.name}
                  className="w-10 h-10 rounded-lg object-cover border border-slate-700 shrink-0"
                />

                {/* Center: Name in Bold + SKU & Category */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-white text-xs truncate leading-tight">{item.name}</h4>
                  <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 truncate mt-0.5">
                    <span className="font-mono text-slate-300 font-semibold">{item.sku}</span>
                    <span>•</span>
                    <span className="truncate">{item.category || 'General'}</span>
                  </div>
                </div>

                {/* Right: Stock Badge + Price in GTQ */}
                <div className="text-right shrink-0">
                  <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border ${stockBadge}`}>
                    {stockText}
                  </span>
                  <span className="block text-xs font-mono font-extrabold text-emerald-400 mt-0.5">
                    Q {sellingPriceGtq}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* DESKTOP TABLE VIEW (Visible on md and larger) */}
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
                <th className="px-5 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {paginatedInventory.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-slate-400">
                    No se encontraron productos en el inventario.
                  </td>
                </tr>
              ) : (
                paginatedInventory.map((item) => {
                  let stockBadge = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                  let stockLabel = 'Disponible';
                  if (item.stock === 0) {
                    stockBadge = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
                    stockLabel = 'Agotado';
                  } else if (item.stock <= 10) {
                    stockBadge = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
                    stockLabel = 'Bajo Stock';
                  }

                  const unitCostGtq = item.unitCost * 7.80;
                  const sellingPriceUsd = item.unitCost * 1.15;
                  const sellingPriceGtq = sellingPriceUsd * 7.80;
                  const defaultImg = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=150&q=80';

                  return (
                    <tr key={item.id} className="hover:bg-slate-700/40 transition cursor-pointer" onClick={() => setSelectedDetailProduct(item)}>
                      <td className="px-5 py-3">
                        <img
                          src={item.image || defaultImg}
                          alt={item.name}
                          className="w-10 h-10 rounded-lg object-cover border border-slate-600 shadow"
                        />
                      </td>
                      <td className="px-5 py-3 font-mono font-bold text-blue-400">{item.sku}</td>
                      <td className="px-5 py-3 font-semibold text-white">{item.name}</td>
                      <td className="px-5 py-3">
                        <span className="px-2 py-0.5 bg-slate-700 text-slate-300 text-xs rounded-md font-medium">
                          {item.category || 'General'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${stockBadge}`}>
                          {item.stock} uds ({stockLabel})
                        </span>
                      </td>
                      <td className="px-5 py-3 font-semibold text-white">
                        <span className="block text-xs">${item.unitCost.toFixed(2)} USD</span>
                        <span className="font-mono text-xs font-bold text-emerald-400 block">Q {unitCostGtq.toFixed(2)} GTQ</span>
                      </td>
                      <td className="px-5 py-3 bg-emerald-950/20 border-l border-emerald-500/20">
                        <span className="font-extrabold text-white text-xs block">${sellingPriceUsd.toFixed(2)} USD</span>
                        <span className="font-mono font-extrabold text-emerald-400 text-xs block">Q {sellingPriceGtq.toFixed(2)} GTQ</span>
                      </td>
                      <td className="px-5 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedDetailProduct(item)}
                          className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/40 rounded-lg text-xs font-bold transition"
                        >
                          Ver Detalle
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

      {/* Performance Pagination Controls Bar */}
      {filteredInventory.length > itemsPerPage && (
        <div className="flex items-center justify-between bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs font-semibold">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            className="flex items-center space-x-1 px-3 py-1.5 bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-600 text-white rounded-lg transition"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Anterior</span>
          </button>

          <span className="text-slate-300 text-[11px] sm:text-xs">
            Página <strong className="text-white">{currentPage}</strong> de <strong className="text-white">{totalPages}</strong> ({startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredInventory.length)} de {filteredInventory.length})
          </span>

          <button
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            className="flex items-center space-x-1 px-3 py-1.5 bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-600 text-white rounded-lg transition"
          >
            <span>Siguiente</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Detail Bottom Sheet / Modal */}
      {selectedDetailProduct && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100000] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[92vh] flex flex-col p-4 sm:p-6 shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200">
            {/* Sheet Header */}
            <div className="flex justify-between items-start border-b border-slate-700 pb-3 shrink-0">
              <div className="flex items-center space-x-3">
                <img
                  src={selectedDetailProduct.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=150&q=80'}
                  alt={selectedDetailProduct.name}
                  className="w-12 h-12 rounded-xl object-cover border border-slate-600 shadow shrink-0"
                />
                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                      {selectedDetailProduct.sku}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-700 text-slate-300">
                      {selectedDetailProduct.category || 'General'}
                    </span>
                  </div>
                  <h3 className="font-bold text-white text-sm sm:text-base truncate mt-0.5">{selectedDetailProduct.name}</h3>
                </div>
              </div>
              <button onClick={() => setSelectedDetailProduct(null)} className="text-slate-400 hover:text-white p-1 text-base font-bold shrink-0">✕</button>
            </div>

            <div className="overflow-y-auto max-h-[calc(92vh-140px)] space-y-4 pt-3 pr-1">
              {/* Metrics Matrix Grid */}
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-700/80 space-y-1">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Existencias en Almacén</span>
                  <span className="font-bold text-white text-sm sm:text-base">{selectedDetailProduct.stock} Unidades</span>
                  <span className="text-[10px] text-emerald-400 block">✓ Disponible en inventario</span>
                </div>

                <div className="bg-slate-900 p-3 rounded-xl border border-slate-700/80 space-y-1">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Valoración Total</span>
                  <span className="font-bold text-white text-xs sm:text-sm block">${(selectedDetailProduct.stock * selectedDetailProduct.unitCost).toFixed(2)} USD</span>
                  <span className="font-mono font-extrabold text-emerald-400 text-xs block">Q {(selectedDetailProduct.stock * selectedDetailProduct.unitCost * 7.80).toLocaleString('en-US', { minimumFractionDigits: 2 })} GTQ</span>
                </div>

                <div className="bg-slate-900 p-3 rounded-xl border border-slate-700/80 space-y-1">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Costo Landed Unitario</span>
                  <span className="font-bold text-white text-xs sm:text-sm block">${selectedDetailProduct.unitCost.toFixed(2)} USD</span>
                  <span className="font-mono font-extrabold text-emerald-400 text-xs block">Q {(selectedDetailProduct.unitCost * 7.80).toFixed(2)} GTQ</span>
                </div>

                <div className="bg-emerald-950/60 p-3 rounded-xl border border-emerald-500/40 space-y-1">
                  <span className="text-emerald-400 block text-[10px] uppercase font-bold">🏷️ Precio Venta (+15%)</span>
                  <span className="font-extrabold text-white text-xs sm:text-sm block">${(selectedDetailProduct.unitCost * 1.15).toFixed(2)} USD</span>
                  <span className="font-mono font-extrabold text-emerald-400 text-xs block">Q {(selectedDetailProduct.unitCost * 1.15 * 7.80).toFixed(2)} GTQ</span>
                </div>
              </div>

              {/* Price Delta Alert */}
              {selectedDetailProduct.priceChangeDelta !== undefined && selectedDetailProduct.priceChangeDelta !== 0 && (
                <div className={`p-3 rounded-xl border text-xs font-semibold ${
                  selectedDetailProduct.priceChangeDelta > 0
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                }`}>
                  {selectedDetailProduct.priceChangeDelta > 0
                    ? `📈 Variación de Costo: +$${selectedDetailProduct.priceChangeDelta.toFixed(2)} USD (+${selectedDetailProduct.priceChangePct}%)`
                    : `📉 Variación de Costo: -$${Math.abs(selectedDetailProduct.priceChangeDelta).toFixed(2)} USD (${selectedDetailProduct.priceChangePct}%)`}
                </div>
              )}

              {/* Quick Actions Grid */}
              <div className="space-y-2 pt-2 border-t border-slate-700">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Acciones Rápidas</span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {!isVendedor && (
                    <button
                      onClick={() => {
                        setStockManageProduct(selectedDetailProduct);
                        setStockChangeAmount('1');
                      }}
                      className="flex items-center justify-center space-x-1.5 px-3 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl font-bold transition active:scale-95 cursor-pointer"
                    >
                      <Sliders className="w-4 h-4 shrink-0" />
                      <span>Ajustar Stock</span>
                    </button>
                  )}

                  {!isVendedor && (
                    <button
                      onClick={() => {
                        setEditingProduct(selectedDetailProduct);
                        setEditImageUrl(selectedDetailProduct.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=150&q=80');
                      }}
                      className="flex items-center justify-center space-x-1.5 px-3 py-2.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-xl font-bold transition active:scale-95 cursor-pointer"
                    >
                      <Camera className="w-4 h-4 shrink-0" />
                      <span>Editar Foto / Datos</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleOpenPriceHistory(selectedDetailProduct)}
                    className={`flex items-center justify-center space-x-1.5 px-3 py-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-xl font-bold transition active:scale-95 cursor-pointer ${isVendedor ? 'col-span-2' : ''}`}
                  >
                    <Eye className="w-4 h-4 shrink-0" />
                    <span>Histórico Precios</span>
                  </button>

                  {!isVendedor && (
                    <button
                      onClick={() => setDeleteConfirmProduct(selectedDetailProduct)}
                      className="flex items-center justify-center space-x-1.5 px-3 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl font-bold transition active:scale-95 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4 shrink-0" />
                      <span>Eliminar SKU</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-700 shrink-0">
              <button
                onClick={() => setSelectedDetailProduct(null)}
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-xl transition"
              >
                Cerrar
              </button>
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
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold uppercase mb-1">Nombre del Producto</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Audífonos Bluetooth Pro"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 font-semibold uppercase mb-1">Categoría</label>
                  <input
                    type="text"
                    placeholder="General"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold uppercase mb-1">Stock Inicial</label>
                  <input
                    type="number"
                    min="0"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold uppercase mb-1">Costo Unitario ($ USD)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono focus:border-blue-500"
                />
              </div>

              {/* Photo Upload / Camera Capture Component */}
              <ImagePicker
                value={image}
                onChange={(img) => setImage(img)}
                label="Imagen del Producto (Subir o Tomar foto)"
              />

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition shadow-lg shadow-blue-600/20"
                >
                  Guardar SKU
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Quick Stock Adjustment & Options */}
      {stockManageProduct && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-[100000] flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-sm p-4 sm:p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-700 pb-3">
              <div>
                <h3 className="font-bold text-white text-base">Ajustar Stock Físico</h3>
                <span className="text-xs text-blue-400 font-mono font-bold">{stockManageProduct.sku}</span>
              </div>
              <button onClick={() => setStockManageProduct(null)} className="text-slate-400 hover:text-white text-base font-bold">✕</button>
            </div>

            <div className="bg-slate-900 p-3 rounded-xl border border-slate-700 text-center space-y-1">
              <span className="text-slate-400 text-xs block uppercase font-bold">Stock Actual</span>
              <span className="text-3xl font-extrabold text-white">{stockManageProduct.stock}</span>
              <span className="text-[10px] text-slate-400 block">unidades disponibles</span>
            </div>

            <div className="space-y-3 text-xs">
              <label className="block text-slate-400 font-semibold uppercase text-center">Cantidad a Modificar</label>
              <div className="flex items-center justify-center space-x-2">
                <input
                  type="number"
                  min="1"
                  value={stockChangeAmount}
                  onChange={(e) => setStockChangeAmount(e.target.value)}
                  className="w-24 text-center py-2 bg-slate-900 border border-slate-700 rounded-xl text-lg font-bold text-white focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  onClick={() => handleStockAdjustment(-Math.abs(parseInt(stockChangeAmount, 10) || 1))}
                  className="flex items-center justify-center space-x-1.5 py-2.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/40 font-bold rounded-xl transition active:scale-95"
                >
                  <Minus className="w-4 h-4" />
                  <span>Reducir (-)</span>
                </button>

                <button
                  onClick={() => handleStockAdjustment(Math.abs(parseInt(stockChangeAmount, 10) || 1))}
                  className="flex items-center justify-center space-x-1.5 py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 font-bold rounded-xl transition active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Incrementar (+)</span>
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-700">
              <button
                onClick={() => setStockManageProduct(null)}
                className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold rounded-xl transition"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Edit Photo / Image */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-[100000] flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md p-4 sm:p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-700 pb-3">
              <div>
                <h3 className="font-bold text-white text-base">Actualizar Foto del Producto</h3>
                <span className="text-xs text-blue-400 font-mono font-bold">{editingProduct.sku}</span>
              </div>
              <button onClick={() => setEditingProduct(null)} className="text-slate-400 hover:text-white text-base font-bold">✕</button>
            </div>

            <ImagePicker
              value={editImageUrl}
              onChange={(img) => setEditImageUrl(img)}
              label="Selecciona una nueva foto o captura desde la cámara"
            />

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-700">
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-semibold rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveProductImage}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition shadow-lg shadow-blue-600/20"
              >
                Actualizar Foto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirm Delete Product */}
      {deleteConfirmProduct && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-[100000] flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-sm p-4 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-400">
              <AlertTriangle className="w-8 h-8 shrink-0" />
              <div>
                <h3 className="font-bold text-white text-base">¿Eliminar Producto?</h3>
                <span className="text-xs text-slate-400 font-mono">{deleteConfirmProduct.sku}</span>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              Esta acción eliminará el SKU <strong className="text-white">{deleteConfirmProduct.name}</strong> del catálogo de la base de datos.
            </p>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-700">
              <button
                onClick={() => setDeleteConfirmProduct(null)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-semibold rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteProduct(deleteConfirmProduct)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg transition shadow-lg shadow-rose-600/20"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Price Variation History */}
      {showHistoryModal && historyProduct && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100000] flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[92vh] flex flex-col p-4 sm:p-6 shadow-2xl overflow-hidden space-y-4">
            <div className="flex justify-between items-start border-b border-slate-700 pb-3 shrink-0">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-bold text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded border border-blue-500/20">
                    {historyProduct.sku}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-700 text-slate-300">
                    {historyProduct.category || 'General'}
                  </span>
                </div>
                <h3 className="font-bold text-white text-base mt-1">{historyProduct.name}</h3>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="text-slate-400 hover:text-white p-1 text-base font-bold">✕</button>
            </div>

            <div className="overflow-y-auto max-h-[calc(92vh-100px)] space-y-3 pr-1">
              {priceHistory.length > 0 ? (
                priceHistory.map((hist, idx) => (
                  <div key={hist.id || idx} className="bg-slate-900/90 p-3 rounded-xl border border-slate-700 space-y-2 text-xs">
                    <div className="flex items-center justify-between border-b border-slate-700/60 pb-1.5">
                      <span className="font-mono text-[11px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                        {hist.batchId || 'Lote Directo'}
                      </span>
                      <span className="text-[11px] text-slate-400">{hist.changeDate}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center pt-0.5">
                      <div className="bg-slate-800 p-2 rounded-lg border border-slate-700/50">
                        <span className="text-[10px] text-slate-400 block font-bold">Anterior</span>
                        <span className="font-bold text-slate-300 block text-xs">${hist.oldCost.toFixed(2)}</span>
                      </div>
                      <div className="bg-slate-800 p-2 rounded-lg border border-blue-500/40">
                        <span className="text-[10px] text-blue-400 block font-bold">Actual</span>
                        <span className="font-bold text-white block text-xs">${hist.newCost.toFixed(2)}</span>
                      </div>
                      <div className="bg-slate-800 p-2 rounded-lg border border-slate-700/50">
                        <span className="text-[10px] text-slate-400 block font-bold">Variación</span>
                        <span className={`font-bold block text-xs ${hist.delta > 0 ? 'text-amber-400' : hist.delta < 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                          {hist.delta > 0 ? `+$${hist.delta.toFixed(2)}` : hist.delta < 0 ? `-$${Math.abs(hist.delta).toFixed(2)}` : '$0.00'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-slate-400 text-center py-4 bg-slate-900/50 rounded-xl text-xs">
                  Sin variaciones de precio registradas.
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-700 shrink-0">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
