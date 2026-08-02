/**
 * Seed di sviluppo — crea un'Organization demo, un Workspace demo, tre
 * utenti (Admin, Manager, Employee) con ruoli e permessi assegnati.
 *
 * Uso: pnpm db:seed (dopo aver eseguito le migrazioni, pnpm db:migrate)
 *
 * Nota di scope dichiarata: questo script usa @prisma/client direttamente
 * (non passa dai casi d'uso/API dei singoli servizi) — è uno strumento di
 * sviluppo, non un client dell'API pubblica.
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';

// Rete di protezione: questo seed crea utenti con password NOTA.
// In produzione è una porta aperta, quindi di norma si rifiuta di partire.
//
// L'unica eccezione è esplicita e volontaria: AIOS_SEED_DEMO=1. Serve a
// popolare un ambiente dimostrativo appena creato, quando senza utenti non
// si può nemmeno verificare che il deploy funzioni. Chi la imposta sa cosa
// sta facendo — ed è invitato a rimuoverla subito dopo.
const seedDemoRichiesto = ['1', 'true'].includes(process.env.AIOS_SEED_DEMO ?? '');

if (process.env.NODE_ENV === 'production' && !seedDemoRichiesto) {
  console.error(
    'Il seed di sviluppo non gira in produzione: creerebbe account con password nota.\n' +
      'Se ti serve davvero un ambiente dimostrativo, imposta AIOS_SEED_DEMO=1 — e rimuovila\n' +
      'appena hai verificato l\'accesso. Altrimenti registra il primo utente dall\'interfaccia.',
  );
  process.exit(1);
}

if (process.env.NODE_ENV === 'production' && seedDemoRichiesto) {
  console.warn(
    '\n⚠  AIOS_SEED_DEMO è attiva in PRODUZIONE.\n' +
      '   Sto creando utenti dimostrativi con password nota (DemoPassword123!).\n' +
      '   Cambia quelle password o elimina quegli account prima di usare AIOS con dati veri,\n' +
      '   e rimuovi AIOS_SEED_DEMO dalle variabili del servizio.\n',
  );
}

const prisma = new PrismaClient();

async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

async function main() {
  console.log('[seed] Inizio popolamento dati demo...');

  const demoPassword = await hashPassword('DemoPassword123!');

  const admin = await prisma.user.upsert({
    where: { email: 'admin@demo.aios.local' },
    // CAUSA DEL BUG (verificata, non ipotizzata): con `update: {}` questo
    // upsert non tocca MAI una riga già esistente — il volume Postgres di
    // Docker persiste tra un `docker compose up`/`down` e l'altro, quindi
    // se questa riga è stata creata una sola volta in una qualunque
    // esecuzione precedente del seed, `update: {}` la lascia congelata
    // per sempre, a prescindere da quante volte il seed viene rilanciato.
    // Reimpostare esplicitamente passwordHash/status ad ogni esecuzione
    // rende il seed idempotente per davvero: riporta sempre l'utente
    // demo allo stato atteso, invece di limitarsi a garantirne
    // l'esistenza.
    update: { passwordHash: demoPassword, status: 'ACTIVE' },
    create: { id: randomUUID(), email: 'admin@demo.aios.local', passwordHash: demoPassword, status: 'ACTIVE' },
  });

  const manager = await prisma.user.upsert({
    where: { email: 'manager@demo.aios.local' },
    update: { passwordHash: demoPassword, status: 'ACTIVE' },
    create: { id: randomUUID(), email: 'manager@demo.aios.local', passwordHash: demoPassword, status: 'ACTIVE' },
  });

  const employee = await prisma.user.upsert({
    where: { email: 'employee@demo.aios.local' },
    update: { passwordHash: demoPassword, status: 'ACTIVE' },
    create: { id: randomUUID(), email: 'employee@demo.aios.local', passwordHash: demoPassword, status: 'ACTIVE' },
  });

  console.log('[seed] Utenti creati: admin, manager, employee (password per tutti: DemoPassword123!)');

  const organization = await prisma.organization.upsert({
    where: { id: '00000000-0000-7000-8000-000000000001' },
    // Stessa lezione già imparata per gli utenti demo: `update: {}`
    // lascerebbe name/slug per sempre null su un database già esistente
    // da prima della Feature 2.1, dato che il repository ora richiede
    // entrambi valorizzati per leggere un'Organization. Riallineati
    // esplicitamente anche in update, non solo in create.
    update: { name: 'AIOS Demo Srl', slug: 'aios-demo-srl' },
    create: {
      id: '00000000-0000-7000-8000-000000000001',
      name: 'AIOS Demo Srl',
      slug: 'aios-demo-srl',
      legalName: 'AIOS Demo Srl',
      ownerUserId: admin.id,
      plan: 'PROFESSIONAL',
      lockVersion: 1,
    },
  });

  console.log(`[seed] Organization demo creata: ${organization.name} (${organization.id})`);

  const adminRole = await prisma.role.upsert({
    where: { organizationId_name: { organizationId: organization.id, name: 'Admin' } },
    update: {},
    create: {
      id: randomUUID(),
      organizationId: organization.id,
      name: 'Admin',
      isSystemRole: false,
      permissions: {
        create: [
          { action: 'organization.update' },
          { action: 'organization.plan.change' },
          { action: 'organization.archive' },
          { action: 'workspace.create' },
          { action: 'workspace.member.invite' },
          { action: 'workspace.member.remove' },
          { action: 'workspace.member.role.change' },
        ],
      },
    },
  });

  const managerRole = await prisma.role.upsert({
    where: { organizationId_name: { organizationId: organization.id, name: 'Manager' } },
    update: {},
    create: {
      id: randomUUID(),
      organizationId: organization.id,
      name: 'Manager',
      isSystemRole: false,
      permissions: {
        create: [{ action: 'workspace.member.invite' }, { action: 'workspace.member.role.change' }],
      },
    },
  });

  const employeeRole = await prisma.role.upsert({
    where: { organizationId_name: { organizationId: organization.id, name: 'Employee' } },
    update: {},
    create: {
      id: randomUUID(),
      organizationId: organization.id,
      name: 'Employee',
      isSystemRole: false,
      permissions: { create: [] },
    },
  });

  console.log('[seed] Ruoli creati: Admin, Manager, Employee');

  for (const [user, role] of [
    [admin, adminRole],
    [manager, managerRole],
    [employee, employeeRole],
  ] as const) {
    await prisma.userRoleAssignment.upsert({
      where: {
        userId_organizationId_roleId: { userId: user.id, organizationId: organization.id, roleId: role.id },
      },
      update: {},
      create: { id: randomUUID(), userId: user.id, organizationId: organization.id, roleId: role.id },
    });
  }

  console.log('[seed] Ruoli assegnati agli utenti demo');

  const workspace = await prisma.workspace.upsert({
    where: { id: '00000000-0000-7000-8000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-7000-8000-000000000002',
      organizationId: organization.id,
      name: 'Workspace Demo',
      lockVersion: 1,
      memberships: {
        create: [
          { userId: admin.id, roleName: 'Admin' },
          { userId: manager.id, roleName: 'Manager' },
          { userId: employee.id, roleName: 'Employee' },
        ],
      },
    },
  });

  console.log(`[seed] Workspace demo creato: ${workspace.name} (${workspace.id})`);

  // Feature 2.2, Incremento 1: senza almeno una versione corrente per
  // ciascun documento richiesto, gli endpoint di consenso legale non
  // avrebbero nulla da restituire/accettare. `contentUrl` è un
  // segnaposto — il testo legale reale è responsabilità del team
  // legale/business, non di questo seed, e va sostituito prima di un
  // rilascio reale: non genero un testo legale plausibile ma finto, che
  // sarebbe più pericoloso di un placeholder esplicitamente marcato come
  // tale.
  const legalDocuments: Array<{ documentType: string; version: number; contentUrl: string }> = [
    { documentType: 'TERMS_OF_SERVICE', version: 1, contentUrl: 'https://aios.local/legal/placeholder/terms-v1' },
    { documentType: 'PRIVACY_POLICY', version: 1, contentUrl: 'https://aios.local/legal/placeholder/privacy-v1' },
    { documentType: 'AI_USAGE_CONSENT', version: 1, contentUrl: 'https://aios.local/legal/placeholder/ai-consent-v1' },
    { documentType: 'DPA', version: 1, contentUrl: 'https://aios.local/legal/placeholder/dpa-v1' },
  ];
  for (const doc of legalDocuments) {
    await prisma.legalDocumentVersion.upsert({
      where: { documentType_version: { documentType: doc.documentType, version: doc.version } },
      update: { contentUrl: doc.contentUrl, isCurrent: true },
      create: {
        documentType: doc.documentType,
        version: doc.version,
        contentUrl: doc.contentUrl,
        effectiveFrom: new Date(),
        isCurrent: true,
      },
    });
  }
  console.log(`[seed] ${legalDocuments.length} versioni di documenti legali create/aggiornate (contentUrl segnaposto — da sostituire prima di un rilascio reale).`);

  console.log('\n[seed] Completato. Credenziali di test:');
  console.log('  admin@demo.aios.local    / DemoPassword123!  (ruolo Admin)');
  console.log('  manager@demo.aios.local  / DemoPassword123!  (ruolo Manager)');
  console.log('  employee@demo.aios.local / DemoPassword123!  (ruolo Employee)');
  console.log(`  Organization ID: ${organization.id}`);
  console.log(`  Workspace ID: ${workspace.id}`);
}

main()
  .catch((err) => {
    console.error('[seed] Errore durante il popolamento:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
