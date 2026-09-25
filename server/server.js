import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const DEFAULT_USER = {
  id: 1,
  name: 'admin-gg',
  username: 'admin-gg',
  email: 'admin@appg.com',
  role: 'Administrador',
  status: 'Activo',
  avatar: ''
};

// ==========================================
// AUTENTICACIÓN
// ==========================================

app.post('/api/auth/verify', (req, res) => {
  res.json({ valid: true, success: true, user: DEFAULT_USER, token: 'local-token', ...DEFAULT_USER });
});

app.post('/api/auth/login', (req, res) => {
  res.json({ success: true, valid: true, token: 'local-token', user: DEFAULT_USER, ...DEFAULT_USER });
});

app.post('/api/auth/register', (req, res) => {
  const { name, email, role } = req.body;
  const user = {
    id: Date.now(),
    name: name || 'Usuario',
    username: (name || 'user').toLowerCase().replace(/\s+/g, ''),
    email: email || 'user@appg.com',
    role: role || 'Vendedor',
    status: 'Activo',
    avatar: ''
  };
  res.json({ success: true, user });
});

// ==========================================
// USUARIOS
// ==========================================

app.get('/api/users', (req, res) => {
  db.all('SELECT * FROM users ORDER BY id DESC', [], (err, users) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(users && users.length > 0 ? users : [DEFAULT_USER]);
  });
});

app.post('/api/users', (req, res) => {
  const { name, email, role, status = 'Activo', password = 'password123' } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'Nombre y correo son requeridos.' });
  }
  const cleanName = name.trim();
  const cleanEmail = email.trim().toLowerCase();
  const lastLogin = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  const query = 'INSERT INTO users (name, email, role, status, avatar, lastLogin, password) VALUES (?, ?, ?, ?, ?, ?, ?)';
  
  db.run(query, [cleanName, cleanEmail, role || 'Vendedor', status, '', lastLogin, password], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, name: cleanName, email: cleanEmail, role: role || 'Vendedor', status, avatar: '', lastLogin });
  });
});

app.put('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const { name, email } = req.body;
  if (!name) return res.status(400).json({ error: 'Nombre de usuario es requerido.' });

  db.get('SELECT * FROM users WHERE id = ?', [id], (err, existing) => {
    if (err || !existing) return res.status(404).json({ error: 'Usuario no encontrado.' });
    const newEmail = email ? email.trim().toLowerCase() : existing.email;
    const query = 'UPDATE users SET name = ?, email = ? WHERE id = ?';
    db.run(query, [name.trim(), newEmail, id], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ ...existing, name: name.trim(), email: newEmail, avatar: '' });
    });
  });
});

app.put('/api/users/:id/password', (req, res) => {
  const { id } = req.params;
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.trim() === '') {
    return res.status(400).json({ error: 'La nueva contraseña es requerida.' });
  }

  db.get('SELECT * FROM users WHERE id = ?', [id], (err, user) => {
    if (err || !user) return res.status(404).json({ error: 'Usuario no encontrado.' });
    const dbPass = user.password || 'password123';
    if (currentPassword && currentPassword.trim() !== dbPass) {
      return res.status(401).json({ error: 'La contraseña actual ingresada es incorrecta.' });
    }
    db.run('UPDATE users SET password = ? WHERE id = ?', [newPassword.trim(), id], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, message: 'Contraseña actualizada correctamente.' });
    });
  });
});

app.put('/api/users/:id/toggle', (req, res) => {
  const { id } = req.params;
  db.get('SELECT status FROM users WHERE id = ?', [id], (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'Usuario no encontrado.' });
    const newStatus = row.status === 'Activo' ? 'Inactivo' : 'Activo';
    db.run('UPDATE users SET status = ? WHERE id = ?', [newStatus, id], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id, status: newStatus });
    });
  });
});

app.delete('/api/users/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM users WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, id });
  });
});

// ==========================================
// DASHBOARD & MÉTRICAS
// ==========================================

app.get('/api/dashboard/stats', (req, res) => {
  db.serialize(() => {
    let stats = {
      totalSales: 0,
      completedSalesCount: 0,
      totalSkus: 0,
      totalStock: 0,
      inventoryValue: 0,
      totalImportExpenses: 0,
      customsTaxPaid: 0,
      shippingPaid: 0,
      totalBatchesCount: 0
    };

    // 1. Ventas desde Transacciones
    db.all('SELECT amount, status FROM transactions', [], (err, trxs) => {
      if (!err && Array.isArray(trxs)) {
        trxs.forEach(t => {
          if (t.status === 'Completado') {
            const rawAmount = typeof t.amount === 'number' ? t.amount : parseFloat(String(t.amount).replace(/[^0-9.-]+/g, '')) || 0;
            stats.totalSales += rawAmount;
            stats.completedSalesCount += 1;
          }
        });
      }

      // 2. Métricas de Inventario
      db.all('SELECT stock, unitCost FROM inventory', [], (err, invs) => {
        if (!err && Array.isArray(invs)) {
          stats.totalSkus = invs.length;
          invs.forEach(i => {
            const st = i.stock || 0;
            const cost = i.unitCost || 0;
            stats.totalStock += st;
            stats.inventoryValue += (st * cost);
          });
        }

        // 3. Gastos de Importación desde Lotes
        db.all('SELECT totalCustomsTax, totalShippingCost FROM batches', [], (err, batches) => {
          if (!err && Array.isArray(batches)) {
            stats.totalBatchesCount = batches.length;
            batches.forEach(b => {
              const tax = b.totalCustomsTax || 0;
              const ship = b.totalShippingCost || 0;
              stats.customsTaxPaid += tax;
              stats.shippingPaid += ship;
              stats.totalImportExpenses += (tax + ship);
            });
          }

          res.json({
            totalSales: parseFloat(stats.totalSales.toFixed(2)),
            completedSalesCount: stats.completedSalesCount,
            totalSkus: stats.totalSkus,
            totalStock: stats.totalStock,
            inventoryValue: parseFloat(stats.inventoryValue.toFixed(2)),
            totalImportExpenses: parseFloat(stats.totalImportExpenses.toFixed(2)),
            customsTaxPaid: parseFloat(stats.customsTaxPaid.toFixed(2)),
            shippingPaid: parseFloat(stats.shippingPaid.toFixed(2)),
            totalBatchesCount: stats.totalBatchesCount
          });
        });
      });
    });
  });
});

app.get('/api/stats', (req, res) => {
  res.redirect('/api/dashboard/stats');
});

// ==========================================
// VENTAS / TRANSACCIONES
// ==========================================

app.get('/api/transactions', (req, res) => {
  db.all('SELECT * FROM transactions ORDER BY date DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

app.post('/api/transactions', (req, res) => {
  const { client, service, amount, status, sku, quantity, unitPrice, items } = req.body;
  if (!client || !amount) {
    return res.status(400).json({ error: 'Nombre del cliente y monto son requeridos.' });
  }

  const id = `#TRX-${Math.floor(1000 + Math.random() * 9000)}`;
  const date = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  const formattedAmount = typeof amount === 'number'
    ? `Q ${(amount * 7.80).toFixed(2)} GTQ`
    : (String(amount).startsWith('Q') ? amount : (String(amount).startsWith('$') ? `Q ${(parseFloat(String(amount).replace('$', '')) * 7.80).toFixed(2)} GTQ` : `Q ${amount} GTQ`));
  const trxStatus = status || 'Completado';
  const qtySold = Math.max(1, parseInt(quantity) || 1);
  const cleanSku = sku ? sku.trim().toUpperCase() : null;
  const prodName = service || 'Producto / Servicio';

  db.serialize(() => {
    const query = 'INSERT INTO transactions (id, client, service, date, amount, status) VALUES (?, ?, ?, ?, ?, ?)';
    db.run(query, [id, client, prodName, date, formattedAmount, trxStatus], function (err) {
      if (err) return res.status(500).json({ error: err.message });

      // Deducción de stock atómica si la venta está completada
      if (trxStatus === 'Completado') {
        if (Array.isArray(items) && items.length > 0) {
          items.forEach(item => {
            if (item.sku) {
              const itemSku = item.sku.trim().toUpperCase();
              const itemQty = Math.max(1, parseInt(item.quantity) || 1);
              db.get('SELECT stock FROM inventory WHERE UPPER(sku) = ?', [itemSku], (invErr, existing) => {
                if (existing) {
                  const newStock = Math.max(0, existing.stock - itemQty);
                  db.run('UPDATE inventory SET stock = ?, lastUpdated = ? WHERE UPPER(sku) = ?', [newStock, date, itemSku]);
                }
              });
            }
          });
        } else if (cleanSku) {
          db.get('SELECT stock FROM inventory WHERE UPPER(sku) = ?', [cleanSku], (invErr, existing) => {
            if (existing) {
              const newStock = Math.max(0, existing.stock - qtySold);
              db.run('UPDATE inventory SET stock = ?, lastUpdated = ? WHERE UPPER(sku) = ?', [newStock, date, cleanSku]);
            }
          });
        }
      }

      res.json({ id, client, service: prodName, date, amount: formattedAmount, status: trxStatus, sku: cleanSku, quantity: qtySold });
    });
  });
});

app.put('/api/transactions/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  db.run('UPDATE transactions SET status = ? WHERE id = ?', [status, id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, id, status });
  });
});

app.delete('/api/transactions/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM transactions WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, id });
  });
});

// ==========================================
// LOTES DE IMPORTACIÓN & PRORRATEO
// ==========================================

app.get('/api/batches', (req, res) => {
  db.all('SELECT * FROM batches ORDER BY created_at DESC, id DESC', [], (err, batches) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!batches || batches.length === 0) return res.json([]);

    db.all(
      `SELECT bi.*, i.brand as invBrand, i.model as invModel
       FROM batch_items bi
       LEFT JOIN inventory i ON UPPER(bi.sku) = UPPER(i.sku)`,
      [],
      (err, items) => {
        if (err) return res.status(500).json({ error: err.message });

        const result = batches.map(batch => ({
          ...batch,
          created_at: batch.created_at || (batch.importDate ? new Date(batch.importDate).toISOString() : new Date().toISOString()),
          totalCustomsTax: batch.totalCustomsTax || 0,
          totalShippingCost: batch.totalShippingCost || 0,
          exchangeRateGtq: batch.exchangeRateGtq || 7.80,
          profitMarginPct: batch.profitMarginPct || 15.0,
          items: (items || [])
            .filter(item => item.batchId === batch.id)
            .map(item => ({
              ...item,
              brand: item.brand || item.invBrand || '',
              model: item.model || item.invModel || ''
            }))
        }));

        res.json(result);
      }
    );
  });
});

app.get('/api/batches/:id/items', (req, res) => {
  db.all('SELECT * FROM batch_items WHERE batchId = ?', [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

app.get('/api/batch-items', (req, res) => {
  db.all('SELECT * FROM batch_items ORDER BY id DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

app.post('/api/batches', (req, res) => {
  const { name, totalCustomsTax, totalShippingCost, exchangeRateGtq, profitMarginPct, costUpdateStrategy, items } = req.body;
  if (!name || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Nombre del lote y productos son requeridos.' });
  }

  const taxFloat = isNaN(parseFloat(totalCustomsTax)) ? 0 : parseFloat(totalCustomsTax);
  const shippingFloat = isNaN(parseFloat(totalShippingCost)) ? 0 : parseFloat(totalShippingCost);
  const gtqFloat = isNaN(parseFloat(exchangeRateGtq)) || parseFloat(exchangeRateGtq) <= 0 ? 7.80 : parseFloat(exchangeRateGtq);
  const marginFloat = isNaN(parseFloat(profitMarginPct)) || parseFloat(profitMarginPct) < 0 ? 15.0 : parseFloat(profitMarginPct);
  const costStrategy = costUpdateStrategy === 'latest' ? 'latest' : 'weighted';

  const batchId = `#LOT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
  const importDate = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

  // 1. Calcular FOB Total
  let grandTotalFob = 0;
  const processedItems = items.map((item, index) => {
    const qty = Math.max(1, parseInt(item.quantity) || 1);
    const unitCost = Math.max(0, parseFloat(item.unitCostFob) || 0);
    const totalFob = qty * unitCost;
    grandTotalFob += totalFob;
    const sku = item.sku && item.sku.trim() !== '' ? item.sku.trim().toUpperCase() : `PROD-00${index + 1}`;
    const productName = item.productName && item.productName.trim() !== '' ? item.productName.trim() : `Producto ${index + 1}`;
    const brand = item.brand ? item.brand.trim() : '';
    const model = item.model ? item.model.trim() : '';
    return { sku, productName, brand, model, quantity: qty, unitCostFob: unitCost, totalFobValue: totalFob, image: '' };
  });

  // 2. Prorratear Gastos de Aduana y Envío proporcionalmente al valor FOB
  const finalItems = processedItems.map(item => {
    const sharePercentage = grandTotalFob > 0 ? (item.totalFobValue / grandTotalFob) * 100 : 0;
    const allocatedCustoms = (sharePercentage / 100) * taxFloat;
    const allocatedShipping = (sharePercentage / 100) * shippingFloat;
    const allocatedExpenses = allocatedCustoms + allocatedShipping;
    const unitTax = item.quantity > 0 ? allocatedExpenses / item.quantity : 0;
    const finalUnitCost = item.unitCostFob + unitTax;
    const finalSellingPrice = finalUnitCost * (1 + marginFloat / 100);

    return {
      ...item,
      sharePercentage: isNaN(sharePercentage) ? 0 : parseFloat(sharePercentage.toFixed(2)),
      allocatedCustoms: isNaN(allocatedCustoms) ? 0 : parseFloat(allocatedCustoms.toFixed(2)),
      allocatedShipping: isNaN(allocatedShipping) ? 0 : parseFloat(allocatedShipping.toFixed(2)),
      allocatedTax: isNaN(allocatedExpenses) ? 0 : parseFloat(allocatedExpenses.toFixed(2)),
      unitTax: isNaN(unitTax) ? 0 : parseFloat(unitTax.toFixed(2)),
      finalUnitCost: isNaN(finalUnitCost) ? item.unitCostFob : parseFloat(finalUnitCost.toFixed(2)),
      profitMarginPct: marginFloat,
      finalSellingPrice: isNaN(finalSellingPrice) ? finalUnitCost : parseFloat(finalSellingPrice.toFixed(2))
    };
  });

  const nowIso = new Date().toISOString();

  // 3. Guardar Lote, Artículos y Actualizar/Insertar Inventario Consolidado
  db.serialize(() => {
    db.run(
      'INSERT INTO batches (id, name, importDate, totalCustomsTax, totalShippingCost, exchangeRateGtq, profitMarginPct, costUpdateStrategy, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [batchId, name, importDate, taxFloat, shippingFloat, gtqFloat, marginFloat, costStrategy, 'Procesado', nowIso],
      function (err) {
        if (err) {
          console.error('Error al insertar lote en BD:', err);
          return res.status(500).json({ error: err.message });
        }

        const stmt = db.prepare(`
          INSERT INTO batch_items (batchId, sku, productName, brand, model, quantity, unitCostFob, totalFobValue, sharePercentage, allocatedCustoms, allocatedShipping, allocatedTax, unitTax, finalUnitCost, profitMarginPct, finalSellingPrice, image)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '')
        `);

        finalItems.forEach(item => {
          stmt.run(batchId, item.sku, item.productName, item.brand || '', item.model || '', item.quantity, item.unitCostFob, item.totalFobValue, item.sharePercentage, item.allocatedCustoms, item.allocatedShipping, item.allocatedTax, item.unitTax, item.finalUnitCost, marginFloat, item.finalSellingPrice);
        });

        // Upsert secuencial de Inventario
        const processInventoryUpsert = (index) => {
          if (index >= finalItems.length) {
            try {
              if (stmt && typeof stmt.finalize === 'function') {
                stmt.finalize(() => {});
              }
            } catch {}
            return res.json({
              id: batchId,
              name,
              importDate,
              created_at: nowIso,
              totalCustomsTax: taxFloat,
              totalShippingCost: shippingFloat,
              exchangeRateGtq: gtqFloat,
              status: 'Procesado',
              items: finalItems
            });
          }

          const item = finalItems[index];
          const cleanSku = item.sku.trim().toUpperCase();
          db.get('SELECT * FROM inventory WHERE UPPER(sku) = ?', [cleanSku], (invErr, existing) => {
            if (existing) {
              const targetSku = existing.sku.toUpperCase();
              const oldStock = existing.stock || 0;
              const oldCost = existing.unitCost || 0;
              const newStock = oldStock + item.quantity;
              
              const calculatedCost = costStrategy === 'latest'
                ? item.finalUnitCost
                : (newStock > 0 ? ((oldStock * oldCost) + (item.quantity * item.finalUnitCost)) / newStock : item.finalUnitCost);

              const newCost = parseFloat(calculatedCost.toFixed(2));
              const delta = parseFloat((item.finalUnitCost - oldCost).toFixed(2));
              const pct = oldCost > 0 ? parseFloat(((delta / oldCost) * 100).toFixed(2)) : 0;
              const updatedBrand = item.brand || existing.brand || '';
              const updatedModel = item.model || existing.model || '';

              db.run(
                'UPDATE inventory SET name = ?, brand = ?, model = ?, stock = ?, unitCost = ?, previousUnitCost = ?, priceChangeDelta = ?, priceChangePct = ?, image = ?, lastUpdated = ? WHERE UPPER(sku) = ?',
                [item.productName, updatedBrand, updatedModel, newStock, newCost, oldCost, delta, pct, '', importDate, targetSku],
                () => {
                  db.run(
                    'INSERT INTO price_history (sku, batchId, oldCost, newCost, delta, pct, changeDate) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [targetSku, batchId, oldCost, item.finalUnitCost, delta, pct, importDate],
                    () => processInventoryUpsert(index + 1)
                  );
                }
              );
            } else {
              db.run(
                'INSERT INTO inventory (sku, name, brand, model, category, stock, unitCost, previousUnitCost, priceChangeDelta, priceChangePct, image, lastUpdated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [cleanSku, item.productName, item.brand || '', item.model || '', 'General', item.quantity, item.finalUnitCost, item.finalUnitCost, 0, 0, '', importDate],
                (err) => {
                  if (err) {
                    console.error('Error al insertar en inventario BD:', err.message);
                  }
                  db.run(
                    'INSERT INTO price_history (sku, batchId, oldCost, newCost, delta, pct, changeDate) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [cleanSku, batchId, item.finalUnitCost, item.finalUnitCost, 0, 0, importDate],
                    () => processInventoryUpsert(index + 1)
                  );
                }
              );
            }
          });
        };

        processInventoryUpsert(0);
      }
    );
  });
});

app.delete('/api/batches/:id', (req, res) => {
  const { id } = req.params;
  db.serialize(() => {
    db.run('DELETE FROM batch_items WHERE batchId = ?', [id], () => {
      db.run('DELETE FROM batches WHERE id = ?', [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, id });
      });
    });
  });
});

// ==========================================
// CATEGORÍAS DINÁMICAS
// ==========================================

app.get('/api/categories', (req, res) => {
  db.all('SELECT id, name, created_at FROM categories ORDER BY name ASC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const defaultCategories = [
      { id: 1, name: 'Repuestos' },
      { id: 2, name: 'Accesorios' },
      { id: 3, name: 'Pantallas' },
      { id: 4, name: 'General' }
    ];
    res.json(rows && rows.length > 0 ? rows : defaultCategories);
  });
});

app.post('/api/categories', (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'El nombre de la categoría es requerido.' });
  }

  const cleanName = name.trim();

  // Validar si ya existe (evitando duplicados insensible a mayúsculas)
  db.get('SELECT * FROM categories WHERE LOWER(TRIM(name)) = LOWER(?)', [cleanName], (err, existing) => {
    if (err) return res.status(500).json({ error: err.message });
    if (existing) {
      return res.json(existing);
    }

    if (db.isPg) {
      db.run('INSERT INTO categories (name, created_at) VALUES (?, NOW()) ON CONFLICT (name) DO NOTHING', [cleanName], function (insertErr) {
        if (insertErr) return res.status(500).json({ error: insertErr.message });
        db.get('SELECT * FROM categories WHERE LOWER(TRIM(name)) = LOWER(?)', [cleanName], (findErr, row) => {
          if (!findErr && row) return res.status(201).json(row);
          res.status(201).json({ id: this.lastID || Date.now(), name: cleanName });
        });
      });
    } else {
      db.run('INSERT INTO categories (name) VALUES (?)', [cleanName], function (insertErr) {
        if (insertErr) {
          return db.get('SELECT * FROM categories WHERE LOWER(TRIM(name)) = LOWER(?)', [cleanName], (findErr, row) => {
            if (!findErr && row) return res.json(row);
            return res.status(500).json({ error: insertErr.message });
          });
        }
        res.status(201).json({ id: this.lastID || Date.now(), name: cleanName });
      });
    }
  });
});

app.put('/api/categories/:id', (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'El nombre de la categoría es requerido.' });
  }
  const cleanName = name.trim();

  db.get('SELECT * FROM categories WHERE LOWER(TRIM(name)) = LOWER(?) AND id != ?', [cleanName, id], (err, existing) => {
    if (err) return res.status(500).json({ error: err.message });
    if (existing) {
      return res.status(400).json({ error: 'Ya existe una categoría con ese nombre.' });
    }

    db.run('UPDATE categories SET name = ? WHERE id = ?', [cleanName, id], function (updateErr) {
      if (updateErr) return res.status(500).json({ error: updateErr.message });
      db.get('SELECT id, name, created_at FROM categories WHERE id = ?', [id], (getErr, row) => {
        if (!getErr && row) return res.json(row);
        res.json({ id, name: cleanName });
      });
    });
  });
});

app.delete('/api/categories/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM categories WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Categoría eliminada con éxito', id });
  });
});

// ==========================================
// INVENTARIO & HISTORIAL DE PRECIOS
// ==========================================

app.get('/api/inventory', (req, res) => {
  db.all('SELECT * FROM inventory ORDER BY id DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const normalized = (rows || []).map(r => ({
      ...r,
      sku: String(r.sku ?? ''),
      name: String(r.name ?? ''),
      brand: String(r.brand ?? ''),
      model: String(r.model ?? ''),
      category: String(r.category ?? 'General')
    }));
    res.json(normalized);
  });
});

app.post('/api/inventory', (req, res) => {
  const { sku, name, brand, model, category, stock, unitCost } = req.body;
  if (!sku || !name) {
    return res.status(400).json({ error: 'Código SKU y Nombre de producto son requeridos.' });
  }

  const cleanSku = sku.trim().toUpperCase();
  const cleanName = name.trim();
  const cleanBrand = brand ? brand.trim() : '';
  const cleanModel = model ? model.trim() : '';
  const cat = category && category.trim() !== '' ? category.trim() : 'General';
  const stockInt = Math.max(0, parseInt(stock) || 0);
  const costFloat = Math.max(0, parseFloat(unitCost) || 0.0);
  const lastUpdated = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

  db.get('SELECT id FROM inventory WHERE UPPER(sku) = ?', [cleanSku], (err, existing) => {
    if (existing) {
      return res.status(400).json({ error: `El Código SKU "${cleanSku}" ya existe en el inventario.` });
    }

    const sql = `INSERT INTO inventory (sku, name, brand, model, category, stock, unitCost, previousUnitCost, priceChangeDelta, priceChangePct, image, lastUpdated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', ?)`;
    db.run(sql, [cleanSku, cleanName, cleanBrand, cleanModel, cat, stockInt, costFloat, costFloat, 0, 0, lastUpdated], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({
        id: this.lastID,
        sku: cleanSku,
        name: cleanName,
        brand: cleanBrand,
        model: cleanModel,
        category: cat,
        stock: stockInt,
        unitCost: costFloat,
        previousUnitCost: costFloat,
        priceChangeDelta: 0,
        priceChangePct: 0,
        image: '',
        lastUpdated
      });
    });
  });
});

app.get('/api/inventory/sku/:sku', (req, res) => {
  const { sku } = req.params;
  db.get('SELECT * FROM inventory WHERE UPPER(sku) = UPPER(?)', [sku], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'SKU no encontrado' });
    res.json(row);
  });
});

app.put('/api/inventory/:id/stock', (req, res) => {
  const { id } = req.params;
  const { delta } = req.body;
  const deltaInt = parseInt(delta) || 0;

  db.get('SELECT stock FROM inventory WHERE id = ?', [id], (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'Producto no encontrado.' });
    const newStock = Math.max(0, row.stock + deltaInt);
    const date = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

    db.run('UPDATE inventory SET stock = ?, lastUpdated = ? WHERE id = ?', [newStock, date, id], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id, stock: newStock });
    });
  });
});

app.delete('/api/inventory/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM inventory WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, id });
  });
});

app.get('/api/inventory/history/:sku', (req, res) => {
  const cleanParam = req.params.sku ? String(req.params.sku).trim().toUpperCase() : '';
  const queryName = req.query.name ? String(req.query.name).trim().toUpperCase() : '';

  db.get(
    'SELECT * FROM inventory WHERE UPPER(sku) = ? OR UPPER(name) = ? OR (LENGTH(?) > 0 AND UPPER(name) = ?)',
    [cleanParam, cleanParam, queryName, queryName],
    (invErr, invItem) => {
      const targetSku = invItem ? String(invItem.sku).toUpperCase() : cleanParam;

      db.all(
        `SELECT bi.*, b.name as batchName, b.importDate
         FROM batch_items bi
         LEFT JOIN batches b ON bi.batchId = b.id
         WHERE UPPER(bi.sku) = ?
         ORDER BY bi.id ASC`,
        [targetSku],
        (bErr, bRows) => {
          if (!bErr && Array.isArray(bRows) && bRows.length > 0) {
            const history = bRows.map((b, idx) => {
              const newCost = b.finalUnitCost || b.unitCostFob;
              const oldCost = idx === 0 ? newCost : bRows[idx - 1].finalUnitCost;
              const delta = parseFloat((newCost - oldCost).toFixed(2));
              const pct = oldCost > 0 ? parseFloat(((delta / oldCost) * 100).toFixed(2)) : 0;

              return {
                id: b.id,
                sku: targetSku,
                batchId: b.batchId || `Lote #${idx + 1}`,
                batchName: b.batchName || `Importación #${idx + 1}`,
                oldCost,
                newCost,
                delta,
                pct,
                changeDate: b.importDate || (invItem ? invItem.lastUpdated : '27 ago 2026'),
                unitCostFob: b.unitCostFob,
                quantity: b.quantity,
                sharePercentage: b.sharePercentage,
                allocatedCustoms: b.allocatedCustoms,
                allocatedShipping: b.allocatedShipping,
                allocatedTax: b.allocatedTax,
                unitTax: b.unitTax,
                finalUnitCost: b.finalUnitCost,
                profitMarginPct: b.profitMarginPct,
                finalSellingPrice: b.finalSellingPrice
              };
            });

            return res.json(history.reverse());
          }

          if (invItem) {
            return res.json([{
              id: 1,
              sku: targetSku,
              batchId: 'Registro de Inventario',
              batchName: 'Costo Base Inicial',
              oldCost: invItem.previousUnitCost || invItem.unitCost,
              newCost: invItem.unitCost,
              delta: invItem.priceChangeDelta || 0,
              pct: invItem.priceChangePct || 0,
              changeDate: invItem.lastUpdated || '27 ago 2026'
            }]);
          }

          return res.json([]);
        }
      );
    }
  );
});

app.get('/api/price-history', (req, res) => {
  db.all('SELECT * FROM price_history ORDER BY changeDate DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

// ==========================================
// RESPALDO DE BASE DE DATOS (BACKUP)
// ==========================================

const authenticateAdmin = (req, res, next) => {
  const role = req.headers['x-user-role'] || req.query.role;
  if (role && role.toLowerCase() !== 'administrador') {
    return res.status(403).json({ error: 'Acceso denegado: se requieren permisos de Administrador' });
  }
  next();
};

const queryAll = (sql, params = []) => {
  return new Promise((resolve) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        console.error(`[BACKUP] Error consultando "${sql}":`, err.message);
        resolve([]);
      } else {
        resolve(rows || []);
      }
    });
  });
};

app.get('/api/backup/download', authenticateAdmin, async (req, res) => {
  try {
    const [categories, inventory, batches, batch_items, transactions, users, price_history] = await Promise.all([
      queryAll('SELECT * FROM categories ORDER BY id ASC'),
      queryAll('SELECT * FROM inventory ORDER BY id ASC'),
      queryAll('SELECT * FROM batches ORDER BY id ASC'),
      queryAll('SELECT * FROM batch_items ORDER BY id ASC'),
      queryAll('SELECT * FROM transactions ORDER BY id ASC'),
      queryAll('SELECT id, name, email, role, status, avatar, lastLogin FROM users ORDER BY id ASC'),
      queryAll('SELECT * FROM price_history ORDER BY id ASC')
    ]);

    const backupData = {
      metadata: {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        system: 'APPG Importaciones & Inventario',
        recordsCount: {
          categories: categories.length,
          inventory: inventory.length,
          batches: batches.length,
          batch_items: batch_items.length,
          transactions: transactions.length,
          users: users.length,
          price_history: price_history.length
        }
      },
      data: {
        categories,
        inventory,
        batches,
        batch_items,
        transactions,
        users,
        price_history
      }
    };

    const filename = `backup_appg_${new Date().toISOString().split('T')[0]}.json`;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(JSON.stringify(backupData, null, 2));
  } catch (error) {
    console.error('Error generando respaldo:', error);
    res.status(500).json({ error: 'Error al generar la copia de seguridad: ' + error.message });
  }
});

app.post('/api/backup/restore', authenticateAdmin, async (req, res) => {
  const payload = req.body;
  const data = (payload && payload.data) ? payload.data : payload;

  if (!data || (!Array.isArray(data.inventory) && !Array.isArray(data.batches) && !Array.isArray(data.categories))) {
    return res.status(400).json({ error: 'Archivo de respaldo inválido o incompleto (se requiere datos de inventario, lotes o categorías).' });
  }

  const categories = Array.isArray(data.categories) ? data.categories : [];
  const inventory = Array.isArray(data.inventory) ? data.inventory : [];
  const batches = Array.isArray(data.batches) ? data.batches : [];
  const batchItems = Array.isArray(data.batch_items) ? data.batch_items : (Array.isArray(data.batchItems) ? data.batchItems : []);
  const transactions = Array.isArray(data.transactions) ? data.transactions : [];
  const priceHistory = Array.isArray(data.price_history) ? data.price_history : (Array.isArray(data.priceHistory) ? data.priceHistory : []);

  if (db.isPg) {
    let client;
    try {
      client = await db.pool.connect();
      await client.query('BEGIN');

      const execPg = (sql, params = []) => {
        let paramIndex = 1;
        const pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
        return client.query(pgSql, params);
      };

      // 1. Limpiar tablas dependientes en orden inverso por claves foráneas
      await client.query('DELETE FROM batch_items');
      await client.query('DELETE FROM price_history');
      await client.query('DELETE FROM transactions');
      await client.query('DELETE FROM inventory');
      await client.query('DELETE FROM batches');
      await client.query('DELETE FROM categories');

      // 2. Insertar Categorías
      for (const cat of categories) {
        const id = cat.id || null;
        const name = cat.name || 'General';
        const createdAt = cat.created_at || cat.createdAt || new Date().toISOString();
        if (id) {
          await execPg('INSERT INTO categories (id, name, created_at) VALUES (?, ?, ?)', [id, name, createdAt]);
        } else {
          await execPg('INSERT INTO categories (name, created_at) VALUES (?, ?)', [name, createdAt]);
        }
      }

      // 3. Insertar Inventario
      for (const item of inventory) {
        const id = item.id || null;
        const sku = String(item.sku || '').trim().toUpperCase();
        const name = String(item.name || '').trim();
        const brand = item.brand || '';
        const model = item.model || '';
        const category = item.category || item.category_id || 'General';
        const stock = Math.max(0, parseInt(item.stock) || 0);
        const unitCost = Math.max(0, parseFloat(item.unitCost ?? item.unit_cost ?? 0));
        const previousUnitCost = Math.max(0, parseFloat(item.previousUnitCost ?? item.previous_unit_cost ?? unitCost));
        const priceChangeDelta = parseFloat(item.priceChangeDelta ?? item.price_change_delta ?? 0);
        const priceChangePct = parseFloat(item.priceChangePct ?? item.price_change_pct ?? 0);
        const image = item.image || '';
        const lastUpdated = item.lastUpdated || item.last_updated || new Date().toLocaleDateString('es-ES');

        if (id) {
          await execPg(
            'INSERT INTO inventory (id, sku, name, brand, model, category, stock, unitCost, previousUnitCost, priceChangeDelta, priceChangePct, image, lastUpdated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, sku, name, brand, model, category, stock, unitCost, previousUnitCost, priceChangeDelta, priceChangePct, image, lastUpdated]
          );
        } else {
          await execPg(
            'INSERT INTO inventory (sku, name, brand, model, category, stock, unitCost, previousUnitCost, priceChangeDelta, priceChangePct, image, lastUpdated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [sku, name, brand, model, category, stock, unitCost, previousUnitCost, priceChangeDelta, priceChangePct, image, lastUpdated]
          );
        }
      }

      // 4. Insertar Lotes
      for (const batch of batches) {
        const id = String(batch.id || batch.batch_code || `BATCH-${Date.now()}`);
        const name = batch.name || batch.batch_code || 'Lote';
        const importDate = batch.importDate || batch.import_date || new Date().toLocaleDateString('es-ES');
        const totalCustomsTax = Math.max(0, parseFloat(batch.totalCustomsTax ?? batch.customs_tax ?? 0));
        const totalShippingCost = Math.max(0, parseFloat(batch.totalShippingCost ?? batch.shipping_cost ?? 0));
        const exchangeRateGtq = parseFloat(batch.exchangeRateGtq ?? batch.exchange_rate ?? 7.80);
        const profitMarginPct = parseFloat(batch.profitMarginPct ?? batch.margin_rate ?? 15.0);
        const costUpdateStrategy = batch.costUpdateStrategy || 'weighted';
        const status = batch.status || 'Procesado';
        const createdAt = batch.created_at || batch.createdAt || new Date().toISOString();

        await execPg(
          'INSERT INTO batches (id, name, importDate, totalCustomsTax, totalShippingCost, exchangeRateGtq, profitMarginPct, costUpdateStrategy, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [id, name, importDate, totalCustomsTax, totalShippingCost, exchangeRateGtq, profitMarginPct, costUpdateStrategy, status, createdAt]
        );
      }

      // 5. Insertar Items de Lote
      for (const bi of batchItems) {
        const id = bi.id || null;
        const batchId = String(bi.batchId || bi.batch_id || '');
        const sku = String(bi.sku || 'PROD-001').trim().toUpperCase();
        const productName = String(bi.productName || bi.product_name || 'Producto').trim();
        const brand = bi.brand || '';
        const model = bi.model || '';
        const quantity = Math.max(1, parseInt(bi.quantity) || 1);
        const unitCostFob = Math.max(0, parseFloat(bi.unitCostFob ?? bi.fob_unit ?? 0));
        const totalFobValue = Math.max(0, parseFloat(bi.totalFobValue ?? (quantity * unitCostFob)));
        const sharePercentage = parseFloat(bi.sharePercentage ?? 0);
        const allocatedCustoms = parseFloat(bi.allocatedCustoms ?? 0);
        const allocatedShipping = parseFloat(bi.allocatedShipping ?? 0);
        const allocatedTax = parseFloat(bi.allocatedTax ?? (allocatedCustoms + allocatedShipping));
        const unitTax = parseFloat(bi.unitTax ?? (quantity > 0 ? allocatedTax / quantity : 0));
        const finalUnitCost = parseFloat(bi.finalUnitCost ?? bi.landed_unit_usd ?? (unitCostFob + unitTax));
        const profitMarginPct = parseFloat(bi.profitMarginPct ?? 15.0);
        const finalSellingPrice = parseFloat(bi.finalSellingPrice ?? bi.sale_price_gtq ?? (finalUnitCost * (1 + profitMarginPct / 100)));
        const image = bi.image || '';

        if (id) {
          await execPg(
            'INSERT INTO batch_items (id, batchId, sku, productName, brand, model, quantity, unitCostFob, totalFobValue, sharePercentage, allocatedCustoms, allocatedShipping, allocatedTax, unitTax, finalUnitCost, profitMarginPct, finalSellingPrice, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, batchId, sku, productName, brand, model, quantity, unitCostFob, totalFobValue, sharePercentage, allocatedCustoms, allocatedShipping, allocatedTax, unitTax, finalUnitCost, profitMarginPct, finalSellingPrice, image]
          );
        } else {
          await execPg(
            'INSERT INTO batch_items (batchId, sku, productName, brand, model, quantity, unitCostFob, totalFobValue, sharePercentage, allocatedCustoms, allocatedShipping, allocatedTax, unitTax, finalUnitCost, profitMarginPct, finalSellingPrice, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [batchId, sku, productName, brand, model, quantity, unitCostFob, totalFobValue, sharePercentage, allocatedCustoms, allocatedShipping, allocatedTax, unitTax, finalUnitCost, profitMarginPct, finalSellingPrice, image]
          );
        }
      }

      // 6. Insertar Transacciones
      for (const trx of transactions) {
        const id = String(trx.id || `#TRX-${Date.now()}`);
        const client = trx.client || 'Cliente';
        const service = trx.service || 'Venta';
        const date = trx.date || new Date().toLocaleDateString('es-ES');
        const amount = String(trx.amount || '0');
        const status = trx.status || 'Completado';

        await execPg(
          'INSERT INTO transactions (id, client, service, date, amount, status) VALUES (?, ?, ?, ?, ?, ?)',
          [id, client, service, date, amount, status]
        );
      }

      // 7. Insertar Historial de Precios
      for (const ph of priceHistory) {
        const id = ph.id || null;
        const sku = String(ph.sku || '').trim().toUpperCase();
        const batchId = ph.batchId || ph.batch_id || null;
        const oldCost = parseFloat(ph.oldCost ?? ph.old_cost ?? 0);
        const newCost = parseFloat(ph.newCost ?? ph.new_cost ?? 0);
        const delta = parseFloat(ph.delta ?? 0);
        const pct = parseFloat(ph.pct ?? 0);
        const changeDate = ph.changeDate || ph.change_date || new Date().toLocaleDateString('es-ES');

        if (id) {
          await execPg(
            'INSERT INTO price_history (id, sku, batchId, oldCost, newCost, delta, pct, changeDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [id, sku, batchId, oldCost, newCost, delta, pct, changeDate]
          );
        } else {
          await execPg(
            'INSERT INTO price_history (sku, batchId, oldCost, newCost, delta, pct, changeDate) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [sku, batchId, oldCost, newCost, delta, pct, changeDate]
          );
        }
      }

      // Reiniciar secuencias PostgreSQL
      await client.query("SELECT setval(pg_get_serial_sequence('categories', 'id'), COALESCE((SELECT MAX(id) FROM categories), 1))").catch(() => {});
      await client.query("SELECT setval(pg_get_serial_sequence('inventory', 'id'), COALESCE((SELECT MAX(id) FROM inventory), 1))").catch(() => {});
      await client.query("SELECT setval(pg_get_serial_sequence('batch_items', 'id'), COALESCE((SELECT MAX(id) FROM batch_items), 1))").catch(() => {});
      await client.query("SELECT setval(pg_get_serial_sequence('price_history', 'id'), COALESCE((SELECT MAX(id) FROM price_history), 1))").catch(() => {});

      await client.query('COMMIT');
      return res.status(200).json({ success: true, message: 'Datos restaurados correctamente' });
    } catch (err) {
      if (client) await client.query('ROLLBACK').catch(() => {});
      console.error('Error restaurando base de datos (PostgreSQL):', err);
      return res.status(500).json({ error: 'Error al procesar la restauración: ' + err.message });
    } finally {
      if (client) client.release();
    }
  } else {
    // SQLite
    const runSqlite = (sql, params = []) => new Promise((resolve, reject) => {
      db.sqliteDb.run(sql, params, (err) => err ? reject(err) : resolve());
    });

    try {
      await runSqlite('BEGIN TRANSACTION');

      await runSqlite('DELETE FROM batch_items');
      await runSqlite('DELETE FROM price_history');
      await runSqlite('DELETE FROM transactions');
      await runSqlite('DELETE FROM inventory');
      await runSqlite('DELETE FROM batches');
      await runSqlite('DELETE FROM categories');

      for (const cat of categories) {
        const id = cat.id || null;
        const name = cat.name || 'General';
        const createdAt = cat.created_at || cat.createdAt || new Date().toISOString();
        if (id) {
          await runSqlite('INSERT INTO categories (id, name, created_at) VALUES (?, ?, ?)', [id, name, createdAt]);
        } else {
          await runSqlite('INSERT INTO categories (name, created_at) VALUES (?, ?)', [name, createdAt]);
        }
      }

      for (const item of inventory) {
        const id = item.id || null;
        const sku = String(item.sku || '').trim().toUpperCase();
        const name = String(item.name || '').trim();
        const brand = item.brand || '';
        const model = item.model || '';
        const category = item.category || item.category_id || 'General';
        const stock = Math.max(0, parseInt(item.stock) || 0);
        const unitCost = Math.max(0, parseFloat(item.unitCost ?? item.unit_cost ?? 0));
        const previousUnitCost = Math.max(0, parseFloat(item.previousUnitCost ?? item.previous_unit_cost ?? unitCost));
        const priceChangeDelta = parseFloat(item.priceChangeDelta ?? item.price_change_delta ?? 0);
        const priceChangePct = parseFloat(item.priceChangePct ?? item.price_change_pct ?? 0);
        const image = item.image || '';
        const lastUpdated = item.lastUpdated || item.last_updated || new Date().toLocaleDateString('es-ES');

        if (id) {
          await runSqlite(
            'INSERT INTO inventory (id, sku, name, brand, model, category, stock, unitCost, previousUnitCost, priceChangeDelta, priceChangePct, image, lastUpdated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, sku, name, brand, model, category, stock, unitCost, previousUnitCost, priceChangeDelta, priceChangePct, image, lastUpdated]
          );
        } else {
          await runSqlite(
            'INSERT INTO inventory (sku, name, brand, model, category, stock, unitCost, previousUnitCost, priceChangeDelta, priceChangePct, image, lastUpdated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [sku, name, brand, model, category, stock, unitCost, previousUnitCost, priceChangeDelta, priceChangePct, image, lastUpdated]
          );
        }
      }

      for (const batch of batches) {
        const id = String(batch.id || batch.batch_code || `BATCH-${Date.now()}`);
        const name = batch.name || batch.batch_code || 'Lote';
        const importDate = batch.importDate || batch.import_date || new Date().toLocaleDateString('es-ES');
        const totalCustomsTax = Math.max(0, parseFloat(batch.totalCustomsTax ?? batch.customs_tax ?? 0));
        const totalShippingCost = Math.max(0, parseFloat(batch.totalShippingCost ?? batch.shipping_cost ?? 0));
        const exchangeRateGtq = parseFloat(batch.exchangeRateGtq ?? batch.exchange_rate ?? 7.80);
        const profitMarginPct = parseFloat(batch.profitMarginPct ?? batch.margin_rate ?? 15.0);
        const costUpdateStrategy = batch.costUpdateStrategy || 'weighted';
        const status = batch.status || 'Procesado';
        const createdAt = batch.created_at || batch.createdAt || new Date().toISOString();

        await runSqlite(
          'INSERT INTO batches (id, name, importDate, totalCustomsTax, totalShippingCost, exchangeRateGtq, profitMarginPct, costUpdateStrategy, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [id, name, importDate, totalCustomsTax, totalShippingCost, exchangeRateGtq, profitMarginPct, costUpdateStrategy, status, createdAt]
        );
      }

      for (const bi of batchItems) {
        const id = bi.id || null;
        const batchId = String(bi.batchId || bi.batch_id || '');
        const sku = String(bi.sku || 'PROD-001').trim().toUpperCase();
        const productName = String(bi.productName || bi.product_name || 'Producto').trim();
        const brand = bi.brand || '';
        const model = bi.model || '';
        const quantity = Math.max(1, parseInt(bi.quantity) || 1);
        const unitCostFob = Math.max(0, parseFloat(bi.unitCostFob ?? bi.fob_unit ?? 0));
        const totalFobValue = Math.max(0, parseFloat(bi.totalFobValue ?? (quantity * unitCostFob)));
        const sharePercentage = parseFloat(bi.sharePercentage ?? 0);
        const allocatedCustoms = parseFloat(bi.allocatedCustoms ?? 0);
        const allocatedShipping = parseFloat(bi.allocatedShipping ?? 0);
        const allocatedTax = parseFloat(bi.allocatedTax ?? (allocatedCustoms + allocatedShipping));
        const unitTax = parseFloat(bi.unitTax ?? (quantity > 0 ? allocatedTax / quantity : 0));
        const finalUnitCost = parseFloat(bi.finalUnitCost ?? bi.landed_unit_usd ?? (unitCostFob + unitTax));
        const profitMarginPct = parseFloat(bi.profitMarginPct ?? 15.0);
        const finalSellingPrice = parseFloat(bi.finalSellingPrice ?? bi.sale_price_gtq ?? (finalUnitCost * (1 + profitMarginPct / 100)));
        const image = bi.image || '';

        if (id) {
          await runSqlite(
            'INSERT INTO batch_items (id, batchId, sku, productName, brand, model, quantity, unitCostFob, totalFobValue, sharePercentage, allocatedCustoms, allocatedShipping, allocatedTax, unitTax, finalUnitCost, profitMarginPct, finalSellingPrice, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, batchId, sku, productName, brand, model, quantity, unitCostFob, totalFobValue, sharePercentage, allocatedCustoms, allocatedShipping, allocatedTax, unitTax, finalUnitCost, profitMarginPct, finalSellingPrice, image]
          );
        } else {
          await runSqlite(
            'INSERT INTO batch_items (batchId, sku, productName, brand, model, quantity, unitCostFob, totalFobValue, sharePercentage, allocatedCustoms, allocatedShipping, allocatedTax, unitTax, finalUnitCost, profitMarginPct, finalSellingPrice, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [batchId, sku, productName, brand, model, quantity, unitCostFob, totalFobValue, sharePercentage, allocatedCustoms, allocatedShipping, allocatedTax, unitTax, finalUnitCost, profitMarginPct, finalSellingPrice, image]
          );
        }
      }

      for (const trx of transactions) {
        const id = String(trx.id || `#TRX-${Date.now()}`);
        const client = trx.client || 'Cliente';
        const service = trx.service || 'Venta';
        const date = trx.date || new Date().toLocaleDateString('es-ES');
        const amount = String(trx.amount || '0');
        const status = trx.status || 'Completado';

        await runSqlite(
          'INSERT INTO transactions (id, client, service, date, amount, status) VALUES (?, ?, ?, ?, ?, ?)',
          [id, client, service, date, amount, status]
        );
      }

      for (const ph of priceHistory) {
        const id = ph.id || null;
        const sku = String(ph.sku || '').trim().toUpperCase();
        const batchId = ph.batchId || ph.batch_id || null;
        const oldCost = parseFloat(ph.oldCost ?? ph.old_cost ?? 0);
        const newCost = parseFloat(ph.newCost ?? ph.new_cost ?? 0);
        const delta = parseFloat(ph.delta ?? 0);
        const pct = parseFloat(ph.pct ?? 0);
        const changeDate = ph.changeDate || ph.change_date || new Date().toLocaleDateString('es-ES');

        if (id) {
          await runSqlite(
            'INSERT INTO price_history (id, sku, batchId, oldCost, newCost, delta, pct, changeDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [id, sku, batchId, oldCost, newCost, delta, pct, changeDate]
          );
        } else {
          await runSqlite(
            'INSERT INTO price_history (sku, batchId, oldCost, newCost, delta, pct, changeDate) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [sku, batchId, oldCost, newCost, delta, pct, changeDate]
          );
        }
      }

      await runSqlite('COMMIT');
      return res.status(200).json({ success: true, message: 'Datos restaurados correctamente' });
    } catch (err) {
      await runSqlite('ROLLBACK').catch(() => {});
      console.error('Error restaurando base de datos (SQLite):', err);
      return res.status(500).json({ error: 'Error al procesar la restauración: ' + err.message });
    }
  }
});

// ==========================================
// HEALTH CHECKS
// ==========================================

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ==========================================
// 404 ESTRICTO PARA RUTAS /api/ NO REGISTRADAS
// ==========================================

app.all('/api/*', (req, res) => {
  res.status(404).json({ error: `La ruta de API '${req.method} ${req.originalUrl}' no existe.` });
});

// ==========================================
// SERVIR FRONTEND COMPILADO (SPA FALLBACK)
// ==========================================

const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// Redirige cualquier ruta de navegación al index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// ==========================================
// INICIO SEGURO DEL SERVIDOR
// ==========================================

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor AppG listo en http://0.0.0.0:${PORT}`);
});

server.on('error', (err) => {
  console.error('Error en el puerto de Express:', err);
});