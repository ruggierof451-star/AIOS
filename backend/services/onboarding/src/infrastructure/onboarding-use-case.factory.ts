import { Injectable, Inject } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { StartConversationUseCase, StartConversationInput, StartConversationOutput } from '../application/start-conversation.use-case';
import {
  ProvisionNewTenantUseCase,
  ProvisionNewTenantInput,
  ProvisionNewTenantOutput,
} from '../application/provision-new-tenant.use-case';
import {
  RecordLegalConsentUseCase,
  RecordLegalConsentInput,
  RecordLegalConsentOutput,
} from '../application/record-legal-consent.use-case';
import { GetCurrentLegalDocumentsUseCase } from '../application/get-current-legal-documents.use-case';
import { LegalDocumentVersionInfo } from '../application/legal-consent-ports';
import { PrismaConversationSessionStore } from './prisma-conversation-session-store';
import { PrismaLegalDocumentRepository } from './prisma-legal-document.repository';
import { runLegalConsentUnitOfWork } from './legal-consent-unit-of-work';
import { HttpOrganizationClient } from './http-organization-client';
import { HttpAdministrationClient } from './http-administration-client';
import { HttpWorkspaceClient } from './http-workspace-client';
import { PRISMA_CLIENT } from './tokens';

@Injectable()
export class OnboardingUseCaseFactory {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    private readonly organizationClient: HttpOrganizationClient,
    private readonly administrationClient: HttpAdministrationClient,
    private readonly workspaceClient: HttpWorkspaceClient,
  ) {}

  async startConversation(input: StartConversationInput): Promise<StartConversationOutput> {
    const sessionStore = new PrismaConversationSessionStore(this.prisma);
    const useCase = new StartConversationUseCase(sessionStore);
    return useCase.execute(input);
  }

  async getConversationSession(conversationId: string) {
    const sessionStore = new PrismaConversationSessionStore(this.prisma);
    return sessionStore.findById(conversationId);
  }

  async provisionNewTenant(input: ProvisionNewTenantInput): Promise<ProvisionNewTenantOutput> {
    const sessionStore = new PrismaConversationSessionStore(this.prisma);
    const useCase = new ProvisionNewTenantUseCase(
      sessionStore,
      this.organizationClient,
      this.administrationClient,
      this.workspaceClient,
    );
    return useCase.execute(input);
  }

  async getCurrentLegalDocuments(): Promise<LegalDocumentVersionInfo[]> {
    const legalDocumentRepository = new PrismaLegalDocumentRepository(this.prisma);
    const useCase = new GetCurrentLegalDocumentsUseCase(legalDocumentRepository);
    return useCase.execute();
  }

  async recordLegalConsent(input: RecordLegalConsentInput): Promise<RecordLegalConsentOutput> {
    return runLegalConsentUnitOfWork(this.prisma, ({ sessionRepository, legalDocumentRepository, acceptanceRepository, eventPublisher }) => {
      const useCase = new RecordLegalConsentUseCase(
        sessionRepository,
        legalDocumentRepository,
        acceptanceRepository,
        eventPublisher,
      );
      return useCase.execute(input);
    });
  }
}
