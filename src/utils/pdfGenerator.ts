import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ImportBatch, User, InventoryProduct } from '../services/api';

/**
 * Genera y descarga directamente el Informe Oficial de un Lote en PDF multipágina
 * con jspdf y jspdf-autotable, evitando ventanas about:blank bloqueadas.
 */
export const exportSingleBatchPdf = (batch: ImportBatch, user?: User | null) => {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const rate = Number(batch.exchangeRateGtq || (batch as any).exchange_rate || 7.80);
    const margin = Number(batch.profitMarginPct || (batch as any).profit_margin_pct || 15.0);

    let grandTotalFob = 0;
    let grandTotalLanded = 0;
    let grandTotalSelling = 0;
    let totalUnits = 0;

    const rawItems = (batch.items || (batch as any).batch_items || []) as any[];

    const itemsDetailed = rawItems.map((item, idx) => {
      const qty = Number(item.quantity ?? item.qty ?? 1);
      totalUnits += qty;

      const fobCost = Number(item.unitCostFob ?? item.fob_unit_usd ?? item.fob ?? 0);
      const totalFob = Number(item.totalFobValue ?? (qty * fobCost));
      grandTotalFob += totalFob;

      const sharePct = Number(item.sharePercentage ?? 0);
      const itemCustoms = item.allocatedCustoms !== undefined
        ? Number(item.allocatedCustoms)
        : (sharePct / 100) * Number(batch.totalCustomsTax || (batch as any).customs_cost_usd || 0);
      const itemShipping = item.allocatedShipping !== undefined
        ? Number(item.allocatedShipping)
        : (sharePct / 100) * Number(batch.totalShippingCost || (batch as any).shipping_cost_usd || 0);
      const itemTotalExpense = itemCustoms + itemShipping;

      const unitTax = qty > 0 ? itemTotalExpense / qty : 0;
      const landedCostUsd = Number(item.finalUnitCost ?? item.landed_unit_usd ?? (fobCost + unitTax));
      const landedCostGtq = Number(item.landed_unit_gtq ?? (landedCostUsd * rate));
      const totalLanded = landedCostUsd * qty;
      grandTotalLanded += totalLanded;

      const sellingPriceUsd = Number(item.finalSellingPrice ?? (landedCostUsd * (1 + margin / 100)));
      const sellingPriceGtq = Number(item.sale_price_gtq ?? (sellingPriceUsd * rate));
      const totalSelling = sellingPriceUsd * qty;
      grandTotalSelling += totalSelling;

      const cleanBrand = item.brand ? String(item.brand).trim() : '';
      const cleanModel = item.model ? String(item.model).trim() : '';
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

      const rawName = String(item.productName || item.name || `Producto ${idx + 1}`).trim();
      const displayTitle = brandModelCombined
        ? `${brandModelCombined} - ${rawName}`
        : rawName;

      const sku = String(item.sku || `SKU-${String(idx + 1).padStart(4, '0')}`);

      return {
        sku,
        name: displayTitle,
        quantity: qty,
        qty,
        fob_unit_usd: fobCost,
        fob: fobCost,
        landed_unit_usd: landedCostUsd,
        landed_unit_gtq: landedCostGtq,
        sale_price_gtq: sellingPriceGtq,
        sale_price_usd: sellingPriceUsd
      };
    });

    const totalCustomsTax = Number(batch.totalCustomsTax || (batch as any).customs_cost_usd || 0);
    const totalShippingCost = Number(batch.totalShippingCost || (batch as any).shipping_cost_usd || 0);
    const totalLandedExpenses = totalCustomsTax + totalShippingCost;
    const grandTotalProfitGtq = (grandTotalSelling - grandTotalLanded) * rate;

    const batchIdStr = String(batch.batch_code || batch.id || 'LOTE');
    const batchNameStr = String(batch.batch_name || batch.name || 'Lote de Importación');

    // Barra decorativa superior
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(14, 10, 182, 1.5, 'F');

    // Logo / Marca
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(37, 99, 235); // blue-600
    doc.text('AppG', 14, 20);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Sistema de Gestión e Importaciones', 34, 20);

    // Metadatos a la derecha
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    const dateFormatted = batch.created_at
      ? new Date(String(batch.created_at).includes(' ') && !String(batch.created_at).includes('T') ? String(batch.created_at).replace(' ', 'T') : batch.created_at).toLocaleString('es-GT', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }).replace(', ', ' • ')
      : (batch.importDate || new Date().toLocaleDateString('es-GT'));

    doc.text(`Fecha Lote: ${dateFormatted}`, 196, 17, { align: 'right' });
    doc.text(`Emisión: ${new Date().toLocaleDateString('es-GT')} ${new Date().toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })}`, 196, 21.5, { align: 'right' });
    doc.text(`Generado: ${user?.name || 'Administrador'} (${user?.role || 'Admin'})`, 196, 26, { align: 'right' });

    // Título del informe
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(`Informe Oficial: ${batchNameStr} (${batchIdStr})`, 14, 30);

    // Tarjetas KPI Financieras (Grilla 4 columnas)
    const cardY = 34;
    const cardW = 43.5;
    const cardH = 17;
    const gap = 2.6;

    // KPI 1: Compra Fábrica Total
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(14, cardY, cardW, cardH, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text('TOTAL COMPRA FÁBRICA', 17, cardY + 4.5);
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`$${grandTotalFob.toFixed(2)} USD`, 17, cardY + 10);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Q ${(grandTotalFob * rate).toFixed(2)} GTQ`, 17, cardY + 14.5);

    // KPI 2: Gastos Aduana + Flete
    const c2X = 14 + cardW + gap;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(c2X, cardY, cardW, cardH, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text('GASTOS IMPORTACIÓN', c2X + 3, cardY + 4.5);
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`$${totalLandedExpenses.toFixed(2)} USD`, c2X + 3, cardY + 10);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Aduana: $${totalCustomsTax.toFixed(2)} | Flete: $${totalShippingCost.toFixed(2)}`, c2X + 3, cardY + 14.5);

    // KPI 3: Costo Puesto Total
    const c3X = c2X + cardW + gap;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(c3X, cardY, cardW, cardH, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text('COSTO TOTAL PUESTO', c3X + 3, cardY + 4.5);
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`$${grandTotalLanded.toFixed(2)} USD`, c3X + 3, cardY + 10);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Q ${(grandTotalLanded * rate).toFixed(2)} GTQ`, c3X + 3, cardY + 14.5);

    // KPI 4: Proyección Venta
    const c4X = c3X + cardW + gap;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(c4X, cardY, cardW, cardH, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text('PROYECCIÓN DE VENTA', c4X + 3, cardY + 4.5);
    doc.setFontSize(9.5);
    doc.setTextColor(21, 128, 61); // green-700
    doc.text(`+Q ${grandTotalProfitGtq.toFixed(2)}`, c4X + 3, cardY + 10);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Margen: +${margin.toFixed(1)}% (TC: Q${rate.toFixed(2)})`, c4X + 3, cardY + 14.5);

    // Línea de parámetros y resumen
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(
      `Detalle: ${itemsDetailed.length} SKUs Registrados • ${totalUnits} Unidades Totales • Tipo de Cambio SAT: Q ${rate.toFixed(2)} GTQ/USD • Margen Aplicado: ${margin.toFixed(1)}%`,
      14,
      cardY + cardH + 5
    );

    // Tabla con paginación automática mediante jspdf-autotable
    const yPosition = cardY + cardH + 7;

    autoTable(doc, {
      startY: yPosition,
      theme: 'grid',
      tableLineColor: [203, 213, 225], // slate-300
      tableLineWidth: 0.5,
      head: [['SKU', 'Producto', 'Cant.', 'Costo Fábrica (USD)', 'Costo Puesto (USD)', 'Costo Puesto (Q)', 'Precio Venta Sugerido (Q)']],
      body: itemsDetailed.map(it => [
        String(it.sku || ''),
        String(it.name || ''),
        String(it.quantity || it.qty || 0),
        `$${Number(it.fob_unit_usd || it.fob || 0).toFixed(2)}`,
        `$${Number(it.landed_unit_usd || 0).toFixed(2)}`,
        `Q${Number(it.landed_unit_gtq || 0).toFixed(2)}`,
        `Q${Number(it.sale_price_gtq || 0).toFixed(2)}`
      ]),
      margin: { top: 18, bottom: 18, left: 14, right: 14 },
      styles: {
        font: 'helvetica',
        fontSize: 7.5,
        cellPadding: 3,
        valign: 'middle',
        lineColor: [226, 232, 240], // slate-200
        lineWidth: 0.3
      },
      headStyles: {
        fillColor: [15, 23, 42], // slate-900
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle'
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 20 }, // SKU
        1: { halign: 'left', cellWidth: 'auto' }, // Producto
        2: { halign: 'center', cellWidth: 12 }, // Cant.
        3: { halign: 'center', cellWidth: 22 }, // Costo Fábrica (USD)
        4: { halign: 'center', cellWidth: 22 }, // Costo Puesto (USD)
        5: { halign: 'center', cellWidth: 22 }, // Costo Puesto (Q)
        6: { halign: 'center', cellWidth: 25, fontStyle: 'bold', textColor: [22, 101, 52] } // Precio Venta Sugerido (Q)
      },
      alternateRowStyles: { fillColor: [248, 250, 252] }
    });

    // Numeración de páginas en el pie de cada hoja
    const totalPages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text(
        `AppG v0.1 (beta) • Informe Oficial de Lote ${batchIdStr} • Página ${p} de ${totalPages}`,
        14,
        doc.internal.pageSize.height - 10
      );
    }

    // Descarga directa limpia sin abrir about:blank
    const sanitizedCode = batchIdStr.replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `Informe_Lote_${sanitizedCode}.pdf`;

    try {
      doc.save(fileName);
    } catch (saveErr) {
      console.warn('Fallback a descarga por elemento ancla y Blob:', saveErr);
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  } catch (error) {
    console.error('Error generando el informe PDF del lote:', error);
    alert('Ocurrió un error al generar el PDF del lote. Por favor intenta de nuevo.');
  }
};

/**
 * Genera y descarga directamente el Reporte Oficial de Inventario & Stock Físico en PDF multipágina
 * con jspdf y jspdf-autotable, con columnas limpias (sin Salud Stock).
 */
export const exportInventoryPdf = (inventory: InventoryProduct[], user?: User | null) => {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const totalStock = inventory.reduce((sum, p) => sum + (p.stock || 0), 0);
    const totalValUsd = inventory.reduce((sum, p) => sum + ((p.stock || 0) * (p.unitCost || 0)), 0);
    const totalValGtq = totalValUsd * 7.80;

    // Barra superior decorativa
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(14, 10, 182, 1.5, 'F');

    // Logo / Marca
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(37, 99, 235); // blue-600
    doc.text('AppG', 14, 20);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Sistema de Gestión e Importaciones', 34, 20);

    // Metadatos
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Emisión: ${new Date().toLocaleDateString('es-GT')} ${new Date().toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })}`, 196, 20, { align: 'right' });
    doc.text(`Generado: ${user?.name || 'Administrador'} (${user?.role || 'Admin'})`, 196, 25, { align: 'right' });

    // Título de la sección
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text('Reporte Oficial de Inventario & Stock Físico', 14, 30);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`Catálogo Consolidado de Inventario (${inventory.length} Productos) • ${totalStock} Unidades • Valoración: $${totalValUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD (Q ${totalValGtq.toLocaleString('es-GT', { minimumFractionDigits: 2 })} GTQ)`, 14, 35);

    autoTable(doc, {
      startY: 40,
      head: [['CÓDIGO SKU', 'NOMBRE DEL PRODUCTO', 'CATEGORÍA', 'STOCK FÍSICO', 'COSTO LANDED', 'VALOR TOTAL USD']],
      body: inventory.map(p => {
        const uCostGtq = (p.unitCost * 7.80).toFixed(2);
        const tValUsd = ((p.stock || 0) * (p.unitCost || 0)).toFixed(2);
        const tValGtq = ((p.stock || 0) * (p.unitCost || 0) * 7.80).toFixed(2);

        return [
          String(p.sku || ''),
          String(p.name || ''),
          String(p.category || 'General'),
          `${p.stock || 0} uds`,
          `$${Number(p.unitCost || 0).toFixed(2)} (Q ${uCostGtq})`,
          `$${tValUsd} USD (Q ${tValGtq})`
        ];
      }),
      margin: { top: 18, bottom: 18, left: 14, right: 14 },
      styles: { fontSize: 7.5, cellPadding: 2.2, overflow: 'linebreak' },
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 24, fontStyle: 'bold' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 26 },
        3: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
        4: { cellWidth: 28, halign: 'right' },
        5: { cellWidth: 32, halign: 'right', fontStyle: 'bold', textColor: [21, 128, 61] }
      },
      alternateRowStyles: { fillColor: [248, 250, 252] }
    });

    const totalPages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text(
        `AppG v0.1 (beta) • Catálogo Consolidado de Inventario (${inventory.length} Productos) • Página ${p} de ${totalPages}`,
        14,
        doc.internal.pageSize.height - 10
      );
    }

    const fileName = `Reporte_Inventario_${new Date().toISOString().slice(0, 10)}.pdf`;
    try {
      doc.save(fileName);
    } catch {
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  } catch (error) {
    console.error('Error generando PDF de inventario:', error);
    alert('Ocurrió un error al generar el PDF de inventario. Por favor intenta de nuevo.');
  }
};

export const generateBatchReportPDF = exportSingleBatchPdf;

