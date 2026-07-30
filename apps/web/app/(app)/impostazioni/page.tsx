import { AREE_IMPOSTAZIONI } from '@/lib/mock/sistema';

export default function PaginaImpostazioni() {
  return (
    <>
      <div className="data-riga">IMPOSTAZIONI</div>
      <h1>Come sono configurato.</h1>
      <p className="apertura">
        Dodici aree, in ordine di quanto cambiano il mio comportamento. Quelle che contano di
        più stanno in alto.
      </p>

      <div className="griglia-impostazioni">
        {AREE_IMPOSTAZIONI.map((a) => (
          <button type="button" className="carta-impostazione" key={a.nome}>
            <div className="impostazione-testa">
              <span className="impostazione-nome">{a.nome}</span>
              <span className="freccia">→</span>
            </div>
            <p className="impostazione-desc">{a.descrizione}</p>
            {a.stato ? <span className="stato">{a.stato}</span> : null}
          </button>
        ))}
      </div>

      <p className="fiducia">
        L&rsquo;area <b>AIOS</b> è quella che cambia di più la nostra convivenza: lì decidi
        quanto posso fare da solo e sotto quale soglia devo comunque chiederti il permesso.
      </p>
    </>
  );
}
