import { describe, it, expect } from 'vitest';
import { ConversationSteps } from '../conversation-steps';

describe('ConversationSteps (registry)', () => {
  it('non ha due chiavi con lo stesso valore stringa', () => {
    const values = Object.values(ConversationSteps);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });

  it('espone le tre chiavi note del provisioning', () => {
    expect(ConversationSteps.ORGANIZATION_CREATED).toBe('organization_created');
    expect(ConversationSteps.ROLES_PROVISIONED).toBe('roles_provisioned');
    expect(ConversationSteps.WORKSPACE_CREATED).toBe('workspace_created');
  });
});
