import { describe, it, expect } from 'vitest';
import { ConversationSession, InvalidConversationSessionStateError } from '../conversation-session.entity';

function buildSession() {
  return ConversationSession.start({ userId: 'user-1' });
}

describe('ConversationSession Aggregate Root', () => {
  it('inizia in stato IN_PROGRESS, senza organizzazione né passi registrati', () => {
    const session = buildSession();
    expect(session.status).toBe('IN_PROGRESS');
    expect(session.organizationId).toBeNull();
    expect(session.steps).toEqual({});
  });

  it('registra il completamento di un passo generico con il suo risultato', () => {
    const session = buildSession();
    session.completeStep('organization_created', { organization_id: 'org-1' });

    expect(session.isStepComplete('organization_created')).toBe(true);
    expect(session.getStep('organization_created')).toEqual({
      status: 'COMPLETED',
      resultData: { organization_id: 'org-1' },
      completedAt: expect.any(Date),
    });
  });

  it('un passo mai registrato non risulta completato', () => {
    const session = buildSession();
    expect(session.isStepComplete('mai_registrato')).toBe(false);
    expect(session.getStep('mai_registrato')).toBeNull();
  });

  it('completare due volte lo stesso passo è idempotente (non lo sovrascrive)', () => {
    const session = buildSession();
    session.completeStep('organization_created', { organization_id: 'org-1' });
    const firstCompletedAt = session.getStep('organization_created')?.completedAt;

    session.completeStep('organization_created', { organization_id: 'org-DIVERSO' });

    expect(session.getStep('organization_created')?.resultData).toEqual({ organization_id: 'org-1' });
    expect(session.getStep('organization_created')?.completedAt).toBe(firstCompletedAt);
  });

  it('areStepsComplete verifica più passi insieme', () => {
    const session = buildSession();
    session.completeStep('a');
    session.completeStep('b');

    expect(session.areStepsComplete(['a', 'b'])).toBe(true);
    expect(session.areStepsComplete(['a', 'b', 'c'])).toBe(false);
  });

  it('collega l\'organizzazione una sola volta', () => {
    const session = buildSession();
    session.linkToOrganization('org-1');
    expect(session.organizationId).toBe('org-1');

    expect(() => session.linkToOrganization('org-2')).toThrow(InvalidConversationSessionStateError);
  });

  it('ricollegare la stessa organizzazione è idempotente', () => {
    const session = buildSession();
    session.linkToOrganization('org-1');
    expect(() => session.linkToOrganization('org-1')).not.toThrow();
  });

  it('failStep preserva un eventuale risultato parziale già noto', () => {
    const session = buildSession();
    session.failStep('workspace_created');
    expect(session.getStep('workspace_created')?.status).toBe('FAILED');
    expect(session.getStep('workspace_created')?.resultData).toBeNull();
  });

  it('markCompleted porta la sessione a COMPLETED', () => {
    const session = buildSession();
    session.markCompleted();
    expect(session.status).toBe('COMPLETED');
  });

  it('non permette ulteriori modifiche dopo il completamento', () => {
    const session = buildSession();
    session.markCompleted();
    expect(() => session.completeStep('altro_passo')).toThrow(InvalidConversationSessionStateError);
  });

  it('markFailed segna la sessione come fallita senza perdere i passi già completati', () => {
    const session = buildSession();
    session.completeStep('organization_created', { organization_id: 'org-1' });
    session.markFailed();

    expect(session.status).toBe('FAILED');
    expect(session.isStepComplete('organization_created')).toBe(true);
  });

  it('resume riporta una sessione fallita a IN_PROGRESS', () => {
    const session = buildSession();
    session.markFailed();
    session.resume();
    expect(session.status).toBe('IN_PROGRESS');
  });

  it('ricostruisce correttamente da dati persistiti, inclusi i passi', () => {
    const original = buildSession();
    original.linkToOrganization('org-1');
    original.completeStep('organization_created', { organization_id: 'org-1' });

    const reconstituted = ConversationSession.reconstitute(original.toPersistence());

    expect(reconstituted.id).toBe(original.id);
    expect(reconstituted.organizationId).toBe('org-1');
    expect(reconstituted.isStepComplete('organization_created')).toBe(true);
  });
});
