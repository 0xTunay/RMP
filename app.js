const categories = [
  { id: 'water', label: 'Вада', icon: 'water' },
  { id: 'wifi', label: 'Wi-Fi', icon: 'wifi' },
  { id: 'toilet', label: 'Туалет', icon: 'toilet' },
  { id: 'rest', label: 'Адпачынак', icon: 'rest' },
  { id: 'medical', label: 'Першая дапамога', icon: 'medical' },
  { id: 'safety', label: 'Бяспека', icon: 'safety' },
  { id: 'help', label: 'Дапамога на вадзе', icon: 'help', wide: true },
];

const categoryGrid = document.querySelector('[data-category-grid]');
const screens = [...document.querySelectorAll('[data-screen]')];
const navItems = [...document.querySelectorAll('.bottom-nav [data-nav]')];
const toast = document.querySelector('[data-toast]');
const appContent = document.querySelector('.app-content');
const mapStage = document.querySelector('.map-stage');
let toastTimer;
let activeScreen = 'home';
let screenHistory = [];

const iconMarkup = (type) => {
  return `<svg class="category-icon-svg" viewBox="0 0 32 32" data-icon="${type}" aria-hidden="true"><use href="#icon-${type}"></use></svg>`;
};

categoryGrid.innerHTML = categories.map((category) => `
  <button class="category-card${category.wide ? ' category-card-wide' : ''}" type="button" data-category="${category.id}">
    ${iconMarkup(category.icon)}
    <span>${category.label}</span>
  </button>
`).join('');

document.querySelector('[data-action="filters"]').insertAdjacentHTML('beforebegin', categories
  .filter((category) => !['water', 'wifi'].includes(category.id))
  .map((category) => `<button class="filter-pill" type="button" data-filter="${category.id}">${iconMarkup(category.icon)}<span>${category.label}</span></button>`)
  .join(''));

const iconNames = new Set(['bell', 'pin', 'chevron-down', 'chevron-right', 'search', 'home', 'map', 'heart', 'user', 'arrow-left', 'sliders', 'target', 'location-off', 'users']);

function replaceIconSpans() {
  document.querySelectorAll('span.icon').forEach((span) => {
    const name = [...span.classList].find((className) => className.startsWith('icon-') && iconNames.has(className.slice(5)))?.slice(5);
    if (!name) return;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', `icon icon-svg icon-${name}`);
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = `<use href="#icon-${name}"></use>`;
    span.replaceWith(svg);
  });

  document.querySelectorAll('svg.category-icon-svg').forEach((svg) => {
    let name = svg.dataset.icon;
    if (!name) {
      const filter = svg.closest('[data-filter]')?.dataset.filter;
      const pin = svg.closest('[data-pin]')?.dataset.pin;
      name = filter || pin || 'water';
    }
    svg.dataset.icon = name;
    svg.innerHTML = `<use href="#icon-${name}"></use>`;
  });
}

replaceIconSpans();

function showScreen(screenName, updateHash = true, fromHistory = false) {
  const next = screens.some((screen) => screen.dataset.screen === screenName) ? screenName : 'home';
  const changed = activeScreen !== next;
  const navScreen = next === 'register' ? 'profile' : next === 'location' ? 'map' : next;
  if (changed && document.activeElement instanceof HTMLInputElement) document.activeElement.blur();
  if (changed && !fromHistory) {
    screenHistory.push(activeScreen);
  }
  activeScreen = next;
  screens.forEach((screen) => screen.classList.toggle('is-active', screen.dataset.screen === next));
  navItems.forEach((item) => {
    const active = item.dataset.nav === navScreen;
    item.classList.toggle('is-active', active);
    if (active) item.setAttribute('aria-current', 'page');
    else item.removeAttribute('aria-current');
  });
  if (updateHash && changed) history.pushState({ screen: next }, '', `#${next}`);
  appContent.scrollTop = 0;
}

function goBack() {
  if (screenHistory.length) {
    screenHistory.pop();
    history.back();
  } else {
    showScreen('profile');
  }
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2500);
}

function selectFilter(filterId) {
  const selected = document.querySelector(`[data-filter="${filterId}"]`);
  document.querySelectorAll('[data-filter]').forEach((pill) => {
    const active = pill === selected;
    pill.classList.toggle('is-selected', active);
    pill.setAttribute('aria-pressed', String(active));
  });
  selected?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

function toggleFavorite() {
  const card = document.querySelector('[data-favorite-item]');
  const empty = document.querySelector('[data-favorite-empty]');
  const button = document.querySelector('[data-action="toggle-favorite"]');
  const liked = button.classList.toggle('is-liked');
  button.setAttribute('aria-label', liked ? 'Выдаліць з абранага' : 'Дадаць у абранае');
  card.classList.toggle('is-hidden', !liked);
  empty.classList.toggle('is-hidden', liked);
  showToast(liked ? 'Месца дададзена ў абранае' : 'Месца выдалена з абранага');
}

document.addEventListener('click', (event) => {
  const nav = event.target.closest('[data-nav]');
  if (nav) {
    event.preventDefault();
    showScreen(nav.dataset.nav);
    return;
  }

  const actionElement = event.target.closest('[data-action]');
  if (actionElement) {
    const action = actionElement.dataset.action;
    if (action === 'open-map') showScreen('map');
    if (action === 'view-place') {
      const details = document.querySelector('[data-place-details]');
      const expanded = details.classList.toggle('is-hidden') === false;
      actionElement.setAttribute('aria-expanded', String(expanded));
      if (expanded) details.scrollIntoView({ block: 'nearest' });
    }
    if (action === 'select-pin') {
      if (actionElement.dataset.pin === 'water') document.querySelector('[data-map-card]').scrollIntoView({ block: 'center' });
      else showToast('Звесткі пра гэты аб’ект пакуль недаступныя');
    }
    if (action === 'toggle-favorite' || action === 'restore-favorite') toggleFavorite();
    if (action === 'register') showScreen('register');
    if (action === 'geolocation' || action === 'location') showScreen('location');
    if (action === 'back') goBack();
    if (action === 'choose-location') showToast('Выберыце кропку на карце — гэта заглушка геалакацыі');
    if (action === 'guest-register') { showToast('Гатова! Вы працягваеце як госць'); showScreen('profile'); }
    if (action === 'notifications') showToast('Новых апавяшчэнняў пакуль няма');
    if (action === 'filters') {
      const expanded = document.querySelector('.map-filters').classList.toggle('is-expanded');
      actionElement.setAttribute('aria-expanded', String(expanded));
      actionElement.setAttribute('aria-label', expanded ? 'Згарнуць фільтры' : 'Паказаць усе фільтры');
    }
    if (action === 'locate') showToast('Цэнтр карты перамешчаны да вас');
    if (action === 'language') showToast('Мова інтэрфейсу: беларуская');
    return;
  }

  const category = event.target.closest('[data-category]');
  if (category) {
    showScreen('map');
    showToast(`Фільтр «${category.textContent.trim()}» ужыты`);
    selectFilter(category.dataset.category);
    return;
  }

  const filter = event.target.closest('[data-filter]');
  if (filter) {
    selectFilter(filter.dataset.filter);
    showToast(filter.dataset.filter === 'all' ? 'Паказаны ўсе месцы' : `Паказаны месцы: ${filter.textContent.trim()}`);
    return;
  }

  const view = event.target.closest('[data-map-view]');
  if (view) {
    document.querySelectorAll('[data-map-view]').forEach((button) => {
      button.classList.toggle('is-active', button === view);
      button.setAttribute('aria-selected', String(button === view));
    });
    mapStage.classList.toggle('is-list-view', view.dataset.mapView === 'list');
    appContent.scrollTop = 0;
  }
});

document.querySelector('[data-search-input]')?.addEventListener('input', (event) => {
  if (event.target.value.trim().length > 1) showToast(`Шукаем: ${event.target.value.trim()}`);
});

document.querySelector('[data-map-search]')?.addEventListener('input', (event) => {
  if (event.target.value.trim().length > 1) showToast(`Знойдзена побач: ${event.target.value.trim()}`);
});

window.addEventListener('popstate', () => {
  screenHistory = [];
  showScreen(window.location.hash.slice(1) || 'home', false, true);
});

let baseViewportHeight = window.innerHeight;

function syncKeyboardViewport() {
  const isSearching = document.activeElement?.matches('input[type="search"]');
  const height = isSearching ? window.visualViewport?.height : null;
  document.documentElement.classList.toggle('is-keyboard-open', Boolean(height && height < baseViewportHeight - 100));
  if (height) document.documentElement.style.setProperty('--viewport-height', `${Math.round(height)}px`);
  else document.documentElement.style.removeProperty('--viewport-height');
}

document.addEventListener('focusin', syncKeyboardViewport);
document.addEventListener('focusout', () => requestAnimationFrame(syncKeyboardViewport));
window.visualViewport?.addEventListener('resize', syncKeyboardViewport);
window.addEventListener('resize', () => {
  if (!document.activeElement?.matches('input[type="search"]')) baseViewportHeight = window.innerHeight;
  syncKeyboardViewport();
});

showScreen(window.location.hash.slice(1) || 'home', false, true);
selectFilter('all');
