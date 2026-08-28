import pg from 'pg';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'database.sqlite');

const isPg = Boolean(process.env.DATABASE_URL);

let pgPool = null;
let sqliteDb = null;

function convertSql(sql) {
  let paramIndex = 1;
  return sql.replace(/\?/g, () => `$${paramIndex++}`);
}

if (isPg) {
  pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
  });
  console.log('🐘 Conectado exitosamente a PostgreSQL usando process.env.DATABASE_URL');
} else {
  sqliteDb = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error al conectar con SQLite:', err.message);
    } else {
      console.log('Conectado exitosamente a la base de datos SQLite en:', dbPath);
    }
  });
}

// Inicializar tablas en PostgreSQL cuando DATABASE_URL esté presente
async function initPgTables() {
  if (!pgPool) return;
  try {
    // 1. Usuarios
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        role VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'Activo',
        avatar TEXT,
        lastLogin VARCHAR(255),
        password VARCHAR(255) DEFAULT '123456'
      );
    `);

    // 2. Transacciones
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id VARCHAR(255) PRIMARY KEY,
        client VARCHAR(255) NOT NULL,
        service TEXT NOT NULL,
        date VARCHAR(255) NOT NULL,
        amount VARCHAR(255) NOT NULL,
        status VARCHAR(255) NOT NULL
      );
    `);

    // 3. Lotes de Importación
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS batches (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        importDate VARCHAR(255) NOT NULL,
        totalCustomsTax NUMERIC NOT NULL DEFAULT 0.0,
        totalShippingCost NUMERIC NOT NULL DEFAULT 0.0,
        exchangeRateGtq NUMERIC DEFAULT 7.80,
        profitMarginPct NUMERIC DEFAULT 15.0,
        costUpdateStrategy VARCHAR(50) DEFAULT 'weighted',
        status VARCHAR(255) DEFAULT 'Procesado'
      );
    `);

    // 4. Productos por Lote
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS batch_items (
        id SERIAL PRIMARY KEY,
        batchId VARCHAR(255) NOT NULL,
        sku VARCHAR(255) NOT NULL DEFAULT 'PROD-001',
        productName VARCHAR(255) NOT NULL,
        quantity INTEGER NOT NULL,
        unitCostFob NUMERIC NOT NULL,
        totalFobValue NUMERIC NOT NULL,
        sharePercentage NUMERIC NOT NULL,
        allocatedTax NUMERIC NOT NULL,
        unitTax NUMERIC NOT NULL,
        finalUnitCost NUMERIC NOT NULL,
        allocatedCustoms NUMERIC DEFAULT 0.0,
        allocatedShipping NUMERIC DEFAULT 0.0,
        profitMarginPct NUMERIC DEFAULT 15.0,
        finalSellingPrice NUMERIC DEFAULT 0.0,
        image TEXT
      );
    `);

    // 5. Inventario Consolidado por SKU
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS inventory (
        id SERIAL PRIMARY KEY,
        sku VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(255) DEFAULT 'General',
        stock INTEGER NOT NULL DEFAULT 0,
        unitCost NUMERIC NOT NULL DEFAULT 0.0,
        previousUnitCost NUMERIC DEFAULT 0.0,
        priceChangeDelta NUMERIC DEFAULT 0.0,
        priceChangePct NUMERIC DEFAULT 0.0,
        image TEXT,
        lastUpdated VARCHAR(255) NOT NULL
      );
    `);

    // 6. Historial de Variaciones de Precios
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS price_history (
        id SERIAL PRIMARY KEY,
        sku VARCHAR(255) NOT NULL,
        batchId VARCHAR(255),
        oldCost NUMERIC NOT NULL,
        newCost NUMERIC NOT NULL,
        delta NUMERIC NOT NULL,
        pct NUMERIC NOT NULL,
        changeDate VARCHAR(255) NOT NULL
      );
    `);

    // Semilla de usuarios si la tabla está vacía
    const usersCount = await pgPool.query('SELECT COUNT(*) as count FROM users');
    if (parseInt(usersCount.rows[0].count) === 0) {
      await pgPool.query(`
        INSERT INTO users (name, email, role, status, avatar, lastLogin, password) VALUES
        ('Sofía Ramírez', 'sofia@nexus.io', 'Administrador', 'Activo', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80', 'Hace 5 min', '123456'),
        ('Alejandro Morales', 'alejandro@nexus.io', 'Desarrollador', 'Activo', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80', 'Hace 2 horas', '123456'),
        ('Camila Torres', 'camila@nexus.io', 'Diseñadora UI/UX', 'Activo', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80', 'Ayer', '123456');
      `);
    }

    // Semilla de inventario si está vacío
    const invCount = await pgPool.query('SELECT COUNT(*) as count FROM inventory');
    if (parseInt(invCount.rows[0].count) === 0) {
      await pgPool.query(`
        INSERT INTO inventory (sku, name, category, stock, unitCost, image, lastUpdated) VALUES
        ('PROD-001', 'Camisetas Algodón', 'Textil', 10, 15.0, 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=150&q=80', '26 Ago 2026'),
        ('PROD-002', 'Gorras Deportivas', 'Accesorios', 20, 7.5, 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=150&q=80', '26 Ago 2026');
      `);
    }

    console.log('✅ Tablas y esquema de PostgreSQL inicializados correctamente.');
  } catch (err) {
    console.error('Error al inicializar las tablas en PostgreSQL:', err);
  }
}

if (isPg) {
  initPgTables();
} else {
  // Inicialización de SQLite Local
  sqliteDb.serialize(() => {
    sqliteDb.run(`
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

    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        client TEXT NOT NULL,
        service TEXT NOT NULL,
        date TEXT NOT NULL,
        amount TEXT NOT NULL,
        status TEXT NOT NULL
      )
    `);

    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS batches (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        importDate TEXT NOT NULL,
        totalCustomsTax REAL NOT NULL DEFAULT 0.0,
        totalShippingCost REAL NOT NULL DEFAULT 0.0,
        status TEXT DEFAULT 'Procesado'
      )
    `);

    sqliteDb.run(`
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

    sqliteDb.run(`
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

    sqliteDb.run(`
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

    sqliteDb.run("ALTER TABLE batches ADD COLUMN totalShippingCost REAL DEFAULT 0.0", () => {});
    sqliteDb.run("ALTER TABLE batches ADD COLUMN exchangeRateGtq REAL DEFAULT 7.80", () => {});
    sqliteDb.run("ALTER TABLE batches ADD COLUMN profitMarginPct REAL DEFAULT 15.0", () => {});
    sqliteDb.run("ALTER TABLE batches ADD COLUMN costUpdateStrategy TEXT DEFAULT 'weighted'", () => {});
    sqliteDb.run("ALTER TABLE batch_items ADD COLUMN sku TEXT DEFAULT 'PROD-001'", () => {});
    sqliteDb.run("ALTER TABLE batch_items ADD COLUMN allocatedCustoms REAL DEFAULT 0.0", () => {});
    sqliteDb.run("ALTER TABLE batch_items ADD COLUMN allocatedShipping REAL DEFAULT 0.0", () => {});
    sqliteDb.run("ALTER TABLE batch_items ADD COLUMN profitMarginPct REAL DEFAULT 15.0", () => {});
    sqliteDb.run("ALTER TABLE batch_items ADD COLUMN finalSellingPrice REAL DEFAULT 0.0", () => {});
    sqliteDb.run("ALTER TABLE batch_items ADD COLUMN image TEXT", () => {});
    sqliteDb.run("ALTER TABLE inventory ADD COLUMN image TEXT", () => {});
    sqliteDb.run("ALTER TABLE inventory ADD COLUMN previousUnitCost REAL DEFAULT 0.0", () => {});
    sqliteDb.run("ALTER TABLE inventory ADD COLUMN priceChangeDelta REAL DEFAULT 0.0", () => {});
    sqliteDb.run("ALTER TABLE inventory ADD COLUMN priceChangePct REAL DEFAULT 0.0", () => {});
    sqliteDb.run("ALTER TABLE users ADD COLUMN password TEXT DEFAULT '123456'", () => {});
  });
}

// Adaptador unificado para PostgreSQL / SQLite
const db = {
  isPg,
  all: function (sql, params, cb) {
    if (typeof params === 'function') {
      cb = params;
      params = [];
    }
    params = params || [];

    if (isPg) {
      const pgSql = convertSql(sql).replace(/ORDER BY rowid DESC/gi, 'ORDER BY id DESC');
      pgPool.query(pgSql, params)
        .then(res => {
          const rows = res.rows.map(row => {
            const formatted = { ...row };
            for (const k in formatted) {
              if (typeof formatted[k] === 'string' && !isNaN(formatted[k]) && formatted[k].trim() !== '' && !k.toLowerCase().includes('date') && !k.toLowerCase().includes('name') && !k.toLowerCase().includes('sku') && !k.toLowerCase().includes('id')) {
                formatted[k] = parseFloat(formatted[k]);
              }
            }
            return formatted;
          });
          if (cb) cb(null, rows);
        })
        .catch(err => {
          if (cb) cb(err, []);
        });
    } else {
      sqliteDb.all(sql, params, cb);
    }
  },

  get: function (sql, params, cb) {
    if (typeof params === 'function') {
      cb = params;
      params = [];
    }
    params = params || [];

    if (isPg) {
      const pgSql = convertSql(sql);
      pgPool.query(pgSql, params)
        .then(res => {
          const row = res.rows[0] || null;
          if (row) {
            for (const k in row) {
              if (typeof row[k] === 'string' && !isNaN(row[k]) && row[k].trim() !== '' && !k.toLowerCase().includes('date') && !k.toLowerCase().includes('name') && !k.toLowerCase().includes('sku') && !k.toLowerCase().includes('id')) {
                row[k] = parseFloat(row[k]);
              }
            }
          }
          if (cb) cb(null, row);
        })
        .catch(err => {
          if (cb) cb(err, null);
        });
    } else {
      sqliteDb.get(sql, params, cb);
    }
  },

  run: function (sql, params, cb) {
    if (typeof params === 'function') {
      cb = params;
      params = [];
    }
    params = params || [];

    if (isPg) {
      let pgSql = convertSql(sql);
      if (pgSql.trim().toUpperCase().startsWith('INSERT') && !pgSql.toUpperCase().includes('RETURNING')) {
        pgSql += ' RETURNING id';
      }
      pgPool.query(pgSql, params)
        .then(res => {
          const lastID = res.rows && res.rows[0] && res.rows[0].id ? res.rows[0].id : 1;
          if (cb) cb.call({ lastID, changes: res.rowCount }, null);
        })
        .catch(err => {
          if (cb) cb.call({ lastID: 0, changes: 0 }, err);
        });
    } else {
      sqliteDb.run(sql, params, cb);
    }
  },

  serialize: function (fn) {
    if (isPg) {
      if (fn) fn();
    } else {
      sqliteDb.serialize(fn);
    }
  },

  prepare: function (sql) {
    if (isPg) {
      const pgSql = convertSql(sql);
      return {
        run: function (...args) {
          let cb = null;
          if (typeof args[args.length - 1] === 'function') {
            cb = args.pop();
          }
          pgPool.query(pgSql, args)
            .then(res => {
              if (cb) cb(null);
            })
            .catch(err => {
              if (cb) cb(err);
            });
        },
        finalize: function () {}
      };
    } else {
      return sqliteDb.prepare(sql);
    }
  }
};

export default db;
