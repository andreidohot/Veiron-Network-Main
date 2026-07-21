CREATE SCHEMA IF NOT EXISTS control_plane;
CREATE SCHEMA IF NOT EXISTS chain_index;

CREATE TABLE IF NOT EXISTS control_plane.schema_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO control_plane.schema_meta(key, value)
VALUES ('docker_stack_schema', '1')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

COMMENT ON SCHEMA chain_index IS
'Reserved for the PostgreSQL-backed Veiron indexer migration. Current indexer remains filesystem-backed.';
