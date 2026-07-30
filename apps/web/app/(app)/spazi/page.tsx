import Link from 'next/link';
import { SPAZI } from '@/lib/mock/spazi';

/**
 * SPAZI — non un elenco di moduli, ma cosa AIOS sta facendo dentro
 * ciascuno adesso (brief V3). La prima riga di ogni spazio è la sua
 * `apertura`: AIOS parla in prima persona, mai un'etichetta fredda.
 */
export default function PaginaSpazi() {
  return (
    <>
      <div className="data-riga">SPAZI DI LAVORO</div>
      <h1>Dove stiamo lavorando.</h1>
      <p className="apertura">
        Non un elenco di moduli — ogni spazio ti dice cosa ci sto facendo dentro, adesso.
      </p>

      <section className="sezione">
        {SPAZI.map((s) => {
          const daTe = (s.decisioni ?? []).length;
          return (
            <Link key={s.slug} href={`/spazi/${s.slug}`} className="spazio">
              <span className="nome">
                {s.nome}
                <span className="freccia">→</span>
              </span>
              <span className="vita">
                {daTe > 0 ? <span className="da-te">{daTe} DA TE</span> : null}
                {s.apertura}
              </span>
            </Link>
          );
        })}
      </section>
    </>
  );
}
