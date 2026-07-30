import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * Carica il file .env dalla radice del monorepo, individuata risalendo
 * l'albero delle cartelle a partire da `startDir` (di default la
 * posizione di questo modulo, `__dirname`) fino a trovare
 * `pnpm-workspace.yaml` — mai un conteggio di livelli hardcoded (fragile:
 * si romperebbe se un servizio cambiasse profondità nella struttura, ed è
 * esattamente il tipo di assunzione che ha già causato un bug in questo
 * progetto).
 *
 * Perché questo esiste: l'iniezione delle variabili d'ambiente tramite
 * la catena `dotenv-cli → turbo → processo figlio` non si è dimostrata
 * affidabile per ogni tipo di processo figlio dell'intero monorepo (il
 * worker Eventing, avviato con `tsx watch`, non la riceveva). Invece di
 * continuare a fidarsi di quella catena — che nessun servizio verificava
 * comunque in modo esplicito, inclusi quelli NestJS — ogni servizio ora
 * si carica l'ambiente da sé, in modo esplicito e indipendente da COME
 * viene avviato (pnpm dev, Docker, chiamata diretta di `node dist/main.js`).
 *
 * Non duplica alcun valore: il file .env resta unico, in un solo posto
 * (la radice del monorepo) — questa funzione ne cambia solo il modo in
 * cui viene raggiunto e caricato in memoria da ciascun processo.
 *
 * Il parametro `startDir` esiste principalmente per rendere la funzione
 * testabile senza dover manipolare `__dirname` reale del modulo.
 */
export function loadRootEnv(startDir: string = __dirname): void {
  let dir = startDir;

  for (let i = 0; i < 15; i++) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml'))) {
      config({ path: join(dir, '.env') });
      return;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      // Raggiunta la radice del filesystem senza trovare il marker —
      // non è necessariamente un errore: le variabili potrebbero essere
      // già presenti nell'ambiente (es. iniettate direttamente da Docker
      // Compose, che non passa da questo meccanismo).
      return;
    }
    dir = parent;
  }
}
