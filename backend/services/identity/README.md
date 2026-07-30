# Identity Service

Bounded Context Identity (Domain Model, sezione 2.1). Gestisce registrazione,
autenticazione, MFA (verifica), refresh token rotante.

## Endpoint

| Metodo | Path | Scopo |
|---|---|---|
| POST | `/api/v1/auth/register` | Registrazione nuovo utente |
| POST | `/api/v1/auth/token` | Login (email + password, + codice MFA se abilitata) |
| POST | `/api/v1/auth/refresh` | Rinnovo sessione con rotazione del refresh token |

Ogni risposta segue l'envelope unico di `@aios/api-contract`.

## Struttura (Clean Architecture)

```
src/
├── domain/           User (Aggregate Root), Email (Value Object)
├── application/      Casi d'uso + port (interfacce verso l'infrastruttura)
├── infrastructure/    Implementazioni Prisma/bcrypt/JWT/TOTP,
│                      IdentityUseCaseFactory (punto di composizione
│                      transazionale — vedi unit-of-work.ts)
└── api/               Controller REST + DTO
```

## Limiti noti di questa milestone (dichiarati esplicitamente)

1. **Flusso di enrollment MFA non incluso.** `TotpMfaVerifier` verifica un
   codice contro un secret già presente — la generazione del secret e la
   presentazione del QR code all'utente per configurare la propria app
   authenticator sono da implementare come milestone successiva.
2. **Cifratura applicativa del campo `mfa_secret`** oltre alla cifratura
   generale del database (Infrastructure Modulo 4, sez. 12.4) non ancora
   implementata — da aggiungere prima di un rilascio in produzione con
   utenti reali.
3. **Nessun test di integrazione reale contro Postgres** in questa
   consegna — solo unit test con repository fake in-memory. La cartella
   `test/integration/` è predisposta ma vuota: richiede un ambiente con
   accesso di rete per essere completata e verificata (vedi limite
   generale dichiarato nel riepilogo della Milestone 1).
4. **Rate limiting sugli endpoint di autenticazione non ancora presente**
   a livello applicativo (l'API Gateway generale lo prevede secondo
   l'Infrastructure Architecture, ma questo servizio preso isolatamente
   non ha ancora un proprio guard di rate limiting come seconda barriera).

## Come testare (quando l'ambiente lo permette)

```bash
pnpm --filter @aios/identity-service test
```
