// util.js – hjälpfunktioner

// Hämta ett element med querySelector
export function q(sel, root = document) {
  return root.querySelector(sel);
}

// Skapa ett nytt element med attribut
export function el(tag, attrs = {}) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'text') {
      e.textContent = v; // Om 'text' används, sätt textinnehållet
    } else {
      e.setAttribute(k, v); // Annars sätt attribut
    }
  }
  return e;
}

// --- Tillgänglig hamburgermeny (körs bara om knapp finns) ---
(function setupHamburger() {
  const btn = document.querySelector('.hamburger'); // Menyknappen
  const nav = document.getElementById('primary-nav'); // Navigationsmenyn
  if (!btn || !nav) return; // Avsluta om inget finns

  // Funktion för att öppna/stänga menyn
  function setOpen(isOpen) {
    nav.classList.toggle('open', isOpen); // Lägg till/ta bort klassen
    btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false'); // Tillgänglighetsattribut
  }

  // Klick på knappen öppnar/stänger menyn
  btn.addEventListener('click', () => {
    const nowOpen = btn.getAttribute('aria-expanded') !== 'true';
    setOpen(nowOpen);
  });

  // Stäng menyn med Escape-tangenten
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setOpen(false);
  });

  // Stäng menyn när en länk klickas (mobilvänligt)
  nav.addEventListener('click', (e) => {
    if (e.target.closest('a')) setOpen(false);
  });
})();
