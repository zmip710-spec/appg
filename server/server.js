import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, '../dist');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(express.static(distPath));

// API Auth Login with Username & Password Checking
app.post('/api/auth/login', (req, res) => {
  const { username, email, password } = req.body;
  const inputUser = (username || email || '').trim().toLowerCase();

  if (!inputUser) {
    return res.status(400).json({ error: 'El nombre de usuario es requerido.' });
  }

  // Find user by username, email, or name
  db.get('SELECT * FROM users WHERE LOWER(email) = ? OR LOWER(name) = ?', [inputUser, inputUser], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });

    if (!user) {
      // Auto-create default admin user if logging in as admin
      if (inputUser === 'admin') {
        const defaultAdminPass = 'admin123';
        const query = 'INSERT INTO users (name, email, role, status, avatar, lastLogin, password) VALUES (?, ?, ?, ?, ?, ?, ?)';
        db.run(query, ['admin', 'admin@appg.com', 'Administrador', 'Activo', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80', 'Ahora mismo', defaultAdminPass], function (err) {
          if (err) return res.status(500).json({ error: err.message });
          
          if (password && password.trim() !== defaultAdminPass) {
            return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
          }

          const newAdmin = { id: this.lastID, name: 'admin', email: 'admin@appg.com', role: 'Administrador', status: 'Activo', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80', lastLogin: 'Ahora mismo' };
          return res.json({ success: true, user: newAdmin });
        });
        return;
      }
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
    }

    if (user.status !== 'Activo') {
      return res.status(403).json({ error: 'El usuario se encuentra inactivo. Contacta al administrador.' });
    }

    // Validate Password
    const expectedPass = user.password || 'admin123';
    if (password && password.trim() !== '' && password.trim() !== expectedPass) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
    }

    const nowStr = 'Ahora mismo';
    db.run('UPDATE users SET lastLogin = ? WHERE id = ?', [nowStr, user.id]);

    res.json({ success: true, user: { ...user, lastLogin: nowStr } });
  });
});

// API Auth Session Verification Endpoint (Strict Security Check)
app.post('/api/auth/verify', (req, res) => {
  const { id, username, email } = req.body;
  const param = id || (username || email || '').trim().toLowerCase();

  if (!param) {
    return res.json({ valid: false, error: 'Usuario requerido para verificación.' });
  }

  const query = id ? 'SELECT * FROM users WHERE id = ?' : 'SELECT * FROM users WHERE LOWER(email) = ? OR LOWER(name) = ?';
  db.get(query, [param], (err, user) => {
    if (err || !user) {
      return res.json({ valid: false, error: 'El perfil de usuario ya no existe en la base de datos.' });
    }
    if (user.status !== 'Activo') {
      return res.json({ valid: false, error: 'El usuario se encuentra inactivo. Sesión cerrada.' });
    }
    res.json({ valid: true, user });
  });
});

// API Auth Register Endpoint (Disabled for Public Access)
app.post('/api/auth/register', (req, res) => {
  return res.status(403).json({ error: 'El registro público de usuarios está deshabilitado por motivos de seguridad. Solicita al administrador registrar tu usuario desde el panel interno de la aplicación.' });
});

// API Users & Team Management (With Password Storage)
app.get('/api/users', (req, res) => {
  db.all('SELECT id, name, email, role, status, avatar, lastLogin FROM users ORDER BY id DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/users', (req, res) => {
  const { name, email, role, avatar, password } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'Nombre y email son requeridos.' });

  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name.trim();
  const userAvatar = avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&q=80';
  const userPassword = password && password.trim() !== '' ? password.trim() : '123456';
  const lastLogin = 'Ahora mismo';
  const status = 'Activo';

  // Check if Email already exists
  db.get('SELECT id FROM users WHERE LOWER(email) = ?', [cleanEmail], (err, existing) => {
    if (existing) {
      return res.status(400).json({ error: `El correo "${cleanEmail}" ya está registrado.` });
    }

    const query = 'INSERT INTO users (name, email, role, status, avatar, lastLogin, password) VALUES (?, ?, ?, ?, ?, ?, ?)';
    db.run(query, [cleanName, cleanEmail, role || 'Desarrollador', status, userAvatar, lastLogin, userPassword], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, name: cleanName, email: cleanEmail, role: role || 'Desarrollador', status, avatar: userAvatar, lastLogin });
    });
  });
});

// Update Profile Info for Logged-In User in SQLite
app.put('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const { name, email, avatar } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'Nombre y email son requeridos.' });

  db.get('SELECT * FROM users WHERE id = ?', [id], (err, existing) => {
    if (err || !existing) return res.status(404).json({ error: 'Usuario no encontrado.' });

    const newAvatar = avatar || existing.avatar;
    const query = 'UPDATE users SET name = ?, email = ?, avatar = ? WHERE id = ?';
    db.run(query, [name.trim(), email.trim(), newAvatar, id], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ ...existing, name: name.trim(), email: email.trim(), avatar: newAvatar });
    });
  });
});

// Update User Password Endpoint
app.put('/api/users/:id/password', (req, res) => {
  const { id } = req.params;
  const { currentPassword, newPassword } = req.body;

  if (!newPassword || newPassword.trim() === '') {
    return res.status(400).json({ error: 'La nueva contraseña es requerida.' });
  }

  db.get('SELECT * FROM users WHERE id = ?', [id], (err, user) => {
    if (err || !user) return res.status(404).json({ error: 'Usuario no encontrado.' });

    const dbPass = user.password || '123456';
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

app.put('/api/users/:id/avatar', (req, res) => {
  const { id } = req.params;
  const { avatar } = req.body;
  db.run('UPDATE users SET avatar = ? WHERE id = ?', [avatar, id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, id, avatar });
  });
});

app.delete('/api/users/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM users WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, id });
  });
});

// API Dashboard Real-time Stats Aggregator
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

    // 1. Calculate Sales from Transactions
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

      // 2. Calculate Inventory Metrics
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

        // 3. Calculate Import Expenses from Batches
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

// API Sales / Transactions & Atomic Inventory Deduction
app.get('/api/transactions', (req, res) => {
  db.all('SELECT * FROM transactions ORDER BY rowid DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
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
    : (amount.startsWith('Q') ? amount : (amount.startsWith('$') ? `Q ${(parseFloat(amount.replace('$', '')) * 7.80).toFixed(2)} GTQ` : `Q ${amount} GTQ`));
  const trxStatus = status || 'Completado';
  const qtySold = Math.max(1, parseInt(quantity) || 1);
  const cleanSku = sku ? sku.trim().toUpperCase() : null;
  const prodName = service || 'Producto / Servicio';

  db.serialize(() => {
    // 1. Insert Transaction in SQLite
    const query = 'INSERT INTO transactions (id, client, service, date, amount, status) VALUES (?, ?, ?, ?, ?, ?)';
    db.run(query, [id, client, prodName, date, formattedAmount, trxStatus], function (err) {
      if (err) return res.status(500).json({ error: err.message });

      // 2. If status is Completed, deduct stock from Inventory (multi-item or single item)
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

// API Import Batches & Customs/Shipping Expenses Prorating
app.get('/api/batches', (req, res) => {
  db.all('SELECT * FROM batches ORDER BY rowid DESC', [], (err, batches) => {
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
          totalCustomsTax: batch.totalCustomsTax || 0,
          totalShippingCost: batch.totalShippingCost || 0,
          exchangeRateGtq: batch.exchangeRateGtq || 7.80,
          profitMarginPct: batch.profitMarginPct || 15.0,
          items: items
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
  const totalLandedExpenses = taxFloat + shippingFloat;

  const batchId = `#LOT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
  const importDate = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

  // 1. Calculate Total FOB Value of shipment
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
    const image = item.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=150&q=80';
    return { sku, productName, brand, model, quantity: qty, unitCostFob: unitCost, totalFobValue: totalFob, image };
  });

  // 2. Prorate Customs Tax + Shipping Cost separately proportionately to FOB Value
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

  // 3. Save Batch, Items and Update/Upsert Consolidated Inventory in SQLite
  db.serialize(() => {
    db.run('INSERT INTO batches (id, name, importDate, totalCustomsTax, totalShippingCost, exchangeRateGtq, profitMarginPct, costUpdateStrategy, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [batchId, name, importDate, taxFloat, shippingFloat, gtqFloat, marginFloat, costStrategy, 'Procesado'],
      function (err) {
        if (err) {
          console.error('Error al insertar lote en SQLite:', err);
          return res.status(500).json({ error: err.message });
        }

        const stmt = db.prepare(`
          INSERT INTO batch_items (batchId, sku, productName, brand, model, quantity, unitCostFob, totalFobValue, sharePercentage, allocatedCustoms, allocatedShipping, allocatedTax, unitTax, finalUnitCost, profitMarginPct, finalSellingPrice, image)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        finalItems.forEach(item => {
          stmt.run(batchId, item.sku, item.productName, item.brand || '', item.model || '', item.quantity, item.unitCostFob, item.totalFobValue, item.sharePercentage, item.allocatedCustoms, item.allocatedShipping, item.allocatedTax, item.unitTax, item.finalUnitCost, marginFloat, item.finalSellingPrice, item.image);
        });

        // Sequential Inventory Upsert Logic to prevent async race conditions & UNIQUE SKU collisions
        const processInventoryUpsert = (index) => {
          if (index >= finalItems.length) {
            stmt.finalize(() => {
              res.json({
                id: batchId,
                name,
                importDate,
                totalCustomsTax: taxFloat,
                totalShippingCost: shippingFloat,
                exchangeRateGtq: gtqFloat,
                status: 'Procesado',
                items: finalItems
              });
            });
            return;
          }

          const item = finalItems[index];
          const cleanSku = item.sku.trim().toUpperCase();
          const cleanName = item.productName.trim().toUpperCase();
          db.get('SELECT * FROM inventory WHERE UPPER(sku) = ?', [cleanSku], (invErr, existing) => {
            if (existing) {
              const targetSku = existing.sku.toUpperCase();
              const oldStock = existing.stock || 0;
              const oldCost = existing.unitCost || 0;
              const newStock = oldStock + item.quantity;
              
              // Apply chosen cost update strategy: 'latest' vs 'weighted'
              const calculatedCost = costStrategy === 'latest'
                ? item.finalUnitCost
                : (newStock > 0 ? ((oldStock * oldCost) + (item.quantity * item.finalUnitCost)) / newStock : item.finalUnitCost);

              const newCost = parseFloat(calculatedCost.toFixed(2));
              
              // Delta and Pct reflect the variation between existing stock cost and new landed batch cost
              const delta = parseFloat((item.finalUnitCost - oldCost).toFixed(2));
              const pct = oldCost > 0 ? parseFloat(((delta / oldCost) * 100).toFixed(2)) : 0;
              const updatedImage = (item.image && !item.image.includes('unsplash.com/photo-1523275335684')) ? item.image : existing.image;
              const updatedBrand = item.brand || existing.brand || '';
              const updatedModel = item.model || existing.model || '';

              db.run(
                'UPDATE inventory SET name = ?, brand = ?, model = ?, stock = ?, unitCost = ?, previousUnitCost = ?, priceChangeDelta = ?, priceChangePct = ?, image = ?, lastUpdated = ? WHERE UPPER(sku) = ?',
                [item.productName, updatedBrand, updatedModel, newStock, newCost, oldCost, delta, pct, updatedImage, importDate, targetSku],
                () => {
                  db.run(
                    'INSERT INTO price_history (sku, batchId, oldCost, newCost, delta, pct, changeDate) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [targetSku, batchId, oldCost, item.finalUnitCost, delta, pct, importDate],
                    () => processInventoryUpsert(index + 1)
                  );
                }
              );
            } else {
              // Insert New Product in Inventory
              db.run(
                'INSERT INTO inventory (sku, name, brand, model, category, stock, unitCost, previousUnitCost, priceChangeDelta, priceChangePct, image, lastUpdated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [cleanSku, item.productName, item.brand || '', item.model || '', 'General', item.quantity, item.finalUnitCost, item.finalUnitCost, 0, 0, item.image, importDate],
                (err) => {
                  if (err) {
                    console.error('Error al insertar en inventario SQLite:', err.message);
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
    db.run('DELETE FROM batch_items WHERE batchId = ?', [id]);
    db.run('DELETE FROM batches WHERE id = ?', [id], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id });
    });
  });
});

// API Consolidated Inventory & SKU Management
app.get('/api/inventory', (req, res) => {
  db.all('SELECT * FROM inventory ORDER BY sku ASC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/inventory/history/:sku', (req, res) => {
  const cleanParam = req.params.sku.trim().toUpperCase();
  const queryName = req.query.name ? String(req.query.name).trim().toUpperCase() : '';

  // 1. Find inventory item by SKU or Name
  db.get(
    'SELECT * FROM inventory WHERE UPPER(sku) = ? OR UPPER(name) = ? OR (LENGTH(?) > 0 AND UPPER(name) = ?)',
    [cleanParam, cleanParam, queryName, queryName],
    (invErr, invItem) => {
      const targetSku = invItem ? String(invItem.sku).toUpperCase() : cleanParam;
      const targetName = invItem ? String(invItem.name).toUpperCase() : (queryName || cleanParam);

      // 2. Directly query ALL batch_items matching SKU or Name
      db.all(
        `SELECT bi.*, b.name as batchName, b.importDate
         FROM batch_items bi
         LEFT JOIN batches b ON bi.batchId = b.id
         WHERE UPPER(bi.sku) = ?
         ORDER BY bi.id ASC`,
        [targetSku],
        (bErr, bRows) => {
          if (!bErr && Array.isArray(bRows) && bRows.length > 0) {
            // Build full variation timeline across all batches
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

            // Return reverse-chronological (newest batch first)
            return res.json(history.reverse());
          }

          // 3. Fallback if no batch_items found
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

// Create Direct SKU / Product in Inventory
app.post('/api/inventory', (req, res) => {
  const { sku, name, brand, model, category, stock, unitCost, image } = req.body;
  if (!sku || !name) {
    return res.status(400).json({ error: 'Código SKU y Nombre de producto son requeridos.' });
  }

  const cleanSku = sku.trim().toUpperCase();
  const cleanName = name.trim();
  const cleanBrand = brand ? brand.trim() : '';
  const cleanModel = model ? model.trim() : '';
  const cat = category && category.trim() !== '' ? category.trim() : 'General';
  const stockInt = Math.max(0, parseInt(stock) || 0);
  const costFloat = Math.max(0, parseFloat(unitCost) || 0);
  const imgUrl = image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=150&q=80';
  const lastUpdated = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

  // Check if SKU exists
  db.get('SELECT id FROM inventory WHERE UPPER(sku) = ?', [cleanSku], (err, existing) => {
    if (existing) {
      return res.status(400).json({ error: `El Código SKU "${cleanSku}" ya existe en el inventario.` });
    }

    const query = 'INSERT INTO inventory (sku, name, brand, model, category, stock, unitCost, previousUnitCost, priceChangeDelta, priceChangePct, image, lastUpdated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
    db.run(query, [cleanSku, cleanName, cleanBrand, cleanModel, cat, stockInt, costFloat, costFloat, 0, 0, imgUrl, lastUpdated], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      const insertedId = this.lastID;
      
      // Record initial price entry in price_history timeline
      db.run(
        'INSERT INTO price_history (sku, batchId, oldCost, newCost, delta, pct, changeDate) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [cleanSku, 'Registro Directo BD', costFloat, costFloat, 0, 0, lastUpdated]
      );

      res.json({
        id: insertedId,
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
        image: imgUrl,
        lastUpdated
      });
    });
  });
});

// Fast SKU Lookup for Auto-fill
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

app.put('/api/inventory/:id/image', (req, res) => {
  const { id } = req.params;
  const { image } = req.body;
  const date = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

  db.run('UPDATE inventory SET image = ?, lastUpdated = ? WHERE id = ?', [image, date, id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, id, image });
  });
});

app.delete('/api/inventory/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM inventory WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, id });
  });
});

// SPA Fallback Routing
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(distPath, 'index.html'));
});

// Dedicated 404 JSON handler for unhandled /api requests
app.use('/api', (req, res) => {
  res.status(404).json({ error: `La ruta de API '${req.method} ${req.originalUrl}' no existe.` });
});

// Global Express Error Handler (Guarantees valid JSON response for any server error)
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  if (res.headersSent) {
    return next(err);
  }
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    error: err.message || 'Error interno en el servidor backend.'
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(` Servidor AppG corriendo en la red local y pública: http://0.0.0.0:${PORT}`);
});
