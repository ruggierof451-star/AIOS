import { Flusso } from '@/components/flusso';
import { GuardiaAccesso } from '@/components/guardia-accesso';
import { Notifiche } from '@/components/notifiche';
import { Rail } from '@/components/rail';
import { RicercaGlobale } from '@/components/ricerca-globale';
import { azienda } from '@/lib/mock/dati';

export default function LayoutApp({ children }: { children: React.ReactNode }) {
  return (
    <>
      <GuardiaAccesso />
      <div className="plancia">
        <Rail />
        <div className="centro">
          <header className="cima">
            <div className="cima-vivo">
              <span className="cuore" aria-hidden="true" />
              <span className="cima-testo">AIOS sta lavorando</span>
            </div>
            <div className="cima-azioni">
              <RicercaGlobale />
              <Notifiche />
              <div className="avatar">{azienda.iniziali}</div>
            </div>
          </header>
          <main className="corpo">{children}</main>
        </div>
        <Flusso />
      </div>
    </>
  );
}
