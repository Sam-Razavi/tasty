// widget.js - hämtar data från TheMealDB
import { q, el } from './util.js';

const WIDGET = q('#food-widget');
const BTN = q('#btn-random');
const ENDPOINT = 'https://www.themealdb.com/api/json/v1/1/random.php';

function renderError(msg='Tyvärr, inga recept kunde hämtas just nu. Försök igen senare.'){
  WIDGET.innerHTML = '';
  const div = el('div', { class:'pad' });
  div.append(el('p', { text: msg }));
  WIDGET.append(div);
}

function renderMeal(meal){
  WIDGET.innerHTML='';
  const card = el('div', { class:'grid grid-2' });
  const left = el('div');
  const right = el('div');

  const h2 = el('h2', { text: meal.strMeal || 'Okänt recept' });
  const img = el('img', { src: meal.strMealThumb || '', alt: meal.strMeal ? ('Bild på ' + meal.strMeal) : 'Receptbild saknas' });

  // Ingredienser & mått (1..20)
  const list = el('ul');
  for(let i=1;i<=20;i++){
    const ing = meal[`strIngredient${i}`];
    const mea = meal[`strMeasure${i}`];
    if(ing && ing.trim() !== ''){
      const li = el('li', { text: `${ing}${mea ? ' – ' + mea : ''}` });
      list.append(li);
    }
  }

  left.append(h2, img);
  right.append(el('h3', { text: 'Ingredienser' }), list, el('h3', { text:'Instruktioner' }), el('p', { text: meal.strInstructions || 'Instruktioner saknas för detta recept.' }));

  card.append(left, right);
  WIDGET.append(card);
}

async function fetchRandom(){
  try{
    WIDGET.setAttribute('aria-busy','true');
    WIDGET.innerHTML = '<p class="pad">Hämtar recept…</p>';
    const res = await fetch(ENDPOINT);
    if(!res.ok){ throw new Error('Nätverksfel: ' + res.status); }
    const data = await res.json();
    const meal = data?.meals?.[0];
    if(!meal){ renderError(); return; }
    renderMeal(meal);
  }catch(err){
    renderError();
  }finally{
    WIDGET.removeAttribute('aria-busy');
  }
}

BTN?.addEventListener('click', fetchRandom);
fetchRandom();
