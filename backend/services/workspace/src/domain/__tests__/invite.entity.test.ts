import { describe, it, expect, vi } from 'vitest';
import { Invite, InviteAlreadyProcessedError, InviteExpiredError } from '../invite.entity';

function buildInvite() {
  return Invite.create({
    workspaceId: 'ws-1',
    email: 'Mario@Azienda.IT',
    invitedByUserId: 'user-1',
    roleName: 'Commerciale',
  });
}

describe('Invite', () => {
  it('crea un invito PENDING e restituisce un token in chiaro diverso dall\'hash persistito', () => {
    const { invite, plainToken } = buildInvite();
    expect(invite.status).toBe('PENDING');
    expect(plainToken).toBeTruthy();
    expect(invite.tokenHash).not.toBe(plainToken);
  });

  it('normalizza l\'email in minuscolo', () => {
    const { invite } = buildInvite();
    expect(invite.email).toBe('mario@azienda.it');
  });

  it('accetta un invito valido', () => {
    const { invite } = buildInvite();
    invite.accept();
    expect(invite.status).toBe('ACCEPTED');
  });

  it('rifiuta di accettare due volte lo stesso invito', () => {
    const { invite } = buildInvite();
    invite.accept();
    expect(() => invite.accept()).toThrow(InviteAlreadyProcessedError);
  });

  it('revoca un invito PENDING', () => {
    const { invite } = buildInvite();
    invite.revoke();
    expect(invite.status).toBe('REVOKED');
  });

  it('rifiuta di revocare un invito già accettato', () => {
    const { invite } = buildInvite();
    invite.accept();
    expect(() => invite.revoke()).toThrow(InviteAlreadyProcessedError);
  });

  it('rifiuta un invito scaduto e lo marca come EXPIRED', () => {
    const { invite } = buildInvite();
    const originalNow = Date.now;
    vi.spyOn(Date, 'now').mockReturnValue(originalNow() + 8 * 24 * 60 * 60 * 1000);

    expect(() => invite.assertCanBeAccepted()).toThrow(InviteExpiredError);
    expect(invite.status).toBe('EXPIRED');

    vi.restoreAllMocks();
  });
});
