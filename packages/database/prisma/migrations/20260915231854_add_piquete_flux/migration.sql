-- CreateTable
CREATE TABLE "tipos_atos" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "gera_processo" BOOLEAN NOT NULL DEFAULT false,
    "campos" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pk_tipos_atos" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sequencias_numeracao" (
    "id" TEXT NOT NULL,
    "unidade" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "ultimo_numero" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pk_sequencias_numeracao" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_keys" (
    "id" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "request_hash" TEXT NOT NULL,
    "response_body" JSONB NOT NULL,
    "response_status" INTEGER NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_idempotency_keys" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" TEXT NOT NULL,
    "event_name" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "aggregate_id" TEXT NOT NULL,
    "aggregate_type" TEXT NOT NULL,
    "processado" BOOLEAN NOT NULL DEFAULT false,
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "ultimo_erro" TEXT,
    "processado_em" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_outbox_events" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "accao" TEXT NOT NULL,
    "recurso_tipo" TEXT NOT NULL,
    "recurso_id" TEXT NOT NULL,
    "dados_antes" JSONB,
    "dados_depois" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_audit_logs" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_tipos_atos_codigo" ON "tipos_atos"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "uq_sequencias_unidade_tipo_ano" ON "sequencias_numeracao"("unidade", "tipo", "ano");

-- CreateIndex
CREATE UNIQUE INDEX "uq_idempotency_keys_chave" ON "idempotency_keys"("chave");

-- CreateIndex
CREATE INDEX "idx_idempotency_keys_user_id" ON "idempotency_keys"("user_id");

-- CreateIndex
CREATE INDEX "idx_idempotency_keys_expires_at" ON "idempotency_keys"("expires_at");

-- CreateIndex
CREATE INDEX "idx_outbox_processado_created" ON "outbox_events"("processado", "created_at");

-- CreateIndex
CREATE INDEX "idx_audit_log_user_created" ON "audit_log"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_audit_log_recurso" ON "audit_log"("recurso_tipo", "recurso_id");

-- AddForeignKey
ALTER TABLE "actos_piquete" ADD CONSTRAINT "actos_piquete_tipo_acto_id_fkey" FOREIGN KEY ("tipo_acto_id") REFERENCES "tipos_atos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
