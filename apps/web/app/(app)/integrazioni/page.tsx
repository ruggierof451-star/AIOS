import { INTEGRAZIONI } from '@/lib/mock/sistema';

/**
 * Integrazioni. Onestà dichiarata: nessuna è collegata, e lo stato di
 * ognuna lo dice invece di mostrare una spunta verde che non significa
 * niente. Ogni riga spiega *cosa sbloccherebbe*, non cosa è.
 */
export default function PaginaIntegrazioni() {
  const categorie = Array.from(new Set(INTEGRAZIONI.map((i) => i.categoria)));

  return (
    <>
      <div className="data-riga">INTEGRAZIONI</div>
      <h1>Da dove posso imparare.</h1>
      <p className="apertura">
        Più cose vedo, meno devi dirmi. Ogni collegamento qui sotto spiega{' '}
        <b>cosa cambierebbe davvero</b> — non è un catalogo di loghi.
      </p>

      {categorie.map((cat) => (
        <section className="sezione" key={cat}>
          <div className="sezione-testa">
            <span className="titolo">{cat.toUpperCase()}</span>
          </div>
          <div className="griglia-integrazioni">
            {INTEGRAZIONI.filter((i) => i.categoria === cat).map((i) => (
              <div className="carta-integrazione" key={i.nome}>
                <div className="integrazione-testa">
                  <span className="integrazione-nome">{i.nome}</span>
                  <span
                    className={
                      i.stato === 'collegata'
                        ? 'stato ok'
                        : i.stato === 'pronta'
                          ? 'stato auto'
                          : 'stato'
                    }
                  >
                    {i.stato.toUpperCase()}
                  </span>
                </div>
                <p className="integrazione-cosa">{i.cosaSbloccherebbe}</p>
              </div>
            ))}
          </div>
        </section>
      ))}

      <p className="fiducia">
        Nessuna di queste è collegata adesso, e preferisco dirtelo invece di mostrarti spunte
        verdi che non significano niente. «Pronta» vuol dire che il collegamento è costruito e
        aspetta solo le tue credenziali.
      </p>
    </>
  );
}
