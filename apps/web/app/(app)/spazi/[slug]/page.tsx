import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SPAZI, spazioDaSlug, type Tono } from '@/lib/mock/spazi';
import { Decisione } from '@/components/decisione';

/**
 * Vista di uno spazio. Il rendering è condiviso da tutti i moduli
 * (Product Bible: "ogni modulo condivide lo stesso design e la stessa
 * memoria"); i contenuti vengono dalla definizione del singolo spazio.
 */

export function generateStaticParams() {
  return SPAZI.map((s) => ({ slug: s.slug }));
}

function classeTono(tono?: Tono): string {
  switch (tono) {
    case 'ok':
      return 'stato ok';
    case 'attesa':
      return 'stato attesa';
    case 'attenzione':
      return 'stato attenzione';
    case 'auto':
      return 'stato auto';
    default:
      return 'stato';
  }
}

export default function PaginaSpazio({ params }: { params: { slug: string } }) {
  const spazio = spazioDaSlug(params.slug);
  if (!spazio) notFound();

  return (
    <>
      <Link href="/spazi" className="indietro">
        ← Spazi
      </Link>
      <div className="data-riga">{spazio.nome.toUpperCase()}</div>
      <h1>{spazio.nome}</h1>
      <p className="apertura">{spazio.apertura}</p>

      {spazio.numeri && spazio.numeri.length > 0 ? (
        <div className="numeri numeri-spazio">
          {spazio.numeri.map((n) => (
            <span key={n.etichetta} className={n.tono === 'ok' ? 'tempo' : undefined}>
              {n.etichetta}{' '}
              <b className={n.tono === 'attenzione' ? 'warn' : undefined}>{n.valore}</b>
            </span>
          ))}
        </div>
      ) : null}

      {spazio.decisioni && spazio.decisioni.length > 0 ? (
        <section className="sezione">
          <div className="sezione-testa">
            <span className="titolo">DA DECIDERE INSIEME</span>
            <span className="conta">{spazio.decisioni.length}</span>
          </div>
          {spazio.decisioni.map((d, i) => (
            <Decisione key={i} decisione={d} indice={i} />
          ))}
        </section>
      ) : null}

      {spazio.sezioni.map((sez) => (
        <section className="sezione" key={sez.titolo}>
          <div className="sezione-testa">
            <span className="titolo">{sez.titolo}</span>
            {sez.conta ? <span className="conta">{sez.conta}</span> : null}
          </div>
          {sez.righe.map((r) => {
            const dentro = (
              <>
                <div className="riga-testo">
                  <div className="riga-principale">{r.principale}</div>
                  {r.dettaglio ? <div className="riga-dettaglio">{r.dettaglio}</div> : null}
                </div>
                {r.stato ? <span className={classeTono(r.tono)}>{r.stato}</span> : null}
              </>
            );
            return r.href ? (
              <Link href={r.href} className="riga-spazio navigabile" key={r.principale}>
                {dentro}
              </Link>
            ) : (
              <div className="riga-spazio" key={r.principale}>
                {dentro}
              </div>
            );
          })}
        </section>
      ))}

      <p className="fiducia">
        Tutto quello che vedi qui l&rsquo;ho messo insieme io. Se qualcosa non ti torna,
        chiedimi <i>perché</i> — e se la mia risposta non ti convince, correggimi: la regola
        diventa tua.
      </p>
    </>
  );
}
