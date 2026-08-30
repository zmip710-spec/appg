import sqlite3 from 'sqlite3';
import path from 'path';

const dbPath = path.resolve('server/database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('🧹 Vaciando toda la base de datos (preservando solo la tabla de usuarios)...');

db.serialize(() => {
  db.run('DELETE FROM transactions', (err) => {
    if (err) console.error('Error al limpiar transactions:', err.message);
  });
  db.run('DELETE FROM batch_items', (err) => {
    if (err) console.error('Error al limpiar batch_items:', err.message);
  });
  db.run('DELETE FROM batches', (err) => {
    if (err) console.error('Error al limpiar batches:', err.message);
  });
  db.run('DELETE FROM inventory', (err) => {
    if (err) console.error('Error al limpiar inventory:', err.message);
  });
  db.run('DELETE FROM price_history', (err) => {
    if (err) console.error('Error al limpiar price_history:', err.message);
  });

  // Vacuum SQLite to reclaim disk space and reset sequence counters if possible
  db.run('VACUUM', (err) => {
    if (err) console.error('Error al ejecutar VACUUM:', err.message);

    console.log('\n📊 ESTADO DE TABLAS EN LA BASE DE DATOS:');
    db.get('SELECT COUNT(*) as cnt FROM users', [], (e, r) => console.log(`• usuarios (users): ${r ? r.cnt : 0} usuarios activos (PRESERVADO)`));
    db.get('SELECT COUNT(*) as cnt FROM inventory', [], (e, r) => console.log(`• inventario (inventory): ${r ? r.cnt : 0} filas`));
    db.get('SELECT COUNT(*) as cnt FROM batches', [], (e, r) => console.log(`• lotes (batches): ${r ? r.cnt : 0} filas`));
    db.get('SELECT COUNT(*) as cnt FROM batch_items', [], (e, r) => console.log(`• ítems de lotes (batch_items): ${r ? r.cnt : 0} filas`));
    db.get('SELECT COUNT(*) as cnt FROM transactions', [], (e, r) => console.log(`• transacciones/ventas (transactions): ${r ? r.cnt : 0} filas`));
    db.get('SELECT COUNT(*) as cnt FROM price_history', [], (e, r) => console.log(`• historial de precios (price_history): ${r ? r.cnt : 0} filas`));

    console.log('\n✨ ¡Base de datos vaciada completamente con éxito!');
  });
});
