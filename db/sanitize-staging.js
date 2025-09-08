#!/usr/bin/env node

/**
 * Sanitiza PII en STAGING de forma genérica por patrones de columnas.
 * - Usa DATABASE_URL_STAGING (o DATABASE_URL)
 * - Respeta SAFE_EMAIL_SUFFIX para no tocar correos internos (e.g., @mixtli.test)
 * - Si DRY_RUN=true solo imprime las queries
 */
const { Client } = require('pg');

const connStr = process.env.DATABASE_URL_STAGING || process.env.DATABASE_URL;
if (!connStr) {
  console.error('❌ Falta DATABASE_URL_STAGING (o DATABASE_URL)');
  process.exit(1);
}
const SAFE_EMAIL_SUFFIX = process.env.SAFE_EMAIL_SUFFIX || '@mixtli.test';
const DRY = (process.env.DRY_RUN || '').toLowerCase() === 'true' || process.env.DRY_RUN === '1';

function qident(name) {
  return '"' + name.replace(/"/g, '""') + '"';
}
function isTextLike(dt) {
  return ['text', 'character varying', 'character', 'citext'].includes(dt.toLowerCase());
}
function isDateLike(dt) {
  return dt.toLowerCase() === 'date' || dt.toLowerCase().startsWith('timestamp');
}
function isInet(dt) {
  return dt.toLowerCase() === 'inet';
}

(async () => {
  const client = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const tablesRes = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema='public' AND table_type='BASE TABLE'
    ORDER BY 1
  `);

  let totalTables = 0, totalRows = 0;
  for (const { table_name } of tablesRes.rows) {
    const colsRes = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema='public' AND table_name=$1
      ORDER BY ordinal_position
    `, [table_name]);

    const cols = colsRes.rows; // [{column_name, data_type}]
    const colNames = cols.map(c => c.column_name);
    const idCol = colNames.includes('id') ? 'id' : null;

    // Build SET list
    const sets = [];

    // Emails
    for (const c of cols.filter(c => /email/i.test(c.column_name) && isTextLike(c.data_type))) {
      if (idCol) {
        sets.push(`${qident(c.column_name)} = CASE
          WHEN ${qident(c.column_name)} ILIKE '%${SAFE_EMAIL_SUFFIX}'
             OR ${qident(c.column_name)} ILIKE '%@example.invalid' THEN ${qident(c.column_name)}
          ELSE 'user_' || ${qident(idCol)} || '@example.invalid' END`);
      } else {
        sets.push(`${qident(c.column_name)} = 'user_' || md5(random()::text) || '@example.invalid'`);
      }
    }

    // Nombres
    const first = cols.find(c => /(^|_)first(name)?$/i.test(c.column_name) && isTextLike(c.data_type));
    const last  = cols.find(c => /(^|_)last(name)?$/i.test(c.column_name) && isTextLike(c.data_type));
    if (first) sets.push(`${qident(first.column_name)} = 'Test'`);
    if (last)  sets.push(`${qident(last.column_name)} = 'User'`);
    for (const c of cols.filter(c => /^name$/i.test(c.column_name) && isTextLike(c.data_type))) {
      sets.push(`${qident(c.column_name)} = 'Test User'`);
    }

    // Teléfonos
    for (const c of cols.filter(c => /(phone|mobile|telefono)/i.test(c.column_name) && isTextLike(c.data_type))) {
      sets.push(`${qident(c.column_name)} = '0000000000'`);
    }

    // Direcciones
    for (const c of cols.filter(c => /(address|direccion|street|city|state|zip|postal|postcode)/i.test(c.column_name) && isTextLike(c.data_type))) {
      sets.push(`${qident(c.column_name)} = 'SANITIZED'`);
    }

    // DOB / fechas sensibles
    for (const c of cols.filter(c => /(birth|dob)/i.test(c.column_name) && isDateLike(c.data_type))) {
      sets.push(`${qident(c.column_name)} = DATE '1990-01-01'`);
    }

    // IDs gubernamentales y similares (texto)
    for (const c of cols.filter(c => /(ssn|curp|rfc|dni|nss|tax|passport|national_id)/i.test(c.column_name) && isTextLike(c.data_type))) {
      sets.push(`${qident(c.column_name)} = NULL`);
    }

    // Tokens / secrets (texto)
    for (const c of cols.filter(c => /(token|secret|api_key|apikey|access|refresh)/i.test(c.column_name) && isTextLike(c.data_type))) {
      sets.push(`${qident(c.column_name)} = NULL`);
    }

    // IP / device
    for (const c of cols.filter(c => /(ip|device|fingerprint)/i.test(c.column_name))) {
      if (isInet(c.data_type)) {
        sets.push(`${qident(c.column_name)} = '0.0.0.0'::inet`);
      } else if (isTextLike(c.data_type)) {
        sets.push(`${qident(c.column_name)} = '0.0.0.0'`);
      } else {
        // skip non-text/non-inet
      }
    }

    if (sets.length === 0) continue;

    let where = '1=1';
    if (colNames.includes('role')) {
      where = `COALESCE(${qident('role')}, '') NOT IN ('system','internal')`;
    }

    const sql = `UPDATE ${qident('public')}.${qident(table_name)} SET ${sets.join(', ')} WHERE ${where};`;
    if (DRY) {
      console.log('-- DRY RUN:', sql);
    } else {
      try {
        const res = await client.query(sql);
        totalTables++;
        totalRows += res.rowCount || 0;
        console.log(`✔ ${table_name}: ${res.rowCount} filas`);
      } catch (e) {
        console.warn(`↷ Omitido ${table_name}: ${e.message}`);
      }
    }
  }

  await client.end();
  console.log(`
✨ Sanitización completa. Tablas afectadas: ${totalTables}, Filas: ${totalRows}`);
})().catch(e => {
  console.error('❌ Error sanitizando:', e);
  process.exit(1);
});
