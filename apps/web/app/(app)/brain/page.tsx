import { Puntino } from '@/components/puntino';
import { azienda, flussiBrain, elaborazioni, automazioni } from '@/lib/mock/dati';
import {
  CAMBI_IDEA,
  CATENE,
  DECISIONI_PRESE,
  ETICHETTE_PASSO,
  NON_SO,
  OBIETTIVI,
  RAGIONAMENTO,
  TENSIONE,
} from '@/lib/mock/brain';

/**
 * Il Brain — il cuore del prodotto, non una pagina di statistiche.
 *
 * L'ordine è deliberato: prima un ragionamento in corso (con
 * l'alternativa scartata), poi come le informazioni si collegano, poi
 * cosa sta cercando di ottenere e cosa fa quando due obiettivi si
 * scontrano. Solo dopo arrivano gli elenchi. In fondo, le due sezioni
 * che nessun software mette: dove ha cambiato idea, e cosa non sa.
 */
export default function PaginaBrain() {
  const sbagliate = DECISIONI_PRESE.filter((d) => d.esito === 'sbagliata').length;

  return (
    <>
      <div className="data-riga">BRAIN — {azienda.nome.toUpperCase()}</div>
      <h1>Come sto ragionando.</h1>
      <div className="stato-brain">
        <Puntino />
        ATTIVO — {elaborazioni.length} ELABORAZIONI
      </div>
      <p className="apertura">
        Il Brain non è una pagina: è dietro ogni cosa che vedi in AIOS. Qui puoi guardarlo
        lavorare, e correggerlo.
      </p>

      {/* ── Il ragionamento aperto: l'elemento principale ── */}
      <section className="sezione">
        <div className="sezione-testa">
          <span className="titolo">UN RAGIONAMENTO, PASSO PER PASSO</span>
        </div>
        <p className="ragionamento-domanda">{RAGIONAMENTO.domanda}</p>
        <div className="ragionamento">
          {RAGIONAMENTO.passi.map((p, i) => (
            <div className={p.tipo === 'scartata' ? 'passo-r scartato' : 'passo-r'} key={i}>
              <span className="passo-tipo">{ETICHETTE_PASSO[p.tipo]}</span>
              <span className="passo-testo">{p.testo}</span>
            </div>
          ))}
        </div>
        <div className="incertezza">
          <span className="conf">{RAGIONAMENTO.confidenza}</span>
          <p>{RAGIONAMENTO.incertezza}</p>
        </div>
      </section>

      {/* ── Le relazioni, come catene leggibili ── */}
      <section className="sezione">
        <div className="sezione-testa">
          <span className="titolo">COME LE COSE SI COLLEGANO</span>
          <span className="conta">{CATENE.length}</span>
        </div>
        {CATENE.map((c) => (
          <div className="catena" key={c.titolo}>
            <div className="catena-titolo">{c.titolo}</div>
            <div className="catena-anelli">
              {c.anelli.map((a, i) => (
                <div className="anello" key={i}>
                  {a}
                </div>
              ))}
            </div>
            <div className="catena-esito">{c.esito}</div>
          </div>
        ))}
      </section>

      {/* ── Obiettivi, e cosa faccio quando si scontrano ── */}
      <section className="sezione">
        <div className="sezione-testa">
          <span className="titolo">COSA STO CERCANDO DI OTTENERE</span>
          <span className="conta">{OBIETTIVI.length}</span>
        </div>
        {OBIETTIVI.map((o) => (
          <div className="obiettivo" key={o.cosa}>
            <div className="obiettivo-testa">
              <span className="obiettivo-cosa">{o.cosa}</span>
              <span className="stato auto">{o.stato}</span>
            </div>
            <p className="obiettivo-come">{o.come}</p>
          </div>
        ))}
        <div className="tensione">
          <span className="tensione-etichetta">QUANDO DUE OBIETTIVI SI SCONTRANO</span>
          <div className="tensione-quali">{TENSIONE.quali}</div>
          <p>{TENSIONE.come}</p>
        </div>
      </section>

      {/* ── Dove ho cambiato idea ── */}
      <section className="sezione">
        <div className="sezione-testa">
          <span className="titolo">DOVE HO CAMBIATO IDEA</span>
          <span className="conta">{CAMBI_IDEA.length}</span>
        </div>
        {CAMBI_IDEA.map((c) => (
          <div className="cambio" key={c.quando}>
            <div className="cambio-quando">{c.quando}</div>
            <div className="cambio-riga">
              <span className="cambio-etichetta">PRIMA</span>
              <span className="cambio-prima">{c.prima}</span>
            </div>
            <div className="cambio-riga">
              <span className="cambio-etichetta ora">ORA</span>
              <span className="cambio-ora">{c.ora}</span>
            </div>
            <p className="cambio-perche">{c.cosaMiHaFattoCambiare}</p>
          </div>
        ))}
      </section>

      {/* ── Decisioni, con gli esiti veri ── */}
      <section className="sezione">
        <div className="sezione-testa">
          <span className="titolo">DECISIONI CHE HO PRESO</span>
          <span className="conta">
            {DECISIONI_PRESE.length} · {sbagliate} sbagliata
          </span>
        </div>
        {DECISIONI_PRESE.map((d) => (
          <div className="riga-spazio" key={d.cosa}>
            <div className="riga-testo">
              <div className="riga-principale">{d.cosa}</div>
              <div className="riga-dettaglio">
                {d.quando} · {d.nota}
              </div>
            </div>
            <span
              className={
                d.esito === 'corretta'
                  ? 'stato ok'
                  : d.esito === 'sbagliata'
                    ? 'stato attenzione'
                    : 'stato'
              }
            >
              {d.esito.toUpperCase()}
            </span>
          </div>
        ))}
      </section>

      {/* ── Cosa osservo e cosa sto elaborando ── */}
      <section className="sezione">
        <div className="sezione-testa">
          <span className="titolo">STO OSSERVANDO</span>
        </div>
        {flussiBrain.map((f) => (
          <div className="flusso" key={f.nome}>
            <span className="nome">{f.nome}</span>
            <span className="val">{f.valore}</span>
          </div>
        ))}
        {elaborazioni.map((e) => (
          <div className="lavorando" key={e.testo}>
            {e.testo} <span className="pct">{e.stato}</span>
          </div>
        ))}
      </section>

      <section className="sezione">
        <div className="sezione-testa">
          <span className="titolo">AUTOMAZIONI ATTIVE</span>
          <span className="conta">6</span>
        </div>
        {automazioni.map((a) => (
          <div className="flusso" key={a.nome}>
            <span className="nome">{a.nome}</span>
            <span className="val">{a.valore}</span>
          </div>
        ))}
      </section>

      {/* ── Cosa non so: l'ultima sezione, di proposito ── */}
      <section className="sezione">
        <div className="sezione-testa">
          <span className="titolo">COSA NON SO</span>
          <span className="conta">{NON_SO.length}</span>
        </div>
        {NON_SO.map((n) => (
          <div className="non-so" key={n}>
            {n}
          </div>
        ))}
      </section>

      <p className="fiducia">
        Ti mostro anche i miei errori e i miei buchi perché è l&rsquo;unico modo per farti
        capire quanto fidarti di me, caso per caso. Se una mia conclusione non ti convince,
        correggimi: quello che mi dici diventa una regola, non un appunto che si perde.
      </p>
    </>
  );
}
