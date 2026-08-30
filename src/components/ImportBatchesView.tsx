import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Layers,
  Image as ImageIcon,
  Sparkles,
  Database,
  TrendingUp,
  Tag,
  AlertCircle,
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import { ImportBatch, fetchBatches, createBatchApi, deleteBatchApi, fetchInventory, InventoryProduct } from '../services/api';
import { ImagePicker } from './ImagePicker';

const fallbackBatches: ImportBatch[] = [
  {
    id: '#5555',
    name: 'Lote #5555 - Importación Tecnológica',
    importDate: '28 Ago 2026',
    totalCustomsTax: 50.00,
    totalShippingCost: 10.00,
    exchangeRateGtq: 7.80,
    profitMarginPct: 15.0,
    costUpdateStrategy: 'weighted',
    items: [
      {
        sku: 'asdasd',
        productName: 'Smartwatch Ultra L5',
        quantity: 17,
        unitCostFob: 25.00,
        allocatedCustoms: 2.94,
        allocatedShipping: 0.59,
        allocatedTax: 3.53,
        unitTax: 3.53,
        finalUnitCost: 28.53,
        profitMarginPct: 15.0,
        finalSellingPrice: 32.81,
        image: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=120&q=80'
      },
      {
        sku: 'AUD-Q3',
        productName: 'Audífonos In-Ear Q3',
        quantity: 25,
        unitCostFob: 11.28,
        allocatedCustoms: 1.20,
        allocatedShipping: 0.35,
        allocatedTax: 1.55,
        unitTax: 1.55,
        finalUnitCost: 12.83,
        profitMarginPct: 15.0,
        finalSellingPrice: 14.81,
        image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=120&q=80'
      },
      {
        sku: 'CARG-M5',
        productName: 'Cargador Inalámbrico M5',
        quantity: 12,
        unitCostFob: 18.09,
        allocatedCustoms: 1.80,
        allocatedShipping: 0.50,
        allocatedTax: 2.30,
        unitTax: 2.30,
        finalUnitCost: 20.39,
        profitMarginPct: 15.0,
        finalSellingPrice: 23.72,
        image: 'https://images.unsplash.com/photo-1622445268465-843857588a36?auto=format&fit=crop&w=120&q=80'
      },
      {
        sku: 'PWR-20K',
        productName: 'Power Bank 20k-mAh',
        quantity: 20,
        unitCostFob: 30.30,
        allocatedCustoms: 3.10,
        allocatedShipping: 0.85,
        allocatedTax: 3.95,
        unitTax: 3.95,
        finalUnitCost: 34.25,
        profitMarginPct: 15.0,
        finalSellingPrice: 39.74,
        image: 'https://images.unsplash.com/photo-1609592424074-245152a514d0?auto=format&fit=crop&w=120&q=80'
      },
      {
        sku: 'HUB-7IN1',
        productName: 'Hub USB-C 7-en-1',
        quantity: 10,
        unitCostFob: 19.55,
        allocatedCustoms: 1.95,
        allocatedShipping: 0.55,
        allocatedTax: 2.50,
        unitTax: 2.50,
        finalUnitCost: 22.05,
        profitMarginPct: 15.0,
        finalSellingPrice: 25.64,
        image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=120&q=80'
      }
    ]
  }
];

export const ImportBatchesView: React.FC = () => {
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [inventoryList, setInventoryList] = useState<InventoryProduct[]>([]);
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addBatchStep, setAddBatchStep] = useState<1 | 2>(1);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isDbConnected, setIsDbConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Active dropdown open index for SKU selector
  const [openSkuDropdownIndex, setOpenSkuDropdownIndex] = useState<number | null>(null);

  // New batch form state
  const [batchName, setBatchName] = useState('');
  const [customsTax, setCustomsTax] = useState<string>('');
  const [shippingCost, setShippingCost] = useState<string>('');
  const [exchangeRateGtq, setExchangeRateGtq] = useState<string>('7.80');
  const [profitMarginPct, setProfitMarginPct] = useState<string>('15.0');
  const [costUpdateStrategy, setCostUpdateStrategy] = useState<'weighted' | 'latest'>('weighted');
  const [inputItems, setInputItems] = useState<Array<{ sku: string; productName: string; quantity: string; unitCostFob: string; image: string }>>([]);

  const loadBatchesData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchBatches();
      const invData = await fetchInventory();
      if (Array.isArray(data)) {
        setBatches(data);
        setIsDbConnected(true);
        if (data.length > 0) setExpandedBatchId(data[0].id);
      }
      if (Array.isArray(invData)) {
        setInventoryList(invData);
      }
    } catch {
      setIsDbConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBatchesData();
  }, []);

  // Real-time prorating calculation preview
  const parsedTax = parseFloat(customsTax) || 0;
  const parsedShipping = parseFloat(shippingCost) || 0;
  const parsedGtqRate = parseFloat(exchangeRateGtq) || 7.80;
  const parsedMargin = parseFloat(profitMarginPct) || 15.0;
  const totalLandedExpenses = parsedTax + parsedShipping;

  let totalBatchFob = 0;

  const previewItems = inputItems.map((item, idx) => {
    const qty = Math.max(0, parseInt(item.quantity) || 0);
    const cost = Math.max(0, parseFloat(item.unitCostFob) || 0);
    const totalFob = qty * cost;
    totalBatchFob += totalFob;
    const sku = item.sku && item.sku.trim() !== '' ? item.sku.trim().toUpperCase() : `PROD-00${idx + 1}`;
    const productName = item.productName && item.productName.trim() !== '' ? item.productName.trim() : `Producto #${idx + 1}`;
    return { sku, productName, quantity: qty, unitCostFob: cost, totalFobValue: totalFob, image: item.image || '' };
  });

  // Calculate live customs percentage on total FOB (100% Automatic Read-Only)
  const computedCustomsTaxPct = totalBatchFob > 0 ? (parsedTax / totalBatchFob) * 100 : 0;

  const proratedPreview = previewItems.map(item => {
    const sharePercentage = totalBatchFob > 0 ? (item.totalFobValue / totalBatchFob) * 100 : 0;
    const allocatedCustoms = (sharePercentage / 100) * parsedTax;
    const allocatedShipping = (sharePercentage / 100) * parsedShipping;
    const allocatedExpenses = allocatedCustoms + allocatedShipping;
    const unitTax = item.quantity > 0 ? allocatedExpenses / item.quantity : 0;
    const finalUnitCost = item.unitCostFob + unitTax;
    const finalSellingPrice = finalUnitCost * (1 + parsedMargin / 100);

    return {
      ...item,
      sharePercentage: isNaN(sharePercentage) ? 0 : parseFloat(sharePercentage.toFixed(2)),
      allocatedCustoms: isNaN(allocatedCustoms) ? 0 : parseFloat(allocatedCustoms.toFixed(2)),
      allocatedShipping: isNaN(allocatedShipping) ? 0 : parseFloat(allocatedShipping.toFixed(2)),
      allocatedTax: isNaN(allocatedExpenses) ? 0 : parseFloat(allocatedExpenses.toFixed(2)),
      unitTax: isNaN(unitTax) ? 0 : parseFloat(unitTax.toFixed(2)),
      finalUnitCost: isNaN(finalUnitCost) ? item.unitCostFob : parseFloat(finalUnitCost.toFixed(2)),
      profitMarginPct: parsedMargin,
      finalSellingPrice: isNaN(finalSellingPrice) ? finalUnitCost : parseFloat(finalSellingPrice.toFixed(2))
    };
  });

  // Check if any item being imported currently has stock > 0 in inventory AND has a price variation
  const detectedPriceVariations = proratedPreview.filter(item => {
    const cleanSku = item.sku.trim().toUpperCase();
    if (!cleanSku) return false;
    const existingInStock = inventoryList.find(inv => inv.sku.toUpperCase() === cleanSku && inv.stock > 0);
    if (!existingInStock) return false;
    return Math.abs(item.finalUnitCost - existingInStock.unitCost) >= 0.01;
  });

  const hasStockWithPriceVariation = detectedPriceVariations.length > 0;

  const handleAddItemRow = () => {
    setInputItems([...inputItems, { sku: '', productName: '', quantity: '1', unitCostFob: '', image: '' }]);
  };

  const handleRemoveItemRow = (index: number) => {
    const updated = inputItems.filter((_, i) => i !== index);
    setInputItems(updated);
  };

  const handleItemChange = (index: number, field: string, value: string) => {
    const updated = [...inputItems];
    // @ts-ignore
    updated[index][field] = value;

    if (field === 'sku') {
      const cleanTyped = value.trim().toUpperCase();
      if (cleanTyped.length >= 1) {
        setOpenSkuDropdownIndex(index);
      } else {
        setOpenSkuDropdownIndex(null);
      }

      const match = inventoryList.find(inv => inv.sku.toUpperCase() === cleanTyped);
      if (match) {
        updated[index].productName = match.name;
        if (match.image) updated[index].image = match.image;
        if (match.unitCost && (!updated[index].unitCostFob || updated[index].unitCostFob === '')) {
          updated[index].unitCostFob = match.unitCost.toString();
        }
      }
    }

    setInputItems(updated);
  };

  const handleSelectMatchingSku = (index: number, inv: InventoryProduct) => {
    const updated = [...inputItems];
    updated[index].sku = inv.sku;
    updated[index].productName = inv.name;
    if (inv.image) updated[index].image = inv.image;
    if (inv.unitCost) updated[index].unitCostFob = inv.unitCost.toString();
    setInputItems(updated);
    setOpenSkuDropdownIndex(null);
  };

  // Single Product Form Entry State inside Modal
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [showImagePickerInForm, setShowImagePickerInForm] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [singleProductForm, setSingleProductForm] = useState<{ sku: string; productName: string; quantity: string; unitCostFob: string; image: string }>({
    sku: '',
    productName: '',
    quantity: '1',
    unitCostFob: '',
    image: ''
  });

  const handleOpenSingleProductForm = (indexToEdit: number | null = null) => {
    if (indexToEdit !== null && inputItems[indexToEdit]) {
      setEditingItemIndex(indexToEdit);
      setSingleProductForm({ ...inputItems[indexToEdit] });
      setShowImagePickerInForm(!!inputItems[indexToEdit].image);
    } else {
      setEditingItemIndex(null);
      setSingleProductForm({ sku: '', productName: '', quantity: '1', unitCostFob: '', image: '' });
      setShowImagePickerInForm(false);
    }
    setIsAddingProduct(true);
    setOpenSkuDropdownIndex(null);
  };

  const handleConfirmSingleProduct = () => {
    if (!singleProductForm.productName || !singleProductForm.quantity || !singleProductForm.unitCostFob) {
      alert('Por favor completa el Nombre del Producto, la Cantidad y el Costo FOB.');
      return;
    }

    const cleanItem = {
      sku: singleProductForm.sku.trim() ? singleProductForm.sku.trim().toUpperCase() : `PROD-00${inputItems.length + 1}`,
      productName: singleProductForm.productName.trim(),
      quantity: singleProductForm.quantity,
      unitCostFob: singleProductForm.unitCostFob,
      image: singleProductForm.image
    };

    if (editingItemIndex !== null) {
      const updated = [...inputItems];
      updated[editingItemIndex] = cleanItem;
      setInputItems(updated);
      setEditingItemIndex(null);
    } else {
      setInputItems([...inputItems, cleanItem]);
    }

    setSingleProductForm({ sku: '', productName: '', quantity: '1', unitCostFob: '', image: '' });
    setIsAddingProduct(false);
    setShowImagePickerInForm(false);
    setOpenSkuDropdownIndex(null);
  };

  const handleRemoveConfirmedItem = (index: number) => {
    const updated = inputItems.filter((_, i) => i !== index);
    setInputItems(updated);
  };

  const handleOpenAddModal = () => {
    setBatchName('');
    setCustomsTax('');
    setShippingCost('');
    setExchangeRateGtq('7.80');
    setProfitMarginPct('15.0');
    setCostUpdateStrategy('weighted');
    setInputItems([]);
    setSingleProductForm({ sku: '', productName: '', quantity: '1', unitCostFob: '', image: '' });
    setIsAddingProduct(false);
    setShowImagePickerInForm(false);
    setEditingItemIndex(null);
    setOpenSkuDropdownIndex(null);
    setShowConfirmModal(false);
    setAddBatchStep(1);
    setShowAddModal(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchName || previewItems.length === 0) return;
    setShowConfirmModal(true);
  };

  const processSaveBatch = async () => {
    if (!batchName || previewItems.length === 0) return;

    const payload = {
      name: batchName,
      totalCustomsTax: parsedTax,
      totalShippingCost: parsedShipping,
      exchangeRateGtq: parsedGtqRate,
      profitMarginPct: parsedMargin,
      costUpdateStrategy: costUpdateStrategy,
      items: previewItems.map(i => ({ sku: i.sku, productName: i.productName, quantity: i.quantity, unitCostFob: i.unitCostFob, image: i.image }))
    };

    try {
      const created = await createBatchApi(payload);
      await loadBatchesData();
      setExpandedBatchId(created.id);
      setIsDbConnected(true);
    } catch (err) {
      console.error('Error al guardar lote:', err);
      const mockCreated: ImportBatch = {
        id: `#LOT-2026-${Math.floor(10 + Math.random() * 90)}`,
        name: batchName,
        importDate: new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }),
        totalCustomsTax: parsedTax,
        totalShippingCost: parsedShipping,
        exchangeRateGtq: parsedGtqRate,
        profitMarginPct: parsedMargin,
        status: 'Procesado',
        items: proratedPreview
      };
      setBatches([mockCreated, ...batches]);
      setExpandedBatchId(mockCreated.id);
    }

    setBatchName('');
    setCustomsTax('');
    setShippingCost('');
    setExchangeRateGtq('7.80');
    setProfitMarginPct('15.0');
    setInputItems([]);
    setShowConfirmModal(false);
    setShowAddModal(false);
  };

  const handleDeleteBatch = async (id: string) => {
    if (!window.confirm(`¿Estás seguro de eliminar el lote ${id}? Esta acción eliminará los ítems asociados a este lote.`)) {
      return;
    }
    try {
      await deleteBatchApi(id);
      await loadBatchesData();
    } catch {
      setBatches(batches.filter(b => b.id !== id));
    }
  };

  // Metrics summary
  const totalCustomsTaxPaid = batches.reduce((sum, b) => sum + (b.totalCustomsTax || 0), 0);
  const totalShippingPaid = batches.reduce((sum, b) => sum + (b.totalShippingCost || 0), 0);
  const totalImportExpenses = totalCustomsTaxPaid + totalShippingPaid;
  const totalBatchesCount = batches.length;

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
        <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">Lotes de Importación</h2>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition shadow-md shadow-blue-600/20 active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Nuevo Lote</span>
        </button>
      </div>

      {/* Mini KPI Cards (~70px Height) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/80 flex flex-col justify-between h-[72px]">
          <span className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase truncate">Lotes Procesados</span>
          <div className="flex items-baseline justify-between">
            <h3 className="text-base sm:text-lg font-extrabold text-white font-mono">{totalBatchesCount}</h3>
            <span className="text-[10px] text-blue-400 font-medium">lotes BD</span>
          </div>
        </div>

        <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/80 flex flex-col justify-between h-[72px]">
          <span className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase truncate">Gastos Importación</span>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-white font-mono">${totalImportExpenses.toFixed(2)} USD</h3>
            <span className="text-[10px] font-mono text-emerald-400 font-semibold block">Q {(totalImportExpenses * 7.80).toFixed(2)}</span>
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-slate-800/80 p-3 rounded-xl border border-slate-700/80 flex flex-col justify-between h-[72px]">
          <span className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase truncate">Margen Aplicado</span>
          <div className="flex items-baseline justify-between">
            <h3 className="text-base sm:text-lg font-extrabold text-emerald-400 font-mono">+15%</h3>
            <span className="text-[10px] text-slate-400">Precio Venta</span>
          </div>
        </div>
      </div>

      {/* Batches List */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-white">Historial de Lotes de Importación</h3>

        {batches.length === 0 ? (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center text-slate-400">
            No hay lotes registrados. Haz clic en "+ Nuevo Lote de Importación" para agregar uno.
          </div>
        ) : (
          batches.map((batch, index) => {
            const isExpanded = expandedBatchId === batch.id;
            const batchFobTotal = batch.items.reduce((sum, i) => sum + (i.totalFobValue || (i.quantity * i.unitCostFob)), 0);
            const totalBatchLandedExpenses = (batch.totalCustomsTax || 0) + (batch.totalShippingCost || 0);
            const rate = batch.exchangeRateGtq || 7.80;
            const marginPct = batch.profitMarginPct || 15.0;
            const totalGtqExpenses = totalBatchLandedExpenses * rate;

            return (
              <div key={batch.id} className={`bg-slate-800 border rounded-xl overflow-hidden shadow-sm transition ${
                index === 0 ? 'border-amber-500/50 ring-1 ring-amber-500/20' : 'border-slate-700/80'
              }`}>
                {/* Batch Header Bar (Compact Accordion ~70px height) */}
                <div
                  onClick={() => setExpandedBatchId(isExpanded ? null : batch.id)}
                  className="p-3.5 sm:p-5 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-700/30 transition min-h-[70px]"
                >
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div className="p-2 sm:p-2.5 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30 shrink-0">
                      <Layers className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-1.5 flex-wrap gap-1">
                        {index === 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[9px] font-extrabold shrink-0">
                            ÚLTIMO LOTE
                          </span>
                        )}
                        <span className="font-mono text-xs font-bold text-blue-400">{batch.id}</span>
                        <h4 className="text-xs sm:text-base font-bold text-white truncate">{batch.name}</h4>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] sm:text-[10px] font-bold shrink-0">
                          +{marginPct}%
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 block truncate mt-0.5">
                        {batch.importDate} • {batch.items.length} prods • Q {rate.toFixed(2)} / USD
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 sm:space-x-4 shrink-0">
                    <div className="text-right text-xs">
                      <span className="text-[10px] text-slate-400 uppercase hidden sm:block font-semibold">Gastos Importación</span>
                      <span className="text-xs sm:text-sm font-bold text-white block">${totalBatchLandedExpenses.toFixed(2)}</span>
                      <span className="font-mono font-extrabold text-emerald-400 text-[10px] sm:text-xs block">
                        Q {totalGtqExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteBatch(batch.id);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 transition"
                      title="Eliminar lote"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </div>

                {/* Batch Items Breakdown */}
                {isExpanded && (
                  <div className="border-t border-slate-700 bg-slate-900/90 p-3 sm:p-4 space-y-3">
                    {/* Summary Header Bar */}
                    {(() => {
                      const batchCustomsPct = batchFobTotal > 0 ? ((batch.totalCustomsTax || 0) / batchFobTotal) * 100 : 0;
                      return (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-semibold text-slate-300 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-white text-xs sm:text-sm">Productos en este Lote ({batch.items.length})</span>
                            <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-mono font-semibold">
                              Tasa: Q {rate.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center space-x-3 text-[10px] sm:text-[11px] flex-wrap gap-1">
                            <span className="text-slate-400">Total FOB: <strong className="text-white">${batchFobTotal.toFixed(2)} USD</strong></span>
                            <span className="text-amber-400">Aduana: <strong>${batch.totalCustomsTax?.toFixed(2)} USD ({batchCustomsPct.toFixed(1)}%)</strong></span>
                            <span className="text-indigo-400">Flete: <strong>${batch.totalShippingCost?.toFixed(2)} USD</strong></span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* MOBILE STACKED PRODUCT BLOCKS VIEW (Visible on small screens md:hidden) */}
                    <div className="md:hidden space-y-3">
                      {batch.items.map((item, idx) => {
                        const itemCustoms = item.allocatedCustoms !== undefined ? item.allocatedCustoms : ((item.sharePercentage || 0) / 100) * (batch.totalCustomsTax || 0);
                        const itemShipping = item.allocatedShipping !== undefined ? item.allocatedShipping : ((item.sharePercentage || 0) / 100) * (batch.totalShippingCost || 0);
                        const totalAllocatedExpenseForItem = itemCustoms + itemShipping;
                        const customsPerUnit = item.quantity > 0 ? itemCustoms / item.quantity : 0;
                        const shippingPerUnit = item.quantity > 0 ? itemShipping / item.quantity : 0;
                        const totalTaxPerUnit = customsPerUnit + shippingPerUnit;
                        
                        const valFobNoTax = item.unitCostFob;
                        const valLandedFull = item.finalUnitCost || (item.unitCostFob + totalTaxPerUnit);
                        const itemMargin = item.profitMarginPct || marginPct;
                        const valFinalSellingUsd = item.finalSellingPrice || (valLandedFull * (1 + itemMargin / 100));
                        const valFinalSellingGtq = valFinalSellingUsd * rate;
                        
                        const taxSurchargePct = valFobNoTax > 0 ? (totalTaxPerUnit / valFobNoTax) * 100 : 0;
                        const sharePct = item.sharePercentage !== undefined ? item.sharePercentage : (batchFobTotal > 0 ? ((item.quantity * item.unitCostFob) / batchFobTotal) * 100 : 0);

                        return (
                          <div key={idx} className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2.5 shadow-md">
                            {/* Header: Photo, Name, SKU, Units */}
                            <div className="flex items-center space-x-3">
                              {item.image ? (
                                <img src={item.image} alt={item.productName} className="w-10 h-10 rounded-xl object-cover border border-slate-700 shrink-0 bg-slate-800" />
                              ) : (
                                <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 shrink-0">
                                  <ImageIcon className="w-5 h-5" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2">
                                  <span className="font-mono text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                                    {item.sku || `PROD-00${idx+1}`}
                                  </span>
                                  <span className="text-[10px] font-bold text-slate-400">
                                    {sharePct.toFixed(1)}% del lote
                                  </span>
                                </div>
                                <h4 className="font-bold text-white text-xs truncate mt-0.5">{item.productName}</h4>
                                <span className="text-[10px] text-slate-400 font-semibold">{item.quantity} unidades</span>
                              </div>
                            </div>

                            {/* Cost Row: FOB Base vs Landed Cost */}
                            <div className="grid grid-cols-2 gap-2 bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 text-xs">
                              <div>
                                <span className="text-slate-400 block text-[10px]">Precio FOB Base</span>
                                <span className="font-bold text-white text-xs">${valFobNoTax.toFixed(2)} USD</span>
                                <span className="font-mono text-[10px] text-slate-400 block">Q {(valFobNoTax * rate).toFixed(2)} GTQ</span>
                              </div>

                              <div>
                                <span className="text-blue-400 block text-[10px] font-bold">= Costo Landed</span>
                                <span className="font-bold text-white text-xs">${valLandedFull.toFixed(2)} USD</span>
                                <span className="font-mono text-[10px] font-extrabold text-blue-400 block">Q {(valLandedFull * rate).toFixed(2)} GTQ</span>
                              </div>
                            </div>

                            {/* Expenses Row: Prorated Tax & Freight */}
                            <div className="bg-amber-950/20 p-2.5 rounded-lg border border-amber-500/30 flex justify-between items-center text-xs">
                              <div>
                                <span className="text-amber-400 block text-[10px] font-bold uppercase">🏛️ Recargo Impuesto/Flete</span>
                                <span className="text-[11px] text-amber-300 font-bold">+${totalTaxPerUnit.toFixed(2)} USD/u</span>
                              </div>
                              <div className="text-right">
                                <span className="inline-block px-2 py-0.5 rounded font-mono font-extrabold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px]">
                                  +{taxSurchargePct.toFixed(1)}% Recargo FOB
                                </span>
                                <span className="text-[10px] text-slate-400 block">Total: ${totalAllocatedExpenseForItem.toFixed(2)}</span>
                              </div>
                            </div>

                            {/* Highlighted Block: Suggested Final Selling Price (GTQ) */}
                            <div className="bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-500/30 flex justify-between items-center">
                              <div>
                                <span className="text-emerald-400 block text-[10px] font-extrabold uppercase">🏷️ Precio Venta (+{itemMargin}%)</span>
                                <span className="font-bold text-slate-300 text-xs">${valFinalSellingUsd.toFixed(2)} USD</span>
                              </div>
                              <span className="font-mono text-sm sm:text-base font-extrabold text-emerald-400">
                                Q {valFinalSellingGtq.toFixed(2)} GTQ
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* DESKTOP TABLE VIEW (Visible only on md and larger) */}
                    <div className="hidden md:block bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-900/90 text-[11px] uppercase font-bold text-slate-400 border-b border-slate-800">
                            <tr>
                              <th className="py-3 px-4 font-semibold">Producto</th>
                              <th className="py-3 px-3 font-semibold text-right">Precio Inicial (FOB)</th>
                              <th className="py-3 px-3 font-semibold text-center text-blue-400">% Part. Lote</th>
                              <th className="py-3 px-3 font-semibold text-right text-amber-400">+ Impuesto & Flete</th>
                              <th className="py-3 px-3 font-semibold text-right text-indigo-400">% Recargo Impuesto</th>
                              <th className="py-3 px-3 font-semibold text-right text-blue-400">= Costo Landed</th>
                              <th className="py-3 px-4 font-semibold text-right text-emerald-400 bg-emerald-950/40 border-l border-emerald-500/30">
                                Precio Final Venta (+{marginPct}%)
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/80 bg-slate-900/40">
                            {batch.items.map((item, idx) => {
                              const itemCustoms = item.allocatedCustoms !== undefined ? item.allocatedCustoms : ((item.sharePercentage || 0) / 100) * (batch.totalCustomsTax || 0);
                              const itemShipping = item.allocatedShipping !== undefined ? item.allocatedShipping : ((item.sharePercentage || 0) / 100) * (batch.totalShippingCost || 0);
                              const totalAllocatedExpenseForItem = itemCustoms + itemShipping;
                              const customsPerUnit = item.quantity > 0 ? itemCustoms / item.quantity : 0;
                              const shippingPerUnit = item.quantity > 0 ? itemShipping / item.quantity : 0;
                              const totalTaxPerUnit = customsPerUnit + shippingPerUnit;
                              
                              const valFobNoTax = item.unitCostFob;
                              const valLandedFull = item.finalUnitCost || (item.unitCostFob + totalTaxPerUnit);
                              const itemMargin = item.profitMarginPct || marginPct;
                              const valFinalSellingUsd = item.finalSellingPrice || (valLandedFull * (1 + itemMargin / 100));
                              const valFinalSellingGtq = valFinalSellingUsd * rate;
                              
                              // Exact % increase over initial FOB price due to import tax/freight
                              const taxSurchargePct = valFobNoTax > 0 ? (totalTaxPerUnit / valFobNoTax) * 100 : 0;
                              const sharePct = item.sharePercentage !== undefined ? item.sharePercentage : (batchFobTotal > 0 ? ((item.quantity * item.unitCostFob) / batchFobTotal) * 100 : 0);

                              return (
                                <tr key={idx} className="hover:bg-slate-800/60 transition">
                                  {/* Producto (Foto, SKU, Nombre, Cantidad) */}
                                  <td className="py-3 px-4">
                                    <div className="flex items-center space-x-3 min-w-[200px]">
                                      {item.image ? (
                                        <img src={item.image} alt={item.productName} className="w-10 h-10 rounded-xl object-cover border border-slate-700 shrink-0 bg-slate-800" />
                                      ) : (
                                        <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 shrink-0">
                                          <ImageIcon className="w-5 h-5" />
                                        </div>
                                      )}
                                      <div className="min-w-0">
                                        <span className="font-mono text-[11px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 inline-block mb-0.5">
                                          {item.sku || `PROD-00${idx+1}`}
                                        </span>
                                        <h4 className="font-bold text-white text-xs truncate">{item.productName}</h4>
                                        <span className="text-[10px] text-slate-400 font-medium">{item.quantity} unidades</span>
                                      </div>
                                    </div>
                                  </td>

                                  {/* Precio Inicial (FOB Base) */}
                                  <td className="py-3 px-3 text-right">
                                    <span className="font-bold text-white block text-xs">${valFobNoTax.toFixed(2)} USD</span>
                                    <span className="font-mono text-[10px] text-slate-400 block">Q {(valFobNoTax * rate).toFixed(2)} GTQ</span>
                                  </td>

                                  {/* % Participación en el Lote */}
                                  <td className="py-3 px-3 text-center">
                                    <span className="font-bold font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 text-xs">
                                      {sharePct.toFixed(1)}%
                                    </span>
                                    <span className="text-[9px] text-slate-400 block mt-0.5">del Lote Total</span>
                                  </td>

                                  {/* + Impuesto & Flete ($USD total e individual) */}
                                  <td className="py-3 px-3 text-right">
                                    <span className="font-bold text-amber-300 block text-xs">+${totalTaxPerUnit.toFixed(2)} USD/u</span>
                                    <span className="text-[10px] text-amber-400 font-mono block">Total: ${totalAllocatedExpenseForItem.toFixed(2)}</span>
                                  </td>

                                  {/* % Recargo de Impuestos sobre FOB */}
                                  <td className="py-3 px-3 text-right">
                                    <span className="font-bold text-indigo-300 font-mono bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 text-xs inline-block">
                                      +{taxSurchargePct.toFixed(1)}%
                                    </span>
                                    <span className="text-[9px] text-indigo-400 block mt-0.5">Recargo sobre FOB</span>
                                  </td>

                                  {/* = Costo Landed Unitario */}
                                  <td className="py-3 px-3 text-right">
                                    <span className="font-bold text-blue-300 block text-xs">${valLandedFull.toFixed(2)} USD</span>
                                    <span className="font-mono text-[10px] text-blue-400 block">Q {(valLandedFull * rate).toFixed(2)} GTQ</span>
                                  </td>

                                  {/* Precio Final Venta (+Margen) */}
                                  <td className="py-3 px-4 text-right bg-emerald-950/40 border-l border-emerald-500/30">
                                    <span className="font-black text-white text-xs block">${valFinalSellingUsd.toFixed(2)} USD</span>
                                    <span className="font-mono font-black text-emerald-400 text-xs block">Q {valFinalSellingGtq.toFixed(2)} GTQ</span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add New Batch Modal (2-Step Guided Stepper Flow with Fixed Touch Scroll) */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100000] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden">
          <div className="bg-slate-800 border border-slate-700 rounded-t-2xl sm:rounded-2xl w-full max-w-4xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
            
            {/* Modal Header with Stepper Progress */}
            <div className="p-4 sm:p-5 border-b border-slate-700 flex justify-between items-center bg-slate-900/80 shrink-0">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-bold text-white text-sm sm:text-base">Registrar Nuevo Lote de Importación</h3>
                  <span className="text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    Paso {addBatchStep} de 2
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                  {addBatchStep === 1
                    ? 'Paso 1: Parámetros Generales y Financieros del Lote'
                    : 'Paso 2: Vista Previa Comprimida y Carga de Productos'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-slate-400 hover:text-white text-base font-bold rounded-lg transition shrink-0"
              >
                ✕
              </button>
            </div>

            {/* Modal Form Container with Touch Pan Y Scroll */}
            <form onSubmit={handleFormSubmit} className="p-3 sm:p-6 overflow-y-auto space-y-4 flex-1 overscroll-contain touch-pan-y max-h-[calc(92vh-120px)]">
              
              {/* PASO 1: Parámetros Generales del Lote */}
              {addBatchStep === 1 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 bg-slate-900/60 p-3.5 sm:p-4 rounded-2xl border border-slate-700/80">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Nombre del Lote *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. Lote Calzado Septiembre"
                        value={batchName}
                        onChange={(e) => setBatchName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-xs font-medium text-slate-400">Impuesto Aduana (USD)</label>
                        {computedCustomsTaxPct > 0 && (
                          <span className="text-[10px] font-bold text-amber-400 font-mono bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                            {computedCustomsTaxPct.toFixed(1)}% FOB
                          </span>
                        )}
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={customsTax}
                        onChange={(e) => setCustomsTax(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Costo Flete (USD)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={shippingCost}
                        onChange={(e) => setShippingCost(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Margen de Venta (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="15.0"
                        value={profitMarginPct}
                        onChange={(e) => setProfitMarginPct(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Exchange Rate GTQ & Stock Price Variation Strategy */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between bg-slate-900/60 p-3.5 rounded-2xl border border-slate-700/80">
                      <label className="text-xs font-medium text-slate-300">Tipo de Cambio (USD a GTQ):</label>
                      <div className="w-36">
                        <input
                          type="number"
                          step="0.01"
                          min="0.1"
                          value={exchangeRateGtq}
                          onChange={(e) => setExchangeRateGtq(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono font-semibold text-right focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    {hasStockWithPriceVariation ? (
                      <div className="bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-2xl space-y-2.5">
                        <div className="flex items-center space-x-2 text-amber-400 font-bold text-xs">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>Variación de Precio en Existencias ({detectedPriceVariations.length} producto{detectedPriceVariations.length > 1 ? 's' : ''} en stock)</span>
                        </div>
                        <p className="text-[11px] text-amber-200/90 leading-relaxed">
                          Detectamos que aún hay unidades guardadas en almacén y el nuevo lote presenta una variación de costo. Elige cómo actualizar el precio del inventario:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                          <div
                            onClick={() => setCostUpdateStrategy('weighted')}
                            className={`p-3 rounded-xl border cursor-pointer transition flex items-start space-x-2.5 ${
                              costUpdateStrategy === 'weighted'
                                ? 'bg-blue-600/20 border-blue-500 text-white shadow'
                                : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                            }`}
                          >
                            <input type="radio" name="costStrategy" checked={costUpdateStrategy === 'weighted'} onChange={() => {}} className="mt-0.5" />
                            <div>
                              <span className="font-bold text-white block">Promedio Ponderado</span>
                              <span className="text-[11px] text-slate-400 block mt-0.5">Combina las existencias en stock con el nuevo costo del lote.</span>
                            </div>
                          </div>

                          <div
                            onClick={() => setCostUpdateStrategy('latest')}
                            className={`p-3 rounded-xl border cursor-pointer transition flex items-start space-x-2.5 ${
                              costUpdateStrategy === 'latest'
                                ? 'bg-emerald-600/20 border-emerald-500 text-white shadow'
                                : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                            }`}
                          >
                            <input type="radio" name="costStrategy" checked={costUpdateStrategy === 'latest'} onChange={() => {}} className="mt-0.5" />
                            <div>
                              <span className="font-bold text-white block">Reemplazar con Último Costo</span>
                              <span className="text-[11px] text-slate-400 block mt-0.5">Actualiza el precio del producto al 100% con la nueva importación.</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-700/50 text-[11px] text-slate-400 flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Sin variación de precio sobre existencias activas en stock. El costo se asignará directamente.</span>
                      </div>
                    )}
                  </div>

                  {/* Step 1 Action Bar */}
                  <div className="pt-3 border-t border-slate-700 flex justify-between items-center sticky bottom-0 bg-slate-800 z-20 py-2">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-semibold rounded-xl transition"
                    >
                      Cancelar
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (!batchName.trim()) {
                          alert('Por favor ingresa un nombre para el lote.');
                          return;
                        }
                        setAddBatchStep(2);
                        if (inputItems.length === 0) {
                          setIsAddingProduct(true);
                        }
                      }}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center space-x-2 transition shadow-lg shadow-blue-600/20 cursor-pointer active:scale-95"
                    >
                      <span>Continuar a Agregar Productos</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* PASO 2: Vista Previa Comprimida y Carga de Productos */}
              {addBatchStep === 2 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* Vista Previa Comprimida de Parámetros */}
                  <div className="bg-slate-950 p-2.5 sm:p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-2 shadow-sm text-xs">
                    <div className="flex items-center space-x-2 flex-wrap gap-1 min-w-0">
                      <span className="font-bold text-white truncate">📦 {batchName}</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-amber-400 font-semibold font-mono text-[11px]">Aduana: ${parseFloat(customsTax || '0').toFixed(2)}</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-indigo-400 font-semibold font-mono text-[11px]">Flete: ${parseFloat(shippingCost || '0').toFixed(2)}</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-emerald-400 font-semibold text-[11px]">Margen: +{profitMarginPct}%</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-blue-400 font-semibold font-mono text-[11px]">TC: Q{parseFloat(exchangeRateGtq || '7.80').toFixed(2)}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setAddBatchStep(1)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-blue-400 border border-blue-500/30 rounded-lg text-[10px] sm:text-[11px] font-bold shrink-0 transition"
                    >
                      ✏️ Editar parámetros
                    </button>
                  </div>

                  {/* Product Entry Section */}
                  <div className="space-y-3.5">
                    <div className="flex justify-between items-center px-1">
                      <div>
                        <h4 className="text-xs font-bold text-slate-200">Productos Agregados al Lote ({inputItems.length})</h4>
                        <p className="text-[11px] text-slate-400">Ingresa los datos del producto y presiona confirmar para agregarlo a la lista.</p>
                      </div>
                      {!isAddingProduct && (
                        <button
                          type="button"
                          onClick={() => handleOpenSingleProductForm(null)}
                          className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center space-x-1.5 transition shadow-md shrink-0 cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>+ Agregar Producto</span>
                        </button>
                      )}
                    </div>

                    {/* Single Active Product Form Card (Compact & Fixed Button Bar) */}
                    {isAddingProduct && (
                      <div className="bg-slate-900 border-2 border-blue-500/80 p-3 sm:p-4 rounded-2xl space-y-3 shadow-xl relative z-40">
                        <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                          <span className="text-xs font-extrabold text-blue-400">
                            {editingItemIndex !== null ? `Editando Producto #${editingItemIndex + 1}` : 'Ingresar Datos del Producto'}
                          </span>
                          {inputItems.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setIsAddingProduct(false)}
                              className="text-xs text-slate-400 hover:text-white"
                            >
                              ✕ Cerrar Formulario
                            </button>
                          )}
                        </div>

                        {/* Input Fields Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-start">
                          {/* SKU */}
                          <div className="sm:col-span-4 relative">
                            <label className="block text-[11px] font-medium text-slate-400 mb-1">Código SKU</label>
                            <input
                              type="text"
                              placeholder="Ej. PROD-001"
                              value={singleProductForm.sku}
                              onChange={(e) => {
                                const val = e.target.value;
                                setSingleProductForm({ ...singleProductForm, sku: val });
                                const cleanTyped = val.trim().toUpperCase();
                                if (cleanTyped.length >= 1) {
                                  setOpenSkuDropdownIndex(-1);
                                } else {
                                  setOpenSkuDropdownIndex(null);
                                }
                                const match = inventoryList.find(inv => inv.sku.toUpperCase() === cleanTyped);
                                if (match) {
                                  setSingleProductForm(prev => ({
                                    ...prev,
                                    productName: match.name,
                                    image: match.image || prev.image,
                                    unitCostFob: match.unitCost && !prev.unitCostFob ? match.unitCost.toString() : prev.unitCostFob
                                  }));
                                }
                              }}
                              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500 uppercase"
                            />

                            {/* Sku Dropdown Suggestions */}
                            {openSkuDropdownIndex === -1 && singleProductForm.sku.trim().length >= 1 && (
                              <div className="absolute left-0 w-full sm:w-80 top-full mt-1 bg-slate-900 border-2 border-blue-500 rounded-xl shadow-2xl z-[99999] max-h-52 overflow-y-auto text-xs divide-y divide-slate-800">
                                {inventoryList
                                  .filter(inv => inv.sku.toUpperCase().includes(singleProductForm.sku.trim().toUpperCase()) || inv.name.toUpperCase().includes(singleProductForm.sku.trim().toUpperCase()))
                                  .map(inv => (
                                    <div
                                      key={inv.id}
                                      onClick={() => {
                                        setSingleProductForm(prev => ({
                                          ...prev,
                                          sku: inv.sku,
                                          productName: inv.name,
                                          image: inv.image || prev.image,
                                          unitCostFob: inv.unitCost ? inv.unitCost.toString() : prev.unitCostFob
                                        }));
                                        setOpenSkuDropdownIndex(null);
                                      }}
                                      className="p-2.5 hover:bg-blue-600/30 hover:text-white cursor-pointer flex items-center justify-between transition"
                                    >
                                      <div className="flex items-center space-x-2">
                                        {inv.image ? (
                                          <img src={inv.image} alt={inv.name} className="w-7 h-7 rounded-lg object-cover" />
                                        ) : (
                                          <div className="w-7 h-7 bg-slate-800 rounded-lg flex items-center justify-center text-[10px]">📦</div>
                                        )}
                                        <div>
                                          <span className="font-mono font-bold text-blue-400 block">{inv.sku}</span>
                                          <span className="text-[11px] text-slate-200">{inv.name}</span>
                                        </div>
                                      </div>
                                      <span className="text-[10px] text-emerald-400">Stock: {inv.stock}</span>
                                    </div>
                                  ))}
                              </div>
                            )}
                          </div>

                          {/* Nombre Producto */}
                          <div className="sm:col-span-8">
                            <label className="block text-[11px] font-medium text-slate-400 mb-1">Nombre del Producto *</label>
                            <input
                              type="text"
                              required
                              placeholder="Ej. Smartwatch Ultra L5"
                              value={singleProductForm.productName}
                              onChange={(e) => setSingleProductForm({ ...singleProductForm, productName: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                            />
                          </div>

                          {/* Cantidad */}
                          <div className="sm:col-span-4">
                            <label className="block text-[11px] font-medium text-slate-400 mb-1">Cantidad *</label>
                            <input
                              type="number"
                              min="1"
                              required
                              placeholder="1"
                              value={singleProductForm.quantity}
                              onChange={(e) => setSingleProductForm({ ...singleProductForm, quantity: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-medium text-center focus:outline-none focus:border-blue-500"
                            />
                          </div>

                          {/* Costo FOB */}
                          <div className="sm:col-span-4">
                            <label className="block text-[11px] font-medium text-slate-400 mb-1">Costo FOB (USD) *</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              required
                              placeholder="0.00"
                              value={singleProductForm.unitCostFob}
                              onChange={(e) => setSingleProductForm({ ...singleProductForm, unitCostFob: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-blue-500"
                            />
                          </div>

                          {/* Total FOB Preview & Live Financial Breakdown */}
                          <div className="sm:col-span-12">
                            {(() => {
                              const liveQty = parseInt(singleProductForm.quantity) || 0;
                              const liveFobUsd = parseFloat(singleProductForm.unitCostFob) || 0;
                              if (liveQty <= 0 || liveFobUsd <= 0) return null;

                              const liveTotalFobUsd = liveQty * liveFobUsd;
                              const liveTotalFobGtq = liveTotalFobUsd * parsedGtqRate;

                              const existingItemsFob = inputItems.reduce((sum, item, idx) => {
                                if (editingItemIndex !== null && idx === editingItemIndex) return sum;
                                return sum + ((parseInt(item.quantity) || 0) * (parseFloat(item.unitCostFob) || 0));
                              }, 0);

                              const estimatedBatchFob = existingItemsFob + liveTotalFobUsd;
                              const liveSharePct = estimatedBatchFob > 0 ? (liveTotalFobUsd / estimatedBatchFob) * 100 : 100;

                              const liveAllocatedTax = (liveSharePct / 100) * parsedTax;
                              const liveAllocatedShipping = (liveSharePct / 100) * parsedShipping;

                              const liveUnitTaxUsd = liveQty > 0 ? liveAllocatedTax / liveQty : 0;
                              const liveUnitShippingUsd = liveQty > 0 ? liveAllocatedShipping / liveQty : 0;

                              const liveCustomsIncrPct = liveFobUsd > 0 ? (liveUnitTaxUsd / liveFobUsd) * 100 : 0;
                              const liveShippingIncrPct = liveFobUsd > 0 ? (liveUnitShippingUsd / liveFobUsd) * 100 : 0;
                              const liveTotalRecargoPct = liveCustomsIncrPct + liveShippingIncrPct;

                              const liveUnitLandedUsd = liveFobUsd + liveUnitTaxUsd + liveUnitShippingUsd;
                              const liveUnitLandedGtq = liveUnitLandedUsd * parsedGtqRate;

                              const liveUnitSellingUsd = liveUnitLandedUsd * (1 + parsedMargin / 100);
                              const liveUnitSellingGtq = liveUnitSellingUsd * parsedGtqRate;

                              const liveUnitGrossProfitUsd = liveUnitSellingUsd - liveUnitLandedUsd;
                              const liveUnitGrossProfitGtq = liveUnitGrossProfitUsd * parsedGtqRate;

                              const liveTotalGrossProfitUsd = liveUnitGrossProfitUsd * liveQty;
                              const liveTotalGrossProfitGtq = liveTotalGrossProfitUsd * liveQty;

                              return (
                                <div className="bg-slate-950 border border-blue-500/40 rounded-xl p-3.5 space-y-3 shadow-inner mt-1">
                                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                    <span className="text-xs font-bold text-blue-400 uppercase tracking-wide">
                                      📊 Desglose Financiero en Vivo
                                    </span>
                                    <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                      Recargo Total: +{liveTotalRecargoPct.toFixed(1)}%
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    {/* Total FOB */}
                                    <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                                      <span className="text-[10px] text-slate-400 block font-medium">Total FOB ({liveQty} uds)</span>
                                      <span className="text-xs font-mono font-bold text-white block">${liveTotalFobUsd.toFixed(2)} USD</span>
                                      <span className="text-[10px] font-mono text-slate-400 block">Q {liveTotalFobGtq.toFixed(2)} GTQ</span>
                                    </div>

                                    {/* Recargos Aduana / Flete */}
                                    <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                                      <span className="text-[10px] text-slate-400 block font-medium">Recargos Estimados</span>
                                      <span className="text-[11px] font-mono text-amber-400 block font-semibold">
                                        🏛️ Ad: +{liveCustomsIncrPct.toFixed(1)}% (${liveUnitTaxUsd.toFixed(2)}/ud)
                                      </span>
                                      <span className="text-[11px] font-mono text-indigo-400 block font-semibold">
                                        🚚 Fl: +{liveShippingIncrPct.toFixed(1)}% (${liveUnitShippingUsd.toFixed(2)}/ud)
                                      </span>
                                    </div>

                                    {/* Costo Landed Final */}
                                    <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                                      <span className="text-[10px] text-slate-400 block font-medium">Costo Landed Final Unit.</span>
                                      <span className="text-xs font-mono font-bold text-indigo-300 block">${liveUnitLandedUsd.toFixed(2)} USD</span>
                                      <span className="text-[11px] font-mono font-extrabold text-indigo-400 block">Q {liveUnitLandedGtq.toFixed(2)} GTQ</span>
                                    </div>

                                    {/* Precio Venta Sugerido */}
                                    <div className="bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-500/30">
                                      <span className="text-[10px] text-emerald-400 block font-medium">Precio Venta (+{parsedMargin}%)</span>
                                      <span className="text-xs font-mono font-bold text-white block">${liveUnitSellingUsd.toFixed(2)} USD</span>
                                      <span className="text-xs font-mono font-extrabold text-emerald-400 block">Q {liveUnitSellingGtq.toFixed(2)} GTQ</span>
                                    </div>
                                  </div>

                                  {/* Ganancia Bruta Estimada */}
                                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between text-xs">
                                    <span className="text-slate-300 font-semibold">Ganancia Bruta Estimada:</span>
                                    <div className="text-right">
                                      <span className="text-emerald-400 font-mono font-extrabold block">
                                        +Q {liveUnitGrossProfitGtq.toFixed(2)} / ud (+${liveUnitGrossProfitUsd.toFixed(2)})
                                      </span>
                                      <span className="text-[10px] text-slate-400 font-mono block">
                                        Total Lote: +Q {liveTotalGrossProfitGtq.toFixed(2)} (+${liveTotalGrossProfitUsd.toFixed(2)} USD)
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Collapsible Photo Section (Oculta por defecto) */}
                        {showImagePickerInForm || singleProductForm.image ? (
                          <div className="space-y-2 pt-1 border-t border-slate-800">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-semibold text-slate-300">Foto del Producto</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setShowImagePickerInForm(false);
                                  setSingleProductForm({ ...singleProductForm, image: '' });
                                }}
                                className="text-[11px] text-rose-400 hover:text-rose-300 font-medium"
                              >
                                ✕ Quitar Foto
                              </button>
                            </div>
                            <ImagePicker
                              value={singleProductForm.image || ''}
                              onChange={(img) => setSingleProductForm({ ...singleProductForm, image: img })}
                              label="Foto del Producto"
                            />
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setShowImagePickerInForm(true)}
                            className="w-full py-2 px-3 bg-slate-800/80 hover:bg-slate-700 text-blue-400 border border-slate-700/80 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition cursor-pointer"
                          >
                            <ImageIcon className="w-4 h-4" />
                            <span>+ Adjuntar Foto (Opcional)</span>
                          </button>
                        )}

                        {/* Sticky Action Button inside Card */}
                        <div className="sticky bottom-0 bg-slate-900 pt-2 pb-1 border-t border-slate-800 flex justify-end space-x-2 z-20">
                          {inputItems.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setIsAddingProduct(false)}
                              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
                            >
                              Cancelar
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={handleConfirmSingleProduct}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 transition shadow-lg shadow-emerald-600/20 cursor-pointer active:scale-95"
                          >
                            <CheckCircle className="w-4 h-4" />
                            <span>{editingItemIndex !== null ? 'Guardar Cambios' : 'Confirmar e Incluir en el Lote'}</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Empty State when no products added */}
                    {inputItems.length === 0 && !isAddingProduct && (
                      <div className="bg-slate-900/60 border border-dashed border-slate-700 rounded-2xl p-5 text-center text-slate-400 text-xs space-y-2">
                        <p>Aún no has agregado productos a este lote.</p>
                        <button
                          type="button"
                          onClick={() => handleOpenSingleProductForm(null)}
                          className="inline-flex items-center space-x-1.5 text-xs font-bold text-blue-400 hover:text-blue-300 bg-blue-500/10 px-3 py-1.5 rounded-xl border border-blue-500/20 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Haz clic aquí para ingresar el primer producto</span>
                        </button>
                      </div>
                    )}

                    {/* Confirmed Products Summary List (Stacked Mobile Cards) */}
                    {inputItems.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center px-1 text-xs font-bold text-slate-300">
                          <span>Lista de Productos Confirmados ({inputItems.length})</span>
                          {!isAddingProduct && (
                            <button
                              type="button"
                              onClick={() => handleOpenSingleProductForm(null)}
                              className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold cursor-pointer"
                            >
                              + Agregar Otro Producto
                            </button>
                          )}
                        </div>

                        <div className="space-y-2.5">
                          {inputItems.map((item, index) => {
                            const qty = parseInt(item.quantity) || 0;
                            const fobCost = parseFloat(item.unitCostFob) || 0;
                            const totalFob = qty * fobCost;

                            const itemSharePct = totalBatchFob > 0 ? (totalFob / totalBatchFob) * 100 : 0;
                            const itemTaxVal = (itemSharePct / 100) * parsedTax;
                            const itemShipVal = (itemSharePct / 100) * parsedShipping;
                            const itemUnitTax = qty > 0 ? itemTaxVal / qty : 0;
                            const itemUnitShip = qty > 0 ? itemShipVal / qty : 0;
                            const itemUnitLandedUsd = fobCost + itemUnitTax + itemUnitShip;
                            const itemUnitLandedGtq = itemUnitLandedUsd * parsedGtqRate;
                            const itemRecargoPct = fobCost > 0 ? ((itemUnitLandedUsd - fobCost) / fobCost) * 100 : 0;
                            const itemSellingUsd = itemUnitLandedUsd * (1 + parsedMargin / 100);
                            const itemSellingGtq = itemSellingUsd * parsedGtqRate;

                            return (
                              <div key={index} className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-3 shadow-sm">
                                {/* Header: Photo, SKU, Name & Qty */}
                                <div className="flex items-center space-x-3 pb-2 border-b border-slate-800/80">
                                  {item.image ? (
                                    <img src={item.image} alt={item.productName} className="w-10 h-10 rounded-lg object-cover border border-slate-700 shrink-0" />
                                  ) : (
                                    <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-sm shrink-0">📦</div>
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between">
                                      <span className="font-mono text-xs font-bold text-blue-400">{item.sku}</span>
                                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-200 border border-slate-700">
                                        {item.quantity} uds
                                      </span>
                                    </div>
                                    <h4 className="text-xs font-semibold text-white truncate mt-0.5">{item.productName}</h4>
                                  </div>
                                </div>

                                {/* Financial Comparison Row */}
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                                    <span className="text-[10px] text-slate-400 block font-medium">Costo FOB Unit.</span>
                                    <span className="text-xs font-mono font-bold text-slate-200">${fobCost.toFixed(2)} USD</span>
                                    <span className="text-[10px] font-mono text-slate-400 block">Q {(fobCost * parsedGtqRate).toFixed(2)} GTQ</span>
                                  </div>

                                  <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                                    <div className="flex justify-between items-center">
                                      <span className="text-[10px] text-slate-400 font-medium">Costo Landed</span>
                                      <span className="text-[10px] font-bold text-amber-400 font-mono">+{itemRecargoPct.toFixed(1)}%</span>
                                    </div>
                                    <span className="text-xs font-mono font-bold text-indigo-300">${itemUnitLandedUsd.toFixed(2)} USD</span>
                                    <span className="text-[10px] font-mono text-indigo-400 font-semibold block">Q {itemUnitLandedGtq.toFixed(2)} GTQ</span>
                                  </div>
                                </div>

                                {/* Selling Price & Quick Action Buttons */}
                                <div className="flex items-center justify-between pt-1">
                                  <div>
                                    <span className="text-[10px] text-emerald-400 font-bold block uppercase">Precio Venta Sugerido</span>
                                    <span className="text-xs font-mono font-extrabold text-emerald-400">
                                      Q {itemSellingGtq.toFixed(2)} GTQ <span className="text-slate-400 font-normal text-[10px]">(${itemSellingUsd.toFixed(2)} USD)</span>
                                    </span>
                                  </div>

                                  <div className="flex items-center space-x-1.5 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenSingleProductForm(index)}
                                      className="text-[11px] font-bold text-blue-400 hover:text-blue-300 transition px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 active:scale-95 cursor-pointer"
                                    >
                                      Editar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveConfirmedItem(index)}
                                      className="text-[11px] font-bold text-rose-400 hover:text-rose-300 transition px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 active:scale-95 cursor-pointer"
                                    >
                                      Eliminar
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Step 2 Sticky Actions Footer */}
                  <div className="sticky bottom-0 bg-slate-900/95 backdrop-blur pt-3 pb-1 border-t border-slate-700/80 flex justify-between items-center z-30 shrink-0">
                    <button
                      type="button"
                      onClick={() => setAddBatchStep(1)}
                      className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition cursor-pointer"
                    >
                      ← Volver al Paso 1
                    </button>
                    <button
                      type="submit"
                      disabled={inputItems.length === 0}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition shadow-lg shadow-emerald-600/20 cursor-pointer flex items-center space-x-1.5 active:scale-95"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Guardar Lote ({inputItems.length})</span>
                    </button>
                  </div>
                </div>
              )}

            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Seguridad antes de Guardar Lote */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[100000] flex items-center justify-center p-4">
          <div className="bg-slate-800 border-2 border-amber-500/60 rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-[0_25px_60px_rgba(0,0,0,0.9)] space-y-4 text-xs">
            {/* Header */}
            <div className="flex items-center space-x-3 border-b border-slate-700 pb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white leading-tight">Confirmar Registro de Importación</h3>
                <p className="text-[11px] text-amber-400 font-semibold">Ventana de Seguridad & Verificación de Datos</p>
              </div>
            </div>

            <p className="text-slate-300 text-xs leading-relaxed">
              Por favor revisa cuidadosamente los datos del lote antes de guardar en la base de datos SQLite. Esta acción actualizará el stock y los costos del inventario.
            </p>

            {/* Summary Box */}
            <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-700/80 space-y-2 text-xs">
              <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
                <span className="text-slate-400 font-semibold">Nombre del Lote:</span>
                <span className="font-bold text-white text-sm">{batchName}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
                <span className="text-slate-400 font-semibold">Gastos Landed Totales:</span>
                <span className="font-bold text-amber-400">${totalLandedExpenses.toFixed(2)} USD <span className="text-emerald-400 text-[11px] font-mono">(Q {(totalLandedExpenses * parsedGtqRate).toFixed(2)} GTQ)</span></span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
                <span className="text-slate-400 font-semibold">Ítems a Procesar:</span>
                <span className="font-bold text-blue-400">{proratedPreview.length} Productos</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-semibold">Estrategia de Costo:</span>
                <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                  {costUpdateStrategy === 'weighted' ? '📊 Promedio Ponderado' : '🏷️ Reemplazar Último Costo'}
                </span>
              </div>
            </div>

            {/* Item List Enriched Preview */}
            <div className="space-y-2 max-h-56 overflow-y-auto bg-slate-900/80 p-2.5 rounded-xl border border-slate-700/80">
              <span className="text-[11px] uppercase font-bold text-slate-300 block px-1 pb-1 border-b border-slate-800">
                Detalle de Productos a Registrar ({proratedPreview.length}):
              </span>
              {proratedPreview.map((item, idx) => {
                const qty = item.quantity;
                const fobUsd = item.unitCostFob;
                const fobGtq = fobUsd * parsedGtqRate;
                const landedUsd = item.finalUnitCost;
                const landedGtq = landedUsd * parsedGtqRate;
                const recargoPct = fobUsd > 0 ? ((landedUsd - fobUsd) / fobUsd) * 100 : 0;
                const sellingUsd = item.finalSellingPrice;
                const sellingGtq = sellingUsd * parsedGtqRate;

                return (
                  <div key={idx} className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1.5 text-xs">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        {item.image ? (
                          <img src={item.image} alt={item.productName} className="w-6 h-6 rounded object-cover border border-slate-700 shrink-0" />
                        ) : (
                          <span className="text-xs shrink-0">📦</span>
                        )}
                        <div>
                          <span className="font-mono text-blue-400 font-bold mr-1.5">{item.sku}</span>
                          <span className="text-white font-semibold truncate max-w-[140px] sm:max-w-[180px] inline-block align-bottom">{item.productName}</span>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                        {qty} uds
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1.5 border-t border-slate-800/80">
                      <div>
                        <span className="text-slate-400 block text-[10px]">FOB ➔ Landed (+{recargoPct.toFixed(1)}%):</span>
                        <span className="font-mono font-medium text-slate-300 block">${fobUsd.toFixed(2)} ➔ ${landedUsd.toFixed(2)} USD</span>
                        <span className="font-mono text-indigo-300 block">Q {fobGtq.toFixed(2)} ➔ Q {landedGtq.toFixed(2)} GTQ</span>
                      </div>
                      <div className="text-right">
                        <span className="text-emerald-400 font-bold block uppercase text-[10px]">Precio Venta GTQ</span>
                        <span className="font-mono font-extrabold text-emerald-400 text-xs block">Q {sellingGtq.toFixed(2)} GTQ</span>
                        <span className="font-mono text-slate-400 text-[10px] block">(${sellingUsd.toFixed(2)} USD)</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Actions Buttons */}
            <div className="flex justify-end space-x-3 pt-3 border-t border-slate-700">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs font-semibold transition"
              >
                ✏️ Modificar
              </button>
              <button
                type="button"
                onClick={processSaveBatch}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-lg shadow-emerald-600/20 active:scale-95 cursor-pointer"
              >
                ✅ Confirmar y Guardar Lote
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
