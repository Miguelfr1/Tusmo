import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Signale qu une bande horizontale continue au-delà du bord visible.
 *
 * La barre d onglets du carnet mesure 471 px dans 390 px d écran : deux
 * onglets sont hors champ sans que rien ne l indique. Ce hook renvoie les
 * bords encore masqués pour qu un dégradé les révèle.
 *
 * Il expose une ref de rappel plutôt qu un objet ref : le nœud est ainsi
 * mesuré au moment où il est attaché, sans lecture de ref pendant le rendu.
 */
export default function useScrollEdges() {
  const nodeRef = useRef(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  const measure = useCallback(() => {
    const node = nodeRef.current;
    if (!node) return;
    const restant = node.scrollWidth - node.clientWidth - node.scrollLeft;
    setEdges({ start: node.scrollLeft > 4, end: restant > 4 });
  }, []);

  const observerRef = useRef(null);
  const attach = useCallback(
    (node) => {
      observerRef.current?.disconnect();
      nodeRef.current?.removeEventListener("scroll", measure);
      nodeRef.current = node;
      if (!node) return;
      node.addEventListener("scroll", measure, { passive: true });
      observerRef.current = new ResizeObserver(measure);
      observerRef.current.observe(node);
      measure();
    },
    [measure],
  );

  useEffect(() => () => observerRef.current?.disconnect(), []);

  return {
    attach,
    shellProps: {
      className: "scroll-shell",
      "data-start": edges.start || undefined,
      "data-end": edges.end || undefined,
    },
  };
}
