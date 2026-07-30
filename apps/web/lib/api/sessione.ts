/**
 * Il poco che teniamo dal Primo Incontro reale, per non mostrare il nome
 * dell'azienda demo a chi ha appena creato la propria.
 *
 * I dati aziendali dei moduli restano simulati (vedi MOCKS.md): reale è
 * chi sei e qual è la tua organizzazione, finto è cosa c'è dentro.
 */

const CHIAVE_AZIENDA = 'aios_azienda';

export interface AziendaSalvata {
  readonly nome: string;
  readonly organizationId: string;
  readonly workspaceId: string;
}

export function salvaAzienda(a: AziendaSalvata): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CHIAVE_AZIENDA, JSON.stringify(a));
}

export function aziendaSalvata(): AziendaSalvata | null {
  if (typeof window === 'undefined') return null;
  const grezzo = window.localStorage.getItem(CHIAVE_AZIENDA);
  if (!grezzo) return null;
  try {
    const letto = JSON.parse(grezzo) as Partial<AziendaSalvata>;
    if (typeof letto.nome !== 'string' || letto.nome.length === 0) return null;
    return {
      nome: letto.nome,
      organizationId: letto.organizationId ?? '',
      workspaceId: letto.workspaceId ?? '',
    };
  } catch {
    return null;
  }
}

export function dimenticaAzienda(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(CHIAVE_AZIENDA);
}
