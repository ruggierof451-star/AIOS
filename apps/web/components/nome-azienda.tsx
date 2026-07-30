'use client';

import { useEffect, useState } from 'react';
import { aziendaSalvata } from '@/lib/api/sessione';
import { azienda } from '@/lib/mock/dati';

/**
 * Mostra il nome dell'organizzazione creata davvero nel Primo Incontro.
 * Se non c'è (sessione di sola lettura sui dati demo), ricade sul nome
 * dell'azienda simulata.
 */
export function NomeAzienda() {
  const [nome, setNome] = useState(azienda.nome);

  useEffect(() => {
    const salvata = aziendaSalvata();
    if (salvata) setNome(salvata.nome);
  }, []);

  return <span>{nome}</span>;
}
