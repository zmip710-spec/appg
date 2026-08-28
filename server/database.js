import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error al conectar con SQLite:', err.message);
  } else {
    console.log('Conectado exitosamente a la base de datos SQLite en:', dbPath);
  }
});

// Inicializar tablas y datos semilla
db.serialize(() => {
  // Tabla Usuarios
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL,
      status TEXT DEFAULT 'Activo',
      avatar TEXT,
      lastLogin TEXT,
      password TEXT DEFAULT '123456'
    )
  `);

  // Tabla Transacciones
  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      client TEXT NOT NULL,
      service TEXT NOT NULL,
      date TEXT NOT NULL,
      amount TEXT NOT NULL,
      status TEXT NOT NULL
    )
  `);

  // Tabla Lotes de Importación
  db.run(`
    CREATE TABLE IF NOT EXISTS batches (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      importDate TEXT NOT NULL,
      totalCustomsTax REAL NOT NULL DEFAULT 0.0,
      totalShippingCost REAL NOT NULL DEFAULT 0.0,
      status TEXT DEFAULT 'Procesado'
    )
  `);

  // Tabla Productos por Lote
  db.run(`
    CREATE TABLE IF NOT EXISTS batch_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batchId TEXT NOT NULL,
      sku TEXT NOT NULL DEFAULT 'PROD-001',
      productName TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unitCostFob REAL NOT NULL,
      totalFobValue REAL NOT NULL,
      sharePercentage REAL NOT NULL,
      allocatedTax REAL NOT NULL,
      unitTax REAL NOT NULL,
      finalUnitCost REAL NOT NULL,
      image TEXT,
      FOREIGN KEY (batchId) REFERENCES batches (id) ON DELETE CASCADE
    )
  `);

  // Tabla Inventario Consolidado por SKU
  db.run(`
    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sku TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category TEXT DEFAULT 'General',
      stock INTEGER NOT NULL DEFAULT 0,
      unitCost REAL NOT NULL DEFAULT 0.0,
      image TEXT,
      lastUpdated TEXT NOT NULL
    )
  `);

  // Tabla Historial de Variaciones de Precios por SKU
  db.run(`
    CREATE TABLE IF NOT EXISTS price_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sku TEXT NOT NULL,
      batchId TEXT,
      oldCost REAL NOT NULL,
      newCost REAL NOT NULL,
      delta REAL NOT NULL,
      pct REAL NOT NULL,
      changeDate TEXT NOT NULL
    )
  `);

  // Migraciones / Alteraciones de Esquema (Garantizan que todas las columnas existan en la BD existente)
  db.run("ALTER TABLE batches ADD COLUMN totalShippingCost REAL DEFAULT 0.0", () => {});
  db.run("ALTER TABLE batches ADD COLUMN exchangeRateGtq REAL DEFAULT 7.80", () => {});
  db.run("ALTER TABLE batches ADD COLUMN profitMarginPct REAL DEFAULT 15.0", () => {});
  db.run("ALTER TABLE batches ADD COLUMN costUpdateStrategy TEXT DEFAULT 'weighted'", () => {});
  db.run("ALTER TABLE batch_items ADD COLUMN sku TEXT DEFAULT 'PROD-001'", () => {});
  db.run("ALTER TABLE batch_items ADD COLUMN allocatedCustoms REAL DEFAULT 0.0", () => {});
  db.run("ALTER TABLE batch_items ADD COLUMN allocatedShipping REAL DEFAULT 0.0", () => {});
  db.run("ALTER TABLE batch_items ADD COLUMN profitMarginPct REAL DEFAULT 15.0", () => {});
  db.run("ALTER TABLE batch_items ADD COLUMN finalSellingPrice REAL DEFAULT 0.0", () => {});
  db.run("ALTER TABLE batch_items ADD COLUMN image TEXT", () => {});
  db.run("ALTER TABLE inventory ADD COLUMN image TEXT", () => {});
  db.run("ALTER TABLE inventory ADD COLUMN previousUnitCost REAL DEFAULT 0.0", () => {});
  db.run("ALTER TABLE inventory ADD COLUMN priceChangeDelta REAL DEFAULT 0.0", () => {});
  db.run("ALTER TABLE inventory ADD COLUMN priceChangePct REAL DEFAULT 0.0", () => {});
  db.run("ALTER TABLE users ADD COLUMN password TEXT DEFAULT '123456'", () => {});

  // Semilla de usuarios si la tabla está vacía
  db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
    if (row && row.count === 0) {
      const stmt = db.prepare('INSERT INTO users (name, email, role, status, avatar, lastLogin, password) VALUES (?, ?, ?, ?, ?, ?, ?)');
      stmt.run('Sofía Ramírez', 'sofia@nexus.io', 'Administrador', 'Activo', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80', 'Hace 5 min', '123456');
      stmt.run('Alejandro Morales', 'alejandro@nexus.io', 'Desarrollador', 'Activo', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80', 'Hace 2 horas', '123456');
      stmt.run('Camila Torres', 'camila@nexus.io', 'Diseñadora UI/UX', 'Activo', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80', 'Ayer', '123456');
      stmt.run('Mateo Silva', 'mateo@nexus.io', 'Soporte Técnico', 'Inactivo', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&q=80', 'Hace 5 días', '123456');
      stmt.run('Valeria Ortiz', 'valeria@nexus.io', 'Marketing Manager', 'Activo', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&q=80', 'Hace 1 hora', '123456');
      stmt.finalize();
    }
  });

  // Semilla de transacciones si la tabla está vacía
  db.get('SELECT COUNT(*) as count FROM transactions', (err, row) => {
    if (row && row.count === 0) {
      const stmt = db.prepare('INSERT INTO transactions (id, client, service, date, amount, status) VALUES (?, ?, ?, ?, ?, ?)');
      stmt.run('#TRX-9482', 'Empresa Alpha S.A.', 'Suscripción Enterprise', '26 Ago 2026', '$4,200.00', 'Completado');
      stmt.run('#TRX-9481', 'Carlos Mendoza', 'Plan Pro Anual', '26 Ago 2026', '$299.00', 'Completado');
      stmt.run('#TRX-9480', 'Lucía Fernández', 'Consultoría Cloud', '25 Ago 2026', '$1,500.00', 'Pendiente');
      stmt.run('#TRX-9479', 'Tech Solutions Ltd.', 'Licencias Adicionales', '25 Ago 2026', '$850.00', 'Completado');
      stmt.finalize();
    }
  });

  // Semilla de Lote de Importación e Inventario
  db.get('SELECT COUNT(*) as count FROM batches', (err, row) => {
    if (row && row.count === 0) {
      const batchId = '#LOT-2026-01';
      db.run('INSERT INTO batches (id, name, importDate, totalCustomsTax, totalShippingCost, status) VALUES (?, ?, ?, ?, ?, ?)',
        [batchId, 'Lote Ropa & Accesorios Agosto', '26 Ago 2026', 50.0, 100.0, 'Procesado']
      );

      const stmt = db.prepare(`
        INSERT INTO batch_items (batchId, sku, productName, quantity, unitCostFob, totalFobValue, sharePercentage, allocatedTax, unitTax, finalUnitCost, image)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(batchId, 'PROD-001', 'Camisetas Algodón', 10, 10.0, 100.0, 33.33, 50.0, 5.0, 15.0, 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=150&q=80');
      stmt.run(batchId, 'PROD-002', 'Gorras Deportivas', 20, 5.0, 100.0, 33.33, 50.0, 2.5, 7.5, 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=150&q=80');
      stmt.run(batchId, 'PROD-003', 'Chaquetas Impermeables', 5, 20.0, 100.0, 33.34, 50.0, 10.0, 30.0, 'https://images.unsplash.com/photo-1548883354-7622d03aca27?w=150&q=80');
      stmt.finalize();
    }
  });

  // Semilla de Inventario Consolidado con Imágenes
  db.get('SELECT COUNT(*) as count FROM inventory', (err, row) => {
    if (row && row.count === 0) {
      const stmt = db.prepare('INSERT INTO inventory (sku, name, category, stock, unitCost, image, lastUpdated) VALUES (?, ?, ?, ?, ?, ?, ?)');
      stmt.run('PROD-001', 'Camisetas Algodón', 'Textil', 10, 15.0, 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=150&q=80', '26 Ago 2026');
      stmt.run('PROD-002', 'Gorras Deportivas', 'Accesorios', 20, 7.5, 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=150&q=80', '26 Ago 2026');
      stmt.run('PROD-003', 'Chaquetas Impermeables', 'Ropa Exterior', 5, 30.0, 'https://images.unsplash.com/photo-1548883354-7622d03aca27?w=150&q=80', '26 Ago 2026');
      stmt.finalize();
    }
  });
});

export default db;
