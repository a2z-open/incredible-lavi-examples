const product = {
  name: 'Fieldpack',
  description: 'A zip-opening daypack for changing weather. Side straps cinch down a light load, and a mesh pocket gives wet gear a place to drain.',
  image: '../../assets/contour.webp',
  imageCaption: 'Fieldpack 18 L · Spruce shown',
  sizes: {
    18: {
      price: 118,
      use: 'Short day hikes',
      cover: 'Sold separately',
      torso: '41–49 cm',
      weight: '690 g',
      dimensions: '46 × 25 × 17 cm',
      load: 'Up to 7 kg'
    },
    26: {
      price: 148,
      use: 'Long day hikes',
      cover: 'Included',
      torso: '43–53 cm',
      weight: '890 g',
      dimensions: '53 × 29 × 20 cm',
      load: 'Up to 10 kg'
    }
  },
  colors: {
    spruce: { label: 'Spruce', hex: '#35483a', sizes: [18] },
    clay: { label: 'Clay', hex: '#a34b2e', sizes: [18, 26] }
  },
  construction: [
    ['Shell', '210D ripstop nylon with a water-repellent finish. Use a dry bag inside for electronics or spare layers.'],
    ['Access', 'The curved main zip opens wide for layers. Stash keys in the front zip pocket and keep a bottle or wet shell in the side mesh.'],
    ['Rain cover', 'The 26 L includes a removable cover for sustained rain. The 18 L accepts the same cover, sold separately.']
  ]
};

const fitNote = 'Measure from the bump at the base of your neck to a line across the top of your hip bones.';
const treatment = document.body.dataset.treatment;
const catalog = treatment === 'catalog';
const storageKey = 'contour-fieldpack-' + treatment;
const initialSelection = { size: '18', color: 'spruce' };
const sizes = Object.keys(product.sizes);
const colors = Object.keys(product.colors);
const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0
});

const price = size => money.format(product.sizes[size].price);
const isAvailable = (size, color) => product.colors[color]?.sizes.includes(Number(size));
const keyOf = ({ size, color }) => `${size}-${color}`;
const labelOf = ({ size, color }) => `${product.name} ${size} L · ${product.colors[color].label}`;

function savedState() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    const valid = entry => entry &&
      isAvailable(entry.size, entry.color) &&
      Number.isSafeInteger(entry.quantity) &&
      entry.quantity > 0;
    return {
      bag: Array.isArray(saved?.bag) ? saved.bag.filter(valid) : [],
      removed: valid(saved?.removed) ? saved.removed : null
    };
  } catch {
    return { bag: [], removed: null };
  }
}

const state = {
  selection: { ...initialSelection },
  editing: null,
  ...savedState()
};

function saveBag() {
  try {
    localStorage.setItem(storageKey, JSON.stringify({ bag: state.bag, removed: state.removed }));
  } catch {
    // The demo remains usable for this visit when storage is unavailable.
  }
}

const store = document.querySelector('#store');
store.innerHTML = `
  <header class="site-header">
    <div class="bar">
      <a class="brand" href="#pack"><i class="contour-mark" aria-hidden="true"></i>Contour</a>
      <nav aria-label="Store">
        <a href="#construction">Construction</a>
        <button id="open-bag" type="button" class="open-bag"><span class="bag-icon" aria-hidden="true"></span><span id="bag-count">Bag (0)</span></button>
      </nav>
    </div>
  </header>
  <main id="pack" tabindex="-1" class="page">
    <div class="product-grid">
      <figure class="product-photo">
        <div class="photo-stage" id="photo-stage">
          <img src="${product.image}" alt="Spruce green Fieldpack with a front zip pocket, side mesh and compression straps" width="1320" height="990" fetchpriority="high">
          <button id="zoom" class="zoom" type="button"><span class="zoom-mark" aria-hidden="true"></span><span id="zoom-label">View close-up</span></button>
        </div>
        <figcaption id="photo-caption">${product.imageCaption}</figcaption>
      </figure>
      <section class="product-info" aria-labelledby="product-title">
        <header class="product-title">
          <h1 id="product-title">${product.name}</h1>
          <p>${product.description}</p>
        </header>
        <div id="product-options"></div>
        ${!catalog ? '<details class="folded-specs" id="specifications"><summary>Compare sizes and specifications</summary><div id="comparison"></div></details>' : ''}
      </section>
      ${catalog ? '<section class="inline-specs" id="specifications" aria-labelledby="spec-heading"><h2 id="spec-heading">Size & fit</h2><div id="comparison"></div></section>' : ''}
    </div>
    <section class="construction" id="construction" aria-labelledby="construction-heading">
      <header>
        <h2 id="construction-heading">Material &amp; construction</h2>
        ${catalog ? `<figure class="fabric-detail">
          <div><img src="${product.image}" alt="Close view of the ripstop weave beside the Fieldpack front zipper" width="1320" height="990" loading="lazy"></div>
          <figcaption>Ripstop shell and front zip</figcaption>
        </figure>` : ''}
      </header>
      <dl>
        ${product.construction.map(([title, description]) => `<div><dt>${title}</dt><dd>${description}</dd></div>`).join('')}
      </dl>
    </section>
  </main>
  <footer class="site-footer">
    <span>Contour · Demo store</span>
    <span>Original generated product image</span>
  </footer>
  <dialog id="bag-dialog" aria-labelledby="bag-heading">
    <div class="bag-panel">
      <header class="bag-heading">
        <h2 id="bag-heading">Your bag</h2>
        <button id="close-bag" type="button" class="close-button" aria-label="Close bag" autofocus></button>
      </header>
      <p class="demo-note">Demo bag. No orders are placed or payments collected.</p>
      <p id="bag-announcement" class="visually-hidden" role="status"></p>
      <div id="bag-content"></div>
    </div>
  </dialog>
  <p id="product-announcement" class="visually-hidden" role="status"></p>
`;

const options = document.querySelector('#product-options');
const comparison = document.querySelector('#comparison');
const bagDialog = document.querySelector('#bag-dialog');
const bagContent = document.querySelector('#bag-content');
const bagCount = document.querySelector('#bag-count');
const productAnnouncement = document.querySelector('#product-announcement');
const bagAnnouncement = document.querySelector('#bag-announcement');
const openBag = document.querySelector('#open-bag');
const photoStage = document.querySelector('#photo-stage');
const photoCaption = document.querySelector('#photo-caption');

function comparisonTable() {
  const rows = [
    ['Best for', 'use'], ['Rain cover', 'cover'], ['Torso fit', 'torso'],
    ['Pack weight', 'weight'], ['Dimensions', 'dimensions'], ['Recommended load', 'load']
  ];
  const selection = state.selection.size;
  const selected = size => size === selection ? ' class="selected"' : '';
  return `
    <table>
      <thead><tr><th scope="col"><span class="visually-hidden">Specification</span></th>${sizes.map(size =>
        `<th scope="col"${selected(size)}>${size} L<span>${price(size)}</span></th>`).join('')}</tr></thead>
      <tbody>${rows.map(([label, field]) => `<tr><th scope="row">${label}</th>${sizes.map(size =>
        `<td${selected(size)}>${product.sizes[size][field]}</td>`).join('')}</tr>`).join('')}</tbody>
    </table>
    <p class="fit-note">${fitNote}</p>`;
}

function fields({ size, color }, prefix) {
  return `
    <fieldset class="capacity-field">
      <legend>Capacity</legend>
      <div class="capacity-choices">${sizes.map(value => `
        <label class="capacity-option">
          <input type="radio" name="${prefix}-size" id="${prefix}-size-${value}" value="${value}" ${size === value ? 'checked' : ''}>
          <span class="capacity-label"><span class="capacity-name">${value} L</span><span class="capacity-use">${product.sizes[value].use}</span></span>
        </label>`).join('')}</div>
    </fieldset>
    <fieldset class="color-field">
      <legend>Color</legend>
      <div class="color-choices">${colors.map(value => `
        <label class="color-option">
          <input type="radio" name="${prefix}-color" id="${prefix}-color-${value}" value="${value}" ${color === value ? 'checked' : ''}>
          <span class="color-label">
            <span class="swatch" style="--swatch:${product.colors[value].hex}"></span>
            <span>${product.colors[value].label}${catalog && !isAvailable(size, value) ? '<small>Sold out</small>' : ''}</span>
          </span>
        </label>`).join('')}</div>
    </fieldset>`;
}

function stock({ size, color }) {
  return isAvailable(size, color)
    ? '<span class="stock stock-available">In stock</span>'
    : `<span class="stock stock-unavailable">${product.colors[color].label} is sold out in ${size} L. Choose another color or size.</span>`;
}

function renderOptions(focusId) {
  const { size, color } = state.selection;
  const available = isAvailable(size, color);
  options.innerHTML = `
    <form id="product-form">
      ${fields(state.selection, 'product')}
      <p class="availability">${stock(state.selection)}</p>
      <button class="primary add-to-bag" type="submit" ${available ? '' : 'disabled'}>
        <span>${available ? 'Add to bag' : 'Sold out'}</span><span>${price(size)}</span>
      </button>
    </form>`;
  comparison.innerHTML = comparisonTable();
  renderCaption();
  if (focusId) document.getElementById(focusId)?.focus({ preventScroll: true });
}

function addLine(entry) {
  const existing = state.bag.find(line => keyOf(line) === keyOf(entry));
  if (existing) {
    existing.quantity += entry.quantity;
  } else {
    state.bag.push({ ...entry });
  }
}

function renderBag(focusId) {
  bagCount.textContent = `Bag (${state.bag.reduce((sum, item) => sum + item.quantity, 0)})`;
  const subtotal = state.bag.reduce((sum, item) => sum + product.sizes[item.size].price * item.quantity, 0);
  const removed = state.removed ? `
    <div class="removed"><p>Removed ${labelOf(state.removed)}.</p>
    <button type="button" id="undo-removal" data-action="undo" class="text-button">Undo removal</button></div>` : '';
  bagContent.innerHTML = `
    ${removed}
    ${state.bag.length ? `<ul class="bag-lines">${state.bag.map(line => `
      <li>
        ${state.editing?.key === keyOf(line) ? editLine() : `
          <div class="item-summary">
            <span class="swatch" style="--swatch:${product.colors[line.color].hex}" aria-hidden="true"></span>
            <div><h3>${labelOf(line)}</h3><p>Quantity ${line.quantity}</p></div>
            <strong>${money.format(product.sizes[line.size].price * line.quantity)}</strong>
          </div>
          <div class="item-actions">
            <button type="button" id="edit-${keyOf(line)}" data-key="${keyOf(line)}" data-action="edit" class="text-button" aria-label="Edit ${labelOf(line)}">Edit</button>
            <button type="button" data-key="${keyOf(line)}" data-action="remove" class="text-button" aria-label="Remove ${labelOf(line)}">Remove</button>
          </div>`}
      </li>`).join('')}</ul>` : '<p class="empty">Your bag is empty.</p>'}
    <div class="bag-total"><span>Subtotal</span><strong>${money.format(subtotal)}</strong></div>
    <button type="button" id="done-bag" data-action="close" class="primary bag-done">Continue browsing</button>`;
  if (focusId) document.getElementById(focusId)?.focus({ preventScroll: true });
}

function editLine() {
  const { size, color, quantity } = state.editing;
  return `
    <form id="edit-form" aria-label="Edit pack">
      ${fields(state.editing, 'edit')}
      <p class="availability">${stock(state.editing)}</p>
      <label class="quantity-edit" for="edit-quantity">Quantity <input type="number" id="edit-quantity" name="quantity" min="1" max="${Number.MAX_SAFE_INTEGER}" value="${quantity}" required></label>
      <div class="edit-actions">
        <button id="save-edit" class="primary" type="submit" ${isAvailable(size, color) ? '' : 'disabled'}>Save changes</button>
        <button type="button" data-action="cancel-edit" class="text-button">Cancel</button>
      </div>
    </form>`;
}

function showBag() {
  renderBag();
  bagDialog.showModal();
}

function announceSelection(selection, region) {
  const available = isAvailable(selection.size, selection.color);
  region.textContent = `${labelOf(selection)}, ${available ? 'in stock' : 'sold out'}.`;
}

function renderCaption() {
  const { size, color } = state.selection;
  const zoomed = photoStage.classList.contains('is-zoomed');
  const photo = zoomed ? 'Spruce shell and front zip · enlarged view' : product.imageCaption;
  const matchesPhoto = size === initialSelection.size && color === initialSelection.color;
  photoCaption.innerHTML = `<span>${photo}</span>${matchesPhoto ? '' : `
    <span class="caption-selection"><span class="swatch" style="--swatch:${product.colors[color].hex}"></span>Selected ${size} L · ${product.colors[color].label}</span>`}`;
}

function toggleZoom() {
  const zoomed = photoStage.classList.toggle('is-zoomed');
  document.querySelector('#zoom-label').textContent = zoomed ? 'View full image' : 'View close-up';
  renderCaption();
}

document.querySelector('#zoom').addEventListener('click', toggleZoom);
openBag.addEventListener('click', showBag);
document.querySelector('#close-bag').addEventListener('click', () => bagDialog.close());
bagDialog.addEventListener('close', () => {
  state.editing = null;
  bagAnnouncement.textContent = '';
});

options.addEventListener('change', event => {
  const field = event.target;
  const name = field.name.slice('product-'.length);
  state.selection[name] = field.value;
  renderOptions(field.id);
  announceSelection(state.selection, productAnnouncement);
});

options.addEventListener('submit', event => {
  event.preventDefault();
  if (!isAvailable(state.selection.size, state.selection.color)) return;
  addLine({ ...state.selection, quantity: 1 });
  saveBag();
  showBag();
  bagAnnouncement.textContent = `Added ${labelOf(state.selection)}.`;
});

bagContent.addEventListener('input', event => {
  if (event.target.id === 'edit-quantity') state.editing.quantity = event.target.value;
});

bagContent.addEventListener('change', event => {
  const field = event.target;
  if (field.type !== 'radio') return;
  const name = field.name.slice('edit-'.length);
  state.editing[name] = field.value;
  renderBag(field.id);
  announceSelection(state.editing, bagAnnouncement);
});

bagContent.addEventListener('submit', event => {
  event.preventDefault();
  const { key, size, color, quantity } = state.editing;
  if (!isAvailable(size, color)) return;
  state.bag = state.bag.filter(line => keyOf(line) !== key);
  addLine({ size, color, quantity: Number(quantity) });
  state.editing = null;
  saveBag();
  renderBag('edit-' + keyOf({ size, color }));
  bagAnnouncement.textContent = `Saved changes to ${labelOf({ size, color })}.`;
});

bagContent.addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const { action, key } = button.dataset;
  if (action === 'close') {
    bagDialog.close();
  } else if (action === 'edit') {
    state.editing = { ...state.bag.find(line => keyOf(line) === key), key };
    renderBag('edit-size-' + state.editing.size);
  } else if (action === 'cancel-edit') {
    const editingKey = state.editing.key;
    state.editing = null;
    renderBag('edit-' + editingKey);
  } else if (action === 'remove') {
    state.removed = state.bag.find(line => keyOf(line) === key);
    state.bag = state.bag.filter(line => keyOf(line) !== key);
    saveBag();
    renderBag('undo-removal');
    bagAnnouncement.textContent = `Removed ${labelOf(state.removed)}. Undo removal is available.`;
  } else if (action === 'undo') {
    const removed = state.removed;
    addLine(removed);
    state.removed = null;
    saveBag();
    renderBag('edit-' + keyOf(removed));
    bagAnnouncement.textContent = `Restored ${labelOf(removed)}.`;
  }
});

if (location.hash === '#specifications' && !catalog) {
  document.querySelector('#specifications').open = true;
}

renderOptions();
renderBag();
