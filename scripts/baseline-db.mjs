import crypto from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const migrationsDir = path.join(repoRoot, "drizzle", "migrations");
const journalPath = path.join(migrationsDir, "meta", "_journal.json");
const postgresUrl = process.env.POSTGRES_URL;

const AUTH_TABLES = ["user", "session", "account", "verification"];
const PRODUCT_TABLES = [
  "document",
  "document_preferences",
  "document_style_profile",
];

const AUTH_COLUMNS = {
  user: {
    id: { type: "text", nullable: false },
    name: { type: "text", nullable: false },
    email: { type: "text", nullable: false },
    email_verified: { type: "boolean", nullable: false },
    image: { type: "text", nullable: true },
    created_at: { type: "timestamp with time zone", nullable: false },
    updated_at: { type: "timestamp with time zone", nullable: false },
  },
  session: {
    id: { type: "text", nullable: false },
    expires_at: { type: "timestamp with time zone", nullable: false },
    token: { type: "text", nullable: false },
    created_at: { type: "timestamp with time zone", nullable: false },
    updated_at: { type: "timestamp with time zone", nullable: false },
    ip_address: { type: "text", nullable: true },
    user_agent: { type: "text", nullable: true },
    user_id: { type: "text", nullable: false },
  },
  account: {
    id: { type: "text", nullable: false },
    account_id: { type: "text", nullable: false },
    provider_id: { type: "text", nullable: false },
    user_id: { type: "text", nullable: false },
    access_token: { type: "text", nullable: true },
    refresh_token: { type: "text", nullable: true },
    id_token: { type: "text", nullable: true },
    access_token_expires_at: {
      type: "timestamp with time zone",
      nullable: true,
    },
    refresh_token_expires_at: {
      type: "timestamp with time zone",
      nullable: true,
    },
    scope: { type: "text", nullable: true },
    password: { type: "text", nullable: true },
    created_at: { type: "timestamp with time zone", nullable: false },
    updated_at: { type: "timestamp with time zone", nullable: false },
  },
  verification: {
    id: { type: "text", nullable: false },
    identifier: { type: "text", nullable: false },
    value: { type: "text", nullable: false },
    expires_at: { type: "timestamp with time zone", nullable: false },
    created_at: { type: "timestamp with time zone", nullable: false },
    updated_at: { type: "timestamp with time zone", nullable: false },
  },
};

const PRODUCT_COLUMNS = {
  document: {
    id: { type: "uuid", nullable: false },
    user_id: { type: "text", nullable: false },
    external_document_key: { type: "uuid", nullable: false },
    title: { type: "text", nullable: true },
    created_at: { type: "timestamp with time zone", nullable: false },
    updated_at: { type: "timestamp with time zone", nullable: false },
    last_used_at: { type: "timestamp with time zone", nullable: false },
  },
  document_preferences: {
    id: { type: "uuid", nullable: false },
    document_id: { type: "uuid", nullable: false },
    default_genre: { type: "text", nullable: false },
    processing_config: { type: "jsonb", nullable: false },
    created_at: { type: "timestamp with time zone", nullable: false },
    updated_at: { type: "timestamp with time zone", nullable: false },
  },
  document_style_profile: {
    id: { type: "uuid", nullable: false },
    document_id: { type: "uuid", nullable: false },
    profile_markdown: { type: "text", nullable: false },
    created_at: { type: "timestamp with time zone", nullable: false },
    updated_at: { type: "timestamp with time zone", nullable: false },
  },
};

if (!postgresUrl) {
  console.error("POSTGRES_URL is required to baseline the database.");
  process.exit(1);
}

const pool = new Pool({ connectionString: postgresUrl });

try {
  const migrations = await readJournalMigrations();
  const authMigration = migrations.at(0);
  const productMigration = migrations.at(1);

  if (!authMigration || !productMigration) {
    throw new Error("Expected exactly two initial Drizzle migrations.");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await assertTablesExist(client, AUTH_TABLES, "auth baseline");
    await assertColumns(client, AUTH_COLUMNS);
    await assertAuthConstraints(client);

    const existingProductTables = await getExistingTables(
      client,
      PRODUCT_TABLES,
    );

    if (
      existingProductTables.length > 0 &&
      existingProductTables.length !== PRODUCT_TABLES.length
    ) {
      throw new Error(
        `Partial product schema detected: ${existingProductTables.join(", ")}. Finish or repair product schema before baselining.`,
      );
    }

    await ensureDrizzleJournal(client);
    await assertJournalIsCompatible(client, migrations);
    await assertProductJournalMatchesSchema(
      client,
      productMigration,
      existingProductTables.length === PRODUCT_TABLES.length,
    );
    await registerMigrationIfMissing(client, authMigration);

    if (existingProductTables.length === PRODUCT_TABLES.length) {
      await assertColumns(client, PRODUCT_COLUMNS);
      await assertProductConstraints(client);
      await assertProductUpdatedAtTriggers(client);
      await registerMigrationIfMissing(client, productMigration);
    }

    await client.query("COMMIT");

    if (existingProductTables.length === PRODUCT_TABLES.length) {
      console.log("Baseline registered for auth and product migrations.");
    } else {
      console.log(
        "Baseline registered for auth migration. Product migration remains pending.",
      );
    }
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
} finally {
  await pool.end();
}

async function readJournalMigrations() {
  const journal = JSON.parse(await readFile(journalPath, "utf8"));

  return Promise.all(
    journal.entries.map(async (entry) => {
      const sqlPath = path.join(migrationsDir, `${entry.tag}.sql`);
      const sql = await readFile(sqlPath, "utf8");

      return {
        tag: entry.tag,
        createdAt: entry.when,
        hash: crypto.createHash("sha256").update(sql).digest("hex"),
      };
    }),
  );
}

async function assertTablesExist(client, tables, context) {
  const existingTables = await getExistingTables(client, tables);
  const missingTables = tables.filter(
    (table) => !existingTables.includes(table),
  );

  if (missingTables.length > 0) {
    throw new Error(
      `Missing tables for ${context}: ${missingTables.join(", ")}. Use db:migrate for empty databases or repair the schema explicitly.`,
    );
  }
}

async function getExistingTables(client, tables) {
  const result = await client.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ANY($1::text[])`,
    [tables],
  );

  return result.rows.map((row) => row.table_name);
}

async function assertColumns(client, tableColumns) {
  for (const [tableName, expectedColumns] of Object.entries(tableColumns)) {
    const result = await client.query(
      `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1`,
      [tableName],
    );
    const actualColumns = new Map(
      result.rows.map((row) => [row.column_name, row]),
    );

    for (const [columnName, expectedColumn] of Object.entries(
      expectedColumns,
    )) {
      const actualColumn = actualColumns.get(columnName);

      if (!actualColumn) {
        throw new Error(`Missing column ${tableName}.${columnName}.`);
      }

      if (actualColumn.data_type !== expectedColumn.type) {
        throw new Error(
          `Column ${tableName}.${columnName} has type ${actualColumn.data_type}; expected ${expectedColumn.type}.`,
        );
      }

      const nullable = actualColumn.is_nullable === "YES";

      if (nullable !== expectedColumn.nullable) {
        throw new Error(
          `Column ${tableName}.${columnName} nullable=${nullable}; expected ${expectedColumn.nullable}.`,
        );
      }
    }
  }
}

async function assertAuthConstraints(client) {
  await assertPrimaryKeys(client, AUTH_TABLES);
  await assertUniqueColumns(client, [
    { table: "user", columns: ["email"] },
    { table: "session", columns: ["token"] },
  ]);
  await assertForeignKey(client, "session", ["user_id"], "user", ["id"]);
  await assertForeignKey(client, "account", ["user_id"], "user", ["id"]);
}

async function assertProductConstraints(client) {
  await assertPrimaryKeys(client, PRODUCT_TABLES);
  await assertUniqueColumns(client, [
    { table: "document", columns: ["user_id", "external_document_key"] },
    { table: "document_preferences", columns: ["document_id"] },
    { table: "document_style_profile", columns: ["document_id"] },
  ]);
  await assertForeignKey(client, "document", ["user_id"], "user", ["id"]);
  await assertForeignKey(
    client,
    "document_preferences",
    ["document_id"],
    "document",
    ["id"],
  );
  await assertForeignKey(
    client,
    "document_style_profile",
    ["document_id"],
    "document",
    ["id"],
  );
  await assertCheckConstraint(client, "document_preferences", "default_genre");
  await assertCheckConstraint(
    client,
    "document_preferences",
    "processing_config",
  );
}

async function assertPrimaryKeys(client, tables) {
  for (const table of tables) {
    const result = await client.query(
      `SELECT 1 FROM pg_constraint constraint_info JOIN pg_class table_info ON table_info.oid = constraint_info.conrelid JOIN pg_namespace schema_info ON schema_info.oid = table_info.relnamespace WHERE schema_info.nspname = 'public' AND table_info.relname = $1 AND constraint_info.contype = 'p'`,
      [table],
    );

    if (result.rowCount === 0) {
      throw new Error(`Missing primary key on ${table}.`);
    }
  }
}

function toColumnList(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    return value
      .replace(/^\{|\}$/g, "")
      .split(",")
      .filter(Boolean);
  }

  return [];
}

async function assertUniqueColumns(client, constraints) {
  for (const constraint of constraints) {
    const result = await client.query(
      `SELECT array_agg(attribute.attname ORDER BY key_position.ordinality) AS columns FROM pg_constraint constraint_info JOIN pg_class table_info ON table_info.oid = constraint_info.conrelid JOIN pg_namespace schema_info ON schema_info.oid = table_info.relnamespace JOIN unnest(constraint_info.conkey) WITH ORDINALITY AS key_position(attnum, ordinality) ON true JOIN pg_attribute attribute ON attribute.attrelid = table_info.oid AND attribute.attnum = key_position.attnum WHERE schema_info.nspname = 'public' AND table_info.relname = $1 AND constraint_info.contype = 'u' GROUP BY constraint_info.oid`,
      [constraint.table],
    );
    const expected = constraint.columns.join(",");
    const hasUnique = result.rows.some(
      (row) => toColumnList(row.columns).join(",") === expected,
    );

    if (!hasUnique) {
      throw new Error(
        `Missing unique constraint on ${constraint.table}(${expected}).`,
      );
    }
  }
}

async function assertForeignKey(
  client,
  table,
  columns,
  foreignTable,
  foreignColumns,
) {
  const result = await client.query(
    `SELECT array_agg(local_attribute.attname ORDER BY local_position.ordinality) AS columns, foreign_table.relname AS foreign_table, array_agg(foreign_attribute.attname ORDER BY foreign_position.ordinality) AS foreign_columns, constraint_info.confdeltype AS delete_action FROM pg_constraint constraint_info JOIN pg_class local_table ON local_table.oid = constraint_info.conrelid JOIN pg_namespace schema_info ON schema_info.oid = local_table.relnamespace JOIN pg_class foreign_table ON foreign_table.oid = constraint_info.confrelid JOIN unnest(constraint_info.conkey) WITH ORDINALITY AS local_position(attnum, ordinality) ON true JOIN pg_attribute local_attribute ON local_attribute.attrelid = local_table.oid AND local_attribute.attnum = local_position.attnum JOIN unnest(constraint_info.confkey) WITH ORDINALITY AS foreign_position(attnum, ordinality) ON foreign_position.ordinality = local_position.ordinality JOIN pg_attribute foreign_attribute ON foreign_attribute.attrelid = foreign_table.oid AND foreign_attribute.attnum = foreign_position.attnum WHERE schema_info.nspname = 'public' AND local_table.relname = $1 AND constraint_info.contype = 'f' GROUP BY constraint_info.oid, foreign_table.relname, constraint_info.confdeltype`,
    [table],
  );
  const expectedColumns = columns.join(",");
  const expectedForeignColumns = foreignColumns.join(",");
  const hasForeignKey = result.rows.some(
    (row) =>
      toColumnList(row.columns).join(",") === expectedColumns &&
      row.foreign_table === foreignTable &&
      toColumnList(row.foreign_columns).join(",") === expectedForeignColumns &&
      row.delete_action === "c",
  );

  if (!hasForeignKey) {
    throw new Error(
      `Missing ON DELETE cascade foreign key ${table}(${expectedColumns}) -> ${foreignTable}(${expectedForeignColumns}).`,
    );
  }
}

async function assertCheckConstraint(client, table, expectedText) {
  const result = await client.query(
    `SELECT pg_get_constraintdef(constraint_info.oid) AS definition FROM pg_constraint constraint_info JOIN pg_class table_info ON table_info.oid = constraint_info.conrelid JOIN pg_namespace schema_info ON schema_info.oid = table_info.relnamespace WHERE schema_info.nspname = 'public' AND table_info.relname = $1 AND constraint_info.contype = 'c'`,
    [table],
  );
  const hasCheck = result.rows.some((row) =>
    row.definition.includes(expectedText),
  );

  if (!hasCheck) {
    throw new Error(
      `Missing check constraint on ${table} for ${expectedText}.`,
    );
  }
}

async function assertProductUpdatedAtTriggers(client) {
  const triggerNames = [
    "set_document_updated_at",
    "set_document_preferences_updated_at",
    "set_document_style_profile_updated_at",
  ];
  const result = await client.query(
    `SELECT trigger_name FROM information_schema.triggers WHERE event_object_schema = 'public' AND trigger_name = ANY($1::text[])`,
    [triggerNames],
  );
  const actualTriggerNames = new Set(
    result.rows.map((row) => row.trigger_name),
  );
  const missingTriggerNames = triggerNames.filter(
    (name) => !actualTriggerNames.has(name),
  );

  if (missingTriggerNames.length > 0) {
    throw new Error(
      `Missing updated_at triggers: ${missingTriggerNames.join(", ")}.`,
    );
  }
}

async function ensureDrizzleJournal(client) {
  await client.query("CREATE SCHEMA IF NOT EXISTS drizzle");
  await client.query(`CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
    id SERIAL PRIMARY KEY,
    hash text NOT NULL,
    created_at bigint
  )`);
}

async function assertJournalIsCompatible(client, migrations) {
  const result = await client.query(
    `SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at ASC`,
  );
  const migrationsByCreatedAt = new Map(
    migrations.map((migration) => [String(migration.createdAt), migration]),
  );

  for (const row of result.rows) {
    const migration = migrationsByCreatedAt.get(String(row.created_at));

    if (!migration) {
      throw new Error(
        `Unknown Drizzle migration journal entry at ${row.created_at}.`,
      );
    }

    if (row.hash !== migration.hash) {
      throw new Error(
        `Hash mismatch for Drizzle migration ${migration.tag}. Refusing to baseline over a contradictory journal.`,
      );
    }
  }
}

async function assertProductJournalMatchesSchema(
  client,
  productMigration,
  hasProductSchema,
) {
  const result = await client.query(
    `SELECT 1 FROM drizzle.__drizzle_migrations WHERE created_at = $1`,
    [productMigration.createdAt],
  );

  if (result.rowCount > 0 && !hasProductSchema) {
    throw new Error(
      `Drizzle journal already contains ${productMigration.tag}, but product tables are not all present.`,
    );
  }
}

async function registerMigrationIfMissing(client, migration) {
  const result = await client.query(
    `SELECT 1 FROM drizzle.__drizzle_migrations WHERE created_at = $1`,
    [migration.createdAt],
  );

  if (result.rowCount > 0) {
    return;
  }

  await client.query(
    `INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)`,
    [migration.hash, migration.createdAt],
  );
}
