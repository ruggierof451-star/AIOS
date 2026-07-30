import { LegalDocumentRepository, LegalDocumentVersionInfo } from './legal-consent-ports';

/**
 * Restituisce la versione corrente di ogni documento legale richiesto —
 * usato dal client per mostrare/collegare i testi prima che l'utente
 * acconsenta (non ha senso chiedere un consenso senza permettere di
 * leggere cosa si sta accettando).
 */
export class GetCurrentLegalDocumentsUseCase {
  constructor(private readonly legalDocumentRepository: LegalDocumentRepository) {}

  async execute(): Promise<LegalDocumentVersionInfo[]> {
    return this.legalDocumentRepository.getAllCurrentVersions();
  }
}
