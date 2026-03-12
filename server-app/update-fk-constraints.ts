import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

async function migrate() {
  const ds = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  await ds.initialize();
  const qr = ds.createQueryRunner();

  console.log('Updating FK constraints...');

  // Helper to drop & re-add a FK constraint
  async function updateFK(
    table: string,
    column: string,
    refTable: string,
    onDelete: string,
  ) {
    // Find existing constraint name
    const result = await qr.query(
      `SELECT tc.constraint_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name
       WHERE tc.table_name = $1
         AND tc.constraint_type = 'FOREIGN KEY'
         AND kcu.column_name = $2`,
      [table, column],
    );

    for (const row of result) {
      console.log(`  DROP ${table}.${column} constraint: ${row.constraint_name}`);
      await qr.query(`ALTER TABLE "${table}" DROP CONSTRAINT "${row.constraint_name}"`);
    }

    console.log(`  ADD  ${table}.${column} -> ${refTable} ON DELETE ${onDelete}`);
    await qr.query(
      `ALTER TABLE "${table}" ADD CONSTRAINT "FK_${table}_${column}"
       FOREIGN KEY ("${column}") REFERENCES "${refTable}"("id") ON DELETE ${onDelete}`,
    );
  }

  // stock -> product CASCADE, warehouse CASCADE
  await updateFK('stock', 'product_id', 'products', 'CASCADE');
  await updateFK('stock', 'warehouse_id', 'warehouses', 'CASCADE');

  // stock_assignments -> product CASCADE, warehouse CASCADE
  await updateFK('stock_assignments', 'product_id', 'products', 'CASCADE');
  await updateFK('stock_assignments', 'warehouse_id', 'warehouses', 'CASCADE');

  // sale_items -> product CASCADE
  await updateFK('sale_items', 'product_id', 'products', 'CASCADE');

  // sales -> warehouse SET NULL
  await updateFK('sales', 'warehouse_id', 'warehouses', 'SET NULL');

  // sales_targets -> warehouse CASCADE
  await updateFK('sales_targets', 'warehouse_id', 'warehouses', 'CASCADE');

  console.log('Done! All FK constraints updated.');
  await qr.release();
  await ds.destroy();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
