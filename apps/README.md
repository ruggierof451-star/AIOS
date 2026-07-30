# Apps

Le tre superfici client di AIOS, tutte sopra la stessa API (Step 1, principio
"una sola fonte di verità, quattro superfici" — la quarta è il backend stesso,
non un client).

| App | Framework | Condivide con |
|---|---|---|
| `web/` | Next.js | Fonte primaria dei componenti UI (`packages/ui-components`) |
| `desktop/` | Tauri | Incapsula `web/` — nessuna UI propria duplicata, solo il layer nativo (Rust) per notifiche di sistema e accesso file locali |
| `mobile/` | React Native (Expo) | Stessi token di `packages/design-system`, componenti propri (React Native non condivide il DOM con React web) |

## Regola di coerenza (Product Bible, Design System)

Un cambiamento visivo o di interazione approvato nella Product Bible si applica
a tutte e tre le superfici, adattato al pattern del dispositivo (Product Bible,
Modulo 3, Navigazione Mobile, sezione 8) — mai un comportamento presente solo
su una piattaforma senza motivazione esplicita documentata.
