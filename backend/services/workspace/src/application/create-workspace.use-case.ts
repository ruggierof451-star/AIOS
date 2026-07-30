import { Workspace } from '../domain/workspace.entity';
import { WorkspaceRepository, DomainEventPublisher } from './ports';

export interface CreateWorkspaceInput {
  organizationId: string;
  name: string;
  creatorUserId: string;
  creatorRoleName: string;
}

export interface CreateWorkspaceOutput {
  workspaceId: string;
  name: string;
}

export class CreateWorkspaceUseCase {
  constructor(
    private readonly workspaceRepository: WorkspaceRepository,
    private readonly eventPublisher: DomainEventPublisher,
  ) {}

  async execute(input: CreateWorkspaceInput): Promise<CreateWorkspaceOutput> {
    const workspace = Workspace.create({
      organizationId: input.organizationId,
      name: input.name,
      creatorUserId: input.creatorUserId,
      creatorRoleName: input.creatorRoleName,
    });

    await this.workspaceRepository.save(workspace);

    await this.eventPublisher.publish({
      eventType: 'WorkspaceCreated',
      aggregateId: workspace.id,
      organizationId: workspace.organizationId,
      payload: { schema_version: 1, workspace_id: workspace.id, organization_id: workspace.organizationId, name: workspace.name },
    });

    return { workspaceId: workspace.id, name: workspace.name };
  }
}
