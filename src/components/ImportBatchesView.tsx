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
  CheckCircle
} from 'lucide-react';
import { ImportBatch, fetchBatches, createBatchApi, deleteBatchApi, fetchInventory, InventoryProduct } from '../services/api';
import { ImagePicker } from './ImagePicker';

const fallbackBatches: ImportBatch[] = [];

export const ImportBatchesView: React.FC = () => {
  const [batches, setBatches] = useState<ImportBatch[]>(fallbackBatches);
  const [inventoryList, setInventoryList] = useState<InventoryProduct[]>([]);
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>('#LOT-2026-01');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isDbConnected, setIsDbConnected] = useState(false);

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
    const qty = parseInt(item.quantity) || 0;
    const cost = parseFloat(item.unitCostFob) || 0;
    const totalFob = qty * cost;
    totalBatchFob += totalFob;
    const sku = item.sku && item.sku.trim() !== '' ? item.sku.trim().toUpperCase() : `PROD-00${idx + 1}`;
    return { sku, productName: item.productName || 'Producto', quantity: qty, unitCostFob: cost, totalFobValue: totalFob, image: item.image || '' };
  });

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
    setInputItems([...inputItems, { sku: '', productName: '', quantity: '1', unitCostFob: '10.0', image: '' }]);
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
      }
    }

    setInputItems(updated);
  };

  const handleSelectMatchingSku = (index: number, inv: InventoryProduct) => {
    const updated = [...inputItems];
    updated[index].sku = inv.sku;
    updated[index].productName = inv.name;
    if (inv.image) updated[index].image = inv.image;
    setInputItems(updated);
    setOpenSkuDropdownIndex(null);
  };

  const handleOpenAddModal = () => {
    setBatchName('');
    setCustomsTax('');
    setShippingCost('');
    setExchangeRateGtq('7.80');
    setProfitMarginPct('15.0');
    setCostUpdateStrategy('weighted');
    setInputItems([]);
    setOpenSkuDropdownIndex(null);
    setShowConfirmModal(false);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-800 p-5 rounded-xl border border-slate-700">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-white">Gestión de Lotes, Envío & Aduanas</h2>
            {isDbConnected && (
              <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Database className="w-3 h-3" />
                <span>Base de Datos SQLite Conectada</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">Matriz Completa: FOB Sin Impuesto, Con Aduana, Costo Landed y Precio Final Venta (+% Margen)</p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded-lg text-sm transition shadow-lg shadow-blue-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>+ Nuevo Lote de Importación</span>
        </button>
      </div>

      {/* KPI Cards (Horizontal Scrollable Ribbon on Mobile) */}
      <div className="flex overflow-x-auto gap-4 scrollbar-none pb-2 snap-x snap-mandatory sm:grid sm:grid-cols-3 sm:overflow-visible">
        <div className="shrink-0 w-[270px] sm:w-auto snap-start bg-slate-800 p-5 rounded-xl border border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase">Lotes Procesados</span>
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg"><Package className="w-5 h-5" /></div>
          </div>
          <h3 className="text-2xl font-bold text-white mt-3">{totalBatchesCount} Lotes</h3>
          <span className="text-xs text-slate-400">Registrados en la BD</span>
        </div>

        <div className="shrink-0 w-[270px] sm:w-auto snap-start bg-slate-800 p-5 rounded-xl border border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase">Gastos Importación (USD / GTQ)</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg"><DollarSign className="w-5 h-5" /></div>
          </div>
          <h3 className="text-xl font-bold text-white mt-2">${totalImportExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD</h3>
          <span className="font-mono text-xs font-extrabold text-emerald-400 block mt-0.5">
            Q {(totalImportExpenses * 7.80).toLocaleString('en-US', { minimumFractionDigits: 2 })} GTQ
          </span>
          <div className="text-[11px] text-slate-400 mt-2 flex flex-wrap gap-2">
            <span className="text-amber-400">🏛️ Aduana: ${totalCustomsTaxPaid.toFixed(2)}</span>
            <span>•</span>
            <span className="text-indigo-400">🚚 Flete: ${totalShippingPaid.toFixed(2)}</span>
          </div>
        </div>

        <div className="shrink-0 w-[270px] sm:w-auto snap-start bg-slate-800 p-5 rounded-xl border border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase">Margen Comercial de Venta</span>
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg"><TrendingUp className="w-5 h-5" /></div>
          </div>
          <h3 className="text-xl font-bold text-white mt-2">+15% Margen Estándar</h3>
          <span className="text-xs text-emerald-400 font-semibold block mt-0.5">Calcula automáticamente el Precio Final de Venta</span>
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
                {/* Batch Header Bar */}
                <div
                  onClick={() => setExpandedBatchId(isExpanded ? null : batch.id)}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-700/30 transition"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 flex-wrap gap-1">
                        {index === 0 && (
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[10px] font-extrabold flex items-center space-x-1 shadow-sm">
                            <span>✨ ÚLTIMO LOTE</span>
                          </span>
                        )}
                        <span className="font-mono text-xs font-semibold text-blue-400">{batch.id}</span>
                        <h4 className="text-base font-bold text-white">{batch.name}</h4>
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                          +{marginPct}% Margen Venta
                        </span>
                      </div>
                      <span className="text-xs text-slate-400">Fecha: {batch.importDate} • {batch.items.length} Productos • Tasa: Q {rate.toFixed(2)} / USD</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-6">
                    <div className="text-right text-xs">
                      <span className="block text-slate-400 font-semibold uppercase">Gastos Importación</span>
                      <span className="text-sm font-bold text-white">${totalBatchLandedExpenses.toFixed(2)} USD</span>
                      <span className="block text-emerald-400 font-mono font-extrabold text-xs">Q {totalGtqExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })} GTQ</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteBatch(batch.id);
                      }}
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 transition"
                      title="Eliminar lote de SQLite"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                  </div>
                </div>

                {/* Batch Items Breakdown */}
                {isExpanded && (
                  <div className="border-t border-slate-700 bg-slate-900/50 p-3 sm:p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-semibold text-slate-400 gap-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                      <span>MATRIZ DE PRECIOS & PRORRATEO (FOB: ${batchFobTotal.toFixed(2)} USD)</span>
                      <div className="flex items-center space-x-4">
                        <span className="text-amber-400">🏛️ Aduana: ${batch.totalCustomsTax?.toFixed(2)} USD</span>
                        <span className="text-indigo-400">🚚 Flete: ${batch.totalShippingCost?.toFixed(2)} USD</span>
                        <span className="text-emerald-400 font-bold">🏷️ Margen Venta: +{marginPct}%</span>
                      </div>
                    </div>

                    {/* MOBILE CARDS BREAKDOWN (Visible only on small screens md:hidden) */}
                    <div className="md:hidden space-y-3">
                      {batch.items.map((item, idx) => {
                        const itemCustoms = item.allocatedCustoms !== undefined ? item.allocatedCustoms : ((item.sharePercentage || 0) / 100) * (batch.totalCustomsTax || 0);
                        const itemShipping = item.allocatedShipping !== undefined ? item.allocatedShipping : ((item.sharePercentage || 0) / 100) * (batch.totalShippingCost || 0);
                        const customsPerUnit = item.quantity > 0 ? itemCustoms / item.quantity : 0;
                        
                        // 1. Sin Impuesto (FOB Base)
                        const valFobNoTax = item.unitCostFob;
                        // 2. Con Impuesto Aduana
                        const valWithCustoms = item.unitCostFob + customsPerUnit;
                        // 3. Con Envío (Costo Landed Completo)
                        const valLandedFull = item.finalUnitCost || (item.unitCostFob + (item.unitTax || 0));
                        // 4. Valor Final para Venta (+Margen)
                        const itemMargin = item.profitMarginPct || marginPct;
                        const valFinalSellingUsd = item.finalSellingPrice || (valLandedFull * (1 + itemMargin / 100));
                        const valFinalSellingGtq = valFinalSellingUsd * rate;
                        const profitPerUnitUsd = valFinalSellingUsd - valLandedFull;

                        return (
                          <div key={idx} className="bg-slate-800 border border-slate-700 rounded-xl p-3.5 space-y-3 shadow">
                            <div className="flex items-center space-x-3">
                              {item.image ? (
                                <img src={item.image} alt={item.productName} className="w-12 h-12 rounded-lg object-cover border border-slate-700 shrink-0" />
                              ) : (
                                <div className="w-12 h-12 rounded-lg bg-slate-700 flex items-center justify-center text-slate-400 shrink-0"><ImageIcon className="w-5 h-5" /></div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2 mb-0.5">
                                  <span className="font-mono text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                                    {item.sku || `PROD-00${idx+1}`}
                                  </span>
                                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                    +{itemMargin}% Ganancia
                                  </span>
                                </div>
                                <h4 className="font-bold text-white text-xs truncate">{item.productName}</h4>
                                <span className="text-[11px] text-slate-300 font-medium">{item.quantity} unidades importadas</span>
                              </div>
                            </div>

                            {/* Matrix of 4 Prices */}
                            <div className="grid grid-cols-2 gap-2 bg-slate-900/90 p-3 rounded-lg border border-slate-700/60 text-xs">
                              <div>
                                <span className="text-slate-400 block text-[10px]">1. FOB Sin Impuesto</span>
                                <span className="font-bold text-white text-xs">${valFobNoTax.toFixed(2)} USD</span>
                                <span className="font-mono text-[10px] text-slate-400 block">Q {(valFobNoTax * rate).toFixed(2)} GTQ</span>
                              </div>
                              <div>
                                <span className="text-amber-400 block text-[10px] font-bold">2. Con Impuesto Aduana</span>
                                <span className="font-bold text-amber-400 text-xs">${valWithCustoms.toFixed(2)} USD</span>
                                <span className="font-mono text-[10px] text-amber-300/80 block">Q {(valWithCustoms * rate).toFixed(2)} GTQ</span>
                              </div>
                              <div>
                                <span className="text-indigo-400 block text-[10px] font-bold">3. Landed (+Flete Completo)</span>
                                <span className="font-bold text-indigo-300 text-xs">${valLandedFull.toFixed(2)} USD</span>
                                <span className="font-mono text-[10px] text-indigo-300/80 block">Q {(valLandedFull * rate).toFixed(2)} GTQ</span>
                              </div>
                              <div className="bg-emerald-950/40 p-1.5 rounded border border-emerald-500/30">
                                <span className="text-emerald-400 block text-[10px] font-extrabold uppercase">4. 🏷️ Precio Final Venta</span>
                                <span className="font-extrabold text-white text-xs block">${valFinalSellingUsd.toFixed(2)} USD</span>
                                <span className="font-mono font-extrabold text-emerald-400 text-xs block">Q {valFinalSellingGtq.toFixed(2)} GTQ</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-1 border-t border-slate-700/50 text-xs">
                              <span className="text-slate-400 text-[10px]">Ganancia Est. por Unidad:</span>
                              <span className="font-bold text-emerald-400 text-xs">+${profitPerUnitUsd.toFixed(2)} USD (+Q {(profitPerUnitUsd * rate).toFixed(2)} GTQ)</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* DESKTOP TABLE BREAKDOWN (Visible on md and larger) */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left text-xs text-slate-300 border border-slate-700 rounded-lg overflow-hidden">
                        <thead className="bg-slate-900 text-slate-400 uppercase font-semibold border-b border-slate-700">
                          <tr>
                            <th className="p-3">Foto</th>
                            <th className="p-3">SKU</th>
                            <th className="p-3">Producto</th>
                            <th className="p-3">Cantidad</th>
                            <th className="p-3">1. FOB Sin Impuesto</th>
                            <th className="p-3 text-amber-400">2. Con Impuesto Aduana</th>
                            <th className="p-3 text-indigo-400">3. Landed (+Flete Completo)</th>
                            <th className="p-3 bg-emerald-950/60 text-emerald-400 font-extrabold">4. 🏷️ Precio Final Venta (+{marginPct}%)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/60 bg-slate-800/80">
                          {batch.items.map((item, idx) => {
                            const itemCustoms = item.allocatedCustoms !== undefined ? item.allocatedCustoms : ((item.sharePercentage || 0) / 100) * (batch.totalCustomsTax || 0);
                            const customsPerUnit = item.quantity > 0 ? itemCustoms / item.quantity : 0;
                            
                            const valFobNoTax = item.unitCostFob;
                            const valWithCustoms = item.unitCostFob + customsPerUnit;
                            const valLandedFull = item.finalUnitCost || (item.unitCostFob + (item.unitTax || 0));
                            const itemMargin = item.profitMarginPct || marginPct;
                            const valFinalSellingUsd = item.finalSellingPrice || (valLandedFull * (1 + itemMargin / 100));
                            const valFinalSellingGtq = valFinalSellingUsd * rate;

                            return (
                              <tr key={idx} className="hover:bg-slate-700/40 transition">
                                <td className="p-2.5">
                                  {item.image ? (
                                    <img src={item.image} alt={item.productName} className="w-9 h-9 rounded-lg object-cover border border-slate-700" />
                                  ) : (
                                    <div className="w-9 h-9 rounded-lg bg-slate-700 flex items-center justify-center text-slate-400"><ImageIcon className="w-4 h-4" /></div>
                                  )}
                                </td>
                                <td className="p-3 font-mono font-medium text-blue-400">{item.sku || `PROD-00${idx+1}`}</td>
                                <td className="p-3 font-semibold text-white">{item.productName}</td>
                                <td className="p-3">{item.quantity} uds</td>
                                
                                {/* 1. Sin Impuesto */}
                                <td className="p-3">
                                  <span className="font-semibold text-white block">${valFobNoTax.toFixed(2)} USD</span>
                                  <span className="font-mono text-[10px] text-slate-400 block">Q {(valFobNoTax * rate).toFixed(2)} GTQ</span>
                                </td>

                                {/* 2. Con Impuesto Aduana */}
                                <td className="p-3 text-amber-400">
                                  <span className="font-bold text-amber-300 block">${valWithCustoms.toFixed(2)} USD</span>
                                  <span className="font-mono text-[10px] text-amber-300/80 block">Q {(valWithCustoms * rate).toFixed(2)} GTQ</span>
                                </td>

                                {/* 3. Con Envío (Landed) */}
                                <td className="p-3 text-indigo-400">
                                  <span className="font-bold text-indigo-300 block">${valLandedFull.toFixed(2)} USD</span>
                                  <span className="font-mono text-[10px] text-indigo-300/80 block">Q {(valLandedFull * rate).toFixed(2)} GTQ</span>
                                </td>

                                {/* 4. Precio Final Venta (+% Margen) */}
                                <td className="p-3 bg-emerald-950/40 border-l border-emerald-500/30">
                                  <span className="font-extrabold text-white text-sm block">${valFinalSellingUsd.toFixed(2)} USD</span>
                                  <span className="font-mono font-extrabold text-emerald-400 text-xs block">Q {valFinalSellingGtq.toFixed(2)} GTQ</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add New Batch Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 overflow-hidden">
          <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col my-auto overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-700 flex justify-between items-center bg-slate-900/60 shrink-0">
              <div>
                <h3 className="font-bold text-white text-base">Registrar Nuevo Lote de Importación</h3>
                <p className="text-xs text-slate-400">Matriz: FOB Sin Impuesto, Con Aduana, Landed y Precio Final Venta (+% Margen)</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Form Scrollable */}
            <form onSubmit={handleFormSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
              {/* Batch General Info */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-700/60">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Nombre del Lote</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Lote Calzado Septiembre"
                    value={batchName}
                    onChange={(e) => setBatchName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-amber-400 uppercase mb-1">🏛️ Impuesto Aduana ($USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={customsTax}
                    onChange={(e) => setCustomsTax(e.target.value)}
                    className="w-full bg-slate-800 border border-amber-500/40 rounded-lg px-3 py-2 text-sm text-amber-300 font-semibold focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-indigo-400 uppercase mb-1">🚚 Costo Flete ($USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={shippingCost}
                    onChange={(e) => setShippingCost(e.target.value)}
                    className="w-full bg-slate-800 border border-indigo-500/40 rounded-lg px-3 py-2 text-sm text-indigo-300 font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-emerald-400 uppercase mb-1">🏷️ Margen Venta (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="15.0"
                    value={profitMarginPct}
                    onChange={(e) => setProfitMarginPct(e.target.value)}
                    className="w-full bg-slate-800 border border-emerald-500/50 rounded-lg px-3 py-2 text-sm text-emerald-400 font-mono font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Tasa de cambio GTQ & Estrategia de Actualización de Costo */}
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-slate-900/40 p-3 rounded-lg border border-slate-700/50">
                  <span className="text-xs text-slate-300 font-medium">Tasa de Cambio Quetzales (Q GTQ / USD):</span>
                  <div className="w-36">
                    <input
                      type="number"
                      step="0.01"
                      min="0.1"
                      value={exchangeRateGtq}
                      onChange={(e) => setExchangeRateGtq(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1 text-xs text-emerald-400 font-mono font-bold text-right"
                    />
                  </div>
                </div>

                {hasStockWithPriceVariation ? (
                  <div className="bg-amber-500/10 border border-amber-500/40 p-3.5 rounded-xl space-y-2">
                    <div className="flex items-center space-x-2 text-amber-400 font-bold text-xs uppercase">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>⚠️ Variación de Precio en Existencias ({detectedPriceVariations.length} producto{detectedPriceVariations.length > 1 ? 's' : ''} en stock)</span>
                    </div>
                    <p className="text-[11px] text-amber-200/90 leading-relaxed">
                      Detectamos que aún hay unidades guardadas en almacén y el nuevo lote presenta una variación de costo. Elige cómo actualizar el precio del inventario:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                      <div
                        onClick={() => setCostUpdateStrategy('weighted')}
                        className={`p-2.5 rounded-lg border cursor-pointer transition flex items-start space-x-2.5 ${
                          costUpdateStrategy === 'weighted'
                            ? 'bg-blue-600/20 border-blue-500 text-white shadow'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        <input type="radio" name="costStrategy" checked={costUpdateStrategy === 'weighted'} onChange={() => {}} className="mt-0.5" />
                        <div>
                          <span className="font-bold text-white block">📊 Promedio Ponderado</span>
                          <span className="text-[11px] text-slate-400 block mt-0.5">Combina las existencias en stock con el nuevo costo del lote.</span>
                        </div>
                      </div>

                      <div
                        onClick={() => setCostUpdateStrategy('latest')}
                        className={`p-2.5 rounded-lg border cursor-pointer transition flex items-start space-x-2.5 ${
                          costUpdateStrategy === 'latest'
                            ? 'bg-emerald-600/20 border-emerald-500 text-white shadow'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        <input type="radio" name="costStrategy" checked={costUpdateStrategy === 'latest'} onChange={() => {}} className="mt-0.5" />
                        <div>
                          <span className="font-bold text-white block">🏷️ Reemplazar con Último Costo</span>
                          <span className="text-[11px] text-slate-400 block mt-0.5">Actualiza el precio del producto al 100% con la nueva importación.</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-700/50 text-[11px] text-slate-400 flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Sin variación de precio sobre existencias activas en stock. El costo se asignará directamente.</span>
                  </div>
                )}
              </div>

              {/* Product Rows Entry */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-slate-300 uppercase">Productos a Importar ({inputItems.length})</label>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="flex items-center space-x-1.5 bg-slate-700 hover:bg-slate-600 text-blue-400 font-semibold px-3 py-1.5 rounded-lg text-xs transition border border-blue-500/30"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Agregar Fila de Producto</span>
                  </button>
                </div>

                {inputItems.length === 0 ? (
                  <div className="bg-slate-900/60 border border-dashed border-slate-700 rounded-xl p-6 text-center text-slate-400 text-xs">
                    Haz clic en <strong className="text-blue-400">+ Agregar Fila de Producto</strong> para añadir ítems a este lote.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {inputItems.map((item, index) => {
                      const cleanTyped = item.sku.trim().toUpperCase();
                      const matchingInventory = cleanTyped.length >= 1
                        ? inventoryList.filter(inv =>
                            inv.sku.toUpperCase().includes(cleanTyped) ||
                            inv.name.toUpperCase().includes(cleanTyped)
                          )
                        : [];

                      const showSuggestions = openSkuDropdownIndex === index && matchingInventory.length > 0;

                      return (
                        <div key={index} className={`space-y-3 bg-slate-900/90 p-3.5 sm:p-4 rounded-xl border border-slate-700/80 relative shadow-md ${showSuggestions ? 'z-50' : 'z-10'}`}>
                          {/* Header bar of item card on mobile: Index badge + Delete Button */}
                          <div className="flex items-center justify-between pb-1 sm:hidden border-b border-slate-800">
                            <span className="text-[11px] font-bold text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded border border-blue-500/20">
                              Producto #{index + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveItemRow(index)}
                              className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 rounded-lg transition flex items-center space-x-1 text-xs"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                              <span className="text-rose-400 text-xs">Eliminar Fila</span>
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start sm:items-center">
                            
                            {/* 1. Strict Matching Filtered SKU Box */}
                            <div className="sm:col-span-4 relative">
                              <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1 sm:hidden">Código SKU</label>
                              <input
                                type="text"
                                required
                                placeholder="Código SKU (ej. PROD-001)..."
                                value={item.sku}
                                onFocus={() => {
                                  if (item.sku.trim().length >= 1) setOpenSkuDropdownIndex(index);
                                }}
                                onChange={(e) => handleItemChange(index, 'sku', e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-blue-400 font-mono font-bold focus:outline-none focus:border-blue-500 uppercase"
                              />

                              {/* Floating Suggestions Popup */}
                              {showSuggestions && (
                                <div className="absolute left-0 w-full sm:w-80 top-full mt-1 bg-slate-900 border-2 border-blue-500 rounded-xl shadow-[0_25px_60px_rgba(0,0,0,0.95)] z-[99999] max-h-52 overflow-y-auto text-xs divide-y divide-slate-800 ring-4 ring-blue-500/30">
                                  <div className="p-2 text-[10px] font-bold text-blue-400 uppercase bg-slate-950 flex justify-between items-center sticky top-0 z-10 border-b border-slate-800">
                                    <span>Coincidencias Encontradas ({matchingInventory.length})</span>
                                    <button
                                      type="button"
                                      onClick={() => setOpenSkuDropdownIndex(null)}
                                      className="text-slate-400 hover:text-white p-0.5"
                                    >
                                      ✕
                                    </button>
                                  </div>

                                  {matchingInventory.map((inv) => (
                                    <div
                                      key={inv.id}
                                      onClick={() => handleSelectMatchingSku(index, inv)}
                                      className="p-2.5 hover:bg-blue-600/30 hover:text-white cursor-pointer flex items-center justify-between transition"
                                    >
                                      <div className="flex items-center space-x-2.5">
                                        {inv.image ? (
                                          <img src={inv.image} alt={inv.name} className="w-7 h-7 rounded-lg object-cover border border-slate-700" />
                                        ) : (
                                          <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-[10px]">📦</div>
                                        )}
                                        <div>
                                          <span className="font-mono font-bold text-blue-400 block">{inv.sku}</span>
                                          <span className="text-[11px] text-slate-200">{inv.name}</span>
                                        </div>
                                      </div>
                                      <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono font-semibold">Stock: {inv.stock}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* 2. Product Name */}
                            <div className="sm:col-span-4">
                              <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1 sm:hidden">Nombre del Producto</label>
                              <input
                                type="text"
                                required
                                placeholder="Nombre del Producto"
                                value={item.productName}
                                onChange={(e) => handleItemChange(index, 'productName', e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                              />
                            </div>

                            {/* 3. Quantity & Cost FOB (Side-by-side Grid on Mobile, Flex on Desktop) */}
                            <div className="grid grid-cols-2 gap-2 sm:col-span-4 sm:flex sm:items-center">
                              <div className="w-full">
                                <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1 sm:hidden">Cantidad</label>
                                <input
                                  type="number"
                                  min="1"
                                  required
                                  placeholder="Cant"
                                  value={item.quantity}
                                  onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white font-semibold text-center focus:outline-none focus:border-blue-500"
                                />
                              </div>

                              <div className="w-full">
                                <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1 sm:hidden">Costo FOB ($USD)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  required
                                  placeholder="FOB $"
                                  value={item.unitCostFob}
                                  onChange={(e) => handleItemChange(index, 'unitCostFob', e.target.value)}
                                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-emerald-400 font-bold focus:outline-none focus:border-blue-500"
                                />
                              </div>

                              <button
                                type="button"
                                onClick={() => handleRemoveItemRow(index)}
                                className="hidden sm:flex p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition shrink-0"
                                title="Eliminar Fila"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Image Attachment preview/picker */}
                          {item.image ? (
                            <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                              <div className="flex items-center space-x-2.5">
                                <img src={item.image} alt={item.productName} className="w-9 h-9 rounded-lg object-cover border border-slate-700" />
                                <div>
                                  <span className="text-xs text-white font-semibold block">Imagen Seleccionada</span>
                                  <span className="text-[10px] text-slate-400">Vinculada al producto</span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleItemChange(index, 'image', '')}
                                className="text-xs text-rose-400 hover:underline px-2 py-1 font-semibold"
                              >
                                Quitar Foto
                              </button>
                            </div>
                          ) : (
                            <ImagePicker
                              value={item.image || ''}
                              onChange={(img) => handleItemChange(index, 'image', img)}
                              label="📷 Foto del Producto (Subir o Tomar Foto)"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Real-time Calculation Preview Table */}
              {proratedPreview.length > 0 && (
                <div className="bg-slate-900/80 p-4 rounded-xl border border-blue-500/30 space-y-2 relative z-10">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-semibold text-blue-400 gap-1">
                    <span>PREVISUALIZACIÓN DE MATRIZ DE COSTOS & PRECIO VENTA (+{parsedMargin}%)</span>
                    <span className="text-emerald-400 font-bold">GASTOS: ${totalLandedExpenses.toFixed(2)} USD (Q {(totalLandedExpenses * parsedGtqRate).toFixed(2)} GTQ)</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="text-slate-400 uppercase font-semibold border-b border-slate-700">
                        <tr>
                          <th className="py-2">Foto</th>
                          <th className="py-2">SKU</th>
                          <th className="py-2">Producto</th>
                          <th className="py-2">1. FOB Sin Imp</th>
                          <th className="py-2 text-amber-400">2. Con Aduana</th>
                          <th className="py-2 text-indigo-400">3. Landed (+Flete)</th>
                          <th className="py-2 text-emerald-400 font-bold">4. 🏷️ Precio Venta (+{parsedMargin}%)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {proratedPreview.map((item, idx) => {
                          const customsPerUnit = item.quantity > 0 ? item.allocatedCustoms / item.quantity : 0;
                          const valWithCustoms = item.unitCostFob + customsPerUnit;
                          const sellingPriceUsd = item.finalSellingPrice;
                          const sellingPriceGtq = sellingPriceUsd * parsedGtqRate;

                          return (
                            <tr key={idx}>
                              <td className="py-1">
                                {item.image ? (
                                  <img src={item.image} alt="Preview" className="w-6 h-6 rounded object-cover border border-slate-700" />
                                ) : (
                                  <span className="text-[10px] text-slate-500">Sin Foto</span>
                                )}
                              </td>
                              <td className="py-2 font-mono font-bold text-blue-400">{item.sku}</td>
                              <td className="py-2 text-white font-semibold">{item.productName}</td>
                              <td className="py-2">${item.unitCostFob.toFixed(2)}</td>
                              <td className="py-2 text-amber-400">${valWithCustoms.toFixed(2)}</td>
                              <td className="py-2 text-indigo-400">${item.finalUnitCost.toFixed(2)}</td>
                              <td className="py-2">
                                <span className="font-bold text-white block">${sellingPriceUsd.toFixed(2)} USD</span>
                                <span className="font-mono font-extrabold text-emerald-400 text-[11px] block">Q {sellingPriceGtq.toFixed(2)} GTQ</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={previewItems.length === 0}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition shadow-lg shadow-blue-600/20"
                >
                  Guardar Lote & Prorratear
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Seguridad antes de Guardar Lote */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[100000] flex items-center justify-center p-4">
          <div className="bg-slate-800 border-2 border-amber-500/60 rounded-2xl w-full max-w-lg p-6 shadow-[0_25px_60px_rgba(0,0,0,0.9)] space-y-4 text-xs">
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

            {/* Item List Preview */}
            <div className="space-y-1.5 max-h-36 overflow-y-auto bg-slate-900/60 p-2 rounded-xl border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 block px-1">Productos Incluidos:</span>
              {proratedPreview.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center bg-slate-800/80 p-2 rounded-lg text-[11px]">
                  <div>
                    <span className="font-mono text-blue-400 font-bold mr-2">{item.sku}</span>
                    <span className="text-white font-semibold">{item.productName}</span>
                    <span className="text-slate-400 text-[10px] block">Cant: {item.quantity} uds | FOB: ${item.unitCostFob.toFixed(2)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-indigo-400 font-bold block">${item.finalUnitCost.toFixed(2)} USD</span>
                    <span className="text-emerald-400 font-mono text-[10px] block">Venta: ${item.finalSellingPrice.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Actions Buttons */}
            <div className="flex justify-end space-x-3 pt-3 border-t border-slate-700">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs font-semibold transition"
              >
                ✏️ Revisar / Modificar Datos
              </button>
              <button
                type="button"
                onClick={processSaveBatch}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-lg shadow-emerald-600/20"
              >
                ✅ Sí, Confirmar y Procesar Lote
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
