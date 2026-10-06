(() => {
  'use strict';
  const data = window.MENU_DATA, recipes = new Map([...data.recipes, ...(data.dining || [])].map(r => [r.id, r]));
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const url = value => /^https:\/\//.test(value || '') ? esc(value) : '';
  const photo = (r, cls = '') => r.image ? '<img class="' + cls + '" src="' + url(r.image) + '" alt="' + esc(r.name) + ' · 来源图片示意" loading="lazy" referrerpolicy="no-referrer">' : '';
  const amount = v => Math.round(v * 10) / 10;
  let category = '全部', activeRecipe, servings = 2, returnFocus, toastTimer;
  const toast = message => { $('toast').textContent = message; $('toast').classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('show'), 2600); };
  const setView = value => {
    const view = ['week', 'recipes', 'shopping'].includes(value) ? value : 'week';
    document.querySelectorAll('.view').forEach(el => el.hidden = el.id !== view);
    document.querySelectorAll('[data-view]').forEach(el => { el.classList.toggle('active', el.dataset.view === view); el.setAttribute('aria-pressed', String(el.dataset.view === view)); });
  };
  const mealTypes = ['breakfast','lunch','dinner'];
  $('calendar').innerHTML = data.schedule.map(day => '<article class="day" data-date="' + esc(day.date) + '"><div class="day-head"><strong>周' + '日一二三四五六'[WeekTools.weekday(day.date)] + '</strong><span title="' + day.date + '">' + day.date.slice(5).replace('-','/') + '</span></div><div class="day-meals">' + mealTypes.map((type,j) => '<div class="meal" data-meal="' + type + '"><div class="meal-name">' + ['早餐','午餐','晚餐'][j] + '</div>' + day.meals[type].map(id => '<button class="dish" data-recipe="' + esc(id) + '">' + esc(recipes.get(id).name) + '</button>').join('') + '</div>').join('') + '</div></article>').join('');
  data.schedule.forEach(day => {
    if (!(day.snacks || []).length) return;
    const meal = document.createElement('div'); meal.className='meal'; meal.dataset.meal='snack';
    meal.innerHTML='<div class="meal-name">加餐</div>'+day.snacks.map(id=>'<button class="dish" data-recipe="'+esc(id)+'">'+esc(recipes.get(id).name)+'</button>').join('');
    document.querySelector('[data-date="'+day.date+'"] .day-meals').append(meal);
  });
  if (data.nutritionCheck) {
    const details=document.createElement('details');details.className='nutrition-review';
    const check=data.nutritionCheck, count=check.days.reduce((n,d)=>n+d.suggestions.length+d.safety.length,0);
    details.innerHTML='<summary>搭配检查 · '+(count ? count+' 条建议／待核实提示' : '未识别到明显类别缺口')+'</summary><p class="small">'+esc(check.scope)+'</p>'+check.days.map(d=>'<div class="review-day"><strong>'+esc(d.date.slice(5))+' · '+esc(d.status)+'</strong>'+[...d.suggestions,...d.safety,...d.unknown].map(s=>'<p>'+esc(s)+'</p>').join('')+'</div>').join('')+'<p>'+esc(check.seafood.suggestion)+'</p><p class="small">'+esc(check.seafood.note)+'</p>';
    $('calendar').after(details);
  }
  if(data.syncedAt){const stamp=document.createElement('p');stamp.className='small sync-stamp';stamp.textContent='从 Mealie 更新：'+new Date(data.syncedAt).toLocaleString('zh-CN',{timeZone:'America/Los_Angeles'})+'（西雅图时间）';document.querySelector('.week-picker').after(stamp);}
  const weekEnd = WeekTools.addDays(data.weekStart,6);
  const outCount = data.schedule.flatMap(day => mealTypes.flatMap(type => day.meals[type])).filter(id => recipes.get(id).name === '外食').length;
  document.querySelector('.hero-meta').innerHTML = '<span>' + data.weekStart.replaceAll('-','.') + ' — ' + weekEnd.slice(5).replace('-','.') + '</span><span>夫妻两人份</span><span>' + outCount + ' 餐外食</span><span>' + data.recipes.length + ' 道食谱</span>';
  document.title = '好好吃饭 · ' + data.weekStart + ' 一周菜单';
  function renderRecipes() {
    const query = $('search').value.trim().toLowerCase();
    const list = data.recipes.filter(r => (category === '全部' || r.category === category || r.type === category) && (r.name + ' ' + r.ingredients.map(x => x.name).join(' ')).toLowerCase().includes(query));
    $('recipe-grid').innerHTML = list.map(r => '<button class="recipe-card" data-recipe="' + esc(r.id) + '">' + photo(r) + '<span class="card-text"><strong>' + esc(r.name) + '</strong><span>' + esc(r.type || r.category) + ' · 约' + esc(r.minutes) + '分钟 · 两人份</span></span></button>').join('') || '<p>暂时没有匹配的菜，试试别的材料或分类。</p>';
  }
  (data.dining || []).forEach(r => {
    const button = document.querySelector('[data-recipe="' + r.id + '"]');
    if (!button) return;
    button.classList.add('out-dish');
    const note = document.createElement('p');
    note.className = 'small dining-time';
    note.textContent = r.options.join(' / ');
    button.after(note);
  });
  const categories = ['全部', ...new Set(data.recipes.map(r => r.category)), ...new Set(data.recipes.map(r => r.type).filter(Boolean))];
  $('filters').innerHTML = categories.map(c => '<button data-category="' + esc(c) + '" aria-pressed="' + (c === category) + '" class="' + (c === category ? 'active' : '') + '">' + esc(c) + '</button>').join('');
  $('filters').addEventListener('click', event => {
    const button = event.target.closest('[data-category]'); if (!button) return;
    category = button.dataset.category;
    $('filters').querySelectorAll('button').forEach(b => { b.classList.toggle('active', b === button); b.setAttribute('aria-pressed', String(b === button)); }); renderRecipes();
  });
  $('search').addEventListener('input', renderRecipes);
  function renderDetail() {
    const r = activeRecipe;
    if (r.kind === 'dining') {
      $('recipe-detail').innerHTML = '<div class="detail-body dining-detail"><h2 id="dialog-name">' + esc(r.name) + '</h2><ul>' + r.options.map(option => '<li>' + esc(option) + '</li>').join('') + '</ul>' + (r.note ? '<p class="small">' + esc(r.note) + '</p>' : '') + '</div>';
      return;
    }
    $('recipe-detail').innerHTML = photo(r, 'detail-photo') + '<div class="detail-body"><p class="eyebrow">' + esc(r.type || r.category) + '</p><h2 id="dialog-name">' + esc(r.name) + '</h2><div class="detail-meta"><span>约' + esc(r.minutes) + '分钟</span><div class="servings-control"><button data-servings="-1" aria-label="减少一人份"' + (servings === 1 ? ' disabled' : '') + '>−</button><span>' + servings + ' 人份</span><button data-servings="1" aria-label="增加一人份"' + (servings === 8 ? ' disabled' : '') + '>+</button></div></div><p class="nutrition">' + esc(r.nutrition) + '</p><div class="detail-columns"><div><h3>准备材料</h3>' + r.ingredients.map(x => '<div class="ingredient">' + esc(x.name) + '<span>' + amount(x.quantity * servings / 2) + ' ' + esc(x.unit) + '</span></div>').join('') + '</div><div><h3>简单做法</h3><ol class="steps">' + r.steps.map(step => '<li>' + esc(step) + '</li>').join('') + '</ol></div></div><div class="source-note"><p>' + esc(r.note) + '</p><p>' + (r.image ? '做法已按家常做饭简化；图片展示来源菜品，可能与改方不同。' : '简单加餐按食材直接准备。') + '</p><a href="' + url(r.url) + '" target="_blank" rel="noopener noreferrer">参考来源 ↗</a></div></div>';
  }
  document.addEventListener('click', event => {
    const recipeButton = event.target.closest('[data-recipe]');
    if (recipeButton) { activeRecipe = recipes.get(recipeButton.dataset.recipe); servings = 2; returnFocus = recipeButton; renderDetail(); $('recipe-dialog').showModal(); }
    const viewButton = event.target.closest('[data-view]');
    if (viewButton) { location.hash = viewButton.dataset.view; setView(viewButton.dataset.view); }
  });
  $('recipe-detail').addEventListener('click', event => {
    const button = event.target.closest('[data-servings]'); if (!button) return;
    const change = Number(button.dataset.servings); servings = Math.max(1, Math.min(8, servings + change)); renderDetail();
    $('recipe-detail').querySelector('[data-servings="' + change + '"]').focus();
  });
  $('close-dialog').addEventListener('click', () => $('recipe-dialog').close());
  $('recipe-dialog').addEventListener('click', event => { if (event.target === $('recipe-dialog')) { const rect = event.target.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) event.target.close(); } });
  $('recipe-dialog').addEventListener('close', () => returnFocus?.focus());
  const totals = new Map();
  data.schedule.flatMap(day => [...mealTypes.flatMap(type => day.meals[type]), ...(day.snacks || [])]).forEach(id => recipes.get(id).ingredients.forEach(x => {
    const key = x.name + '|' + x.unit; const item = totals.get(key) || {...x, quantity: 0, key}; item.quantity += x.quantity; totals.set(key, item);
  }));
  const group = name => /牛奶|酸奶|芝士|鸡蛋/.test(name) ? '蛋奶与乳制品' : /鸡(?:肉|腿|胸)|牛肉|猪肉|肉末|虾仁|三文鱼|豆腐|黑豆/.test(name) ? '肉鱼与豆类' : /米|燕麦|面包|玉米饼|水饺|小笼包|馒头|红薯/.test(name) ? '主食与冷冻早餐' : /油|盐|酱油|核桃|大蒜|柠檬/.test(name) ? '调味与其他' : '蔬菜与水果';
  const storageKey = 'weekly-menu-shopping-' + data.weekStart + '-' + (data.revision || '');
  let checked = [];
  try { const saved = JSON.parse(localStorage.getItem(storageKey) || '[]'); if (Array.isArray(saved)) checked = saved.filter(x => typeof x === 'string'); } catch {}
  function renderShopping() {
    $('shopping-list').innerHTML = ['蔬菜与水果','肉鱼与豆类','蛋奶与乳制品','主食与冷冻早餐','调味与其他'].map(name => {
      const items = [...totals.values()].filter(x => group(x.name) === name);
      return items.length ? '<section class="shopping-group"><h3>' + name + '</h3>' + items.map(x => '<label class="shopping-item"><input type="checkbox" data-item="' + esc(x.key) + '"' + (checked.includes(x.key) ? ' checked' : '') + '>' + esc(x.name) + '<span>' + amount(x.quantity) + ' ' + esc(x.unit) + '</span></label>').join('') + '</section>' : '';
    }).join('');
  }
  $('shopping-list').addEventListener('change', event => {
    const key = event.target.dataset.item; if (!key) return; checked = checked.filter(x => x !== key); if (event.target.checked) checked.push(key);
    try { localStorage.setItem(storageKey, JSON.stringify(checked)); } catch { toast('当前浏览器无法保存勾选'); }
  });
  $('reset-shopping').addEventListener('click', () => { checked = []; try { localStorage.removeItem(storageKey); } catch {} renderShopping(); });
  $('print').addEventListener('click', () => window.print());
  $('share').addEventListener('click', async () => {
    try { if (navigator.share) await navigator.share({title: document.title, url: location.href}); else { await navigator.clipboard.writeText(location.href); toast('分享链接已复制'); } } catch (error) { if (error.name !== 'AbortError') toast('请复制浏览器地址栏里的链接'); }
  });
  document.addEventListener('error', event => { if (event.target.tagName === 'IMG') { event.target.style.objectFit = 'contain'; event.target.removeAttribute('src'); } }, true);
  const firstLunch = data.schedule[0].meals.lunch.map(id=>recipes.get(id));
  const heroRecipe = firstLunch.find(r=>r.id==='salmon') || firstLunch.find(r=>r.image) || data.recipes.find(r=>r.image);
  if (heroRecipe) { $('hero-photo').src=heroRecipe.image; $('hero-photo').alt=heroRecipe.name+' · 来源图片示意'; $('hero-photo').referrerPolicy='no-referrer'; $('hero-source').href=heroRecipe.url; }
  document.querySelector('.photo-label span').textContent = '周一午餐';
  document.querySelector('.photo-label strong').textContent = firstLunch.filter(r=>r.category!=='加餐候选').map(r=>r.name).join(' · ');
  window.addEventListener('hashchange', () => setView(location.hash.slice(1)));
  renderRecipes(); renderShopping(); setView(location.hash.slice(1));
})();


