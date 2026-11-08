/**
 * Números que contam até o valor final quando entram na tela (ex.: "13", "7+", "1.302h").
 * - O valor final já está no HTML: sem JavaScript ou com "reduzir movimento", nada muda.
 * - O leitor de tela recebe sempre o valor final (aria-label), nunca os intermediários.
 * - Largura reservada (tabular-nums) evita deslocar o layout durante a contagem.
 */
const alvos = document.querySelectorAll<HTMLElement>('[data-contar]');
const reduzir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function animar(el: HTMLElement) {
  const final = el.textContent ?? '';
  const m = final.match(/^(\D*)([\d.]+)(.*)$/);
  if (!m) return;
  const [, antes, numeroTexto, depois] = m;
  const alvo = Number(numeroTexto.replace(/\./g, ''));
  if (!Number.isFinite(alvo) || alvo <= 0) return;
  el.setAttribute('aria-label', final);
  const formatar = (n: number) => antes + n.toLocaleString('pt-BR') + depois;
  const duracao = Math.min(1400, 600 + alvo * 40);
  const inicio = performance.now();
  const passo = (agora: number) => {
    const t = Math.min(1, (agora - inicio) / duracao);
    const suave = 1 - Math.pow(1 - t, 3);
    el.textContent = formatar(Math.round(alvo * suave));
    if (t < 1) requestAnimationFrame(passo);
    else el.textContent = final;
  };
  requestAnimationFrame(passo);
}

if (alvos.length && !reduzir && 'IntersectionObserver' in window) {
  const obs = new IntersectionObserver(
    (entradas) => {
      for (const e of entradas) {
        if (!e.isIntersecting) continue;
        animar(e.target as HTMLElement);
        obs.unobserve(e.target);
      }
    },
    { threshold: 0.6 },
  );
  alvos.forEach((a) => obs.observe(a));
}

export {};
