'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { azienda } from '@/lib/mock/dati';
import { NomeAzienda } from './nome-azienda';

/**
 * Il rail — non un menu di moduli, le parti di un organismo.
 * Solo icone; si allarga al passaggio del mouse.
 */

const TRACCIATI: Record<string, string> = {
  plancia: 'M3 12l9-8 9 8M5 10v10h14V10',
  cervello: 'M12 4v16M12 8H8a3 3 0 100 6M12 12h4a3 3 0 110 6M6 14v2M18 18v2',
  flussi: 'M13 3L5 14h6l-2 7 8-11h-6l2-7z',
  denaro: 'M4 19V9M10 19V5M16 19v-6M22 19H2',
  relazioni: 'M9 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5M17 8.5a2.5 2.5 0 100-5M18 20c0-2.4-1-4.2-2.6-5.2',
  materia: 'M4 8l8-4 8 4v9l-8 4-8-4V8zM4 8l8 4 8-4M12 12v9',
  memoria: 'M6 3h7l5 5v13H6V3zM13 3v5h5M9 13h6M9 17h4',
  tempo: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2',
  persone: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5',
  segnali: 'M3 3v18h18M7 15l4-5 3 3 5-7',
  innesti: 'M9 3v6M15 3v6M7 9h10v4a5 5 0 01-10 0V9zM12 18v3',
  regole: 'M12 9a3 3 0 100 6 3 3 0 000-6zM19.4 13.5l1.8 1.4-2 3.4-2.2-.9a7.5 7.5 0 01-1.8 1l-.3 2.3h-4l-.3-2.3a7.5 7.5 0 01-1.8-1l-2.2.9-2-3.4 1.8-1.4a7.5 7.5 0 010-2.1L2.8 10l2-3.4 2.2.9a7.5 7.5 0 011.8-1l.3-2.3h4l.3 2.3c.65.25 1.25.6 1.8 1l2.2-.9 2 3.4-1.8 1.4c.07.7.07 1.4 0 2.1z',
};

const VOCI: readonly { href: string; nome: string; icona: string; conta?: string }[] = [
  { href: '/oggi', nome: 'Plancia', icona: 'plancia' },
  { href: '/brain', nome: 'Cervello', icona: 'cervello' },
  { href: '/automazioni', nome: 'Flussi', icona: 'flussi', conta: '6' },
  { href: '/spazi/finanza', nome: 'Denaro', icona: 'denaro', conta: '2' },
  { href: '/spazi/clienti', nome: 'Relazioni', icona: 'relazioni', conta: '1' },
  { href: '/spazi/magazzino', nome: 'Materia', icona: 'materia', conta: '1' },
  { href: '/spazi/documenti', nome: 'Memoria', icona: 'memoria' },
  { href: '/spazi/calendario', nome: 'Tempo', icona: 'tempo' },
  { href: '/spazi/persone', nome: 'Persone', icona: 'persone' },
  { href: '/spazi/analytics', nome: 'Segnali', icona: 'segnali' },
  { href: '/integrazioni', nome: 'Innesti', icona: 'innesti' },
  { href: '/impostazioni', nome: 'Regole', icona: 'regole' },
];

export function Rail() {
  const pathname = usePathname();
  return (
    <nav className="rail" aria-label="Navigazione">
      <div className="rail-logo">
        <b>A</b>
      </div>
      <div className="rail-voci">
        {VOCI.map((v) => {
          const attiva = pathname === v.href || (v.href !== '/oggi' && pathname.startsWith(v.href));
          return (
            <Link key={v.href} href={v.href} className={attiva ? 'rail-voce attiva' : 'rail-voce'}>
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d={TRACCIATI[v.icona] ?? ''} />
              </svg>
              <span>{v.nome}</span>
              {v.conta ? <span className="conta">{v.conta}</span> : null}
            </Link>
          );
        })}
      </div>
      <div className="rail-piede">
        <div className="rail-utente">
          <div className="rail-sigla">{azienda.iniziali}</div>
          <span>
            {azienda.utenteCompleto} · <NomeAzienda />
          </span>
        </div>
      </div>
    </nav>
  );
}
