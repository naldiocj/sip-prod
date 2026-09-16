import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL ?? "postgresql://sip:sip@localhost:5432/sip?schema=public"
  })
});

async function main() {
  const roles = [
    { codigo: "diretor_geral", nome: "Diretor Geral", parent: null },
    { codigo: "diretor_nacional", nome: "Diretor Nacional", parent: "diretor_geral" },
    { codigo: "chefe_departamento", nome: "Chefe de Departamento", parent: "diretor_nacional" },
    { codigo: "chefe_seccao", nome: "Chefe de Secção", parent: "chefe_departamento" },
    { codigo: "instrutor", nome: "Instrutor", parent: "chefe_seccao" },
    { codigo: "oficial_secretaria", nome: "Oficial de Secretaria", parent: "chefe_seccao" },
    { codigo: "agente_piquete", nome: "Agente do Piquete", parent: "chefe_seccao" },
    { codigo: "procurador", nome: "Procurador", parent: null }
  ];

  const roleMap = new Map<string, { id: string }>();

  for (const roleData of roles) {
    const existing = await prisma.role.findUnique({
      where: { key: roleData.codigo }
    });

    let role;
    if (existing) {
      role = existing;
    } else {
      role = await prisma.role.create({
        data: {
          key: roleData.codigo,
          name: roleData.nome,
          parent: roleData.parent
            ? { connect: { key: roleData.parent } }
            : undefined
        }
      });
    }

    roleMap.set(roleData.codigo, role);
  }

  const permissions = [
    { codigo: "acto:register", nome: "Registar acto", modulo: "acto", accao: "register" },
    { codigo: "processo:read", nome: "Consultar processo", modulo: "processo", accao: "read" },
    { codigo: "processo:write", nome: "Alterar processo", modulo: "processo", accao: "write" },
    { codigo: "processo:review", nome: "Rever processo", modulo: "processo", accao: "review" },
    { codigo: "peca:sign", nome: "Assinar peça", modulo: "peca", accao: "sign" },
    { codigo: "peca:write", nome: "Alterar peça", modulo: "peca", accao: "write" },
    { codigo: "entrada_pgr:register", nome: "Registar entrada PGR", modulo: "entrada_pgr", accao: "register" },
    { codigo: "despacho:write", nome: "Alterar despacho", modulo: "despacho", accao: "write" },
    { codigo: "relatorio:export", nome: "Exportar relatório", modulo: "relatorio", accao: "export" },
    { codigo: "acto_piquete:criar", nome: "Criar acto do piquete", modulo: "acto_piquete", accao: "criar" },
    { codigo: "acto_piquete:ler", nome: "Ler actos do piquete", modulo: "acto_piquete", accao: "ler" },
    { codigo: "acto_piquete:validar", nome: "Validar acto do piquete", modulo: "acto_piquete", accao: "validar" },
    { codigo: "acto_piquete:rejeitar", nome: "Rejeitar acto do piquete", modulo: "acto_piquete", accao: "rejeitar" },
    { codigo: "processo:criar", nome: "Criar processo", modulo: "processo", accao: "criar" },
    { codigo: "processo:ler", nome: "Ler processo", modulo: "processo", accao: "ler" },
    { codigo: "processo:distribuir", nome: "Distribuir processo", modulo: "processo", accao: "distribuir" },
    { codigo: "processo:remeter", nome: "Remeter processo", modulo: "processo", accao: "remeter" },
    { codigo: "processo:arquivar", nome: "Arquivar processo", modulo: "processo", accao: "arquivar" },
    { codigo: "processo:registar_numero_procuradoria", nome: "Registar número da procuradoria", modulo: "processo", accao: "registar_numero_procuradoria" },
    { codigo: "entrada_pgr:registar", nome: "Registar entrada PGR", modulo: "entrada_pgr", accao: "registar" },
    { codigo: "entrada_pgr:encaminhar", nome: "Encaminhar entrada PGR", modulo: "entrada_pgr", accao: "encaminhar" },
    { codigo: "peca:criar", nome: "Criar peça processual", modulo: "peca", accao: "criar" },
    { codigo: "peca:gerar_pdf", nome: "Gerar PDF de peça", modulo: "peca", accao: "gerar_pdf" },
    { codigo: "peca:assinar", nome: "Assinar peça", modulo: "peca", accao: "assinar" },
    { codigo: "peca:ler", nome: "Ler peça", modulo: "peca", accao: "ler" },
    { codigo: "despacho:criar", nome: "Criar despacho", modulo: "despacho", accao: "criar" },
    { codigo: "despacho:assinar", nome: "Assinar despacho", modulo: "despacho", accao: "assinar" },
    { codigo: "despacho:ler", nome: "Ler despacho", modulo: "despacho", accao: "ler" },
    { codigo: "relatorio:ver", nome: "Ver relatórios", modulo: "relatorio", accao: "ver" },
    { codigo: "auditoria:ver", nome: "Ver auditoria", modulo: "auditoria", accao: "ver" }
  ];

  const permissionMap = new Map<string, { id: string }>();

  for (const permission of permissions) {
    const existing = await prisma.permission.findUnique({
      where: { key: permission.codigo }
    });

    const created = existing ?? await prisma.permission.create({
      data: {
        key: permission.codigo,
        name: permission.nome,
        description: `${permission.modulo}:${permission.accao}`
      }
    });

    permissionMap.set(permission.codigo, created);
  }

  // Seed TipoActo entries
  const tiposAto = [
    { codigo: "AUTO_NOTICIA", nome: "Auto de Notícia", geraProcesso: true },
    { codigo: "REVELACAO_CRIME", nome: "Revelação de Crime", geraProcesso: true },
    { codigo: "TERMO_CIRCUNSTANCIADO", nome: "Termo Circunstanciado", geraProcesso: false },
  ];

  for (const tipo of tiposAto) {
    await prisma.tipoActo.upsert({
      where: { codigo: tipo.codigo },
      update: {},
      create: {
        codigo: tipo.codigo,
        nome: tipo.nome,
        activo: true,
        geraProcesso: tipo.geraProcesso,
        campos: {},
      }
    });
  }

  const rolePermissions: Record<string, string[]> = {
    agente_piquete: ["acto_piquete:criar", "acto_piquete:ler"],
    instrutor: ["peca:sign", "processo:review"],
    oficial_secretaria: ["entrada_pgr:register", "peca:write"],
    chefe_seccao: ["processo:read", "processo:write"],
    chefe_departamento: ["processo:read", "despacho:write"],
    diretor_nacional: ["processo:read", "processo:write", "relatorio:export"],
    diretor_geral: ["processo:read", "processo:write", "despacho:write", "relatorio:export"],
    procurador: ["processo:read", "despacho:write", "relatorio:export"]
  };

  for (const [roleKey, permissionKeys] of Object.entries(rolePermissions)) {
    const role = roleMap.get(roleKey);
    if (!role) continue;

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: permissionKeys.map((permissionKey) => ({
        roleId: role.id,
        permissionId: permissionMap.get(permissionKey)!.id
      }))
    });
  }

  const passwordHash = await hash("Teste@123", 12);

  const users = [
    { email: "diretor.geral@sic.ao", name: "Diretor Geral", role: "diretor_geral" },
    { email: "diretor.nacional@sic.ao", name: "Diretor Nacional", role: "diretor_nacional" },
    { email: "chefe.depto@sic.ao", name: "Chefe de Departamento", role: "chefe_departamento" },
    { email: "chefe.seccao@sic.ao", name: "Chefe de Secção", role: "chefe_seccao" },
    { email: "instrutor@sic.ao", name: "Instrutor", role: "instrutor" },
    { email: "secretaria@sic.ao", name: "Oficial de Secretaria", role: "oficial_secretaria" },
    { email: "piquete@sic.ao", name: "Agente do Piquete", role: "agente_piquete" },
    { email: "procurador@pgr.ao", name: "Procurador", role: "procurador" }
  ];

  for (const userData of users) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {
        name: userData.name,
        passwordHash
      },
      create: {
        email: userData.email,
        name: userData.name,
        passwordHash,
        roles: {
          create: [
            { role: { connect: { key: userData.role } } }
          ]
        }
      }
    });

    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: (await prisma.role.findUniqueOrThrow({ where: { key: userData.role } })).id } },
      update: {},
      create: {
        userId: user.id,
        roleId: (await prisma.role.findUniqueOrThrow({ where: { key: userData.role } })).id
      }
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
