-- AIOS — migrazione iniziale
--
-- Crea i sette schema Postgres (uno per Bounded Context, Physical Database
-- Schema sez. 1.1), i tipi enumerati e le venti tabelle dello schema Prisma.
--
-- Nessuna chiave esterna attraversa i confini fra schema (sez. 1.4): i
-- riferimenti cross-context — organizations.owner_user_id verso
-- identity.users, workspace_memberships.user_id, retry_queue.event_id —
-- restano volutamente senza vincolo nativo. È una scelta di dominio, non
-- una dimenticanza: legare due Bounded Context con una FK impedirebbe di
-- separarli in futuro senza una migrazione dei dati.

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "administration";
CREATE SCHEMA IF NOT EXISTS "eventing";
CREATE SCHEMA IF NOT EXISTS "identity";
CREATE SCHEMA IF NOT EXISTS "legal";
CREATE SCHEMA IF NOT EXISTS "onboarding";
CREATE SCHEMA IF NOT EXISTS "organization";
CREATE SCHEMA IF NOT EXISTS "workspace";

-- CreateEnum
CREATE TYPE "identity"."UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "organization"."Plan" AS ENUM ('FREE', 'STARTER', 'PROFESSIONAL', 'BUSINESS', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "organization"."OrganizationStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'ARCHIVED', 'DELETED');

-- CreateEnum
CREATE TYPE "workspace"."Density" AS ENUM ('COMFORTABLE', 'COMPACT');

-- CreateEnum
CREATE TYPE "workspace"."InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "workspace"."Theme" AS ENUM ('LIGHT', 'DARK', 'SYSTEM');

-- CreateEnum
CREATE TYPE "administration"."ActorType" AS ENUM ('USER', 'AGENT');

-- CreateEnum
CREATE TYPE "onboarding"."ConversationSessionStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "onboarding"."ConversationStepStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "identity"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "mfa_secret" TEXT,
    "status" "identity"."UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "lock_version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity"."refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "replaced_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization"."organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "slug" TEXT,
    "legal_name" TEXT,
    "vat_number" TEXT,
    "tax_code" TEXT,
    "pec" TEXT,
    "sdi" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "logo_url" TEXT,
    "address" TEXT,
    "city" TEXT,
    "province" TEXT,
    "postal_code" TEXT,
    "country" TEXT NOT NULL DEFAULT 'IT',
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Rome',
    "language" TEXT NOT NULL DEFAULT 'it',
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "fiscal_year_start" INTEGER NOT NULL DEFAULT 1,
    "fiscal_year_end" INTEGER NOT NULL DEFAULT 12,
    "default_workspace_id" TEXT,
    "owner_user_id" TEXT NOT NULL,
    "plan" "organization"."Plan" NOT NULL DEFAULT 'STARTER',
    "status" "organization"."OrganizationStatus" NOT NULL DEFAULT 'ACTIVE',
    "settings" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "archived_at" TIMESTAMP(3),
    "lock_version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization"."branches" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archived_at" TIMESTAMP(3),

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization"."departments" (
    "id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archived_at" TIMESTAMP(3),

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace"."workspace_preferences" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "sidebar_expanded" BOOLEAN NOT NULL DEFAULT true,
    "density" "workspace"."Density" NOT NULL DEFAULT 'COMFORTABLE',
    "theme" "workspace"."Theme" NOT NULL DEFAULT 'SYSTEM',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace"."workspaces" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "archived_at" TIMESTAMP(3),
    "lock_version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace"."workspace_memberships" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role_name" TEXT NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace"."workspace_invites" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "invited_by_user_id" TEXT NOT NULL,
    "role_name" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "status" "workspace"."InviteStatus" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accepted_at" TIMESTAMP(3),

    CONSTRAINT "workspace_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "administration"."roles" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT,
    "name" TEXT NOT NULL,
    "is_system_role" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "administration"."role_permissions" (
    "id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "scope" JSONB,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "administration"."user_role_assignments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_role_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "administration"."audit_log" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "actor_type" "administration"."ActorType" NOT NULL,
    "actor_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "before_state" JSONB,
    "after_state" JSONB,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventing"."outbox" (
    "id" TEXT NOT NULL,
    "aggregate_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "event_version" INTEGER NOT NULL DEFAULT 1,
    "payload" JSONB NOT NULL,
    "organization_id" TEXT,
    "correlation_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMP(3),

    CONSTRAINT "outbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventing"."retry_queue" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "consumer_name" TEXT NOT NULL,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "last_error" TEXT NOT NULL,
    "next_retry_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "retry_queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventing"."dead_letter_queue" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "consumer_name" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "failure_reason" TEXT NOT NULL,
    "attempts_made" INTEGER NOT NULL,
    "moved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dead_letter_queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboarding"."conversation_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "organization_id" TEXT,
    "status" "onboarding"."ConversationSessionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversation_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboarding"."conversation_steps" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "step_key" TEXT NOT NULL,
    "status" "onboarding"."ConversationStepStatus" NOT NULL DEFAULT 'PENDING',
    "result_data" JSONB,
    "completed_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversation_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legal"."legal_document_versions" (
    "id" TEXT NOT NULL,
    "document_type" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "content_url" TEXT NOT NULL,
    "effective_from" TIMESTAMP(3) NOT NULL,
    "is_current" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "legal_document_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legal"."legal_document_acceptances" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "document_type" TEXT NOT NULL,
    "document_version" INTEGER NOT NULL,
    "accepted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" TEXT,
    "user_agent" TEXT,

    CONSTRAINT "legal_document_acceptances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "identity"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "identity"."refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "identity"."refresh_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organization"."organizations"("slug");

-- CreateIndex
CREATE INDEX "branches_organization_id_idx" ON "organization"."branches"("organization_id");

-- CreateIndex
CREATE INDEX "departments_branch_id_idx" ON "organization"."departments"("branch_id");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_preferences_user_id_organization_id_key" ON "workspace"."workspace_preferences"("user_id", "organization_id");

-- CreateIndex
CREATE INDEX "workspaces_organization_id_idx" ON "workspace"."workspaces"("organization_id");

-- CreateIndex
CREATE INDEX "workspace_memberships_user_id_idx" ON "workspace"."workspace_memberships"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_memberships_workspace_id_user_id_key" ON "workspace"."workspace_memberships"("workspace_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_invites_token_hash_key" ON "workspace"."workspace_invites"("token_hash");

-- CreateIndex
CREATE INDEX "workspace_invites_workspace_id_idx" ON "workspace"."workspace_invites"("workspace_id");

-- CreateIndex
CREATE INDEX "workspace_invites_email_idx" ON "workspace"."workspace_invites"("email");

-- CreateIndex
CREATE UNIQUE INDEX "roles_organization_id_name_key" ON "administration"."roles"("organization_id", "name");

-- CreateIndex
CREATE INDEX "role_permissions_role_id_idx" ON "administration"."role_permissions"("role_id");

-- CreateIndex
CREATE INDEX "user_role_assignments_user_id_organization_id_idx" ON "administration"."user_role_assignments"("user_id", "organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_role_assignments_user_id_organization_id_role_id_key" ON "administration"."user_role_assignments"("user_id", "organization_id", "role_id");

-- CreateIndex
CREATE INDEX "audit_log_organization_id_resource_type_resource_id_idx" ON "administration"."audit_log"("organization_id", "resource_type", "resource_id");

-- CreateIndex
CREATE INDEX "audit_log_organization_id_occurred_at_idx" ON "administration"."audit_log"("organization_id", "occurred_at");

-- CreateIndex
CREATE INDEX "outbox_published_at_idx" ON "eventing"."outbox"("published_at");

-- CreateIndex
CREATE INDEX "outbox_aggregate_id_idx" ON "eventing"."outbox"("aggregate_id");

-- CreateIndex
CREATE INDEX "retry_queue_next_retry_at_idx" ON "eventing"."retry_queue"("next_retry_at");

-- CreateIndex
CREATE INDEX "conversation_sessions_user_id_idx" ON "onboarding"."conversation_sessions"("user_id");

-- CreateIndex
CREATE INDEX "conversation_steps_session_id_idx" ON "onboarding"."conversation_steps"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_steps_session_id_step_key_key" ON "onboarding"."conversation_steps"("session_id", "step_key");

-- CreateIndex
CREATE UNIQUE INDEX "legal_document_versions_document_type_version_key" ON "legal"."legal_document_versions"("document_type", "version");

-- CreateIndex
CREATE INDEX "legal_document_versions_document_type_is_current_idx" ON "legal"."legal_document_versions"("document_type", "is_current");

-- CreateIndex
CREATE INDEX "legal_document_acceptances_user_id_idx" ON "legal"."legal_document_acceptances"("user_id");

-- CreateIndex
CREATE INDEX "legal_document_acceptances_conversation_id_idx" ON "legal"."legal_document_acceptances"("conversation_id");

-- AddForeignKey
ALTER TABLE "identity"."refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization"."branches" ADD CONSTRAINT "branches_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization"."departments" ADD CONSTRAINT "departments_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "organization"."branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace"."workspace_memberships" ADD CONSTRAINT "workspace_memberships_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspace"."workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace"."workspace_invites" ADD CONSTRAINT "workspace_invites_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspace"."workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "administration"."role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "administration"."roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "administration"."user_role_assignments" ADD CONSTRAINT "user_role_assignments_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "administration"."roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding"."conversation_steps" ADD CONSTRAINT "conversation_steps_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "onboarding"."conversation_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
