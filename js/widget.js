// widget.js – TheMealDB-widget
// Allt UI skapas med JS i #food-widget (krav: endast ett widget-element i HTML)
import { q, el } from './util.js';

const WIDGET = q('#food-widget');

// --- API-endpoints ---
const EP_RANDOM = 'https://www.themealdb.com/api/json/v1/1/random.php';
const EP_SEARCH = (term) => `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(term)}`;
const EP_LOOKUP = (id)   => `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${encodeURIComponent(id)}`;

// --- Enkel state (för sök + paginering) ---
const state = {
  meals: [],
  term: '',
  page: 1,
  perPage: 5,
  lastAction: 'random' // 'random' | 'search'
};

// ===========================
// Små hjälp-funktioner (render/busy)
// ===========================

// Visar kontroller + ett valfritt innehållsnode under
function wrapWithControls(contentNode) {
  WIDGET.innerHTML = '';
  const wrap = el('div', { class: 'grid' });
  wrap.append(buildControls());
  if (contentNode) wrap.append(contentNode);
  WIDGET.append(wrap);
}

// Enkelt placeholder-element om bild saknas
function imgPlaceholder(label = 'Receptbild saknas') {
  const ph = el('div', { class: 'card', role: 'img', 'aria-label': label });
  const pad = el('div', { class: 'pad' });
  pad.append(el('p', { text: '🍽️ Bild saknas' }));
  ph.append(pad);
  return ph;
}

// Sätt/ta bort aria-busy på widgeten
function setBusy(isBusy) {
  if (isBusy) WIDGET.setAttribute('aria-busy', 'true');
  else WIDGET.removeAttribute('aria-busy');
}

// Visa enkel laddtext
function renderLoading(text = 'Hämtar recept…') {
  setBusy(true);
  wrapWithControls(el('p', { class: 'pad', text }));
}

// Visa felmeddelande (med förslag/retry vid behov)
function renderError(msg, { showSuggestions = false, canRetry = true } = {}) {
  setBusy(false);

  // Offline- eller generellt fel
  if (navigator && navigator.onLine === false) {
    msg = 'Du verkar vara offline. Kontrollera din internetanslutning och försök igen.';
  } else if (!msg) {
    msg = 'Tyvärr, något gick fel. Försök igen om en liten stund.';
  }

  const card = el('div', { class: 'card' });
  const pad  = el('div', { class: 'pad' });
  pad.append(el('p', { text: msg }));

  // Förslag vid tomt resultat (gör det lätt att testa)
  if (showSuggestions) {
    const suggestions = ['chicken', 'beef', 'pasta', 'salad'];
    const tip  = el('p', { text: 'Tips på sökord:' });
    const list = el('div', { class: 'grid' });
    suggestions.forEach(s => {
      list.append(el('button', {
        class: 'button', text: s, 'data-suggest': s, 'aria-label': `Sök ${s}`
      }));
    });
    // Klick på förslag = kör sök direkt
    list.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-suggest]');
      if (!btn) return;
      state.term = btn.getAttribute('data-suggest');
      state.page = 1;
      fetchSearch(state.term);
    });
    pad.append(tip, list);
  }

  // Försök igen-knapp
  if (canRetry) {
    const retry = el('button', { class: 'button', text: 'Försök igen', 'aria-label': 'Försök igen' });
    retry.addEventListener('click', () => {
      if (state.lastAction === 'search' && state.term) fetchSearch(state.term);
      else fetchRandom();
    });
    pad.append(el('span', { text: ' ' }), retry);
  }

  card.append(pad);
  wrapWithControls(card); // Viktigt: lägg in kontroller + felkort EN gång
}

// Bygger sökfält + “Slumpa”-knapp (skapas alltid via JS)
function buildControls() {
  const form  = el('form', { class: 'card', role: 'search', 'aria-label': 'Sök recept' });
  const inner = el('div',  { class: 'pad' });

  const label    = el('label', { for: 'search-term', text: 'Sök recept (namn): ' });
  const input    = el('input', {
    id: 'search-term', name: 'q', type: 'search',
    placeholder: 't.ex. chicken', 'aria-label': 'Sök recept', value: state.term || ''
  });
  const btnFind  = el('button', { type: 'submit', class: 'button', text: 'Sök' });
  const btnRand  = el('button', { type: 'button', class: 'button', text: 'Slumpa recept', 'aria-label': 'Hämta ett slumpmässigt recept' });

  inner.append(label, input, el('span', { text: ' ' }), btnFind, el('span', { text: ' ' }), btnRand);
  form.append(inner);

  // Sök
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const term = input.value.trim();
    if (!term) { fetchRandom(); return; }
    state.term = term;
    state.page = 1;
    fetchSearch(term);
  });

  // Slump
  btnRand.addEventListener('click', () => {
    state.term = '';
    state.page = 1;
    fetchRandom();
  });

  return form;
}

// ===========================
// Detaljvy (ett recept)
// ===========================
function renderMeal(meal) {
  const card = el('div', { class: 'grid grid-2' });
  const left = el('div');
  const right = el('div');

  const title = meal?.strMeal || 'Okänt recept';
  const h2    = el('h2', { text: title });

  const img = el('img', {
    src: meal?.strMealThumb || '',
    alt: meal?.strMeal ? ('Bild på ' + meal.strMeal) : 'Receptbild saknas',
    loading: 'lazy', decoding: 'async'
  });
  img.addEventListener('error', () => {
    img.replaceWith(imgPlaceholder(`Bild saknas för ${title}`));
  });

  // Ingredienslista 1..20
  const list = el('ul');
  for (let i = 1; i <= 20; i++) {
    const ing = meal?.[`strIngredient${i}`];
    const mea = meal?.[`strMeasure${i}`];
    if (ing && ing.trim() !== '') {
      list.append(el('li', { text: `${ing}${mea ? ' – ' + mea : ''}` }));
    }
    // Hoppa över tomma värden
  }

  left.append(h2, img);
  right.append(
    el('h3', { text: 'Ingredienser' }),
    list,
    el('h3', { text: 'Instruktioner' }),
    el('p', { text: meal?.strInstructions || 'Instruktioner saknas för detta recept.' })
  );

  wrapWithControls(card);
  card.append(left, right);
  setBusy(false);
}

// ===========================
// Listvy + paginering (5 per sida)
// ===========================
function renderListPage() {
  const { meals, term, page, perPage } = state;
  const total      = meals.length;
  const totalPages = Math.ceil(total / perPage) || 1;
  const start      = (page - 1) * perPage;
  const end        = Math.min(start + perPage, total);
  const pageItems  = meals.slice(start, end);

  const listWrap = el('div', { class: 'grid' });

  // Rubrik för sökresultat
  listWrap.append(el('h2', { text: `Sökresultat${term ? ` för “${term}”` : ''} (${total})` }));

  // Kort-grid
  const grid = el('div', { class: 'grid' });
  pageItems.forEach(m => {
    const card = el('article', { class: 'card', role: 'listitem' });
    const pad  = el('div', { class: 'pad' });

    const h3  = el('h3', { text: m.strMeal || 'Okänt recept' });
    const img = el('img', {
      src: m.strMealThumb || '',
      alt: m.strMeal ? ('Bild på ' + m.strMeal) : 'Receptbild saknas',
      loading: 'lazy', decoding: 'async'
    });
    const p   = el('p', { text: (m.strInstructions || '').slice(0, 150) + (m.strInstructions?.length > 150 ? '…' : '') });
    const btn = el('button', { class: 'button', text: 'Visa recept', 'data-id': m.idMeal, 'aria-label': `Visa ${m.strMeal}` });

    pad.append(h3, img, p, btn);
    card.append(pad);
    grid.append(card);
  });
  listWrap.append(grid);

  // Paginering (centrerad)
  const nav  = el('nav', { 'aria-label': 'Paginering', class: 'pad' });
  const info = el('span', { text: `Sida ${page} av ${totalPages}` });

  const btnPrev = el('button', { class: 'button', text: 'Föregående', 'aria-label': 'Föregående sida' });
  const btnNext = el('button', { class: 'button', text: 'Nästa',       'aria-label': 'Nästa sida' });

  // Viktigt: använd egenskapen disabled (inte attribut) för korrekt state
  btnPrev.disabled = page <= 1;
  btnNext.disabled = page >= totalPages;

  nav.append(btnPrev, el('span', { text: ' ' }), info, el('span', { text: ' ' }), btnNext);
  listWrap.append(nav);

  wrapWithControls(listWrap);
  setBusy(false);

  // Händelser: visa detalj via id
  grid.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-id]');
    if (!btn) return;
    const id = btn.getAttribute('data-id');
    await fetchById(id);
  });

  // Paginering fram/bak
  btnPrev.addEventListener('click', () => {
    if (state.page > 1) {
      state.page--;
      renderListPage();
    }
  });
  btnNext.addEventListener('click', () => {
    const totalPagesNow = Math.ceil(state.meals.length / state.perPage) || 1;
    if (state.page < totalPagesNow) {
      state.page++;
      renderListPage();
    }
  });
}

// ===========================
// Hämtare (fetch) – random, sök, lookup
// ===========================
async function fetchRandom() {
  try {
    state.lastAction = 'random';
    renderLoading('Hämtar slumpmässigt recept…');
    const res  = await fetch(EP_RANDOM);
    if (!res.ok) throw new Error('Nätverksfel: ' + res.status);
    const data = await res.json();
    const meal = data?.meals?.[0];
    if (!meal) { renderError(); return; }
    renderMeal(meal);
  } catch {
    renderError();
  }
}

async function fetchSearch(term) {
  try {
    state.lastAction = 'search';
    renderLoading('Söker recept…');
    const res   = await fetch(EP_SEARCH(term));
    if (!res.ok) throw new Error('Nätverksfel: ' + res.status);
    const data  = await res.json();
    const meals = data?.meals;
    if (!meals || meals.length === 0) {
      renderError(`Inget recept hittades för “${term}”. Försök med ett annat sökord.`, { showSuggestions: true });
      return;
    }
    state.meals = meals;
    state.page  = 1;
    renderListPage();
  } catch {
    renderError();
  }
}

async function fetchById(id) {
  try {
    renderLoading('Hämtar recept…');
    const res  = await fetch(EP_LOOKUP(id));
    if (!res.ok) throw new Error('Nätverksfel: ' + res.status);
    const data = await res.json();
    const meal = data?.meals?.[0];
    if (!meal) { renderError(); return; }
    renderMeal(meal);
  } catch {
    renderError();
  }
}

// Init – visa något direkt vid sidladdning
fetchRandom();
