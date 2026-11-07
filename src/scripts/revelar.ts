/**
 * Entrada suave dos blocos marcados com a classe "revelar".
 * - Sem JavaScript, ou com "reduzir movimento" ligado, tudo aparece normalmente.
 * - Cada bloco anima uma única vez, quando entra na tela.
 */
const blocos = document.querySelectorAll<HTMLElement>('.revelar');
const reduzir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (blocos.length && !reduzir && 'IntersectionObserver' in window) {
  document.documentElement.classList.add('revelar-ativo');
  const observador = new IntersectionObserver(
    (entradas) => {
      for (const e of entradas) {
        if (!e.isIntersecting) continue;
        e.target.classList.add('visivel');
        observador.unobserve(e.target);
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
  );
  // Blocos já visíveis ao carregar aparecem sem atraso
  for (const b of blocos) {
    if (b.getBoundingClientRect().top < window.innerHeight) b.classList.add('visivel');
    else observador.observe(b);
  }
}
