# Cosa è simulato (e dove) — stato onesto al 30/07/2026

Regola del progetto: **dati finti sì, intelligenza finta no davanti a un
investitore.** Questo file è l'elenco unico di ciò che oggi è simulato.

| Cosa | Dove | Diventerà reale |
|---|---|---|
| Contenuto di "Oggi" (fatti, decisioni, prossime ore, numeri) | `app/(app)/oggi/page.tsx` + `lib/mock/dati.ts` | Quando esisteranno i moduli corrispondenti |
| Interazioni Bellini (approva / tono più deciso / imparato) | `app/(app)/oggi/page.tsx` | Modulo crediti/solleciti con AI reale (novembre) |
| Vista Brain (osservo/elaboro/imparato/automazioni) | `app/(app)/brain/page.tsx` + `lib/mock/dati.ts` | Business Brain reale |
| Vista Spazi e le 7 viste dei moduli (Finanza, Clienti, Magazzino, Documenti, Calendario, Persone, Analytics) | `lib/mock/spazi.ts` | Man mano che i moduli nascono. Il rendering è già definitivo: cambierà la fonte dei dati, non la vista |
| Le decisioni approvabili dentro i moduli | `components/decisione.tsx` | Quando la chat potrà eseguire azioni reali (tool use) |
| Le 4 schede cliente a 360° (giudizio, affidabilità, rischio, storia unificata, memoria, previsione) | `lib/mock/clienti.ts` | Modulo CRM reale + Business Brain. La *struttura* del giudizio (valutazione + perché + confidenza) è però quella definitiva |
| ~~Input della striscia AIOS~~ | — | **GIÀ REALE**: la conversazione passa da `lib/conversation/engine.ts` → `app/api/chat/route.ts` → LLM. Nessuna risposta preregistrata. Richiede `ANTHROPIC_API_KEY` in `.env.local` |
| Sessione salvata in localStorage | `lib/api/client.ts` | Cookie httpOnly quando faremo l'hardening |
| **Rinnovo automatico del token alla scadenza** | `lib/api/client.ts` | Identity espone già `POST /api/v1/auth/refresh` e il refresh token viene salvato, ma il rinnovo su 401 non è ancora implementato: alla scadenza dell'access token si torna alla schermata di accesso |

| Gli *effetti* delle azioni approvate (sollecito, riordino, spostamento) | `app/api/chat/route.ts` | Quando i moduli avranno API di scrittura. Oggi l'azione viene tracciata e confermata, ma nessuna email parte davvero |

| Le notifiche: 3 interruzioni + 47 cose silenziate + il criterio | `lib/mock/notifiche.ts` | Quando i moduli genereranno eventi veri. Il *meccanismo* (tetto giornaliero, regola che silenzia, soglia correggibile) è però quello definitivo |

| Il Brain espanso: ragionamento tracciato, catene di relazioni, obiettivi con tensione, cambi di idea, decisioni con esiti, cosa non sa | `lib/mock/brain.ts` | Business Brain reale (Knowledge Graph + Reasoning Pipeline dell'Engineering Bible). La *forma* del ragionamento (passi + alternativa scartata + incertezza dichiarata) è quella definitiva |

**Già reale**:
- **la ricerca globale** (⌘K su desktop, lente in alto su telefono): interroga lo stesso
  indice dello strumento `cerca` della conversazione — ciò che AIOS trova da sé e ciò che
  trovi tu non possono divergere. I *dati* dell'indice sono simulati, il meccanismo no;
- registrazione e accesso (`app/accesso/`) → Identity via Gateway;
- **il Primo Incontro** (`app/primo-incontro/`) → tutto reale: apertura sessione,
  lettura dei 4 documenti legali, registrazione del consenso (con IP e user agent) e
  provisioning di Organization + ruoli + Workspace. Gli identificativi mostrati nella
  rivelazione finale vengono dal database. *Nota onesta*: i testi legali collegati sono
  segnaposto, ed è dichiarato anche nell'interfaccia;
- **gli strumenti della chat**: AIOS cerca da sé nell'indice aziendale
  (`lib/mock/indice.ts`) e propone azioni. La divisione lettura/azione è imposta dal
  server (`app/api/chat/route.ts`), non dal prompt: un'azione non approvata **non può**
  essere eseguita nemmeno se il modello ci provasse;
- **la voce**: ascolto (voce → testo) e parlato (testo → voce) con le API native del
  browser, in `lib/conversation/voce.ts`. Nessun servizio esterno, nessun costo, l'audio
  non lascia il dispositivo. Non disponibile su Firefox e in alcune webview: la UI
  interroga la disponibilità e nasconde il microfono invece di fingere;
- **la conversazione con AIOS** → LLM vero via `/api/chat`. Il contesto aziendale
  che AIOS ha in testa (`lib/conversation/contesto.ts`) è dati simulati, ma il
  ragionamento sopra di essi è reale: è esattamente la regola del progetto —
  *dati finti sì, intelligenza finta no*.
