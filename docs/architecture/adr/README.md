# Architecture Decision Records — AIOS

Un ADR registra **una decisione architetturale**, il contesto in cui è
stata presa, le alternative scartate e perché, e le conseguenze accettate.
Non è un verbale di riunione né una guida implementativa — è la risposta,
per iscritto, alla domanda che qualcuno si farà tra due anni: *"perché
abbiamo fatto così, e non nell'altro modo ovvio?"*

## Quando scrivere un ADR

Non ogni scelta tecnica merita un ADR — solo quelle che:
- Hanno **alternative reali** scartate consapevolmente (non l'unica opzione sensata).
- Sono **costose da invertire** una volta che altro codice vi si appoggia.
- Restano rilevanti **oltre l'incremento** in cui sono state prese — una convenzione o un principio, non un dettaglio locale di un singolo file.

Una scelta di stile del codice, un nome di variabile, un dettaglio
implementativo reversibile in un pomeriggio: non è un ADR.

## Come scriverne uno

1. Copia `template.md` in un nuovo file `NNNN-titolo-breve-in-kebab-case.md`, dove `NNNN` è il prossimo numero progressivo a 4 cifre (mai riutilizzato, anche se un ADR viene poi superato).
2. Compila tutte le sezioni del template.
3. Aggiungi una riga all'indice qui sotto.
4. Se un nuovo ADR ne sostituisce uno vecchio, non cancellare il vecchio: cambia il suo `Status` in `Superseded by ADR-NNNN` e aggiungi un riferimento incrociato.

## Stati possibili

- **Proposed** — in discussione, non ancora vincolante.
- **Accepted** — la decisione attualmente in vigore.
- **Deprecated** — non più raccomandata, ma non ancora sostituita da un'alternativa esplicita.
- **Superseded by ADR-NNNN** — rimpiazzata da una decisione successiva, che va consultata.

## Indice

| # | Titolo | Stato |
|---|---|---|
| [0001](0001-legal-bounded-context-placement.md) | Bounded Context Legal separato concettualmente, non come servizio a sé | Accepted |
