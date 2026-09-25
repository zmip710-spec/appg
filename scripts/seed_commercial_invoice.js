import pg from 'pg';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const databaseUrl = process.env.DATABASE_URL;
const useSqlite = process.argv.includes('--sqlite');

if (!databaseUrl && !useSqlite) {
  console.error('\n❌ ERROR: La variable de entorno DATABASE_URL no está definida.');
  console.error('👉 Para conectar con PostgreSQL de Neon:');
  console.error('   1. Configura DATABASE_URL en tu archivo .env o en el entorno del sistema:');
  console.error('      DATABASE_URL=postgresql://usuario:password@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require');
  console.error('   2. O ejecuta en PowerShell:');
  console.error('      $env:DATABASE_URL="tu_url_neon"; node scripts/seed_commercial_invoice.js\n');
  console.error('💡 Para poblar la base de datos local SQLite para pruebas inmediatas:');
  console.error('   node scripts/seed_commercial_invoice.js --sqlite\n');
  process.exit(1);
}

const pool = databaseUrl ? new Pool({
  connectionString: databaseUrl,
  ssl: databaseUrl.includes('localhost') ? false : { rejectUnauthorized: false }
}) : null;

const EXCHANGE_RATE = 7.80;
const PROFIT_MARGIN_PCT = 15.0;
const SHIPPING_USD = 260.00;
const CUSTOMS_GTQ = 6323.00;
const CUSTOMS_USD = Number((CUSTOMS_GTQ / EXCHANGE_RATE).toFixed(2)); // 810.64

const items = [
  { name: "Pantalla", brand: "Samsung", model: "A16 4G/5G/A17 4G/5G/A26 5G", quality: "INCELL", qty: 5, fob: 6.60 },
  { name: "Pantalla Con Marco", brand: "Samsung", model: "A16 4G", quality: "INCELL", qty: 15, fob: 7.50 },
  { name: "Pantalla Con Marco", brand: "Samsung", model: "A32 4G", quality: "INCELL", qty: 2, fob: 7.10 },
  { name: "Pantalla Con Marco", brand: "Samsung", model: "A15", quality: "INCELL", qty: 15, fob: 7.10 },
  { name: "Pantalla Con Marco", brand: "Samsung", model: "A25", quality: "OLED Big 6.52", qty: 2, fob: 25.90 },
  { name: "Pantalla Con Marco", brand: "Samsung", model: "A32 4g", quality: "OLED Big", qty: 2, fob: 20.30 },
  { name: "Pantalla Con Marco", brand: "Samsung", model: "A35", quality: "OLED Big 6.67", qty: 2, fob: 24.20 },
  { name: "Pantalla Con Marco", brand: "Samsung", model: "Z Flip 7", quality: "Original", qty: 1, fob: 249.00 },
  { name: "Pantalla", brand: "Samsung", model: "A03S/A02S/A04E", quality: "Original", qty: 10, fob: 5.10 },
  { name: "Pantalla", brand: "Samsung", model: "A05", quality: "Original", qty: 15, fob: 5.40 },
  { name: "Pantalla", brand: "Samsung", model: "A05s", quality: "Original", qty: 10, fob: 6.20 },
  { name: "Pantalla", brand: "Samsung", model: "A06 4G", quality: "Original", qty: 15, fob: 5.40 },
  { name: "Pantalla", brand: "Samsung", model: "A20S", quality: "Original", qty: 3, fob: 5.50 },
  { name: "Pantalla", brand: "Samsung", model: "A22 5G", quality: "Original", qty: 5, fob: 6.10 },
  { name: "Pantalla", brand: "Honor", model: "Honor 90 Lite", quality: "Original", qty: 5, fob: 8.90 },
  { name: "Pantalla", brand: "Honor", model: "X5B/X5B Plus/X5 Plus/X6A/X6A Plus", quality: "Original", qty: 10, fob: 5.30 },
  { name: "Pantalla", brand: "Honor", model: "X5C", quality: "Original", qty: 10, fob: 6.20 },
  { name: "Pantalla", brand: "Honor", model: "X6B", quality: "Original", qty: 10, fob: 5.30 },
  { name: "Pantalla", brand: "Honor", model: "X6C", quality: "Original", qty: 10, fob: 5.80 },
  { name: "Pantalla", brand: "Moto", model: "G35", quality: "Original", qty: 2, fob: 6.00 },
  { name: "Pantalla", brand: "Motorola", model: "G06", quality: "Original", qty: 10, fob: 6.20 },
  { name: "Pantalla", brand: "Redmi", model: "Redmi A3", quality: "Original", qty: 5, fob: 5.30 },
  { name: "Pantalla", brand: "Redmi", model: "Redmi A5", quality: "Original", qty: 5, fob: 5.60 },
  { name: "Pantalla", brand: "Tecno", model: "Go 1", quality: "Original", qty: 10, fob: 5.30 },
  { name: "Pantalla", brand: "Zte", model: "A35", quality: "Original", qty: 10, fob: 6.70 },
  { name: "Pantalla", brand: "ZTE", model: "A36", quality: "Original", qty: 10, fob: 7.50 },
  { name: "Pantalla", brand: "Samsung", model: "A13 4G/A23 4G/A23 5G", quality: "Original", qty: 10, fob: 5.80 },
  { name: "Pantalla", brand: "Samsung", model: "A04S/A13 5G", quality: "Original", qty: 10, fob: 5.10 },
  { name: "Pantalla", brand: "Samsung", model: "A12/A02/A32 5G", quality: "Original", qty: 6, fob: 5.10 },
  { name: "Pantalla", brand: "Samsung", model: "A21S", quality: "Original", qty: 6, fob: 7.10 },
  { name: "Pantalla", brand: "Tecno/Infinix", model: "Spark 30C", quality: "Original", qty: 5, fob: 5.40 },
  { name: "Pantalla", brand: "Iphone", model: "13", quality: "OLED SOFT", qty: 1, fob: 33.00 },
  { name: "Charging Flex", brand: "Samsung", model: "A05", quality: "Original", qty: 15, fob: 1.80 },
  { name: "Charging Flex", brand: "Samsung", model: "A05S", quality: "Original", qty: 10, fob: 1.80 },
  { name: "Charging Flex", brand: "Samsung", model: "A06 5G", quality: "Original", qty: 10, fob: 6.10 },
  { name: "Charging Flex", brand: "Samsung", model: "S22 Ultra 5G/S908B", quality: "Original", qty: 3, fob: 8.30 },
  { name: "Charging Flex", brand: "Samsung", model: "S23 Ultra/S918B", quality: "Original", qty: 3, fob: 6.90 },
  { name: "Charging Flex", brand: "Samsung", model: "S24 Ultra/S926B", quality: "Original", qty: 3, fob: 8.70 },
  { name: "Charging Flex", brand: "Samsung", model: "S25 Ultra/S938B", quality: "Original", qty: 3, fob: 8.70 },
  { name: "Charging Flex", brand: "Samsung", model: "S26 Ultra/S948B", quality: "Original", qty: 3, fob: 10.80 },
  { name: "Pantalla Tablet", brand: "Samsung", model: "T500", quality: "Original", qty: 1, fob: 16.00 },
  { name: "Pantalla Con Marco (Muestra)", brand: "Samsung", model: "A25", quality: "INCELL", qty: 1, fob: 0.01 },
  { name: "Pantalla (Muestra)", brand: "Samsung", model: "A04S", quality: "Original", qty: 1, fob: 0.01 },
  { name: "Pantalla (Muestra)", brand: "Honor", model: "X6B", quality: "Original", qty: 1, fob: 0.01 },
  { name: "Vidrio Templado", brand: "Apple", model: "iPhone X", quality: "Glass", qty: 10, fob: 0.45 },
  { name: "Vidrio Templado", brand: "Apple", model: "iPhone Xs", quality: "Glass", qty: 10, fob: 0.45 },
  { name: "Vidrio Templado", brand: "Apple", model: "iPhone Xs Max", quality: "Glass", qty: 10, fob: 0.45 },
  { name: "Vidrio Templado", brand: "Apple", model: "iPhone 11 Pro", quality: "Glass", qty: 10, fob: 0.45 },
  { name: "Vidrio Templado", brand: "Apple", model: "iPhone 11 Pro Max", quality: "Glass", qty: 10, fob: 0.45 },
  { name: "Vidrio Templado", brand: "Apple", model: "iPhone 12 Pro Max", quality: "Glass", qty: 10, fob: 0.45 },
  { name: "Vidrio Templado", brand: "Apple", model: "iPhone 12/12 Pro", quality: "Glass", qty: 10, fob: 0.45 },
  { name: "Vidrio Templado", brand: "Apple", model: "iPhone 13", quality: "Glass", qty: 10, fob: 0.45 },
  { name: "Vidrio Templado", brand: "Apple", model: "iPhone 13 Pro", quality: "Glass", qty: 10, fob: 0.45 },
  { name: "Vidrio Templado", brand: "Apple", model: "iPhone 13 Pro Max", quality: "Glass", qty: 10, fob: 0.45 },
  { name: "Vidrio Templado", brand: "Apple", model: "iPhone 14", quality: "Glass", qty: 10, fob: 0.45 },
  { name: "Vidrio Templado", brand: "Apple", model: "iPhone 14 Plus", quality: "Glass", qty: 10, fob: 0.45 },
  { name: "Vidrio Templado", brand: "Apple", model: "iPhone 14 Pro", quality: "Glass", qty: 10, fob: 0.45 },
  { name: "Vidrio Templado", brand: "Apple", model: "iPhone 14 Pro Max", quality: "Glass", qty: 10, fob: 0.45 },
  { name: "Vidrio Templado", brand: "Apple", model: "iPhone 15", quality: "Glass", qty: 10, fob: 0.45 },
  { name: "Vidrio Templado", brand: "Apple", model: "iPhone 15 Plus", quality: "Glass", qty: 10, fob: 0.45 },
  { name: "Vidrio Templado", brand: "Apple", model: "iPhone 15 Pro", quality: "Glass", qty: 10, fob: 0.45 },
  { name: "Vidrio Templado", brand: "Apple", model: "iPhone 15 Pro Max", quality: "Glass", qty: 10, fob: 0.45 },
  { name: "Vidrio Templado", brand: "Apple", model: "iPhone 16", quality: "Glass", qty: 10, fob: 0.45 },
  { name: "Vidrio Templado", brand: "Apple", model: "iPhone 16 Plus", quality: "Glass", qty: 10, fob: 0.45 },
  { name: "Vidrio Templado", brand: "Apple", model: "iPhone 16 Pro", quality: "Glass", qty: 10, fob: 0.45 },
  { name: "Vidrio Templado", brand: "Apple", model: "iPhone 16 Pro Max", quality: "Glass", qty: 10, fob: 0.45 }
];

async function ensureSchemaCompatibility(client) {
  // Asegurar tabla batches con soporte dual de columnas
  await client.query(`
    CREATE TABLE IF NOT EXISTS batches (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255),
      importDate VARCHAR(255),
      totalCustomsTax NUMERIC DEFAULT 0.0,
      totalShippingCost NUMERIC DEFAULT 0.0,
      exchangeRateGtq NUMERIC DEFAULT 7.80,
      profitMarginPct NUMERIC DEFAULT 15.0,
      costUpdateStrategy VARCHAR(50) DEFAULT 'weighted',
      status VARCHAR(255) DEFAULT 'Procesado',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      batch_name VARCHAR(255),
      batch_code VARCHAR(255),
      shipping_cost_usd NUMERIC DEFAULT 0.0,
      customs_cost_usd NUMERIC DEFAULT 0.0,
      exchange_rate NUMERIC DEFAULT 7.80,
      profit_margin_pct NUMERIC DEFAULT 15.0,
      total_fob_usd NUMERIC DEFAULT 0.0,
      cost_update_strategy VARCHAR(50) DEFAULT 'weighted'
    );
  `);

  // Asegurar columnas opcionales si la tabla ya existía
  const batchCols = [
    'name VARCHAR(255)',
    'importDate VARCHAR(255)',
    'totalCustomsTax NUMERIC DEFAULT 0.0',
    'totalShippingCost NUMERIC DEFAULT 0.0',
    'exchangeRateGtq NUMERIC DEFAULT 7.80',
    'profitMarginPct NUMERIC DEFAULT 15.0',
    'costUpdateStrategy VARCHAR(50) DEFAULT \'weighted\'',
    'status VARCHAR(255) DEFAULT \'Procesado\'',
    'created_at TIMESTAMPTZ DEFAULT NOW()',
    'batch_name VARCHAR(255)',
    'batch_code VARCHAR(255)',
    'shipping_cost_usd NUMERIC DEFAULT 0.0',
    'customs_cost_usd NUMERIC DEFAULT 0.0',
    'exchange_rate NUMERIC DEFAULT 7.80',
    'profit_margin_pct NUMERIC DEFAULT 15.0',
    'total_fob_usd NUMERIC DEFAULT 0.0',
    'cost_update_strategy VARCHAR(50) DEFAULT \'weighted\''
  ];
  for (const col of batchCols) {
    await client.query(`ALTER TABLE batches ADD COLUMN IF NOT EXISTS ${col}`).catch(() => {});
  }

  // Asegurar tabla batch_items con soporte dual de columnas
  await client.query(`
    CREATE TABLE IF NOT EXISTS batch_items (
      id SERIAL PRIMARY KEY,
      batchId VARCHAR(255),
      batch_id VARCHAR(255),
      sku VARCHAR(255) NOT NULL DEFAULT 'PROD-001',
      name VARCHAR(255),
      productName VARCHAR(255),
      brand TEXT DEFAULT '',
      model TEXT DEFAULT '',
      quantity INTEGER NOT NULL DEFAULT 1,
      fob_unit_usd NUMERIC DEFAULT 0.0,
      unitCostFob NUMERIC DEFAULT 0.0,
      totalFobValue NUMERIC DEFAULT 0.0,
      sharePercentage NUMERIC DEFAULT 0.0,
      allocatedTax NUMERIC DEFAULT 0.0,
      unitTax NUMERIC DEFAULT 0.0,
      finalUnitCost NUMERIC DEFAULT 0.0,
      landed_unit_usd NUMERIC DEFAULT 0.0,
      landed_unit_gtq NUMERIC DEFAULT 0.0,
      sale_price_gtq NUMERIC DEFAULT 0.0,
      finalSellingPrice NUMERIC DEFAULT 0.0,
      recargo_pct NUMERIC DEFAULT 0.0,
      allocatedCustoms NUMERIC DEFAULT 0.0,
      allocatedShipping NUMERIC DEFAULT 0.0,
      profitMarginPct NUMERIC DEFAULT 15.0,
      image TEXT DEFAULT ''
    );
  `);

  const itemCols = [
    'batchId VARCHAR(255)',
    'batch_id VARCHAR(255)',
    'sku VARCHAR(255) DEFAULT \'PROD-001\'',
    'name VARCHAR(255)',
    'productName VARCHAR(255)',
    'brand TEXT DEFAULT \'\'',
    'model TEXT DEFAULT \'\'',
    'quantity INTEGER DEFAULT 1',
    'fob_unit_usd NUMERIC DEFAULT 0.0',
    'unitCostFob NUMERIC DEFAULT 0.0',
    'totalFobValue NUMERIC DEFAULT 0.0',
    'sharePercentage NUMERIC DEFAULT 0.0',
    'allocatedTax NUMERIC DEFAULT 0.0',
    'unitTax NUMERIC DEFAULT 0.0',
    'finalUnitCost NUMERIC DEFAULT 0.0',
    'landed_unit_usd NUMERIC DEFAULT 0.0',
    'landed_unit_gtq NUMERIC DEFAULT 0.0',
    'sale_price_gtq NUMERIC DEFAULT 0.0',
    'finalSellingPrice NUMERIC DEFAULT 0.0',
    'recargo_pct NUMERIC DEFAULT 0.0',
    'allocatedCustoms NUMERIC DEFAULT 0.0',
    'allocatedShipping NUMERIC DEFAULT 0.0',
    'profitMarginPct NUMERIC DEFAULT 15.0',
    'image TEXT DEFAULT \'\''
  ];
  for (const col of itemCols) {
    await client.query(`ALTER TABLE batch_items ADD COLUMN IF NOT EXISTS ${col}`).catch(() => {});
  }

  // Asegurar tabla inventory con soporte dual de columnas
  await client.query(`
    CREATE TABLE IF NOT EXISTS inventory (
      id SERIAL PRIMARY KEY,
      sku VARCHAR(255) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      brand TEXT DEFAULT '',
      model TEXT DEFAULT '',
      category VARCHAR(255) DEFAULT 'General',
      stock INTEGER NOT NULL DEFAULT 0,
      unitCost NUMERIC DEFAULT 0.0,
      landed_cost_usd NUMERIC DEFAULT 0.0,
      landed_cost_gtq NUMERIC DEFAULT 0.0,
      sale_price_gtq NUMERIC DEFAULT 0.0,
      last_batch_id VARCHAR(255),
      previousUnitCost NUMERIC DEFAULT 0.0,
      priceChangeDelta NUMERIC DEFAULT 0.0,
      priceChangePct NUMERIC DEFAULT 0.0,
      image TEXT DEFAULT '',
      lastUpdated VARCHAR(255) DEFAULT '',
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  const invCols = [
    'brand TEXT DEFAULT \'\'',
    'model TEXT DEFAULT \'\'',
    'category VARCHAR(255) DEFAULT \'General\'',
    'stock INTEGER DEFAULT 0',
    'unitCost NUMERIC DEFAULT 0.0',
    'landed_cost_usd NUMERIC DEFAULT 0.0',
    'landed_cost_gtq NUMERIC DEFAULT 0.0',
    'sale_price_gtq NUMERIC DEFAULT 0.0',
    'last_batch_id VARCHAR(255)',
    'previousUnitCost NUMERIC DEFAULT 0.0',
    'priceChangeDelta NUMERIC DEFAULT 0.0',
    'priceChangePct NUMERIC DEFAULT 0.0',
    'image TEXT DEFAULT \'\'',
    'lastUpdated VARCHAR(255) DEFAULT \'\'',
    'updated_at TIMESTAMPTZ DEFAULT NOW()'
  ];
  for (const col of invCols) {
    await client.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS ${col}`).catch(() => {});
  }
}

async function run() {
  const client = await pool.connect();
  try {
    console.log('🔄 Verificando y adaptando esquema en PostgreSQL Neon...');
    await ensureSchemaCompatibility(client);

    await client.query('BEGIN');

    const totalFob = items.reduce((acc, it) => acc + (it.qty * it.fob), 0);
    const totalExpenses = SHIPPING_USD + CUSTOMS_USD;
    const overheadRatio = totalExpenses / totalFob;

    console.log(`Total FOB: $${totalFob.toFixed(2)} | Flete: $${SHIPPING_USD} | Aduana: $${CUSTOMS_USD} (Q${CUSTOMS_GTQ})`);
    console.log(`Recargo proporcional: ${(overheadRatio * 100).toFixed(2)}%`);

    const batchCode = `#LOT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
    const batchName = "Lote Importación Pantallas y Repuestos Septiembre";
    const importDate = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

    const batchRes = await client.query(`
      INSERT INTO batches (
        id, name, importDate, totalCustomsTax, totalShippingCost,
        exchangeRateGtq, profitMarginPct, costUpdateStrategy, status, created_at,
        batch_name, batch_code, shipping_cost_usd, customs_cost_usd,
        exchange_rate, profit_margin_pct, total_fob_usd, cost_update_strategy
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING id
    `, [
      batchCode,
      batchName,
      importDate,
      CUSTOMS_USD,
      SHIPPING_USD,
      EXCHANGE_RATE,
      PROFIT_MARGIN_PCT,
      'weighted',
      'Procesado',
      batchName,
      batchCode,
      SHIPPING_USD,
      CUSTOMS_USD,
      EXCHANGE_RATE,
      PROFIT_MARGIN_PCT,
      Number(totalFob.toFixed(2)),
      'weighted'
    ]);

    const batchId = batchRes.rows[0].id;

    let index = 1;
    for (const it of items) {
      const itemTotalFob = it.qty * it.fob;
      const shareOfBatch = itemTotalFob / totalFob;
      const itemShipping = SHIPPING_USD * shareOfBatch;
      const itemCustoms = CUSTOMS_USD * shareOfBatch;
      const unitExpenses = (itemShipping + itemCustoms) / it.qty;
      const landedUsd = it.fob + unitExpenses;
      const landedGtq = landedUsd * EXCHANGE_RATE;
      const salePriceGtq = landedGtq * (1 + (PROFIT_MARGIN_PCT / 100));
      const salePriceUsd = salePriceGtq / EXCHANGE_RATE;

      const sku = `REP-${String(index).padStart(4, '0')}`;
      const fullName = `${it.name} ${it.brand} ${it.model} ${it.quality}`.trim();

      await client.query(`
        INSERT INTO batch_items (
          batchId, batch_id, sku, productName, name, brand, model, quantity,
          unitCostFob, fob_unit_usd, totalFobValue, sharePercentage, allocatedTax,
          unitTax, finalUnitCost, landed_unit_usd, landed_unit_gtq, sale_price_gtq,
          finalSellingPrice, recargo_pct, allocatedCustoms, allocatedShipping, profitMarginPct
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
      `, [
        batchId, batchId, sku, fullName, fullName, it.brand, it.model, it.qty,
        it.fob, it.fob, Number(itemTotalFob.toFixed(2)), Number((shareOfBatch * 100).toFixed(2)),
        Number((itemShipping + itemCustoms).toFixed(2)), Number(unitExpenses.toFixed(2)),
        Number(landedUsd.toFixed(2)), Number(landedUsd.toFixed(2)), Number(landedGtq.toFixed(2)),
        Number(salePriceGtq.toFixed(2)), Number(salePriceUsd.toFixed(2)), Number((overheadRatio * 100).toFixed(1)),
        Number(itemCustoms.toFixed(2)), Number(itemShipping.toFixed(2)), PROFIT_MARGIN_PCT
      ]);

      await client.query(`
        INSERT INTO inventory (
          sku, name, brand, model, category, stock, unitCost,
          landed_cost_usd, landed_cost_gtq, sale_price_gtq, last_batch_id,
          lastUpdated, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
        ON CONFLICT (sku) DO UPDATE SET
          stock = inventory.stock + EXCLUDED.stock,
          unitCost = EXCLUDED.unitCost,
          landed_cost_usd = EXCLUDED.landed_cost_usd,
          landed_cost_gtq = EXCLUDED.landed_cost_gtq,
          sale_price_gtq = EXCLUDED.sale_price_gtq,
          last_batch_id = EXCLUDED.last_batch_id,
          lastUpdated = EXCLUDED.lastUpdated,
          updated_at = NOW();
      `, [
        sku, fullName, it.brand, it.model, 'Repuestos', it.qty,
        Number(landedUsd.toFixed(2)), Number(landedUsd.toFixed(2)),
        Number(landedGtq.toFixed(2)), Number(salePriceGtq.toFixed(2)),
        batchId, importDate
      ]);

      index++;
    }

    await client.query('COMMIT');
    console.log(`✅ [PostgreSQL Neon] Lote creado con ID ${batchId} y ${items.length} productos insertados con éxito.`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error ejecutando seed en PostgreSQL:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

async function runSqlite() {
  const dbPath = path.join(__dirname, '../server/database.sqlite');
  const sqliteDb = new sqlite3.Database(dbPath);

  const runAsync = (sql, params = []) => new Promise((resolve, reject) => {
    sqliteDb.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });

  try {
    console.log(`🔄 Conectando y adaptando esquema en SQLite Local (${dbPath})...`);

    const batchCols = [
      'totalShippingCost REAL DEFAULT 0.0',
      'exchangeRateGtq REAL DEFAULT 7.80',
      'profitMarginPct REAL DEFAULT 15.0',
      'costUpdateStrategy TEXT DEFAULT "weighted"',
      'created_at TEXT'
    ];
    for (const c of batchCols) {
      await runAsync(`ALTER TABLE batches ADD COLUMN ${c}`).catch(() => {});
    }

    const itemCols = [
      'sku TEXT DEFAULT "PROD-001"',
      'allocatedCustoms REAL DEFAULT 0.0',
      'allocatedShipping REAL DEFAULT 0.0',
      'profitMarginPct REAL DEFAULT 15.0',
      'finalSellingPrice REAL DEFAULT 0.0',
      'brand TEXT DEFAULT ""',
      'model TEXT DEFAULT ""'
    ];
    for (const c of itemCols) {
      await runAsync(`ALTER TABLE batch_items ADD COLUMN ${c}`).catch(() => {});
    }

    const invCols = [
      'brand TEXT DEFAULT ""',
      'model TEXT DEFAULT ""',
      'previousUnitCost REAL DEFAULT 0.0',
      'priceChangeDelta REAL DEFAULT 0.0',
      'priceChangePct REAL DEFAULT 0.0'
    ];
    for (const c of invCols) {
      await runAsync(`ALTER TABLE inventory ADD COLUMN ${c}`).catch(() => {});
    }

    await runAsync('BEGIN TRANSACTION');

    const totalFob = items.reduce((acc, it) => acc + (it.qty * it.fob), 0);
    const totalExpenses = SHIPPING_USD + CUSTOMS_USD;
    const overheadRatio = totalExpenses / totalFob;

    console.log(`Total FOB: $${totalFob.toFixed(2)} | Flete: $${SHIPPING_USD} | Aduana: $${CUSTOMS_USD} (Q${CUSTOMS_GTQ})`);
    console.log(`Recargo proporcional: ${(overheadRatio * 100).toFixed(2)}%`);

    const batchCode = `#LOT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
    const batchName = "Lote Importación Pantallas y Repuestos Septiembre";
    const importDate = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
    const nowIso = new Date().toISOString();

    await runAsync(`
      INSERT INTO batches (
        id, name, importDate, totalCustomsTax, totalShippingCost,
        exchangeRateGtq, profitMarginPct, costUpdateStrategy, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      batchCode, batchName, importDate, CUSTOMS_USD, SHIPPING_USD,
      EXCHANGE_RATE, PROFIT_MARGIN_PCT, 'weighted', 'Procesado', nowIso
    ]);

    let index = 1;
    for (const it of items) {
      const itemTotalFob = it.qty * it.fob;
      const shareOfBatch = itemTotalFob / totalFob;
      const itemShipping = SHIPPING_USD * shareOfBatch;
      const itemCustoms = CUSTOMS_USD * shareOfBatch;
      const unitExpenses = (itemShipping + itemCustoms) / it.qty;
      const landedUsd = it.fob + unitExpenses;
      const landedGtq = landedUsd * EXCHANGE_RATE;
      const salePriceGtq = landedGtq * (1 + (PROFIT_MARGIN_PCT / 100));
      const salePriceUsd = salePriceGtq / EXCHANGE_RATE;

      const sku = `REP-${String(index).padStart(4, '0')}`;
      const fullName = `${it.name} ${it.brand} ${it.model} ${it.quality}`.trim();

      await runAsync(`
        INSERT INTO batch_items (
          batchId, sku, productName, brand, model, quantity,
          unitCostFob, totalFobValue, sharePercentage, allocatedTax,
          unitTax, finalUnitCost, finalSellingPrice, allocatedCustoms,
          allocatedShipping, profitMarginPct
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        batchCode, sku, fullName, it.brand, it.model, it.qty,
        it.fob, Number(itemTotalFob.toFixed(2)), Number((shareOfBatch * 100).toFixed(2)),
        Number((itemShipping + itemCustoms).toFixed(2)), Number(unitExpenses.toFixed(2)),
        Number(landedUsd.toFixed(2)), Number(salePriceUsd.toFixed(2)),
        Number(itemCustoms.toFixed(2)), Number(itemShipping.toFixed(2)), PROFIT_MARGIN_PCT
      ]);

      await runAsync(`
        INSERT INTO inventory (
          sku, name, brand, model, category, stock, unitCost, lastUpdated
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (sku) DO UPDATE SET
          stock = inventory.stock + excluded.stock,
          unitCost = excluded.unitCost,
          lastUpdated = excluded.lastUpdated
      `, [
        sku, fullName, it.brand, it.model, 'Repuestos', it.qty,
        Number(landedUsd.toFixed(2)), importDate
      ]);

      index++;
    }

    await runAsync('COMMIT');
    console.log(`✅ [SQLite] Lote creado con ID ${batchCode} y ${items.length} productos insertados con éxito.`);
  } catch (err) {
    await runAsync('ROLLBACK').catch(() => {});
    console.error('❌ Error ejecutando seed en SQLite:', err);
    process.exit(1);
  } finally {
    sqliteDb.close();
  }
}

if (useSqlite) {
  runSqlite();
} else {
  run();
}
