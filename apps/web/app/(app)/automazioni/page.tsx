import { AUTOMAZIONI, TEMPO_TOTALE } from '@/lib/mock/automazioni';

/**
 * Centro Automazioni. Non un pannello di interruttori: per ognuna si vede
 * quanto tempo restituisce, lo storico con gli errori veri, e — dove c'è —
 * il miglioramento che AIOS propone da sé.
 */
export default function PaginaAutomazioni() {
  const autonome = AUTOMAZIONI.filter((a) => a.modo === 'autonoma').length;
  const errori = AUTOMAZIONI.reduce((s, a) => s + a.errori, 0);

  return (
    <>
      <div className="data-riga">AUTOMAZIONI</div>
      <h1>Cosa faccio senza chiedertelo.</h1>
      <p className="apertura">
        {AUTOMAZIONI.length} automazioni attive: <b>{autonome}</b> girano da sole, le altre
        aspettano il tuo ok. Insieme ti restituiscono <b>{TEMPO_TOTALE}</b>.
      </p>

      <div className="numeri numeri-spazio">
        <span className="tempo">
          TEMPO RESTITUITO <b>{TEMPO_TOTALE}</b>
        </span>
        <span>
          ESECUZIONI TOTALI <b>{AUTOMAZIONI.reduce((s, a) => s + a.esecuzioni, 0)}</b>
        </span>
        <span>
          ERRORI <b className={errori > 0 ? 'warn' : undefined}>{errori}</b>
        </span>
      </div>

      {AUTOMAZIONI.map((a) => (
        <section className="scheda-auto" key={a.slug}>
          <div className="auto-testa">
            <div>
              <div className="auto-nome">{a.nome}</div>
              <div className="auto-cosa">{a.cosaFa}</div>
            </div>
            <span className={a.modo === 'autonoma' ? 'stato auto' : 'stato'}>
              {a.modo === 'autonoma' ? 'AUTONOMA' : 'CON APPROVAZIONE'}
            </span>
          </div>

          <div className="auto-dati">
            <span>
              <b>Quando</b> {a.quandoParte}
            </span>
            <span>
              <b>Creata</b> {a.creataDa}
            </span>
            <span className="tempo">
              <b>Ti restituisce</b> {a.tempoRestituito}
            </span>
            <span>
              <b>Esecuzioni</b> {a.esecuzioni} · {a.errori} errori
            </span>
          </div>

          <div className="auto-storico">
            {a.storico.map((e, i) => (
              <div className="esecuzione" key={i}>
                <span className={`punto-esito ${e.esito}`} aria-hidden="true" />
                <span className="esecuzione-quando">{e.quando}</span>
                <span className="esecuzione-nota">{e.nota}</span>
              </div>
            ))}
          </div>

          {a.miglioramento ? (
            <div className="miglioramento">
              <span className="miglioramento-etichetta">POTREI FARE MEGLIO</span>
              {a.miglioramento}
            </div>
          ) : null}
        </section>
      ))}

      <p className="fiducia">
        Ogni automazione l&rsquo;abbiamo decisa insieme: quelle che girano da sole le hai
        approvate tu, e puoi fermarle quando vuoi. Se una comincia a sbagliare, te lo dico
        prima che tu debba accorgertene.
      </p>
    </>
  );
}
