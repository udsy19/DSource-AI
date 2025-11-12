# Database Reference Documentation

**Generated:** 2025-01-06  
**Database:** Supabase PostgreSQL  
**Version:** PostgreSQL 17.6 on aarch64-unknown-linux-gnu

---

## Table of Contents

1. [Database Overview](#database-overview)
2. [Schemas](#schemas)
3. [Tables](#tables)
   - [Public Schema](#public-schema)
   - [Auth Schema](#auth-schema)
   - [Storage Schema](#storage-schema)
   - [Realtime Schema](#realtime-schema)
   - [Vault Schema](#vault-schema)
4. [Extensions](#extensions)
5. [Migrations](#migrations)
6. [Views](#views)
7. [Indexes](#indexes)
8. [Constraints](#constraints)
9. [Sample Data](#sample-data)

---

## Database Overview

- **Database Type:** PostgreSQL (Supabase)
- **PostgreSQL Version:** 17.6
- **Architecture:** aarch64-unknown-linux-gnu
- **Compiler:** GCC 13.2.0
- **Total Schemas:** 5 (auth, public, realtime, storage, vault)
- **Total Tables:** 31
- **Installed Extensions:** 90+ (many available, some installed)

---

## Schemas

### 1. Public Schema
- **Purpose:** User-defined tables and data
- **Tables:** 1
- **RLS Enabled:** Varies by table

### 2. Auth Schema
- **Purpose:** Authentication and authorization
- **Tables:** 20
- **RLS Enabled:** Yes (on most tables)

### 3. Storage Schema
- **Purpose:** File storage management
- **Tables:** 8
- **RLS Enabled:** Yes

### 4. Realtime Schema
- **Purpose:** Real-time subscriptions and messaging
- **Tables:** 3
- **RLS Enabled:** Varies

### 5. Vault Schema
- **Purpose:** Encrypted secrets storage
- **Tables:** 1
- **RLS Enabled:** No

---

## Tables

### Public Schema

#### `scraped_product_list`

**Description:** Stores scraped product information from Material Depot

**Row Count:** 24  
**Size:** 240 kB  
**RLS Enabled:** No  
**Primary Key:** `id`

**Columns:**

| Column Name | Data Type | Nullable | Constraints | Default | Description |
|------------|-----------|----------|-------------|---------|-------------|
| `id` | bigint | No | Primary Key, Identity | auto | Unique identifier |
| `created_at` | timestamptz | No | - | now() | Creation timestamp |
| `product_id` | numeric | Yes | Unique | - | Product ID from source |
| `product_material_depot_variant_handle` | varchar | Yes | - | - | Material Depot variant handle |
| `product_name` | varchar | Yes | - | - | Product name |
| `brand_name` | varchar | Yes | - | - | Brand name |
| `category_name` | varchar | Yes | - | - | Product category |
| `color` | varchar | Yes | - | - | Product color |
| `color_code` | varchar | Yes | - | - | Hex color code |
| `color_family` | varchar | Yes | - | - | Color family |
| `sub_category` | json | Yes | - | - | Sub-categories (JSON array) |
| `series_name` | varchar | Yes | - | - | Product series |
| `description` | varchar | Yes | - | - | Product description |
| `application` | json | Yes | - | - | Applications (JSON array) |
| `thickness` | varchar | Yes | - | - | Product thickness |
| `size` | varchar | Yes | - | - | Product size |
| `tags` | json | Yes | - | - | Tags (JSON array) |
| `image_url` | varchar | Yes | - | - | Product image URL |

**Indexes:**
- `scraped_product_list_pkey` (Primary Key on `id`)
- `scraped_product_list_product_id_key` (Unique on `product_id`)

**Constraints:**
- Primary Key: `id`
- Unique: `product_id`
- Not Null: `id`, `created_at`

---

### Auth Schema

#### `users`

**Description:** Stores user login data within a secure schema

**Row Count:** 0  
**Size:** 96 kB  
**RLS Enabled:** Yes  
**Primary Key:** `id`

**Columns (35 total):**
- `id` (uuid, PK)
- `instance_id` (uuid)
- `aud` (varchar)
- `role` (varchar)
- `email` (varchar)
- `encrypted_password` (varchar)
- `email_confirmed_at` (timestamptz)
- `invited_at` (timestamptz)
- `confirmation_token` (varchar)
- `confirmation_sent_at` (timestamptz)
- `recovery_token` (varchar)
- `recovery_sent_at` (timestamptz)
- `email_change_token_new` (varchar)
- `email_change` (varchar)
- `email_change_sent_at` (timestamptz)
- `last_sign_in_at` (timestamptz)
- `raw_app_meta_data` (jsonb)
- `raw_user_meta_data` (jsonb)
- `is_super_admin` (boolean)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)
- `phone` (text, Unique)
- `phone_confirmed_at` (timestamptz)
- `phone_change` (text)
- `phone_change_token` (varchar)
- `phone_change_sent_at` (timestamptz)
- `confirmed_at` (timestamptz, Generated)
- `email_change_token_current` (varchar)
- `email_change_confirm_status` (smallint, Check: 0-2)
- `banned_until` (timestamptz)
- `reauthentication_token` (varchar)
- `reauthentication_sent_at` (timestamptz)
- `is_sso_user` (boolean, Default: false)
- `deleted_at` (timestamptz)
- `is_anonymous` (boolean, Default: false)

**Foreign Keys:**
- Referenced by: `one_time_tokens.user_id`, `sessions.user_id`, `oauth_consents.user_id`, `oauth_authorizations.user_id`, `mfa_factors.user_id`, `identities.user_id`

#### `sessions`

**Description:** Stores session data associated to a user

**Row Count:** 0  
**Size:** 48 kB  
**RLS Enabled:** Yes  
**Primary Key:** `id`

**Columns (14 total):**
- `id` (uuid, PK)
- `user_id` (uuid, FK → users.id)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)
- `factor_id` (uuid)
- `aal` (aal_level enum: aal1, aal2, aal3)
- `not_after` (timestamptz)
- `refreshed_at` (timestamp)
- `user_agent` (text)
- `ip` (inet)
- `tag` (text)
- `oauth_client_id` (uuid, FK → oauth_clients.id)
- `refresh_token_hmac_key` (text)
- `refresh_token_counter` (bigint)

#### `identities`

**Description:** Stores identities associated to a user

**Row Count:** 0  
**Size:** 40 kB  
**RLS Enabled:** Yes  
**Primary Key:** `id`

**Columns (9 total):**
- `id` (uuid, PK)
- `provider_id` (text)
- `user_id` (uuid, FK → users.id)
- `identity_data` (jsonb)
- `provider` (text)
- `last_sign_in_at` (timestamptz)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)
- `email` (text, Generated)

**Unique Constraint:** `provider_id`, `provider`

#### `refresh_tokens`

**Description:** Store of tokens used to refresh JWT tokens once they expire

**Row Count:** 0  
**Size:** 64 kB  
**RLS Enabled:** Yes  
**Primary Key:** `id`

**Columns (9 total):**
- `id` (bigint, PK)
- `instance_id` (uuid)
- `token` (varchar, Unique)
- `user_id` (varchar)
- `revoked` (boolean)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)
- `parent` (varchar)
- `session_id` (uuid, FK → sessions.id)

#### `mfa_factors`

**Description:** Stores metadata about factors

**Row Count:** 0  
**Size:** 56 kB  
**RLS Enabled:** Yes  
**Primary Key:** `id`

**Columns (13 total):**
- `id` (uuid, PK)
- `user_id` (uuid, FK → users.id)
- `friendly_name` (text)
- `factor_type` (factor_type enum: totp, webauthn, phone)
- `status` (factor_status enum: unverified, verified)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)
- `secret` (text)
- `phone` (text)
- `last_challenged_at` (timestamptz, Unique)
- `web_authn_credential` (jsonb)
- `web_authn_aaguid` (uuid)
- `last_webauthn_challenge_data` (jsonb)

#### `mfa_challenges`

**Description:** Stores metadata about challenge requests made

**Row Count:** 0  
**Size:** 24 kB  
**RLS Enabled:** Yes  
**Primary Key:** `id`

**Columns (7 total):**
- `id` (uuid, PK)
- `factor_id` (uuid, FK → mfa_factors.id)
- `created_at` (timestamptz)
- `verified_at` (timestamptz)
- `ip_address` (inet)
- `otp_code` (text)
- `web_authn_session_data` (jsonb)

#### `mfa_amr_claims`

**Description:** Stores authenticator method reference claims for multi factor authentication

**Row Count:** 0  
**Size:** 24 kB  
**RLS Enabled:** Yes  
**Primary Key:** `id`

**Columns (5 total):**
- `id` (uuid, PK)
- `session_id` (uuid, FK → sessions.id)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)
- `authentication_method` (text)

**Unique Constraint:** `session_id`, `authentication_method`

#### `oauth_clients`

**Description:** OAuth client applications

**Row Count:** 0  
**Size:** 24 kB  
**RLS Enabled:** No  
**Primary Key:** `id`

**Columns (12 total):**
- `id` (uuid, PK)
- `client_secret_hash` (text)
- `registration_type` (oauth_registration_type enum: dynamic, manual)
- `redirect_uris` (text)
- `grant_types` (text)
- `client_name` (text, Check: length <= 1024)
- `client_uri` (text, Check: length <= 2048)
- `logo_uri` (text, Check: length <= 2048)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)
- `deleted_at` (timestamptz)
- `client_type` (oauth_client_type enum: public, confidential)

#### `oauth_authorizations`

**Description:** OAuth authorization requests

**Row Count:** 0  
**Size:** 40 kB  
**RLS Enabled:** No  
**Primary Key:** `id`

**Columns (16 total):**
- `id` (uuid, PK)
- `authorization_id` (text, Unique)
- `client_id` (uuid, FK → oauth_clients.id)
- `user_id` (uuid, FK → users.id)
- `redirect_uri` (text, Check: length <= 2048)
- `scope` (text, Check: length <= 4096)
- `state` (text, Check: length <= 4096)
- `resource` (text, Check: length <= 2048)
- `code_challenge` (text, Check: length <= 128)
- `code_challenge_method` (code_challenge_method enum: s256, plain)
- `response_type` (oauth_response_type enum: code, Default: code)
- `status` (oauth_authorization_status enum: pending, approved, denied, expired, Default: pending)
- `authorization_code` (text, Unique, Check: length <= 255)
- `created_at` (timestamptz, Default: now())
- `expires_at` (timestamptz, Default: now() + 3 minutes)
- `approved_at` (timestamptz)

#### `oauth_consents`

**Description:** OAuth user consents

**Row Count:** 0  
**Size:** 48 kB  
**RLS Enabled:** No  
**Primary Key:** `id`

**Columns (6 total):**
- `id` (uuid, PK)
- `user_id` (uuid, FK → users.id)
- `client_id` (uuid, FK → oauth_clients.id)
- `scopes` (text, Check: length <= 2048, not empty)
- `granted_at` (timestamptz, Default: now())
- `revoked_at` (timestamptz)

**Unique Constraint:** `user_id`, `client_id`

#### `one_time_tokens`

**Description:** One-time tokens for various operations

**Row Count:** 0  
**Size:** 88 kB  
**RLS Enabled:** Yes  
**Primary Key:** `id`

**Columns (7 total):**
- `id` (uuid, PK)
- `user_id` (uuid, FK → users.id)
- `token_type` (one_time_token_type enum)
- `token_hash` (text, Check: length > 0)
- `relates_to` (text)
- `created_at` (timestamp, Default: now())
- `updated_at` (timestamp, Default: now())

**Unique Constraint:** `user_id`, `token_type`

#### `sso_providers`

**Description:** Manages SSO identity provider information

**Row Count:** 0  
**Size:** 32 kB  
**RLS Enabled:** Yes  
**Primary Key:** `id`

**Columns (5 total):**
- `id` (uuid, PK)
- `resource_id` (text, Check: length > 0 or null)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)
- `disabled` (boolean)

#### `sso_domains`

**Description:** Manages SSO email address domain mapping to an SSO Identity Provider

**Row Count:** 0  
**Size:** 32 kB  
**RLS Enabled:** Yes  
**Primary Key:** `id`

**Columns (5 total):**
- `id` (uuid, PK)
- `sso_provider_id` (uuid, FK → sso_providers.id)
- `domain` (text, Check: length > 0)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

#### `saml_providers`

**Description:** Manages SAML Identity Provider connections

**Row Count:** 0  
**Size:** 32 kB  
**RLS Enabled:** Yes  
**Primary Key:** `id`

**Columns (9 total):**
- `id` (uuid, PK)
- `sso_provider_id` (uuid, FK → sso_providers.id)
- `entity_id` (text, Unique, Check: length > 0)
- `metadata_xml` (text, Check: length > 0)
- `metadata_url` (text, Check: length > 0 or null)
- `attribute_mapping` (jsonb)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)
- `name_id_format` (text)

#### `saml_relay_states`

**Description:** Contains SAML Relay State information for each Service Provider initiated login

**Row Count:** 0  
**Size:** 40 kB  
**RLS Enabled:** Yes  
**Primary Key:** `id`

**Columns (8 total):**
- `id` (uuid, PK)
- `sso_provider_id` (uuid, FK → sso_providers.id)
- `request_id` (text, Check: length > 0)
- `for_email` (text)
- `redirect_to` (text)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)
- `flow_state_id` (uuid, FK → flow_state.id)

#### `flow_state`

**Description:** Stores metadata for pkce logins

**Row Count:** 0  
**Size:** 40 kB  
**RLS Enabled:** Yes  
**Primary Key:** `id`

**Columns (12 total):**
- `id` (uuid, PK)
- `user_id` (uuid)
- `auth_code` (text)
- `code_challenge_method` (code_challenge_method enum: s256, plain)
- `code_challenge` (text)
- `provider_type` (text)
- `provider_access_token` (text)
- `provider_refresh_token` (text)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)
- `authentication_method` (text)
- `auth_code_issued_at` (timestamptz)

#### `audit_log_entries`

**Description:** Audit trail for user actions

**Row Count:** 0  
**Size:** 24 kB  
**RLS Enabled:** Yes  
**Primary Key:** `id`

**Columns (5 total):**
- `id` (uuid, PK)
- `instance_id` (uuid)
- `payload` (json)
- `created_at` (timestamptz)
- `ip_address` (varchar, Default: '')

#### `instances`

**Description:** Manages users across multiple sites

**Row Count:** 0  
**Size:** 16 kB  
**RLS Enabled:** Yes  
**Primary Key:** `id`

**Columns (5 total):**
- `id` (uuid, PK)
- `uuid` (uuid)
- `raw_base_config` (text)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

#### `schema_migrations`

**Description:** Manages updates to the auth system

**Row Count:** 2  
**Size:** 24 kB  
**RLS Enabled:** Yes  
**Primary Key:** `version`

**Columns (1 total):**
- `version` (varchar, PK)

**Migration Versions:** 00, 20171026211738, 20171026211808, 20171026211834, 20180103212743, 20180108183307, 20180119214651, 20180125194653, 20210710035447, 20210722035447, 20210730183235, 20210909172000, 20210927181326, 20211122151130, 20211124214934, 20211202183645, 20220114185221, 20220114185340, 20220224000811, 20220323170000, 20220429102000, 20220531120530, 20220614074223, 20220811173540, 20221003041349, 20221003041400, 20221011041400, 20221020193600, 20221021073300, 20221021082433, 20221027105023, 20221114143122, 20221114143410, 20221125140132, 20221208132122, 20221215195500, 20221215195800, 20221215195900, 20230116124310, 20230116124412, 20230131181311, 20230322519590, 20230402418590, 20230411005111, 20230508135423, 20230523124323, 20230818113222, 20230914180801, 20231027141322, 20231114161723, 20231117164230, 20240115144230, 20240214120130, 20240306115329, 20240314092811, 20240427152123, 20240612123726, 20240729123726, 20240802193726, 20240806073726, 20241009103726, 20250717082212, 20250731150234, 20250804100000, 20250901200500, 20250903112500, 20250904133000, 20250925093508, 20251007112900

---

### Storage Schema

#### `buckets`

**Description:** Storage buckets configuration

**Row Count:** 0  
**Size:** 24 kB  
**RLS Enabled:** Yes  
**Primary Key:** `id`

**Columns (11 total):**
- `id` (text, PK)
- `name` (text, Unique)
- `owner` (uuid, Deprecated)
- `created_at` (timestamptz, Default: now())
- `updated_at` (timestamptz, Default: now())
- `public` (boolean, Default: false)
- `avif_autodetection` (boolean, Default: false)
- `file_size_limit` (bigint)
- `allowed_mime_types` (text[])
- `owner_id` (text)
- `type` (buckettype enum: STANDARD, ANALYTICS, Default: STANDARD)

#### `objects`

**Description:** Storage objects (files)

**Row Count:** 0  
**Size:** 64 kB  
**RLS Enabled:** Yes  
**Primary Key:** `id`

**Columns (13 total):**
- `id` (uuid, PK, Default: gen_random_uuid())
- `bucket_id` (text, FK → buckets.id)
- `name` (text)
- `owner` (uuid, Deprecated)
- `created_at` (timestamptz, Default: now())
- `updated_at` (timestamptz, Default: now())
- `last_accessed_at` (timestamptz, Default: now())
- `metadata` (jsonb)
- `path_tokens` (text[], Generated)
- `version` (text)
- `owner_id` (text)
- `user_metadata` (jsonb)
- `level` (integer)

**Unique Constraints:**
- `bucket_id`, `name`
- `name` (C collation), `bucket_id`, `level`

#### `prefixes`

**Description:** Storage prefixes for organization

**Row Count:** 0  
**Size:** 24 kB  
**RLS Enabled:** Yes  
**Primary Key:** `bucket_id`, `name`, `level`

**Columns (5 total):**
- `bucket_id` (text, PK, FK → buckets.id)
- `name` (text, PK)
- `level` (integer, PK, Generated)
- `created_at` (timestamptz, Default: now())
- `updated_at` (timestamptz, Default: now())

#### `s3_multipart_uploads`

**Description:** S3 multipart upload sessions

**Row Count:** 0  
**Size:** 24 kB  
**RLS Enabled:** Yes  
**Primary Key:** `id`

**Columns (9 total):**
- `id` (text, PK)
- `in_progress_size` (bigint, Default: 0)
- `upload_signature` (text)
- `bucket_id` (text, FK → buckets.id)
- `key` (text)
- `version` (text)
- `owner_id` (text)
- `created_at` (timestamptz, Default: now())
- `user_metadata` (jsonb)

#### `s3_multipart_uploads_parts`

**Description:** S3 multipart upload parts

**Row Count:** 0  
**Size:** 16 kB  
**RLS Enabled:** Yes  
**Primary Key:** `id`

**Columns (10 total):**
- `id` (uuid, PK, Default: gen_random_uuid())
- `upload_id` (text, FK → s3_multipart_uploads.id)
- `size` (bigint, Default: 0)
- `part_number` (integer)
- `bucket_id` (text, FK → buckets.id)
- `key` (text)
- `etag` (text)
- `owner_id` (text)
- `version` (text)
- `created_at` (timestamptz, Default: now())

#### `buckets_analytics`

**Description:** Analytics buckets configuration

**Row Count:** 0  
**Size:** 16 kB  
**RLS Enabled:** Yes  
**Primary Key:** `id`

**Columns (5 total):**
- `id` (text, PK)
- `type` (buckettype enum: STANDARD, ANALYTICS, Default: ANALYTICS)
- `format` (text, Default: 'ICEBERG')
- `created_at` (timestamptz, Default: now())
- `updated_at` (timestamptz, Default: now())

#### `migrations`

**Description:** Storage migrations tracking

**Row Count:** 0  
**Size:** 40 kB  
**RLS Enabled:** Yes  
**Primary Key:** `id`

**Columns (4 total):**
- `id` (integer, PK)
- `name` (varchar, Unique)
- `hash` (varchar)
- `executed_at` (timestamp, Default: CURRENT_TIMESTAMP)

---

### Realtime Schema

#### `subscription`

**Description:** Real-time subscriptions

**Row Count:** 0  
**Size:** 32 kB  
**RLS Enabled:** No  
**Primary Key:** `id`

**Columns (7 total):**
- `id` (bigint, PK, Identity)
- `subscription_id` (uuid)
- `entity` (regclass)
- `filters` (user_defined_filter[], Default: '{}')
- `claims` (jsonb)
- `claims_role` (regrole, Generated)
- `created_at` (timestamp, Default: timezone('utc', now()))

**Unique Constraint:** `subscription_id`, `entity`, `filters`

#### `messages`

**Description:** Real-time messages

**Row Count:** 0  
**Size:** 0 bytes  
**RLS Enabled:** Yes  
**Primary Key:** `id`, `inserted_at`

**Columns (8 total):**
- `id` (uuid, PK, Default: gen_random_uuid())
- `topic` (text)
- `extension` (text)
- `payload` (jsonb)
- `event` (text)
- `private` (boolean, Default: false)
- `updated_at` (timestamp, Default: now())
- `inserted_at` (timestamp, PK, Default: now())

#### `schema_migrations`

**Description:** Realtime schema migrations

**Row Count:** 0  
**Size:** 24 kB  
**RLS Enabled:** No  
**Primary Key:** `version`

**Columns (2 total):**
- `version` (bigint, PK)
- `inserted_at` (timestamp)

---

### Vault Schema

#### `secrets`

**Description:** Table with encrypted `secret` column for storing sensitive information on disk

**Row Count:** 0  
**Size:** 24 kB  
**RLS Enabled:** No  
**Primary Key:** `id`

**Columns (8 total):**
- `id` (uuid, PK, Default: gen_random_uuid())
- `name` (text, Unique where not null)
- `description` (text, Default: '')
- `secret` (text)
- `key_id` (uuid)
- `nonce` (bytea, Default: vault._crypto_aead_det_noncegen())
- `created_at` (timestamptz, Default: CURRENT_TIMESTAMP)
- `updated_at` (timestamptz, Default: CURRENT_TIMESTAMP)

---

## Extensions

### Installed Extensions

1. **plpgsql** (pg_catalog) - PL/pgSQL procedural language - Version 1.0
2. **pgcrypto** (extensions) - cryptographic functions - Version 1.3
3. **pg_stat_statements** (extensions) - track planning and execution statistics - Version 1.11
4. **uuid-ossp** (extensions) - generate universally unique identifiers (UUIDs) - Version 1.1
5. **pg_graphql** (graphql) - GraphQL support - Version 1.5.11
6. **supabase_vault** (vault) - Supabase Vault Extension - Version 0.3.1

### Available Extensions (Not Installed)

The database has 90+ extensions available including:
- PostGIS (spatial data)
- pg_net (async HTTP)
- pgmq (message queue)
- vector (vector data type)
- pgroonga (full-text search)
- And many more...

---

## Migrations

### Auth Schema Migrations

**Latest Migration:** 20251007112900

**Total Migrations:** 70+

The auth schema has been migrated through multiple versions from 2017 to 2025, indicating active maintenance and feature additions over time.

### Storage Schema Migrations

**Status:** Tracked in `storage.migrations` table

### Realtime Schema Migrations

**Status:** Tracked in `realtime.schema_migrations` table

---

## Views

### 1. `extensions.pg_stat_statements`

**Description:** Statistics about SQL statement execution

**Columns:** 50+ columns including query text, execution times, buffer hits, WAL records, etc.

### 2. `extensions.pg_stat_statements_info`

**Description:** Information about pg_stat_statements

**Columns:**
- `dealloc`
- `stats_reset`

### 3. `vault.decrypted_secrets`

**Description:** View for decrypted secrets (definition not available)

---

## Indexes

### Key Indexes by Schema

#### Public Schema
- `scraped_product_list_pkey` - Primary key on `id`
- `scraped_product_list_product_id_key` - Unique index on `product_id`

#### Auth Schema
- Multiple indexes on `users` table for email, phone, tokens, instance_id
- Indexes on `sessions` for user_id, oauth_client_id, not_after
- Indexes on `identities` for email, user_id, provider
- Indexes on `refresh_tokens` for token, session_id, instance_id, user_id
- Indexes on `mfa_factors` for user_id, last_challenged_at
- Indexes on `oauth_authorizations` for authorization_code, authorization_id, expires_at
- And many more...

#### Storage Schema
- Indexes on `buckets` for name
- Multiple indexes on `objects` for bucket_id, name, path searches
- Indexes on `prefixes` for bucket_id, name, level
- Indexes on `s3_multipart_uploads` for bucket_id, key, created_at

#### Realtime Schema
- Indexes on `subscription` for entity, subscription_id
- Indexes on `messages` for inserted_at, topic

#### Vault Schema
- Index on `secrets` for name (unique where not null)

---

## Constraints

### Primary Keys

All tables have primary keys defined:
- Most use `uuid` type
- Some use `bigint` with identity/auto-increment
- Composite primary keys exist in some tables (e.g., `realtime.messages`, `storage.prefixes`)

### Foreign Keys

**Key Relationships:**

#### Auth Schema
- `users` ← referenced by: `sessions`, `identities`, `refresh_tokens`, `mfa_factors`, `mfa_challenges`, `oauth_authorizations`, `oauth_consents`, `one_time_tokens`
- `sessions` ← referenced by: `refresh_tokens`, `mfa_amr_claims`
- `oauth_clients` ← referenced by: `sessions`, `oauth_authorizations`, `oauth_consents`
- `sso_providers` ← referenced by: `sso_domains`, `saml_providers`, `saml_relay_states`
- `mfa_factors` ← referenced by: `mfa_challenges`
- `flow_state` ← referenced by: `saml_relay_states`

#### Storage Schema
- `buckets` ← referenced by: `objects`, `prefixes`, `s3_multipart_uploads`, `s3_multipart_uploads_parts`

### Unique Constraints

- `scraped_product_list.product_id` - Unique
- `users.phone` - Unique
- `users.email` - Unique (partial index for non-SSO users)
- `identities.provider_id + provider` - Unique combination
- `refresh_tokens.token` - Unique
- `oauth_authorizations.authorization_code` - Unique
- `oauth_authorizations.authorization_id` - Unique
- `oauth_consents.user_id + client_id` - Unique combination
- `saml_providers.entity_id` - Unique
- `buckets.name` - Unique
- `objects.bucket_id + name` - Unique combination
- `storage.migrations.name` - Unique
- `vault.secrets.name` - Unique (where not null)
- And many more...

### Check Constraints

Multiple check constraints exist for:
- String length validation (e.g., OAuth URIs, client names)
- Value ranges (e.g., `email_change_confirm_status` 0-2)
- Non-empty strings (e.g., domain names, entity IDs)
- Date validations (e.g., `revoked_at` after `granted_at`)

---

## Sample Data

### `scraped_product_list` Sample Records

**Total Rows:** 24

**Sample Record 1:**
```json
{
  "id": 55,
  "created_at": "2025-10-06T02:25:19.655804+00:00",
  "product_id": "672812",
  "product_material_depot_variant_handle": "lm-01683-smt-12016-creamy-venetino-8-ft-x-4-ft-silky-matt-marble-finish-decorative-laminate-1-mm",
  "product_name": "LM 01683 8 ft x 4 ft Super Matte Finish Decorative Laminate - 1 mm",
  "brand_name": "12th Mica",
  "category_name": "Laminates",
  "color": "Beige",
  "color_code": "#F5F5DC",
  "color_family": "Beige",
  "sub_category": ["Decorative Laminates"],
  "series_name": "Marbles & Stones",
  "description": "LM 01683 is part of an elegant collection of Silky Matt Marble is a premium product with unmatched quality and aesthetic. LM 01683 available in size of 8 ft x 4 ft of 1 mm thickness. Decorative Laminates are best used in Living Room, Bedroom, Kitchen, TV Unit, Wardrobe, Cabinates, Office for Commercial,Residential projects.",
  "application": ["Living Room", "Bedroom", "Kitchen", "TV Unit", "Wardrobe", "Office"],
  "thickness": "1 mm",
  "size": "8x4 ft",
  "tags": ["SMT 12016 Creamy Venetino", "Silky Matt Marble", "Super Matte", "Decorative Laminates", "Beige", "Living Room", "Bedroom", "Kitchen", "TV Unit", "Wardrobe", "Cabinates", "Office", "Commercial", "Residential", "Indoor", "Laminates"],
  "image_url": "https://pub-132f3882c2074e84999a9ab982950552.r2.dev/V001484/smt-12016-creamy-venetino-8-ft-x-4-ft-silky-matt-marble-finish-decorative-laminate-1-mm/smt-12016-creamy-venetino-8-ft-x-4-ft-silky-matt-marble-finish-decorative-laminate-1-mm/1.jpg"
}
```

**Sample Record 2:**
```json
{
  "id": 49,
  "created_at": "2025-10-06T02:25:19.655804+00:00",
  "product_id": "668345",
  "product_material_depot_variant_handle": "lm-01363-bb-9523-carve-craft-8-ft-x-4-ft-texture-finish-decorative-laminate-1-mm",
  "product_name": "LM 01363 8 ft x 4 ft Texture Finish Decorative Laminate - 1 mm",
  "brand_name": "Sarvo Lam",
  "category_name": "Laminates",
  "color": "Grey",
  "color_code": "#808080",
  "color_family": "Grey",
  "sub_category": ["Decorative Laminates"],
  "series_name": "Fluted Laminates",
  "description": "Experience the perfect fusion of Fluted Laminates-inspired elegance and modern durability with BB 9523 Carve Craft...",
  "application": ["Living Room", "Bedroom", "Kitchen", "TV Cabinet", "Wardrobe", "Hotel", "Restaurant", "Office"],
  "thickness": "1 mm",
  "size": "8x4 ft",
  "tags": ["Texture", "Carve Craft", "Grey", "8 ft x 4 ft", "Decorative Laminates", "Living Room", "Bedroom", "Kitchen", "TV Cabinet", "Wardrobe", "Hotel", "Restaurant", "Office", "Commercial", "Residential", "Indoor"],
  "image_url": "https://pub-132f3882c2074e84999a9ab982950552.r2.dev/V001477/bb-9523-carve-craft-8-ft-x-4-ft-texture-finish-decorative-laminate-1-mm/bb-9523-carve-craft-8-ft-x-4-ft-texture-finish-decorative-laminate-1-mm/2.png"
}
```

**Product Categories Found:**
- Laminates (all 24 products)

**Brands Found:**
- 12th Mica
- Sarvo Lam
- Ferrero

**Series Found:**
- Marbles & Stones
- Fluted Laminates
- Wooden Effect

**Colors Found:**
- Beige
- Grey
- Brown
- White

**Applications Found:**
- Living Room
- Bedroom
- Kitchen
- TV Unit / TV Cabinet
- Wardrobe
- Office
- Hotel
- Restaurant

---

## Database Statistics

### Table Sizes (Total)

| Schema | Total Tables | Total Size |
|--------|-------------|------------|
| auth | 20 | ~600 kB |
| public | 1 | 240 kB |
| storage | 8 | ~200 kB |
| realtime | 3 | ~60 kB |
| vault | 1 | 24 kB |
| **Total** | **31** | **~1.1 MB** |

### Row Counts

- **scraped_product_list:** 24 rows
- **auth.schema_migrations:** 2 rows (version tracking)
- All other tables: 0 rows (empty)

---

## Security Notes

### Row Level Security (RLS)

- **Auth Schema:** RLS enabled on most tables
- **Storage Schema:** RLS enabled on all tables
- **Realtime Schema:** RLS enabled on `messages`, disabled on `subscription` and `schema_migrations`
- **Public Schema:** RLS disabled on `scraped_product_list`
- **Vault Schema:** RLS disabled on `secrets`

### Recommendations

1. Consider enabling RLS on `scraped_product_list` if user access control is needed
2. Review RLS policies to ensure proper access control
3. Audit foreign key relationships for data integrity
4. Monitor index usage for query performance

---

## Usage Notes

### Querying Products

```sql
-- Get all products
SELECT * FROM public.scraped_product_list;

-- Get products by category
SELECT * FROM public.scraped_product_list 
WHERE category_name = 'Laminates';

-- Get products by color
SELECT * FROM public.scraped_product_list 
WHERE color = 'Beige';

-- Search products by name
SELECT * FROM public.scraped_product_list 
WHERE product_name ILIKE '%laminate%';

-- Get products with specific application
SELECT * FROM public.scraped_product_list 
WHERE application @> '["Kitchen"]'::json;
```

### Authentication

The auth schema provides comprehensive authentication features:
- User management
- Session management
- MFA support (TOTP, WebAuthn, Phone)
- OAuth2 support
- SAML SSO support
- Refresh tokens
- Audit logging

### Storage

The storage schema provides file storage capabilities:
- Bucket management
- Object storage
- Multipart uploads
- Prefix organization
- Analytics buckets

---

## Maintenance

### Regular Maintenance Tasks

1. **Monitor table sizes** - Currently very small, but monitor growth
2. **Review indexes** - Ensure indexes are being used effectively
3. **Check constraints** - Validate data integrity
4. **Review RLS policies** - Ensure proper access control
5. **Monitor migrations** - Keep track of schema changes
6. **Backup strategy** - Ensure regular backups are taken

### Performance Considerations

- `scraped_product_list` is the only table with data (24 rows)
- Most tables are empty, so performance is not a concern yet
- Indexes are in place for efficient queries
- Consider adding indexes on frequently queried columns if data grows

---

## Conclusion

This database is a Supabase PostgreSQL instance with:
- **31 tables** across 5 schemas
- **1 user table** with product data (24 products)
- **Comprehensive auth system** (20 tables)
- **File storage system** (8 tables)
- **Real-time capabilities** (3 tables)
- **Secrets management** (1 table)
- **90+ available extensions**
- **70+ auth migrations** applied

The database is well-structured with proper indexes, constraints, and relationships. The main data table (`scraped_product_list`) contains product information for a material/furniture e-commerce application.

---

**Last Updated:** 2025-01-06  
**Document Version:** 1.0

