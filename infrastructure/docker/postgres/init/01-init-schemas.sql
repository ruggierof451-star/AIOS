-- AIOS — Inizializzazione database locale
-- Eseguito automaticamente da Docker al primo avvio del container Postgres.
-- Coerente con Physical Database Schema (Engineering Bible, Modulo 6):
-- uno schema per Bounded Context, estensione pgvector per la memoria semantica
-- iniziale (Step 1, sezione 5 — "pgvector in fase iniziale → Vector DB dedicato
-- alla scala").

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto; -- per generazione UUID v7 lato database

-- Uno schema per Bounded Context (Physical Database Schema, sezione 1.1)
CREATE SCHEMA IF NOT EXISTS identity;
CREATE SCHEMA IF NOT EXISTS organization;
CREATE SCHEMA IF NOT EXISTS workspace;
CREATE SCHEMA IF NOT EXISTS crm;
CREATE SCHEMA IF NOT EXISTS finance;
CREATE SCHEMA IF NOT EXISTS inventory;
CREATE SCHEMA IF NOT EXISTS hr;
CREATE SCHEMA IF NOT EXISTS documents;
CREATE SCHEMA IF NOT EXISTS calendar;
CREATE SCHEMA IF NOT EXISTS analytics;
CREATE SCHEMA IF NOT EXISTS automation;
CREATE SCHEMA IF NOT EXISTS notification;
CREATE SCHEMA IF NOT EXISTS marketplace;
CREATE SCHEMA IF NOT EXISTS administration;
CREATE SCHEMA IF NOT EXISTS eventing;
CREATE SCHEMA IF NOT EXISTS ai_platform;
CREATE SCHEMA IF NOT EXISTS knowledge_graph;

-- Nota: le tabelle vengono create dalle migrazioni Prisma di ogni servizio
-- (pnpm db:migrate), non qui — questo script prepara solo l'ambiente
-- (estensioni + namespace), coerente con "le migrazioni sono la fonte di
-- verità dello schema", mai duplicata in due posti diversi.
