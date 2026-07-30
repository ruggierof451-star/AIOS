/**
 * Backfill una tantum — Milestone 2.1 (evoluzione modello dati Organization).
 *
 * `prisma migrate dev` applica solo la STRUTTURA (nuove colonne, nuovo
 * enum) — non conosce la logica di business per valorizzare i dati
 * esistenti. Questo script colma esattamente quel divario, per ogni
 * riga creata PRIMA di questa migrazione:
 *
 * - `name` mancante → valorizzato da `legalName`
 * - `slug` mancante → generato da `name`, reso univoco
 * - `status` → ARCHIVED se `archivedAt` non è null, altrimenti resta
 *   ACTIVE (il default già applicato dalla migrazione strutturale)
 *
 * Idempotente: rieseguirlo su righe già backfillate non fa nulla (i
 * filtri `WHERE name IS NULL` / `WHERE slug IS NULL` le escludono).
 *
 * Non fa parte del normale `pnpm db:migrate` — è specifico di QUESTA
 * migrazione, va eseguito una sola volta su un database che aveva già
 * dati prima della Milestone 2.1. Un database nuovo (creato via
 * `pnpm db:seed` dopo questa milestone) non ne ha bisogno: il seed
 * stesso ora valorizza name/slug direttamente.
 */
import { PrismaClient } from '@prisma/client';
import { loadRootEnv } from '@aios/domain-model';
import { normalizeSlug } from '../backend/services/organization/src/domain/slug';

loadRootEnv();

const prisma = new PrismaClient();

async function ensureUniqueSlug(baseSlug: string, excludeId: string): Promise<string> {
  let candidate = baseSlug;
  let suffix = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.organization.findUnique({ where: { slug: candidate } });
    if (!existing || existing.id === excludeId) return candidate;
    suffix += 1;
    candidate = `${baseSlug}-${suffix}`;
  }
}

async function main() {
  const withoutName = await prisma.organization.findMany({ where: { name: null } });
  console.log(`[backfill-2.1] Organizzazioni senza 'name': ${withoutName.length}`);
  for (const org of withoutName) {
    const fallbackName = org.legalName ?? `Organizzazione ${org.id.slice(0, 8)}`;
    await prisma.organization.update({ where: { id: org.id }, data: { name: fallbackName } });
    console.log(`  - ${org.id}: name = "${fallbackName}"`);
  }

  const withoutSlug = await prisma.organization.findMany({ where: { slug: null } });
  console.log(`[backfill-2.1] Organizzazioni senza 'slug': ${withoutSlug.length}`);
  for (const org of withoutSlug) {
    const sourceName = org.name ?? org.legalName ?? org.id;
    const baseSlug = normalizeSlug(sourceName) || org.id.slice(0, 8);
    const uniqueSlug = await ensureUniqueSlug(baseSlug, org.id);
    await prisma.organization.update({ where: { id: org.id }, data: { slug: uniqueSlug } });
    console.log(`  - ${org.id}: slug = "${uniqueSlug}"`);
  }

  const result = await prisma.$executeRawUnsafe(
    `UPDATE organization.organizations SET status = 'ARCHIVED' WHERE archived_at IS NOT NULL AND status = 'ACTIVE'`,
  );
  console.log(`[backfill-2.1] Righe portate a status = ARCHIVED (da archived_at storico): ${result}`);

  console.log('[backfill-2.1] Completato.');
}

main()
  .catch((err) => {
    console.error('[backfill-2.1] Errore:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
