'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError, tokenCorrente } from '@/lib/api/client';
import {
  avviaSessione,
  creaAmbiente,
  documentiLegali,
  NOMI_DOCUMENTI,
  registraConsenso,
  SPIEGAZIONI_DOCUMENTI,
  type DocumentoLegale,
} from '@/lib/api/first-meeting';
import { salvaAzienda } from '@/lib/api/sessione';
import { Puntino } from '@/components/puntino';

/**
 * PRIMO INCONTRO — tutto reale, contro il backend.
 *
 * Non è un wizard (la Product Constitution lo vieta anche nel
 * linguaggio): è una conversazione in cui AIOS chiede il minimo
 * indispensabile — il nome dell'azienda e il consenso legale — e poi
 * costruisce l'ambiente davanti agli occhi dell'utente.
 *
 * Ogni passo è una chiamata vera:
 *   POST /api/v1/first-meeting/sessions
 *   GET  /api/v1/first-meeting/legal-documents
 *   POST /api/v1/first-meeting/legal-consent
 *   POST /api/v1/first-meeting/provision
 *
 * Il provisioning rifiuta con 409 se il consenso manca: il vincolo è del
 * server, e qui non lo aggiriamo — lo rispettiamo nell'ordine dei passi.
 */

type Fase = 'apertura' | 'nome' | 'documenti' | 'costruisco' | 'pronto';

export default function PaginaPrimoIncontro() {
  const router = useRouter();
  const [fase, setFase] = useState<Fase>('apertura');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [documenti, setDocumenti] = useState<readonly DocumentoLegale[]>([]);
  const [accettati, setAccettati] = useState<readonly string[]>([]);
  const [nome, setNome] = useState('');
  const [ambiente, setAmbiente] = useState<{ organizationId: string; workspaceId: string } | null>(
    null,
  );
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState(false);

  // Apre la sessione e carica i documenti: due chiamate reali.
  const inizia = useCallback(async () => {
    setErrore(null);
    setInCorso(true);
    try {
      const sessione = await avviaSessione();
      setConversationId(sessione.conversationId);
      setDocumenti(await documentiLegali());
      setFase('nome');
    } catch (err) {
      setErrore(
        err instanceof ApiError
          ? err.message
          : 'Non riesco a raggiungere il backend. Verifica che sia avviato.',
      );
    } finally {
      setInCorso(false);
    }
  }, []);

  useEffect(() => {
    if (!tokenCorrente()) {
      router.replace('/accesso');
      return;
    }
    void inizia();
  }, [router, inizia]);

  const tuttiAccettati =
    documenti.length > 0 && documenti.every((d) => accettati.includes(d.documentType));

  function commuta(tipo: string) {
    setAccettati((v) => (v.includes(tipo) ? v.filter((x) => x !== tipo) : [...v, tipo]));
  }

  async function costruisci() {
    if (!conversationId || !tuttiAccettati || nome.trim().length < 2) return;
    setErrore(null);
    setInCorso(true);
    setFase('costruisco');
    try {
      // L'ordine conta: senza consenso il provisioning risponde 409.
      await registraConsenso(conversationId);
      const creato = await creaAmbiente(conversationId, nome.trim());
      setAmbiente(creato);
      salvaAzienda({
        nome: nome.trim(),
        organizationId: creato.organizationId,
        workspaceId: creato.workspaceId,
      });
      setFase('pronto');
    } catch (err) {
      setErrore(
        err instanceof ApiError ? err.message : 'Qualcosa è andato storto durante la creazione.',
      );
      setFase('documenti');
    } finally {
      setInCorso(false);
    }
  }

  return (
    <div className="incontro">
      <div className="incontro-scheda">
        <div className="incontro-testa">
          <Puntino />
          <span className="incontro-nome">AIOS</span>
        </div>

        {/* ── Apertura ── */}
        {fase === 'apertura' ? (
          <p className="incontro-parla">
            {inCorso ? 'Un attimo, mi sto preparando…' : 'Ci siamo quasi.'}
          </p>
        ) : null}

        {/* ── Il nome dell'azienda ── */}
        {fase === 'nome' ? (
          <>
            <p className="incontro-parla">
              Piacere. Da adesso lavoro con te, non per te: ti dirò sempre cosa faccio e ti
              chiederò il permesso prima di toccare qualcosa di importante.
            </p>
            <p className="incontro-parla">
              Partiamo dall&rsquo;unica cosa che non posso indovinare: <b>come si chiama la tua
              azienda?</b>
            </p>
            <div className="campo">
              <label htmlFor="nome">RAGIONE SOCIALE</label>
              <input
                id="nome"
                type="text"
                autoFocus
                value={nome}
                placeholder="Es. Rossi Impianti S.r.l."
                onChange={(e) => setNome(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && nome.trim().length >= 2) setFase('documenti');
                }}
              />
            </div>
            <button
              type="button"
              className="invia"
              disabled={nome.trim().length < 2}
              onClick={() => setFase('documenti')}
            >
              Continua
            </button>
          </>
        ) : null}

        {/* ── Consenso legale, granulare ── */}
        {fase === 'documenti' ? (
          <>
            <p className="incontro-parla">
              Prima di iniziare devo chiederti quattro consensi. Te li chiedo separati, non tutti
              insieme: sono cose diverse e hai il diritto di sapere cosa stai accettando.
            </p>
            <div className="documenti">
              {documenti.map((d) => (
                <label className="documento" key={d.documentType}>
                  <input
                    type="checkbox"
                    checked={accettati.includes(d.documentType)}
                    onChange={() => commuta(d.documentType)}
                  />
                  <span className="documento-corpo">
                    <span className="documento-nome">
                      {NOMI_DOCUMENTI[d.documentType] ?? d.documentType}
                      <span className="documento-versione">v{d.version}</span>
                    </span>
                    <span className="documento-spiega">
                      {SPIEGAZIONI_DOCUMENTI[d.documentType] ?? ''}
                    </span>
                    <a
                      className="documento-link"
                      href={d.contentUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Leggi il testo →
                    </a>
                  </span>
                </label>
              ))}
            </div>
            <p className="incontro-nota">
              I testi collegati sono <b>segnaposto</b> in questa versione: la registrazione del
              consenso è però reale e viene tracciata con data, versione del documento e indirizzo
              IP, come richiede il GDPR.
            </p>
            <button type="button" className="invia" disabled={!tuttiAccettati} onClick={costruisci}>
              {tuttiAccettati
                ? 'Accetto — costruisci il mio ambiente'
                : `Accetta tutti e quattro (${accettati.length}/${documenti.length})`}
            </button>
          </>
        ) : null}

        {/* ── Costruzione ── */}
        {fase === 'costruisco' ? (
          <>
            <p className="incontro-parla">Sto costruendo il tuo ambiente. Ci metto pochi secondi.</p>
            <div className="costruzione">
              <div className="passo-c fatto">Consenso registrato</div>
              <div className="passo-c corso">Organizzazione, ruoli e spazio di lavoro</div>
            </div>
          </>
        ) : null}

        {/* ── La rivelazione ── */}
        {fase === 'pronto' && ambiente ? (
          <>
            <p className="incontro-parla">
              Fatto. <b>{nome.trim()}</b> adesso esiste, e il tuo ambiente è pronto.
            </p>
            <div className="rivelazione">
              <div className="rivelato">
                <span className="rivelato-cosa">Organizzazione creata</span>
                <span className="rivelato-id">{ambiente.organizationId}</span>
              </div>
              <div className="rivelato">
                <span className="rivelato-cosa">Spazio di lavoro «Principale»</span>
                <span className="rivelato-id">{ambiente.workspaceId}</span>
              </div>
              <div className="rivelato">
                <span className="rivelato-cosa">Ruoli assegnati — sei l&rsquo;amministratore</span>
                <span className="rivelato-id">Admin</span>
              </div>
              <div className="rivelato">
                <span className="rivelato-cosa">Consenso legale registrato</span>
                <span className="rivelato-id">4 documenti</span>
              </div>
            </div>
            <p className="incontro-nota">
              Questi identificativi arrivano dal database reale: organizzazione, ruoli, spazio di
              lavoro e consenso sono stati creati davvero adesso. I dati aziendali che vedrai
              dentro (clienti, fatture, magazzino) sono invece un esempio, perché AIOS non è ancora
              collegato ai tuoi sistemi.
            </p>
            <button type="button" className="invia" onClick={() => router.push('/oggi')}>
              Entra in AIOS
            </button>
          </>
        ) : null}

        {errore ? <p className="errore">{errore}</p> : null}

        {fase === 'apertura' && errore ? (
          <button type="button" className="invia" onClick={() => void inizia()}>
            Riprova
          </button>
        ) : null}
      </div>
    </div>
  );
}
