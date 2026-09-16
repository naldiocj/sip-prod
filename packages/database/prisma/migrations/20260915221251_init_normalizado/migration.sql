-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "unidade_organica_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pk_users" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parent_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pk_roles" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pk_permissions" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,

    CONSTRAINT "pk_role_permissions" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,

    CONSTRAINT "pk_user_roles" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "replaced_by_token_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_refresh_tokens" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unidades_organicas" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pk_unidades_organicas" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processos" (
    "id" TEXT NOT NULL,
    "numero_interno" TEXT NOT NULL,
    "numero_procuradoria" TEXT,
    "estado" TEXT NOT NULL,
    "origem" TEXT NOT NULL,
    "tipicidade_codigo" TEXT,
    "tipicidade_designacao" TEXT,
    "tipicidade_artigo_cpp" TEXT,
    "piquete_id" TEXT,
    "instrutor_id" TEXT,
    "unidade_actual_id" TEXT NOT NULL,
    "data_instauracao" TIMESTAMP(3) NOT NULL,
    "data_ultima_transicao" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pk_processos" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "actos_piquete" (
    "id" TEXT NOT NULL,
    "tipo_acto_id" TEXT NOT NULL,
    "tipo_acto_codigo" TEXT NOT NULL,
    "piquete_id" TEXT NOT NULL,
    "user_registo_id" TEXT NOT NULL,
    "numero_acto" TEXT NOT NULL,
    "factos" TEXT NOT NULL,
    "dados" JSONB NOT NULL,
    "estado" TEXT NOT NULL,
    "processo_id" TEXT,
    "gera_processo" BOOLEAN NOT NULL,
    "data_registo" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pk_actos_piquete" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pecas_processuais" (
    "id" TEXT NOT NULL,
    "processo_id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "numero_ordem" INTEGER NOT NULL,
    "dados" JSONB NOT NULL,
    "estado" TEXT NOT NULL,
    "hash_documento" TEXT,
    "pdf_path" TEXT,
    "criada_por" TEXT NOT NULL,
    "criada_em" TIMESTAMP(3) NOT NULL,
    "assinada_por" TEXT,
    "assinada_em" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pk_pecas_processuais" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_users_email" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "uq_roles_key" ON "roles"("key");

-- CreateIndex
CREATE UNIQUE INDEX "uq_permissions_key" ON "permissions"("key");

-- CreateIndex
CREATE INDEX "idx_role_permissions_permission_id" ON "role_permissions"("permission_id");

-- CreateIndex
CREATE INDEX "idx_user_roles_role_id" ON "user_roles"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_user_roles_user_id_role_id" ON "user_roles"("user_id", "role_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_refresh_tokens_token_hash" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "idx_refresh_tokens_session_id" ON "refresh_tokens"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_unidades_organicas_codigo" ON "unidades_organicas"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "uq_processos_numero_interno" ON "processos"("numero_interno");

-- CreateIndex
CREATE UNIQUE INDEX "uq_processos_numero_procuradoria" ON "processos"("numero_procuradoria");

-- CreateIndex
CREATE INDEX "idx_processos_estado" ON "processos"("estado");

-- CreateIndex
CREATE INDEX "idx_processos_unidade_actual_id" ON "processos"("unidade_actual_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_actos_piquete_numero_acto" ON "actos_piquete"("numero_acto");

-- CreateIndex
CREATE INDEX "idx_actos_piquete_piquete_id" ON "actos_piquete"("piquete_id");

-- CreateIndex
CREATE INDEX "idx_actos_piquete_estado" ON "actos_piquete"("estado");

-- CreateIndex
CREATE INDEX "idx_actos_piquete_data_registo" ON "actos_piquete"("data_registo");

-- CreateIndex
CREATE INDEX "idx_pecas_processuais_processo_id" ON "pecas_processuais"("processo_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_pecas_processuais_processo_id_numero_ordem" ON "pecas_processuais"("processo_id", "numero_ordem");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "fk_users_unidade_organica" FOREIGN KEY ("unidade_organica_id") REFERENCES "unidades_organicas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "fk_roles_parent" FOREIGN KEY ("parent_id") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "fk_role_permissions_role" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "fk_role_permissions_permission" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "fk_user_roles_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "fk_user_roles_role" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "fk_refresh_tokens_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actos_piquete" ADD CONSTRAINT "fk_actos_piquete_processo" FOREIGN KEY ("processo_id") REFERENCES "processos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pecas_processuais" ADD CONSTRAINT "fk_pecas_processuais_processo" FOREIGN KEY ("processo_id") REFERENCES "processos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
