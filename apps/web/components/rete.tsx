'use client';

import { useCallback, useEffect, useRef } from 'react';

/**
 * L'organismo — la rete viva dell'azienda.
 *
 * Vive in un PANNELLO PROPRIO, mai dietro il testo: nella versione
 * precedente stava sotto il titolo e disturbava la lettura. Qui ha uno
 * spazio suo, delimitato, dove non si sovrappone a nulla.
 *
 * Coordinate in pixel reali (viewBox ricalcolato al ridimensionamento):
 * un viewBox stirato deformava le etichette fino a coprire il titolo.
 */

export interface NodoRete {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly eti: string;
  readonly tipo: 'cliente' | 'fattura' | 'documento' | 'fornitore' | 'concetto' | 'scadenza';
  readonly stato?: 'rischio' | 'bene';
}

export const NODI: readonly NodoRete[] = [
  { id: 'bellini', x: 0.10, y: 0.28, r: 6, eti: 'BELLINI', tipo: 'cliente' },
  { id: 'f214', x: 0.19, y: 0.62, r: 4.5, eti: 'FATT. 214', tipo: 'fattura' },
  { id: 'fontana', x: 0.06, y: 0.74, r: 5, eti: 'FONTANA', tipo: 'cliente', stato: 'bene' },
  { id: 'gialli', x: 0.25, y: 0.18, r: 5, eti: 'GIALLI', tipo: 'cliente' },
  { id: 'metalsud', x: 0.36, y: 0.44, r: 6.5, eti: 'METALSUD', tipo: 'fornitore' },
  { id: 'catalogo', x: 0.30, y: 0.78, r: 4, eti: 'CATALOGO', tipo: 'documento' },
  { id: 'margine', x: 0.50, y: 0.24, r: 7, eti: 'MARGINE', tipo: 'concetto', stato: 'rischio' },
  { id: 'ferro', x: 0.62, y: 0.52, r: 5.5, eti: 'FERRO&CO', tipo: 'fornitore' },
  { id: 'scorte', x: 0.46, y: 0.74, r: 5, eti: 'SCORTE', tipo: 'concetto' },
  { id: 'cassa', x: 0.72, y: 0.22, r: 7.5, eti: 'CASSA', tipo: 'concetto', stato: 'bene' },
  { id: 'nervi', x: 0.84, y: 0.52, r: 6, eti: 'NERVI', tipo: 'cliente' },
  { id: 'f24', x: 0.89, y: 0.18, r: 4.5, eti: 'F24', tipo: 'scadenza' },
  { id: 'verdi', x: 0.60, y: 0.82, r: 6, eti: 'VERDI LOG.', tipo: 'cliente', stato: 'rischio' },
  { id: 'enel', x: 0.14, y: 0.45, r: 4, eti: 'ENEL', tipo: 'concetto' },
  { id: 'agenda', x: 0.93, y: 0.74, r: 4.5, eti: 'AGENDA', tipo: 'concetto' },
  { id: 'preventivo', x: 0.73, y: 0.70, r: 4, eti: 'PREVENTIVO', tipo: 'documento' },
];

const ARCHI: readonly (readonly [string, string])[] = [
  ['bellini', 'f214'], ['f214', 'cassa'], ['fontana', 'cassa'], ['gialli', 'margine'],
  ['metalsud', 'margine'], ['metalsud', 'gialli'], ['metalsud', 'catalogo'], ['metalsud', 'scorte'],
  ['margine', 'ferro'], ['ferro', 'scorte'], ['cassa', 'f24'], ['nervi', 'cassa'],
  ['nervi', 'agenda'], ['verdi', 'preventivo'], ['preventivo', 'agenda'], ['enel', 'cassa'],
  ['bellini', 'gialli'], ['verdi', 'margine'], ['scorte', 'nervi'],
];

const NS = 'http://www.w3.org/2000/svg';

/**
 * Props di Rete.
 *
 * `?: T | undefined` invece del solo `?: T` non è ridondanza: con
 * `exactOptionalPropertyTypes` attivo (lo stesso rigore del backend) le
 * due forme dicono cose diverse.
 *   - `catena?: readonly string[]`            → la prop può essere OMESSA,
 *                                               ma non ricevere `undefined`
 *   - `catena?: readonly string[] | undefined` → può essere omessa OPPURE
 *                                               valere esplicitamente `undefined`
 *
 * Nel JSX la seconda è la semantica giusta: `catena={attiva?.catena}` è la
 * forma idiomatica in React, e passa `undefined` quando non c'è nulla a
 * fuoco. Dichiararlo nel contratto del componente è più pulito che
 * costringere ogni chiamante a spread condizionali o a inventare un valore
 * di ripiego che il componente già sa produrre da sé.
 */
export interface ReteProps {
  /** Catena da tracciare: l'impulso la percorre accendendo un nodo alla volta. */
  readonly catena?: readonly string[] | undefined;
  /** Altezza della tela in pixel. */
  readonly altezza?: number | undefined;
}

export function Rete({ catena, altezza = 300 }: ReteProps) {
  const tela = useRef<SVGSVGElement | null>(null);
  const gArchi = useRef<SVGGElement | null>(null);
  const gNodi = useRef<SVGGElement | null>(null);
  const posizioni = useRef<Record<string, { px: number; py: number }>>({});

  const disegna = useCallback(() => {
    const svg = tela.current;
    if (!svg) return;
    const r = svg.getBoundingClientRect();
    const W = Math.max(320, r.width);
    const H = Math.max(160, r.height);
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    const pos: Record<string, { px: number; py: number }> = {};
    NODI.forEach((n) => {
      pos[n.id] = { px: n.x * W, py: n.y * H };
    });
    posizioni.current = pos;

    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const ga = document.createElementNS(NS, 'g');
    const gn = document.createElementNS(NS, 'g');
    svg.appendChild(ga);
    svg.appendChild(gn);
    gArchi.current = ga;
    gNodi.current = gn;

    ARCHI.forEach(([a, b]) => {
      const p1 = pos[a];
      const p2 = pos[b];
      if (!p1 || !p2) return;
      const l = document.createElementNS(NS, 'line');
      l.setAttribute('class', 'arco');
      l.setAttribute('x1', String(p1.px));
      l.setAttribute('y1', String(p1.py));
      l.setAttribute('x2', String(p2.px));
      l.setAttribute('y2', String(p2.py));
      l.dataset['a'] = a;
      l.dataset['b'] = b;
      ga.appendChild(l);
    });

    NODI.forEach((n) => {
      const p = pos[n.id];
      if (!p) return;
      const g = document.createElementNS(NS, 'g');
      g.setAttribute('class', `nodo${n.stato ? ' ' + n.stato : ''}`);
      g.dataset['id'] = n.id;

      const alone = document.createElementNS(NS, 'circle');
      alone.setAttribute('class', 'alone');
      alone.setAttribute('cx', String(p.px));
      alone.setAttribute('cy', String(p.py));
      alone.setAttribute('r', '4');
      g.appendChild(alone);

      let corpo: SVGElement;
      if (n.tipo === 'documento' || n.tipo === 'fattura') {
        corpo = document.createElementNS(NS, 'rect');
        corpo.setAttribute('x', String(p.px - n.r));
        corpo.setAttribute('y', String(p.py - n.r));
        corpo.setAttribute('width', String(n.r * 2));
        corpo.setAttribute('height', String(n.r * 2));
        corpo.setAttribute('rx', '1.5');
      } else if (n.tipo === 'fornitore' || n.tipo === 'scadenza') {
        corpo = document.createElementNS(NS, 'polygon');
        corpo.setAttribute(
          'points',
          `${p.px},${p.py - n.r} ${p.px + n.r},${p.py} ${p.px},${p.py + n.r} ${p.px - n.r},${p.py}`,
        );
      } else {
        corpo = document.createElementNS(NS, 'circle');
        corpo.setAttribute('cx', String(p.px));
        corpo.setAttribute('cy', String(p.py));
        corpo.setAttribute('r', String(n.r));
      }
      corpo.setAttribute('class', 'corpo');
      g.appendChild(corpo);

      // L'etichetta esiste ma è invisibile finché il nodo non è vivo:
      // niente muro di testo sullo sfondo.
      const t = document.createElementNS(NS, 'text');
      t.setAttribute('class', 'eti');
      t.setAttribute('x', String(p.px + n.r + 5));
      t.setAttribute('y', String(p.py + 3.2));
      t.textContent = n.eti;
      g.appendChild(t);

      g.addEventListener('mouseenter', () => accendi([n.id], 1500));
      gn.appendChild(g);
    });
  }, []);

  function accendi(ids: readonly string[], durata = 2400) {
    const gn = gNodi.current;
    const ga = gArchi.current;
    if (!gn || !ga) return;
    ids.forEach((id) => gn.querySelector(`[data-id="${id}"]`)?.classList.add('viva'));
    const linee = Array.from(ga.querySelectorAll('line'));
    linee.forEach((l) => {
      const a = l.dataset['a'] ?? '';
      const b = l.dataset['b'] ?? '';
      if (ids.includes(a) && ids.includes(b)) l.classList.add('viva');
    });
    window.setTimeout(() => {
      ids.forEach((id) => gn.querySelector(`[data-id="${id}"]`)?.classList.remove('viva'));
      linee.forEach((l) => l.classList.remove('viva'));
    }, durata);
  }

  function impulso(a: string, b: string) {
    const gn = gNodi.current;
    const p1 = posizioni.current[a];
    const p2 = posizioni.current[b];
    if (!gn || !p1 || !p2) return;

    // Estraggo i numeri PRIMA di creare la chiusura: dentro `muovi` il
    // restringimento di tipo su p1/p2 non è garantito (sono letti da un
    // indice, quindi `| undefined` per `noUncheckedIndexedAccess`), e
    // dipenderebbe dalla versione di TypeScript. Con quattro numeri
    // semplici il dubbio non esiste — ed è anche più leggibile.
    const { px: x1, py: y1 } = p1;
    const { px: x2, py: y2 } = p2;

    const c = document.createElementNS(NS, 'circle');
    c.setAttribute('class', 'impulso');
    c.setAttribute('r', '2.6');
    c.setAttribute('cx', String(x1));
    c.setAttribute('cy', String(y1));
    gn.appendChild(c);

    const t0 = performance.now();
    function muovi(t: number) {
      const k = Math.min((t - t0) / 480, 1);
      c.setAttribute('cx', String(x1 + (x2 - x1) * k));
      c.setAttribute('cy', String(y1 + (y2 - y1) * k));
      if (k < 1) requestAnimationFrame(muovi);
      else c.remove();
    }
    requestAnimationFrame(muovi);
  }

  /** Il ragionamento prende forma: un nodo alla volta, con l'impulso. */
  const traccia = useCallback((percorso: readonly string[]) => {
    const gn = gNodi.current;
    const ga = gArchi.current;
    if (!gn || !ga || percorso.length === 0) return;
    const ridotto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (ridotto) {
      accendi(percorso, 2600);
      return;
    }
    let i = 0;
    function passo() {
      if (i >= percorso.length) return;
      const id = percorso[i];
      if (id) gn?.querySelector(`[data-id="${id}"]`)?.classList.add('viva');
      const prima = i > 0 ? percorso[i - 1] : undefined;
      if (prima && id) {
        const l =
          ga?.querySelector(`line[data-a="${prima}"][data-b="${id}"]`) ??
          ga?.querySelector(`line[data-a="${id}"][data-b="${prima}"]`);
        if (l) l.classList.add('viva');
        impulso(prima, id);
      }
      i += 1;
      window.setTimeout(passo, 520);
    }
    passo();
    window.setTimeout(
      () => {
        percorso.forEach((id) => gn?.querySelector(`[data-id="${id}"]`)?.classList.remove('viva'));
        ga?.querySelectorAll('line.viva').forEach((l) => l.classList.remove('viva'));
      },
      520 * percorso.length + 2600,
    );
  }, []);

  useEffect(() => {
    disegna();
    const ri = () => disegna();
    window.addEventListener('resize', ri);
    return () => window.removeEventListener('resize', ri);
  }, [disegna]);

  useEffect(() => {
    const t = window.setTimeout(
      () => traccia(catena && catena.length > 0 ? catena : ['catalogo', 'metalsud', 'margine', 'ferro']),
      900,
    );
    return () => window.clearTimeout(t);
  }, [catena, traccia]);

  return (
    <div className="pannello-rete">
      <div className="rete-eti">
        <span className="rete-punto" aria-hidden="true" />
        LA RETE DELLA TUA AZIENDA — {NODI.length} ENTITÀ, {ARCHI.length} LEGAMI
      </div>
      <svg
        ref={tela}
        className="tela"
        style={{ height: altezza }}
        aria-label="Rete viva dell'azienda"
      />
    </div>
  );
}
