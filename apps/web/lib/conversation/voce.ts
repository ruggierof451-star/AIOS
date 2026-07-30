/**
 * Voce di AIOS: ascolto (voce → testo) e parlato (testo → voce).
 *
 * Usa le API vocali native del browser — nessun servizio esterno,
 * nessun costo, nessun audio che lascia il dispositivo per il
 * riconoscimento. Tutto isolato qui: se in futuro passeremo a un
 * servizio di trascrizione migliore, cambia questo file e nient'altro.
 *
 * Limiti noti e dichiarati:
 * - Il riconoscimento non esiste su Firefox e su alcuni browser in-app;
 *   `ascoltoDisponibile()` va sempre interrogato prima di mostrare il
 *   microfono, mai dato per scontato.
 * - Su iOS il permesso al microfono viene chiesto ad ogni sessione e
 *   può essere negato dalle webview di altre app.
 * - La prima frase parlata richiede un gesto dell'utente (tocco): per
 *   noi è sempre vero, perché si parla solo dopo un invio.
 */

interface AlternativaVocale {
  readonly transcript: string;
}
interface RisultatoVocale {
  readonly isFinal: boolean;
  readonly length: number;
  readonly [indice: number]: AlternativaVocale | undefined;
}
interface ElencoRisultati {
  readonly length: number;
  readonly [indice: number]: RisultatoVocale | undefined;
}
interface EventoRisultato {
  readonly resultIndex: number;
  readonly results: ElencoRisultati;
}
interface EventoErrore {
  readonly error: string;
}
interface MotoreAscolto {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: EventoRisultato) => void) | null;
  onerror: ((e: EventoErrore) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type CostruttoreAscolto = new () => MotoreAscolto;

function costruttoreAscolto(): CostruttoreAscolto | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: CostruttoreAscolto;
    webkitSpeechRecognition?: CostruttoreAscolto;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function ascoltoDisponibile(): boolean {
  return costruttoreAscolto() !== null;
}

export function parlatoDisponibile(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export interface SessioneAscolto {
  ferma(): void;
}

/**
 * Avvia l'ascolto. `onParziale` riceve la trascrizione mentre parli
 * (così vedi che ti sto capendo), `onFinale` la frase completa.
 */
export function ascolta(opzioni: {
  onParziale: (testo: string) => void;
  onFinale: (testo: string) => void;
  onErrore: (messaggio: string) => void;
  onFine: () => void;
}): SessioneAscolto | null {
  const Costruttore = costruttoreAscolto();
  if (!Costruttore) {
    opzioni.onErrore('Questo browser non sa ascoltare. Su iPhone funziona in Safari.');
    return null;
  }

  const motore = new Costruttore();
  motore.lang = 'it-IT';
  motore.continuous = false;
  motore.interimResults = true;

  let accumulato = '';

  motore.onresult = (evento) => {
    let parziale = '';
    for (let i = evento.resultIndex; i < evento.results.length; i += 1) {
      const risultato = evento.results[i];
      const alternativa = risultato?.[0];
      if (!risultato || !alternativa) continue;
      if (risultato.isFinal) accumulato += alternativa.transcript;
      else parziale += alternativa.transcript;
    }
    if (accumulato) opzioni.onParziale(accumulato);
    else if (parziale) opzioni.onParziale(parziale);
  };

  motore.onerror = (evento) => {
    const messaggi: Record<string, string> = {
      'not-allowed': 'Non ho il permesso di usare il microfono. Concedilo e riprova.',
      'service-not-allowed': 'Il microfono è bloccato da questo browser.',
      'no-speech': 'Non ho sentito nulla. Riprova quando vuoi.',
      network: 'Il riconoscimento vocale ha bisogno di connessione.',
    };
    opzioni.onErrore(messaggi[evento.error] ?? 'Non riesco ad ascoltare adesso.');
  };

  motore.onend = () => {
    const frase = accumulato.trim();
    if (frase) opzioni.onFinale(frase);
    opzioni.onFine();
  };

  try {
    motore.start();
  } catch {
    opzioni.onErrore('Non riesco ad avviare il microfono.');
    return null;
  }

  return {
    ferma() {
      try {
        motore.stop();
      } catch {
        /* già fermo: non è un errore da mostrare */
      }
    },
  };
}

/** Legge un testo con una voce italiana, se il dispositivo ne ha una. */
export function parla(testo: string): void {
  if (!parlatoDisponibile()) return;
  const sintesi = window.speechSynthesis;
  sintesi.cancel();

  // Ripulisco quello che a voce suona male: virgolette e trattini lunghi.
  const pulito = testo.replace(/[«»"]/g, '').replace(/\s—\s/g, ', ');

  const frase = new SpeechSynthesisUtterance(pulito);
  frase.lang = 'it-IT';
  frase.rate = 1.03;
  frase.pitch = 1;

  const italiana = sintesi.getVoices().find((v) => v.lang.startsWith('it'));
  if (italiana) frase.voice = italiana;

  sintesi.speak(frase);
}

export function zittisci(): void {
  if (parlatoDisponibile()) window.speechSynthesis.cancel();
}
