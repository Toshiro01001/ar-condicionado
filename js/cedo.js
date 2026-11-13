/* Roda antes da primeira pintura: marca quem pediu menos movimento no sistema. */
if (matchMedia('(prefers-reduced-motion: reduce)').matches) document.documentElement.classList.add('is-reduced');
