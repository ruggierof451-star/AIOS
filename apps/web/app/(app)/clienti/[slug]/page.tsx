import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CLIENTI, clienteDaSlug, ETICHETTE_CANALE } from '@/lib/mock/clienti';
import { Decisione } from '@/components/decisione';

/**
 * Scheda cliente a 360°.
 *
 * L'ordine degli elementi è la tesi del prodotto: prima il giudizio di
 * AIOS, poi come ci è arrivato, poi cosa vuole fare, e solo dopo i dati.
 * Un CRM tradizionale fa l'esatto contrario.
 */

export function generateStaticParams() {
  return CLIENTI.map((c) => ({ slug: c.slug }));
}

export default function PaginaCliente({ params }: { params: { slug: string } }) {
  const cliente = clienteDaSlug(params.slug);
  if (!cliente) notFound();

  return (
    <>
      <Link href="/spazi/clienti" className="indietro">
        ← Clienti
      </Link>
      <div className="data-riga">
        {cliente.settore.toUpperCase()} · CLIENTE DAL {cliente.clienteDal.toUpperCase()}
      </div>
      <h1>{cliente.nome}</h1>

      {/* Il giudizio prima dei numeri: è quello che un collega ti direbbe. */}
      <p className="giudizio">{cliente.giudizio}</p>

      <div className="numeri numeri-spazio">
        {cliente.numeri.map((n) => (
          <span key={n.etichetta} className={n.tono === 'ok' ? 'tempo' : undefined}>
            {n.etichetta} <b className={n.tono === 'attenzione' ? 'warn' : undefined}>{n.valore}</b>
          </span>
        ))}
      </div>

      <section className="sezione">
        <div className="sezione-testa">
          <span className="titolo">COME LO VALUTO</span>
        </div>
        <div className="valutazione">
          <div className="valutazione-testa">
            <span className="valutazione-etichetta">AFFIDABILITÀ</span>
            <span className="valutazione-livello">{cliente.affidabilita.livello}</span>
          </div>
          <p className="valutazione-perche">{cliente.affidabilita.perche}</p>
          <span className="conf">{cliente.affidabilita.confidenza}</span>
        </div>
        <div className="valutazione">
          <div className="valutazione-testa">
            <span className="valutazione-etichetta">RISCHIO</span>
            <span className="valutazione-livello">{cliente.rischio.livello}</span>
          </div>
          <p className="valutazione-perche">{cliente.rischio.perche}</p>
          <span className="conf">{cliente.rischio.confidenza}</span>
        </div>
      </section>

      {cliente.decisioni && cliente.decisioni.length > 0 ? (
        <section className="sezione">
          <div className="sezione-testa">
            <span className="titolo">DA DECIDERE INSIEME</span>
            <span className="conta">{cliente.decisioni.length}</span>
          </div>
          {cliente.decisioni.map((d, i) => (
            <Decisione key={i} decisione={d} indice={i} />
          ))}
        </section>
      ) : null}

      {cliente.attesa ? (
        <section className="sezione">
          <div className="sezione-testa">
            <span className="titolo">COSA MI ASPETTO</span>
          </div>
          <div className="attesa-blocco">
            <div className="attesa-cosa">{cliente.attesa.cosa}</div>
            <p className="attesa-perche">{cliente.attesa.perche}</p>
            <span className="conf">{cliente.attesa.confidenza}</span>
          </div>
        </section>
      ) : null}

      <section className="sezione">
        <div className="sezione-testa">
          <span className="titolo">COSA SO DI LORO</span>
          <span className="conta">{cliente.memoria.length}</span>
        </div>
        {cliente.memoria.map((m) => (
          <div className="riga-spazio" key={m.cosa}>
            <div className="riga-testo">
              <div className="riga-principale">{m.cosa}</div>
            </div>
            <span className="stato auto">{m.origine}</span>
          </div>
        ))}
      </section>

      <section className="sezione">
        <div className="sezione-testa">
          <span className="titolo">TUTTA LA STORIA</span>
          <span className="conta">{cliente.timeline.length} eventi</span>
        </div>
        <div className="storia">
          {cliente.timeline.map((e, i) => (
            <div className={e.canale === 'aios' ? 'evento mio' : 'evento'} key={`${e.quando}-${i}`}>
              <div className="evento-meta">
                <span className="evento-canale">{ETICHETTE_CANALE[e.canale]}</span>
                <span className="evento-quando">{e.quando}</span>
              </div>
              <div className="evento-corpo">
                <div className="evento-cosa">{e.cosa}</div>
                {e.dettaglio ? <div className="evento-dettaglio">{e.dettaglio}</div> : null}
              </div>
            </div>
          ))}
        </div>
      </section>

      <p className="fiducia">
        Le righe marcate <b>AIOS</b> sono cose che ho fatto io per questo cliente. Se una non ti
        torna, chiedimi <i>perché</i> — e se sbaglio, correggimi: quello che mi dici su di loro
        diventa memoria, non un appunto che si perde.
      </p>
    </>
  );
}
