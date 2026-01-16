-- Nazim requires gen_random_uuid() in migrations.
-- That function is provided by pgcrypto.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

