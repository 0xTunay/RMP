const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function element(dataset = {}, initialClasses = []) {
  const classes = new Set(initialClasses);
  const attributes = new Map();
  return {
    dataset,
    classes,
    attributes,
    classList: {
      add: (name) => classes.add(name),
      remove: (name) => classes.delete(name),
      contains: (name) => classes.has(name),
      toggle(name, force) {
        const active = force === undefined ? !classes.has(name) : force;
        if (active) classes.add(name);
        else classes.delete(name);
        return active;
      },
    },
    setAttribute: (name, value) => attributes.set(name, value),
    removeAttribute: (name) => attributes.delete(name),
    getAttribute: (name) => attributes.get(name),
    addEventListener() {},
    insertAdjacentHTML(position, html) { this.insertedHTML = html; },
    scrollIntoView() { this.scrolledIntoView = true; },
    textContent: '',
    scrollTop: 0,
  };
}

const screens = ['home', 'map', 'favorites', 'profile', 'location', 'register']
  .map((screen) => element({ screen }));
const navItems = ['home', 'map', 'favorites', 'profile']
  .map((nav) => element({ nav }));
const filters = ['all', 'water', 'wifi', 'toilet', 'rest', 'medical', 'safety', 'help']
  .map((filter) => element({ filter }));
const views = ['map', 'list'].map((mapView) => element({ mapView }));
const controls = {
  '[data-category-grid]': element(),
  '[data-action="filters"]': element({ action: 'filters' }),
  '[data-toast]': element(),
  '.app-content': element(),
  '.map-stage': element(),
  '.map-filters': element(),
  '[data-favorite-item]': element(),
  '[data-favorite-empty]': element({}, ['is-hidden']),
  '[data-action="toggle-favorite"]': element({ action: 'toggle-favorite' }, ['is-liked']),
  '[data-map-card]': element(),
  '[data-place-details]': element({}, ['is-hidden']),
  '[data-search-input]': element(),
  '[data-map-search]': element(),
};

const listeners = {};
const windowListeners = {};
const viewportListeners = {};
const customProperties = new Map();
class MockInput { matches(selector) { return selector === 'input[type="search"]'; } blur() { documentMock.activeElement = null; } }
const windowMock = {
  location: { hash: '#home' },
  innerHeight: 800,
  visualViewport: { height: 800, addEventListener: (name, callback) => { viewportListeners[name] = callback; } },
  addEventListener: (name, callback) => { windowListeners[name] = callback; },
};
const visited = ['#home'];
const history = {
  pushState(state, title, url) { visited.push(url); windowMock.location.hash = url; },
  back() { visited.pop(); windowMock.location.hash = visited.at(-1); windowListeners.popstate(); },
};
const documentMock = {
  activeElement: null,
  documentElement: {
    classList: element().classList,
    style: {
      setProperty: (name, value) => customProperties.set(name, value),
      removeProperty: (name) => customProperties.delete(name),
    },
  },
  querySelector(selector) {
    const filterId = selector.match(/^\[data-filter="([^"]+)"\]$/)?.[1];
    return filterId ? filters.find((filter) => filter.dataset.filter === filterId) : controls[selector];
  },
  querySelectorAll(selector) {
    return {
      '[data-screen]': screens,
      '.bottom-nav [data-nav]': navItems,
      '[data-filter]': filters,
      '[data-map-view]': views,
      'span.icon': [],
      'svg.category-icon-svg': [],
    }[selector] || [];
  },
  addEventListener: (name, callback) => { listeners[name] = callback; },
};

vm.runInNewContext(fs.readFileSync('app.js', 'utf8'), {
  document: documentMock,
  window: windowMock,
  history,
  HTMLInputElement: MockInput,
  setTimeout: () => 1,
  clearTimeout() {},
  requestAnimationFrame: (callback) => callback(),
});

function click(selector, target) {
  listeners.click({
    target: { closest: (requested) => requested === selector ? target : null },
    preventDefault() {},
  });
}
const screen = (name) => screens.find((item) => item.dataset.screen === name);
const nav = (name) => navItems.find((item) => item.dataset.nav === name);
const filter = (name) => filters.find((item) => item.dataset.filter === name);

assert.equal(nav('home').getAttribute('aria-current'), 'page');
for (const name of ['map', 'favorites', 'profile', 'home']) {
  click('[data-nav]', nav(name));
  assert.equal(screen(name).classList.contains('is-active'), true, `screen ${name}`);
  assert.equal(nav(name).getAttribute('aria-current'), 'page', `nav ${name}`);
}

click('[data-map-view]', views[1]);
assert.equal(controls['.map-stage'].classList.contains('is-list-view'), true);
assert.equal(views[1].getAttribute('aria-selected'), 'true');
click('[data-map-view]', views[0]);
assert.equal(controls['.map-stage'].classList.contains('is-list-view'), false);

click('[data-filter]', filter('wifi'));
assert.equal(filter('wifi').getAttribute('aria-pressed'), 'true');
assert.equal(filter('all').getAttribute('aria-pressed'), 'false');
click('[data-category]', element({ category: 'rest' }));
assert.equal(filter('rest').classList.contains('is-selected'), true);
assert.equal(screen('map').classList.contains('is-active'), true);

click('[data-action]', controls['[data-action="filters"]']);
assert.equal(controls['.map-filters'].classList.contains('is-expanded'), true);
assert.equal(controls['[data-action="filters"]'].getAttribute('aria-expanded'), 'true');
click('[data-action]', element({ action: 'view-place' }));
assert.equal(controls['[data-place-details]'].classList.contains('is-hidden'), false);
click('[data-action]', element({ action: 'select-pin', pin: 'water' }));
assert.equal(controls['[data-map-card]'].scrolledIntoView, true);

click('[data-action]', controls['[data-action="toggle-favorite"]']);
assert.equal(controls['[data-favorite-item]'].classList.contains('is-hidden'), true);
assert.equal(controls['[data-favorite-empty]'].classList.contains('is-hidden'), false);
click('[data-action]', element({ action: 'restore-favorite' }));
assert.equal(controls['[data-favorite-item]'].classList.contains('is-hidden'), false);

click('[data-action]', element({ action: 'register' }));
assert.equal(screen('register').classList.contains('is-active'), true);
assert.equal(nav('profile').getAttribute('aria-current'), 'page');
click('[data-action]', element({ action: 'back' }));
assert.equal(screen('map').classList.contains('is-active'), true);

assert.match(controls['[data-action="filters"]'].insertedHTML, /data-filter="help"/);
documentMock.activeElement = new MockInput();
windowMock.visualViewport.height = 450;
viewportListeners.resize();
assert.equal(documentMock.documentElement.classList.contains('is-keyboard-open'), true);
assert.equal(customProperties.get('--viewport-height'), '450px');
documentMock.activeElement = null;
listeners.focusout();
assert.equal(documentMock.documentElement.classList.contains('is-keyboard-open'), false);

console.log('UI logic checks passed: navigation, back, filters, map/list, details, pins, favorites and keyboard sizing.');
