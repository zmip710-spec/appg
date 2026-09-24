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
app.use(express.json({ limit: '50mb' }));

const DEFAULT_USER = {
  id: 1,
  name: 'admin-gg',
  username: 'admin-gg',
  email: 'admin@appg.com',
  role: 'admin',
  status: 'Activo'
};

// Función de seguridad: evita que la base de datos bloquee la app si tarda en responder
function safeQuery(query, params = []) {
  return new Promise((resolve) => {
    let isResolved = false;
    
    const timeout = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        resolve([]);
      }
    }, 2000);

    db.all(query, params, (err, rows) => {
      if (!isResolved) {
        isResolved = true;
        clearTimeout(timeout);
        resolve(err ? [] : (rows || []));
      }
    });
  });
}

// ==========================================
// AUTENTICACIÓN
// ==========================================

app.post('/api/auth/verify', (req, res) => {
  res.json({ success: true, user: DEFAULT_USER, token: 'local-token', ...DEFAULT_USER });
});

app.post('/api/auth/login', (req, res) => {
  res.json({ success: true, token: 'local-token', user: DEFAULT_USER, ...DEFAULT_USER });
});

// ==========================================
// ENDPOINTS DE DATOS (Estrictamente /api/)
// ==========================================

app.get('/api/stats', (req, res) => {
  res.json({ totalProducts: 0, totalBatches: 0, totalInventoryValue: 0, totalSales: 0 });
});

app.get('/api/inventory', async (req, res) => {
  res.json(await safeQuery('SELECT * FROM inventory ORDER BY id DESC'));
});

app.post('/api/inventory', (req, res) => {
  const { sku, name, brand, model, category, stock, unitCost, image } = req.body;
  const lastUpdated = new Date().toISOString();
  const sql = `INSERT INTO inventory (sku, name, brand, model, category, stock, unitCost, image, lastUpdated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  
  db.run(sql, [sku, name, brand || '', model || '', category || 'General', stock || 0, unitCost || 0, image || '', lastUpdated], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, sku, name, brand, model, category, stock, unitCost, image, lastUpdated });
  });
});

app.get('/api/batches', async (req, res) => {
  res.json(await safeQuery('SELECT * FROM batches ORDER BY importDate DESC'));
});

app.get('/api/batches/:id/items', async (req, res) => {
  res.json(await safeQuery('SELECT * FROM batch_items WHERE batchId = ?', [req.params.id]));
});

app.get('/api/batch-items', async (req, res) => {
  res.json(await safeQuery('SELECT * FROM batch_items ORDER BY id DESC'));
});

app.get('/api/users', async (req, res) => {
  const users = await safeQuery('SELECT * FROM users ORDER BY id DESC');
  res.json(users.length > 0 ? users : [DEFAULT_USER]);
});

app.get('/api/transactions', async (req, res) => {
  res.json(await safeQuery('SELECT * FROM transactions ORDER BY date DESC'));
});

app.get('/api/price-history', async (req, res) => {
  res.json(await safeQuery('SELECT * FROM price_history ORDER BY changeDate DESC'));
});

// Health check para arranque de Electron
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ==========================================
// SERVIR FRONTEND COMPILADO
// ==========================================
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// Redirige cualquier ruta web al React Router
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// ==========================================
// INICIO SEGURO DEL SERVIDOR
// ==========================================
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor AppG listo en http://0.0.0.0:${PORT}`);
});

// Evita que la aplicación colapse si el puerto se queda bloqueado por un proceso zombi
server.on('error', (err) => {
  console.error('Error en el puerto de Express (posible bloqueo):', err);
});