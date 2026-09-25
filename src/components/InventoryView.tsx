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
  CheckCircle,
  AlertCircle,
  Edit2,
  FileDown
} from 'lucide-react';
import {
  InventoryProduct,
  fetchInventory,
  createInventoryApi,
  deleteInventoryApi,
  updateStockApi,
  PriceHistoryEntry,
  fetchPriceHistoryApi,
  User,
  Category,
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory
} from '../services/api';
import { exportInventoryPdf } from '../utils/pdfGenerator';

interface InventoryViewProps {
  currentUser?: User | null;
  readOnly?: boolean;
  onExportPDF?: () => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({ currentUser, readOnly, onExportPDF }) => {
  const isVendedor = readOnly || currentUser?.role === 'Vendedor';
  const [inventory, setInventory] = useState<InventoryProduct[]>(() => {
    try {
      const cached = localStorage.getItem('appg_cache_inventory');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [isLoading, setIsLoading] = useState(() => {
    try {
      const cached = localStorage.getItem('appg_cache_inventory');
      return !cached;
    } catch {
      return true;
    }
  });
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  const [showAddModal, setShowAddModal] = useState(false);
  const [isDbConnected, setIsDbConnected] = useState(false);
  const [selectedDetailProduct, setSelectedDetailProduct] = useState<InventoryProduct | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [historyProduct, setHistoryProduct] = useState<InventoryProduct | null>(null);
  const [stockManageProduct, setStockManageProduct] = useState<InventoryProduct | null>(null);
  const [stockChangeAmount, setStockChangeAmount] = useState<string>('1');
  const [deleteConfirmProduct, setDeleteConfirmProduct] = useState<InventoryProduct | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryEntry[]>([]);
  const [selectedProductImportDetails, setSelectedProductImportDetails] = useState<{
    fobUsd: number;
    sharePercentage: number;
    unitCustomsUsd: number;
    unitShippingUsd: number;
    unitTaxUsd: number;
    landedUsd: number;
    finalSellingPriceUsd: number;
    totalExpensesUsd: number;
    customsPct: number;
    shippingPct: number;
    recargoPct: number;
    batchName?: string;
  } | null>(null);

  // Categorías Dinámicas
  const [categories, setCategories] = useState<Category[]>(() => {
    try {
      const cached = localStorage.getItem('appg_cache_categories');
      return cached ? JSON.parse(cached) : [
        { id: 1, name: 'Repuestos' },
        { id: 2, name: 'Accesorios' },
        { id: 3, name: 'Pantallas' },
        { id: 4, name: 'General' }
      ];
    } catch {
      return [
        { id: 1, name: 'Repuestos' },
        { id: 2, name: 'Accesorios' },
        { id: 3, name: 'Pantallas' },
        { id: 4, name: 'General' }
      ];
    }
  });
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<number | string | null>(null);
  const [categorySearchTerm, setCategorySearchTerm] = useState('');
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);
  const [categoryError, setCategoryError] = useState('');
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [categoryToastMessage, setCategoryToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedDetailProduct) {
      setSelectedProductImportDetails(null);
      return;
    }

    // Reset import details immediately so previous product metrics never linger
    setSelectedProductImportDetails(null);

    let isMounted = true;
    const loadDetailImportMetrics = async () => {
      try {
        const history = await fetchPriceHistoryApi(selectedDetailProduct.sku, selectedDetailProduct.name);
        if (!isMounted) return;

        if (history && history.length > 0) {
          // history[0] is the most recent batch item entry
          const latest = history[0];
          const landed = latest.finalUnitCost !== undefined && latest.finalUnitCost > 0 ? latest.finalUnitCost : selectedDetailProduct.unitCost;
          const fob = latest.unitCostFob !== undefined && latest.unitCostFob >= 0 ? latest.unitCostFob : landed;
          const qty = latest.quantity && latest.quantity > 0 ? latest.quantity : (selectedDetailProduct.stock || 1);

          const uCustoms = latest.allocatedCustoms !== undefined && qty > 0 ? latest.allocatedCustoms / qty : 0;
          const uShipping = latest.allocatedShipping !== undefined && qty > 0 ? latest.allocatedShipping / qty : (latest.unitTax !== undefined ? Math.max(0, latest.unitTax - uCustoms) : 0);
          const uTax = latest.unitTax !== undefined ? latest.unitTax : (uCustoms + uShipping);

          const customsPct = fob > 0 ? (uCustoms / fob) * 100 : 0;
          const shippingPct = fob > 0 ? (uShipping / fob) * 100 : 0;
          const recargo = fob > 0 ? ((landed - fob) / fob) * 100 : 0;

          const sellingPrice = latest.finalSellingPrice !== undefined && latest.finalSellingPrice > 0
            ? latest.finalSellingPrice
            : landed * 1.15;

          setSelectedProductImportDetails({
            fobUsd: fob,
            sharePercentage: latest.sharePercentage || 0,
            unitCustomsUsd: uCustoms,
            unitShippingUsd: uShipping,
            unitTaxUsd: uTax,
            landedUsd: landed,
            finalSellingPriceUsd: sellingPrice,
            totalExpensesUsd: latest.allocatedTax !== undefined ? latest.allocatedTax : (uTax * selectedDetailProduct.stock),
            customsPct,
            shippingPct,
            recargoPct: recargo,
            batchName: latest.batchName
          });
        } else {
          const landed = selectedDetailProduct.unitCost;
          const fob = landed;
          setSelectedProductImportDetails({
            fobUsd: fob,
            sharePercentage: 0,
            unitCustomsUsd: 0,
            unitShippingUsd: 0,
            unitTaxUsd: 0,
            landedUsd: landed,
            finalSellingPriceUsd: landed * 1.15,
            totalExpensesUsd: 0,
            customsPct: 0,
            shippingPct: 0,
            recargoPct: 0
          });
        }
      } catch {
        if (!isMounted) return;
        const landed = selectedDetailProduct.unitCost;
        const fob = landed;
        setSelectedProductImportDetails({
          fobUsd: fob,
          sharePercentage: 0,
          unitCustomsUsd: 0,
          unitShippingUsd: 0,
          unitTaxUsd: 0,
          landedUsd: landed,
          finalSellingPriceUsd: landed * 1.15,
          totalExpensesUsd: 0,
          customsPct: 0,
          shippingPct: 0,
          recargoPct: 0
        });
      }
    };

    loadDetailImportMetrics();
    return () => { isMounted = false; };
  }, [selectedDetailProduct?.sku]);

  const DRAFT_INVENTORY_KEY = 'draft_form_inventory';

  // Form State for new SKU/Product with localStorage Draft Recovery
  const [sku, setSku] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('draft_form_inventory');
      if (saved) return JSON.parse(saved).sku || '';
    } catch {}
    return '';
  });
  const [name, setName] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('draft_form_inventory');
      if (saved) return JSON.parse(saved).name || '';
    } catch {}
    return '';
  });
  const [brand, setBrand] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('draft_form_inventory');
      if (saved) return JSON.parse(saved).brand || '';
    } catch {}
    return '';
  });
  const [model, setModel] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('draft_form_inventory');
      if (saved) return JSON.parse(saved).model || '';
    } catch {}
    return '';
  });
  const [category, setCategory] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('draft_form_inventory');
      if (saved) return JSON.parse(saved).category || 'General';
    } catch {}
    return 'General';
  });
  const [stock, setStock] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('draft_form_inventory');
      if (saved) return JSON.parse(saved).stock || '10';
    } catch {}
    return '10';
  });
  const [unitCost, setUnitCost] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('draft_form_inventory');
      if (saved) return JSON.parse(saved).unitCost || '10.0';
    } catch {}
    return '10.0';
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [invNetworkError, setInvNetworkError] = useState<string | null>(null);
  const [isSavingProduct, setIsSavingProduct] = useState<boolean>(false);

  // Autosave Debounced Effect (400ms)
  useEffect(() => {
    const hasContent = name.trim() !== '' || sku.trim() !== '' || brand.trim() !== '';
    const timer = setTimeout(() => {
      try {
        if (hasContent) {
          localStorage.setItem('draft_form_inventory', JSON.stringify({
            sku, name, brand, model, category, stock, unitCost
          }));
        } else {
          localStorage.removeItem('draft_form_inventory');
        }
      } catch {}
    }, 400);
    return () => clearTimeout(timer);
  }, [sku, name, brand, model, category, stock, unitCost]);

  // Window beforeunload Accidental Navigation Protection
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const hasContent = name.trim() !== '' || sku.trim() !== '';
      if (hasContent) {
        e.preventDefault();
        e.returnValue = 'Tienes datos sin guardar en el formulario de producto. ¿Estás seguro de salir?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [sku, name]);

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

  const loadCategories = async () => {
    try {
      const data = await fetchCategories();
      if (Array.isArray(data) && data.length > 0) {
        setCategories(data);
      }
    } catch (err) {
      console.warn('Error cargando categorías:', err);
    }
  };

  useEffect(() => {
    loadInventory();
    loadCategories();
  }, []);

  const handleSaveCategorySubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setCategoryError('');
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      setCategoryError('El nombre de la categoría es requerido.');
      return;
    }

    setIsSavingCategory(true);
    try {
      if (editingCategoryId) {
        const updated = await updateCategory(editingCategoryId, trimmed);
        await loadCategories();
        setCategory(updated.name || trimmed);
        setEditingCategoryId(null);
        setNewCategoryName('');
        setCategoryToastMessage(`¡Categoría "${updated.name || trimmed}" actualizada con éxito!`);
      } else {
        const created = await createCategory(trimmed);
        await loadCategories();
        setCategory(created.name || trimmed);
        setNewCategoryName('');
        setCategoryToastMessage(`¡Categoría "${created.name || trimmed}" creada con éxito!`);
      }
      setTimeout(() => setCategoryToastMessage(null), 3500);
    } catch (err: any) {
      setCategoryError(err.message || 'Error al procesar la categoría.');
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleStartEditCategory = (cat: Category) => {
    setEditingCategoryId(cat.id);
    setNewCategoryName(cat.name);
    setCategoryError('');
  };

  const handleCancelEditCategory = () => {
    setEditingCategoryId(null);
    setNewCategoryName('');
    setCategoryError('');
  };

  const handleDeleteCategoryConfirm = async () => {
    if (!categoryToDelete) return;
    setIsDeletingCategory(true);
    try {
      await deleteCategory(categoryToDelete.id);
      await loadCategories();
      setCategoryToastMessage(`Categoría "${categoryToDelete.name}" eliminada.`);
      setTimeout(() => setCategoryToastMessage(null), 3500);
      if (editingCategoryId === categoryToDelete.id) {
        setEditingCategoryId(null);
        setNewCategoryName('');
      }
      setCategoryToDelete(null);
    } catch (err: any) {
      setCategoryError(err.message || 'Error al eliminar la categoría.');
      setCategoryToDelete(null);
    } finally {
      setIsDeletingCategory(false);
    }
  };

  const filteredCategoriesList = categories.filter((c) =>
    String(c.name ?? '').toLowerCase().includes(categorySearchTerm.trim().toLowerCase())
  );

  const handleOpenPriceHistory = async (product: InventoryProduct) => {
    setHistoryProduct(product);
    setShowHistoryModal(true);
    try {
      const history = await fetchPriceHistoryApi(product.sku, product.name);
      setPriceHistory(history);
    } catch {
      setPriceHistory([]);
    }
  };

  const handleCreateProduct = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    setInvNetworkError(null);

    if (!sku.trim() || !name.trim()) {
      setErrorMessage('Código SKU y Nombre de producto son requeridos.');
      return;
    }

    if (isSavingProduct) return;
    setIsSavingProduct(true);

    try {
      await createInventoryApi({
        sku: sku.trim().toUpperCase(),
        name: name.trim(),
        brand: brand.trim(),
        model: model.trim(),
        category: category.trim() || 'General',
        stock: parseInt(stock, 10) || 0,
        unitCost: parseFloat(unitCost) || 0.0
      });
    } catch (err: any) {
      console.error('Error de conexión o servidor al crear producto:', err);
      // DO NOT RESET FORM OR CLEAR STATE!
      setInvNetworkError("Error de conexión con el host. Tus datos siguen guardados aquí. Presiona 'Reintentar' cuando se restablezca la conexión.");
      setIsSavingProduct(false);
      return;
    }

    // HTTP 200/201 SUCCESS: Immediately clear errors, remove draft, reset form and close modal
    setInvNetworkError(null);
    try { localStorage.removeItem(DRAFT_INVENTORY_KEY); } catch {}
    setShowAddModal(false);
    resetForm();
    setIsSavingProduct(false);

    // Refresh inventory list in background safely
    try {
      await loadInventory();
    } catch (loadErr) {
      console.warn('Producto creado correctamente, pero falló la actualización del inventario:', loadErr);
    }
  };

  const handleDeleteProduct = async (product: InventoryProduct) => {
    try {
      await deleteInventoryApi(product.id);
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
      await updateStockApi(stockManageProduct.id, delta);
      setInventory(inventory.map((item) => (item.id === stockManageProduct.id ? { ...item, stock: newStock } : item)));
      setStockManageProduct({ ...stockManageProduct, stock: newStock });
      if (selectedDetailProduct?.id === stockManageProduct.id) {
        setSelectedDetailProduct({ ...selectedDetailProduct, stock: newStock });
      }
    } catch {
      setInventory(inventory.map((item) => (item.id === stockManageProduct.id ? { ...item, stock: newStock } : item)));
    }
  };

  const resetForm = () => {
    setSku('');
    setName('');
    setBrand('');
    setModel('');
    setCategory('General');
    setStock('10');
    setUnitCost('10.0');
    setErrorMessage('');
    setInvNetworkError(null);
    try { localStorage.removeItem(DRAFT_INVENTORY_KEY); } catch {}
  };

  // Real-time Search & Category Filtering (Includes match by Brand & Model)
  const searchLower = String(search || '').toLowerCase();
  const filteredInventory = inventory.filter((item) => {
    const sku = String(item.sku ?? '').toLowerCase();
    const name = String(item.name ?? '').toLowerCase();
    const brand = String(item.brand ?? '').toLowerCase();
    const model = String(item.model ?? '').toLowerCase();
    const category = String(item.category ?? '').toLowerCase();

    const matchesSearch =
      sku.includes(searchLower) ||
      name.includes(searchLower) ||
      brand.includes(searchLower) ||
      model.includes(searchLower) ||
      category.includes(searchLower);

    const matchesCategory =
      selectedCategory === 'ALL' ||
      String(item.category || 'General').trim().toLowerCase() === selectedCategory.trim().toLowerCase();

    return matchesSearch && matchesCategory;
  });

  // Performance Pagination (25 items per page)
  const totalPages = Math.ceil(filteredInventory.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedInventory = filteredInventory.slice(startIndex, startIndex + itemsPerPage);

  const totalStockUnits = inventory.reduce((sum, item) => sum + item.stock, 0);
  const totalInventoryValue = inventory.reduce((sum, item) => sum + item.stock * item.unitCost, 0);
  const totalInventoryValueGtq = totalInventoryValue * 7.80;
  const totalUniqueSkus = inventory.length;

  const handleExportPDF = () => {
    if (onExportPDF) {
      onExportPDF();
    } else {
      exportInventoryPdf(inventory, currentUser);
    }
  };

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
    <div className="space-y-4 pb-24 sm:pb-32 min-h-[500px]">
      {/* Compact Minimal Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-2 px-1 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">Stock e Inventario</h2>
        {!isVendedor && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleExportPDF}
              title="Exportar PDF Inventario"
              className="flex items-center gap-1.5 px-3 py-2 text-xs md:text-sm font-medium text-slate-300 bg-slate-900 border border-slate-700 hover:border-slate-600 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer active:scale-95 shadow-sm"
            >
              <FileDown className="w-4 h-4 text-blue-400" />
              <span>Exportar PDF</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setNewCategoryName('');
                setCategoryError('');
                setShowCategoryModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 text-xs md:text-sm font-medium text-blue-400 bg-slate-900 hover:bg-slate-800 border border-blue-500/40 rounded-lg transition-colors cursor-pointer active:scale-95 shadow-sm"
              title="Crear nueva categoría"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>Nueva Categoría</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setErrorMessage('');
                setShowAddModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 text-xs md:text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors shadow-md shadow-blue-600/20 active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>Nuevo SKU</span>
            </button>
          </div>
        )}
      </div>

      {/* Mini KPI Cards (~70px Height) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        <div className="bg-white dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 flex flex-col justify-between h-[72px] shadow-sm">
          <span className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase truncate">SKUs Únicos</span>
          <div className="flex items-baseline justify-between">
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white font-mono">{totalUniqueSkus}</h3>
            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">catálogos</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 flex flex-col justify-between h-[72px] shadow-sm">
          <span className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase truncate">Stock Total</span>
          <div className="flex items-baseline justify-between">
            <h3 className="text-base sm:text-lg font-extrabold text-indigo-600 dark:text-indigo-300 font-mono">{totalStockUnits}</h3>
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">unidades</span>
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-white dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 flex flex-col justify-between h-[72px] shadow-sm">
          <span className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase truncate">Valoración Total</span>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white font-mono">${totalInventoryValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</h3>
            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold block">Q {totalInventoryValueGtq.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GTQ</span>
          </div>
        </div>
      </div>

      {/* Sticky Header Search & Quick Filter Chips */}
      <div className="sticky top-0 sm:top-[57px] z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur py-3 px-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
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
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-semibold"
          />
        </div>

        {/* Selector Desplegable de Categorías */}
        <div className="flex items-center gap-3 mt-3">
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider shrink-0">
            Categoría:
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200 text-xs sm:text-sm rounded-lg px-3 py-2 outline-none focus:border-blue-500 transition-colors cursor-pointer w-full sm:w-auto min-w-[220px]"
          >
            <option value="ALL">Todas las categorías ({inventory.length})</option>
            {categories.map((cat) => {
              const count = inventory.filter(
                (item) => String(item.category || 'General').trim().toLowerCase() === String(cat.name ?? '').trim().toLowerCase()
              ).length;
              return (
                <option key={cat.id || cat.name} value={cat.name}>
                  {cat.name} ({count})
                </option>
              );
            })}
          </select>
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
            const isOutOfStock = item.stock === 0;
            const stockText = isOutOfStock ? '0 uds (Agotado)' : `${item.stock} uds`;

            return (
              <div
                key={item.id}
                onClick={() => setSelectedDetailProduct(item)}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl p-2.5 flex items-center justify-between gap-3 h-[65px] active:bg-slate-100 dark:active:bg-slate-700/60 cursor-pointer shadow-sm transition"
              >
                {/* Product Info: Name in Bold + SKU & Brand */}
                {(() => {
                  const brandStr = item.brand != null ? String(item.brand).trim() : '';
                  const modelStr = item.model != null ? String(item.model).trim() : '';
                  const brandModelStr = [brandStr, modelStr].filter(Boolean).join(' ');
                  const fullTitle = brandModelStr ? `${brandModelStr} - ${String(item.name ?? '')}` : String(item.name ?? '');
                  return (
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-900 dark:text-white text-xs truncate leading-tight">{fullTitle}</h4>
                      <div className="flex items-center space-x-1.5 text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">{String(item.sku ?? '')} {brandStr ? `| ${brandStr}` : ''}</span>
                        <span>•</span>
                        <span className="truncate">{String(item.category || 'General')}</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Right: Clean Stock Text + Price in GTQ */}
                <div className="text-right shrink-0">
                  <span className={`text-[11px] font-medium ${isOutOfStock ? 'text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-200'}`}>
                    {stockText}
                  </span>
                  <span className="block text-xs font-mono font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    Q {(item.unitCost * 1.15 * 7.80).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* DESKTOP TABLE VIEW (Visible on md and larger) */}
      <div className="hidden md:block bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <h3 className="font-bold text-slate-900 dark:text-white text-base">Catálogo de Productos ({filteredInventory.length})</h3>
        </div>

        <div className="w-full overflow-x-hidden">
          <table className="w-full table-fixed border-collapse text-left">
            <thead className="bg-slate-50 dark:bg-slate-900/80 text-[11px] uppercase text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="w-[12%] px-2 py-2">SKU</th>
                <th className="w-[36%] px-2 py-2">Producto</th>
                <th className="w-[12%] px-2 py-2">Categoría</th>
                <th className="w-[8%] px-2 py-2 text-center">Stock</th>
                <th className="w-[14%] px-2 py-2 text-right">Costo Landed</th>
                <th className="w-[12%] px-2 py-2 bg-emerald-50 dark:bg-emerald-950/30 border-l border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-right">Precio Venta (+15%)</th>
                <th className="w-[6%] px-2 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700 text-xs">
              {paginatedInventory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-2 py-8 text-center text-slate-500 dark:text-slate-400">
                    No se encontraron productos en el inventario.
                  </td>
                </tr>
              ) : (
                paginatedInventory.map((item) => {
                  const unitCostGtq = item.unitCost * 7.80;
                  const sellingPriceUsd = item.unitCost * 1.15;
                  const sellingPriceGtq = sellingPriceUsd * 7.80;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition cursor-pointer" onClick={() => setSelectedDetailProduct(item)}>
                      <td className="px-2 py-2 font-mono font-bold text-blue-600 dark:text-blue-400 text-xs truncate" title={String(item.sku ?? '')}>
                        {String(item.sku ?? '')}
                      </td>
                      <td className="px-2 py-2 font-semibold text-slate-900 dark:text-white">
                        {(() => {
                          const bStr = item.brand != null ? String(item.brand).trim() : '';
                          const mStr = item.model != null ? String(item.model).trim() : '';
                          const bmStr = [bStr, mStr].filter(Boolean).join(' ');
                          const title = bmStr ? `${bmStr} - ${String(item.name ?? '')}` : String(item.name ?? '');
                          return (
                            <div className="min-w-0">
                              <span className="block truncate text-xs font-semibold text-slate-900 dark:text-white leading-snug" title={title}>
                                {title}
                              </span>
                              {bStr && (
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-normal truncate mt-0.5">
                                  Marca: {bStr} {mStr ? `• Modelo: ${mStr}` : ''}
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-2 py-2">
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] rounded-md font-medium border border-slate-200 dark:border-slate-600 inline-block truncate max-w-full">
                          {item.category || 'General'}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-center text-slate-700 dark:text-slate-200 font-medium text-xs whitespace-nowrap">
                        {item.stock === 0 ? (
                          <span className="text-slate-400 dark:text-slate-500 font-normal">0 uds</span>
                        ) : (
                          <span>{item.stock} uds</span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-right font-medium text-slate-900 dark:text-white whitespace-nowrap">
                        <span className="block text-xs font-mono font-bold">${item.unitCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</span>
                        <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 block">Q {unitCostGtq.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GTQ</span>
                      </td>
                      <td className="px-2 py-2 text-right bg-emerald-50/50 dark:bg-emerald-950/20 border-l border-emerald-200 dark:border-emerald-500/20 whitespace-nowrap">
                        <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400 text-xs block">Q {sellingPriceGtq.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GTQ</span>
                        <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 block">${sellingPriceUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</span>
                      </td>
                      <td className="px-2 py-2 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedDetailProduct(item)}
                          className="px-2 py-1 bg-blue-50 dark:bg-blue-600/20 hover:bg-blue-100 dark:hover:bg-blue-600/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/40 rounded-lg text-xs font-bold transition cursor-pointer"
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

      {/* Vista Pantalla Completa Detalle de SKU y Estructura de Costos */}
      {selectedDetailProduct && (
        <div className="fixed inset-0 z-50 w-full h-full bg-[#0b1329] p-4 md:p-8 overflow-y-auto flex flex-col text-slate-100 animate-in fade-in duration-150">
          <div className="w-full flex-1 flex flex-col space-y-5">
            {/* Header */}
            <div className="flex justify-between items-start border-b border-slate-700/80 pb-4 shrink-0 gap-4">
              <div className="flex items-start space-x-3 min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => setSelectedDetailProduct(null)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition font-medium text-xs border border-slate-700 cursor-pointer shrink-0 mt-0.5"
                >
                  <span>← Volver</span>
                </button>
                <div className="min-w-0 flex-1">
                  {(() => {
                    const cleanBrand = String(selectedDetailProduct.brand ?? '').trim();
                    const cleanModel = String(selectedDetailProduct.model ?? '').trim();

                    let brandModelCombined = '';
                    if (cleanBrand && cleanModel) {
                      if (cleanModel.toLowerCase().startsWith(cleanBrand.toLowerCase())) {
                        brandModelCombined = cleanModel;
                      } else {
                        brandModelCombined = `${cleanBrand} ${cleanModel}`;
                      }
                    } else if (cleanModel) {
                      brandModelCombined = cleanModel;
                    } else if (cleanBrand) {
                      brandModelCombined = cleanBrand;
                    }

                    const displayTitle = brandModelCombined
                      ? `${brandModelCombined} - ${String(selectedDetailProduct.name ?? '').trim()}`
                      : String(selectedDetailProduct.name ?? '').trim();

                    return (
                      <div className="min-w-0">
                        <div className="flex items-center flex-wrap gap-1.5 mb-1.5">
                          <span className="font-mono text-xs font-bold text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded border border-blue-500/20">
                            {selectedDetailProduct.sku}
                          </span>
                          {cleanBrand && (
                            <span className="text-xs font-bold text-slate-300 bg-slate-800 px-2.5 py-0.5 rounded border border-slate-700">
                              {cleanBrand}
                            </span>
                          )}
                          {selectedProductImportDetails?.sharePercentage ? (
                            <span className="text-xs font-bold text-slate-400 bg-slate-900 px-2.5 py-0.5 rounded border border-slate-800">
                              {selectedProductImportDetails.sharePercentage.toFixed(1)}% del lote
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-slate-300 bg-slate-800 px-2.5 py-0.5 rounded border border-slate-700">
                              {selectedDetailProduct.stock} uds disponibles
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-white text-base sm:text-lg leading-snug break-words">{displayTitle}</h3>
                      </div>
                    );
                  })()}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDetailProduct(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition font-bold text-base cursor-pointer border border-slate-700 shrink-0"
                title="Cerrar vista"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 pt-1 pb-4 flex-1">
              {/* Price Delta Alert */}
              {selectedDetailProduct.priceChangeDelta !== undefined && selectedDetailProduct.priceChangeDelta !== 0 && (
                <div className={`p-3 rounded-xl border text-xs font-semibold ${
                  selectedDetailProduct.priceChangeDelta > 0
                    ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                }`}>
                  {selectedDetailProduct.priceChangeDelta > 0
                    ? `📈 Variación de Costo: +$${selectedDetailProduct.priceChangeDelta.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD (+${selectedDetailProduct.priceChangePct}%)`
                    : `📉 Variación de Costo: -$${Math.abs(selectedDetailProduct.priceChangeDelta).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD (${selectedDetailProduct.priceChangePct}%)`}
                </div>
              )}

              {/* Step-by-Step 2-Column Financial Receipt */}
              {(() => {
                const stockQty = selectedDetailProduct.stock;
                const landedUsd = selectedProductImportDetails?.landedUsd || selectedDetailProduct.unitCost;
                const landedGtq = landedUsd * 7.80;
                const totalValUsd = stockQty * landedUsd;
                const totalValGtq = stockQty * landedGtq;

                const fobUsd = selectedProductImportDetails?.fobUsd ?? landedUsd;
                const fobGtq = fobUsd * 7.80;

                const unitCustomsUsd = selectedProductImportDetails?.unitCustomsUsd ?? 0;
                const unitCustomsGtq = unitCustomsUsd * 7.80;
                const customsPct = selectedProductImportDetails?.customsPct ?? 0;

                const unitShippingUsd = selectedProductImportDetails?.unitShippingUsd ?? 0;
                const unitShippingGtq = unitShippingUsd * 7.80;
                const shippingPct = selectedProductImportDetails?.shippingPct ?? 0;

                const sellingUsd = selectedProductImportDetails?.finalSellingPriceUsd || (landedUsd * 1.15);
                const sellingGtq = sellingUsd * 7.80;
                const profitUsd = sellingUsd - landedUsd;
                const profitGtq = profitUsd * 7.80;

                return (
                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between px-1 pb-1 border-b border-slate-200 dark:border-slate-700/80">
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">Estructura de Costos del Producto</span>
                      {selectedProductImportDetails?.batchName && (
                        <span className="text-[10px] font-mono text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-900 px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 font-bold">
                          📦 Lote: {selectedProductImportDetails.batchName}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                      {/* Columna Izquierda: 1. Costo Base FOB, 2. Recargo Aduana, 3. Recargo Flete */}
                      <div className="space-y-3">
                        {/* Step 1: Costo Base (Compra China / FOB) */}
                        <div className="bg-slate-50 dark:bg-slate-900/90 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-1.5 shadow-sm">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-900 dark:text-slate-200 text-xs">1. Costo Base (Compra China / FOB)</span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">Por Unidad</span>
                          </div>
                          <div className="flex justify-between items-baseline pt-0.5">
                            <span className="text-base font-mono font-bold text-slate-900 dark:text-white">${fobUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</span>
                            <span className="text-xs font-mono font-extrabold text-slate-700 dark:text-slate-300">Q {fobGtq.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GTQ</span>
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 pt-1.5 border-t border-slate-200 dark:border-slate-800 flex justify-between">
                            <span>Total Lote ({stockQty} uds):</span>
                            <span className="font-mono">${(fobUsd * stockQty).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD (Q {(fobGtq * stockQty).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GTQ)</span>
                          </div>
                        </div>

                        {/* Step 2: Recargo Aduana */}
                        <div className="bg-amber-50/70 dark:bg-slate-900/90 p-3.5 rounded-xl border border-amber-200 dark:border-slate-700/80 space-y-1.5 shadow-sm">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-amber-800 dark:text-amber-300 text-xs">2. Recargo Aduana</span>
                            <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 font-mono bg-amber-100 dark:bg-amber-500/10 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-500/20">
                              +{customsPct.toFixed(1)}% s/FOB
                            </span>
                          </div>
                          <div className="flex justify-between items-baseline pt-0.5">
                            <span className="text-xs font-mono font-semibold text-amber-800 dark:text-amber-200">+$ {unitCustomsUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD/u</span>
                            <span className="text-xs font-mono font-bold text-amber-800 dark:text-amber-300">+Q {unitCustomsGtq.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GTQ/u</span>
                          </div>
                        </div>

                        {/* Step 3: Recargo Flete */}
                        <div className="bg-indigo-50/70 dark:bg-slate-900/90 p-3.5 rounded-xl border border-indigo-200 dark:border-slate-700/80 space-y-1.5 shadow-sm">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-indigo-800 dark:text-indigo-300 text-xs">3. Recargo Flete</span>
                            <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 font-mono bg-indigo-100 dark:bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-500/20">
                              +{shippingPct.toFixed(1)}% s/FOB
                            </span>
                          </div>
                          <div className="flex justify-between items-baseline pt-0.5">
                            <span className="text-xs font-mono font-semibold text-indigo-800 dark:text-indigo-200">+$ {unitShippingUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD/u</span>
                            <span className="text-xs font-mono font-bold text-indigo-800 dark:text-indigo-300">+Q {unitShippingGtq.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GTQ/u</span>
                          </div>
                        </div>
                      </div>

                      {/* Columna Derecha: 4. Costo Landed Final, 5. Precio Venta Sugerido con margen */}
                      <div className="space-y-3">
                        {/* Step 4: Costo Aquí (Landed Final) */}
                        <div className="bg-blue-50 dark:bg-blue-950/40 p-3.5 rounded-xl border border-blue-200 dark:border-blue-500/40 space-y-2 shadow-sm">
                          <div className="flex justify-between items-center">
                            <span className="font-extrabold text-blue-800 dark:text-blue-300 text-xs">4. Costo Aquí (Landed Final)</span>
                            <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-500/20 px-2 py-0.5 rounded">FOB + Ad + Fl</span>
                          </div>
                          <div className="flex justify-between items-baseline">
                            <span className="text-base font-mono font-bold text-slate-900 dark:text-white">${landedUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</span>
                            <span className="text-sm font-mono font-extrabold text-indigo-700 dark:text-indigo-300">Q {landedGtq.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GTQ</span>
                          </div>
                          <div className="text-[10px] text-blue-700 dark:text-blue-300/80 pt-1.5 border-t border-blue-200 dark:border-blue-900/50 flex justify-between">
                            <span>Valoración Almacén ({stockQty} uds):</span>
                            <span className="font-mono font-bold text-indigo-700 dark:text-indigo-200">${totalValUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD (Q {totalValGtq.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GTQ)</span>
                          </div>
                        </div>

                        {/* Step 5: Precio Venta Final */}
                        <div className="bg-emerald-50 dark:bg-emerald-950/70 p-4 rounded-xl border border-emerald-200 dark:border-emerald-500/50 space-y-2.5 shadow-md">
                          <div className="flex justify-between items-center">
                            <span className="font-extrabold text-emerald-800 dark:text-emerald-400 text-xs uppercase tracking-wide">5. Precio Venta Sugerido (+15% Margen)</span>
                          </div>
                          <div className="flex justify-between items-baseline">
                            <span className="text-lg font-mono font-black text-slate-900 dark:text-white">${sellingUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</span>
                            <span className="text-lg font-mono font-black text-emerald-600 dark:text-emerald-400">Q {sellingGtq.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GTQ</span>
                          </div>
                          <div className="text-[11px] text-emerald-800 dark:text-emerald-300 pt-2 border-t border-emerald-200 dark:border-emerald-800/60 flex justify-between items-center">
                            <span>Ganancia Estimada por Unidad:</span>
                            <span className="font-mono font-extrabold text-emerald-700 dark:text-emerald-300">+Q {profitGtq.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GTQ (+${profitUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Barra Horizontal Fija de Acciones Rápidas (Ajustar Stock, Histórico Precios, Eliminar SKU, Cerrar) */}
            <div className="pt-4 border-t border-slate-700/80 shrink-0 flex flex-wrap items-center justify-between gap-3 bg-transparent">
              <div className="flex items-center flex-wrap gap-2.5">
                {!isVendedor && (
                  <button
                    type="button"
                    onClick={() => {
                      setStockManageProduct(selectedDetailProduct);
                      setStockChangeAmount('1');
                    }}
                    className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl font-bold text-xs transition active:scale-95 cursor-pointer shadow-sm"
                  >
                    <Sliders className="w-3.5 h-3.5 shrink-0" />
                    <span>Ajustar Stock</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleOpenPriceHistory(selectedDetailProduct)}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-xl font-bold text-xs transition active:scale-95 cursor-pointer shadow-sm"
                >
                  <Eye className="w-3.5 h-3.5 shrink-0" />
                  <span>Histórico Precios</span>
                </button>

                {!isVendedor && (
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmProduct(selectedDetailProduct)}
                    className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl font-bold text-xs transition active:scale-95 cursor-pointer shadow-sm"
                  >
                    <Trash2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Eliminar SKU</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSelectedDetailProduct(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-sm border border-slate-700 ml-auto"
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
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-white text-base">Registrar Nuevo Producto / SKU</h3>
                {(name.trim() !== '' || sku.trim() !== '') && (
                  <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    📝 Borrador autoguardado
                  </span>
                )}
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white text-base font-bold">✕</button>
            </div>

            {errorMessage && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-3 rounded-lg font-medium shrink-0">
                {errorMessage}
              </div>
            )}

            {invNetworkError && (
              <div className="p-3 bg-rose-500/15 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex flex-col sm:flex-row items-center justify-between gap-2.5 animate-in fade-in shrink-0">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
                  <span className="font-semibold">{invNetworkError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCreateProduct()}
                  disabled={isSavingProduct}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs transition shadow shrink-0 cursor-pointer flex items-center space-x-1"
                >
                  <span>{isSavingProduct ? 'Guardando...' : '🔄 Reintentar Guardar'}</span>
                </button>
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
                <label className="block text-slate-400 font-semibold uppercase mb-1">Nombre del Producto *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Audífonos Bluetooth Pro / Smartphone"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500"
                />
              </div>

              {/* Marca & Modelo (Fila de 2 columnas) */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 font-semibold uppercase mb-1">Marca (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ej. Xiaomi, Honda"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold uppercase mb-1">Modelo (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ej. Redmi Note 13, CG125"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 font-semibold uppercase mb-1">Categoría</label>
                  <select
                    value={category}
                    onChange={(e) => {
                      if (e.target.value === '__NEW__') {
                        setNewCategoryName('');
                        setCategoryError('');
                        setShowCategoryModal(true);
                      } else {
                        setCategory(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 cursor-pointer text-sm"
                  >
                    {categories.map((c) => (
                      <option key={c.id || c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                    <option value="__NEW__" className="text-blue-400 font-bold bg-slate-800">
                      + Crear nueva categoría...
                    </option>
                  </select>
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

      {/* Panel de Gestión de Categorías a Pantalla Completa */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 z-[100005] bg-slate-950 flex flex-col p-4 sm:p-6 overflow-hidden animate-in fade-in duration-200">
          {/* Header Superior */}
          <div className="flex justify-between items-start border-b border-slate-800 pb-4 mb-5 shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                <Tag className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Gestión de Categorías</h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                  Total: <span className="text-blue-400 font-bold font-mono">{categories.length}</span> categorías registradas
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowCategoryModal(false);
                setEditingCategoryId(null);
                setNewCategoryName('');
                setCategorySearchTerm('');
                setCategoryError('');
              }}
              className="text-slate-400 hover:text-white p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition text-lg font-bold cursor-pointer"
              title="Cerrar panel"
            >
              ✕
            </button>
          </div>

          {/* Cuerpo en Dos Columnas */}
          <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0 overflow-hidden">
            {/* Columna Izquierda (Crear Categoría, ~35% de ancho) */}
            <div className="w-full lg:w-[35%] shrink-0 flex flex-col space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="font-bold text-white text-base">
                    {editingCategoryId ? 'Editar Categoría' : 'Nueva Categoría'}
                  </h3>
                  {editingCategoryId && (
                    <button
                      type="button"
                      onClick={handleCancelEditCategory}
                      className="text-xs text-slate-400 hover:text-slate-200 underline cursor-pointer"
                    >
                      Cancelar edición
                    </button>
                  )}
                </div>

                {categoryError && (
                  <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-3 rounded-lg font-medium">
                    {categoryError}
                  </div>
                )}

                <form onSubmit={handleSaveCategorySubmit} className="space-y-4">
                  <div>
                    <label className="block text-slate-400 font-semibold uppercase text-xs mb-1.5">
                      Nombre de la Categoría
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Baterías, Cargadores, Pantallas..."
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      autoFocus
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm font-medium transition"
                    />
                    <p className="text-[11px] text-slate-500 mt-1.5">
                      {editingCategoryId
                        ? 'Modifica el nombre para actualizar la categoría en el catálogo.'
                        : 'Define una nueva categoría para organizar productos y SKUs.'}
                    </p>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSavingCategory}
                      className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-blue-600/20 active:scale-[0.98] cursor-pointer flex items-center justify-center space-x-2"
                    >
                      {isSavingCategory ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                          <span>{editingCategoryId ? 'Actualizando...' : 'Guardando...'}</span>
                        </>
                      ) : (
                        <>
                          <Plus size={16} />
                          <span>{editingCategoryId ? 'Actualizar Categoría' : 'Guardar Categoría'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Caja de ayuda informativa */}
              <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4 text-xs text-slate-400 space-y-1.5">
                <span className="font-semibold text-slate-300 block">💡 Organización Dinámica</span>
                <p>
                  Las categorías permiten segmentar y filtrar eficientemente el catálogo de productos y son cargadas dinámicamente en el formulario de nuevos SKUs.
                </p>
              </div>
            </div>

            {/* Columna Derecha (Listado y Administración, ~65% de ancho) */}
            <div className="w-full lg:w-[65%] flex-1 min-h-0 flex flex-col bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
              {/* Barra rápida de búsqueda */}
              <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-800 shrink-0">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar categoría existente..."
                    value={categorySearchTerm}
                    onChange={(e) => setCategorySearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:border-blue-500 text-xs sm:text-sm font-medium transition"
                  />
                </div>
                <span className="text-xs text-slate-400 font-mono shrink-0">
                  {filteredCategoriesList.length} de {categories.length}
                </span>
              </div>

              {/* Card contenedora con scroll vertical independiente */}
              <div className="flex-1 max-h-[calc(100vh-180px)] overflow-y-auto space-y-2.5 pt-4 pr-1">
                {filteredCategoriesList.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-sm">
                    No se encontraron categorías que coincidan con la búsqueda.
                  </div>
                ) : (
                  filteredCategoriesList.map((cat) => {
                    const associatedProductsCount = inventory.filter(
                      (p) => String(p.category ?? '').trim().toLowerCase() === String(cat.name ?? '').trim().toLowerCase()
                    ).length;

                    const isEditingThis = editingCategoryId === cat.id;

                    return (
                      <div
                        key={cat.id}
                        className={`bg-slate-900/60 border rounded-lg p-3 flex items-center justify-between gap-3 transition hover:bg-slate-800/40 ${
                          isEditingThis ? 'border-blue-500 ring-1 ring-blue-500/30' : 'border-slate-800/80'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-white text-sm sm:text-base tracking-tight truncate">
                              {cat.name}
                            </span>
                            {associatedProductsCount > 0 ? (
                              <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                                {associatedProductsCount} {associatedProductsCount === 1 ? 'SKU' : 'SKUs'}
                              </span>
                            ) : (
                              <span className="bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                                0 SKUs
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-3 text-[11px] text-slate-400 mt-1">
                            {cat.created_at ? (
                              <span>
                                Creada el {new Date(cat.created_at).toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </span>
                            ) : (
                              <span>Categoría estándar</span>
                            )}
                          </div>
                        </div>

                        {/* Acciones */}
                        <div className="flex items-center space-x-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleStartEditCategory(cat)}
                            className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition text-xs font-semibold cursor-pointer"
                            title="Editar categoría"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setCategoryToDelete(cat)}
                            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition text-xs font-semibold cursor-pointer"
                            title="Eliminar categoría"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación Rápida de Eliminación */}
      {categoryToDelete && (
        <div className="fixed inset-0 bg-black/80 z-[100010] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <h4 className="font-bold text-white text-base">¿Eliminar Categoría?</h4>
            <p className="text-xs text-slate-300">
              ¿Estás seguro de que deseas eliminar la categoría <span className="font-bold text-white">"{categoryToDelete.name}"</span>?
            </p>
            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteCategoryConfirm}
                disabled={isDeletingCategory}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition cursor-pointer"
              >
                {isDeletingCategory ? 'Eliminando...' : 'Sí, Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notificación Categoría */}
      {categoryToastMessage && (
        <div className="fixed bottom-6 right-6 z-[100006] bg-slate-900 border border-emerald-500/40 text-emerald-300 px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-2 text-xs font-bold animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{categoryToastMessage}</span>
        </div>
      )}
    </div>
  );
};
