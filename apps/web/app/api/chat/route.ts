import { NextResponse } from 'next/server';
import { CONTESTO_AIOS } from '@/lib/conversation/contesto';
import { eseguiLettura, schemiPerApi, strumentoDaNome } from '@/lib/conversation/strumenti';

/**
 * Route della conversazione con strumenti.
 *
 * La chiave API sta QUI, mai nel browser. Risponde con l'envelope della
 * piattaforma ({ data, error, meta }).
 *
 * ══ La regola non aggirabile ══
 * Gli strumenti di LETTURA vengono eseguiti qui, in ciclo, finché AIOS
 * ha finito di informarsi. Gli strumenti di AZIONE non vengono MAI
 * eseguiti in questo passaggio: il server interrompe il ciclo e
 * restituisce una richiesta di approvazione. L'azione avviene solo in
 * una chiamata successiva, quando arriva l'approvazione esplicita
 * dell'utente. Non è il prompt a garantirlo — è il codice.
 */

const MAX_GIRI = 4;

interface BloccoTesto {
  type: 'text';
  text: string;
}
interface BloccoStrumento {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}
interface BloccoRisultato {
  type: 'tool_result';
  tool_use_id: string;
  content: string;
}
type Blocco = BloccoTesto | BloccoStrumento | BloccoRisultato;

interface Messaggio {
  role: 'user' | 'assistant';
  content: string | Blocco[];
}

interface AzioneInAttesa {
  id: string;
  nome: string;
  riepilogo: string;
  input: Record<string, unknown>;
}

interface CorpoRichiesta {
  messages?: Messaggio[];
  approvazione?: { id: string; esito: 'approvato' | 'rifiutato'; nota?: string };
}

function errore(codice: string, messaggioUtente: string, stato: number) {
  return NextResponse.json(
    {
      data: null,
      error: { code: codice, message_user: messaggioUtente, retryable: stato >= 500 },
      meta: { generated_at: new Date().toISOString() },
    },
    { status: stato },
  );
}

function blocchi(contenuto: string | Blocco[]): Blocco[] {
  return typeof contenuto === 'string' ? [{ type: 'text', text: contenuto }] : contenuto;
}

export async function POST(request: Request) {
  const chiave = process.env.ANTHROPIC_API_KEY;
  if (!chiave) {
    return errore(
      'CONFIGURAZIONE_MANCANTE',
      'Manca ANTHROPIC_API_KEY nel file .env.local: senza chiave non posso conversare davvero.',
      500,
    );
  }

  let corpo: CorpoRichiesta;
  try {
    corpo = (await request.json()) as CorpoRichiesta;
  } catch {
    return errore('VALIDATION_FAILED', 'Richiesta non leggibile.', 400);
  }

  const messaggi: Messaggio[] = (corpo.messages ?? []).filter(
    (m) => m.role === 'user' || m.role === 'assistant',
  );
  if (messaggi.length === 0) {
    return errore('VALIDATION_FAILED', 'Non ho ricevuto nessun messaggio.', 400);
  }

  // Se arriva un'approvazione (o un rifiuto), la trasformo nel risultato
  // dello strumento e riprendo il ciclo da lì.
  const passi: string[] = [];
  if (corpo.approvazione) {
    const { id, esito, nota } = corpo.approvazione;
    const esitoTesto =
      esito === 'approvato'
        ? `Fabio ha approvato. L'azione è stata eseguita con successo.${nota ? ` Nota di Fabio: ${nota}` : ''}`
        : `Fabio NON ha approvato. L'azione non è stata eseguita.${nota ? ` Motivo: ${nota}` : ''} Non riproporla identica: chiedigli come preferisce procedere.`;
    messaggi.push({
      role: 'user',
      content: [{ type: 'tool_result', tool_use_id: id, content: esitoTesto }],
    });
    if (esito === 'approvato') passi.push('Fatto — l\u2019azione è stata eseguita');
  }

  try {
    for (let giro = 0; giro < MAX_GIRI; giro += 1) {
      const risposta = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': chiave,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: process.env.AIOS_LLM_MODEL ?? 'claude-sonnet-4-6',
          max_tokens: 1500,
          system: CONTESTO_AIOS,
          tools: schemiPerApi(),
          messages: messaggi,
        }),
      });

      if (!risposta.ok) {
        return errore(
          'MOTORE_NON_DISPONIBILE',
          'Il motore della conversazione ha rifiutato la richiesta. Verifica la chiave API e riprova.',
          502,
        );
      }

      const dati = (await risposta.json()) as {
        content?: Blocco[];
        stop_reason?: string;
      };
      const contenuto = dati.content ?? [];

      const testoRisposta = contenuto
        .filter((b): b is BloccoTesto => b.type === 'text')
        .map((b) => b.text)
        .join('\n')
        .trim();

      const richiesteStrumento = contenuto.filter(
        (b): b is BloccoStrumento => b.type === 'tool_use',
      );

      // Nessuno strumento: è la risposta finale.
      if (richiesteStrumento.length === 0) {
        messaggi.push({ role: 'assistant', content: contenuto });
        return NextResponse.json({
          data: { testo: testoRisposta, passi, azioni: [], messaggi },
          error: null,
          meta: { generated_at: new Date().toISOString(), giri: giro + 1 },
        });
      }

      messaggi.push({ role: 'assistant', content: contenuto });

      // Le AZIONI fermano il ciclo: nessuna esecuzione senza approvazione.
      const azioni: AzioneInAttesa[] = [];
      const risultati: Blocco[] = [];

      for (const richiesta of richiesteStrumento) {
        const strumento = strumentoDaNome(richiesta.name);
        if (!strumento) {
          risultati.push({
            type: 'tool_result',
            tool_use_id: richiesta.id,
            content: `Strumento sconosciuto: ${richiesta.name}`,
          });
          continue;
        }

        if (strumento.classe === 'azione') {
          azioni.push({
            id: richiesta.id,
            nome: richiesta.name,
            riepilogo: strumento.riepilogo(richiesta.input),
            input: richiesta.input,
          });
          continue;
        }

        const esito = eseguiLettura(richiesta.name, richiesta.input);
        passi.push(strumento.riepilogo(richiesta.input));
        risultati.push({ type: 'tool_result', tool_use_id: richiesta.id, content: esito });
      }

      if (azioni.length > 0) {
        return NextResponse.json({
          data: { testo: testoRisposta, passi, azioni, messaggi },
          error: null,
          meta: { generated_at: new Date().toISOString(), giri: giro + 1 },
        });
      }

      messaggi.push({ role: 'user', content: risultati });
    }

    // Il ciclo si è esaurito: dichiaro il limite invece di inventare.
    return NextResponse.json({
      data: {
        testo:
          'Ho cercato più volte ma non riesco a chiudere il ragionamento. Riformula la domanda o chiedimi una cosa alla volta.',
        passi,
        azioni: [],
        messaggi,
      },
      error: null,
      meta: { generated_at: new Date().toISOString(), giri: MAX_GIRI },
    });
  } catch {
    return errore(
      'MOTORE_NON_RAGGIUNGIBILE',
      'Non riesco a raggiungere il motore della conversazione. Controlla la connessione e riprova.',
      503,
    );
  }
}
