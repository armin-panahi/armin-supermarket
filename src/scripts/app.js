/* Armin Supermarket — Week 2: «سوپرمارکت زنده»
 * The whole page is built from the shared API (../../api/*.json) with vanilla JS.
 * Rules followed: no framework/library, no inline handlers, API data is only ever
 * written with textContent / createElement (never innerHTML), one Promise.all for all files.
 */
'use strict';

/* ==========================================================================
   1. Config
   ========================================================================== */
const API_BASE = '../../api/';
const API_FILES = ['products', 'categories', 'stock', 'offers', 'shop'];
/* home.json (hero, banners, carousel order) is optional for now: while this is false the file is not requested and the
   page uses the defaults built in defaultHome() below. Set it to true once ../../api/home.json exists. */
const HOME_FROM_API = false;
const SLOW_AFTER_MS = 3000; // challenge: Promise.race → «اتصال کند است»
const HARD_TIMEOUT_MS = 30000; // give up (and show the error state) after this long
const CART_KEY = 'armin-market:cart';
const OFFERS_VIEW = 'offers'; // reserved value for ?cat=offers
const MAX_CAROUSEL_ITEMS = 6; // every carousel shows at most this many cards; «مشاهده همه» opens the full list
const SHOW_EMOJI_FIRST = false; // true → the API emoji replaces the local photos; false → emoji only where no photo exists

/* Identity that belongs to THIS shop (the PDF says name/logo/colors stay ours).
   Every field here wins over the same field in shop.json; delete a field to read it from the API instead. */
const BRAND = {
  name: 'سوپرمارکت آرمین',
  tagline: 'همه‌چیز برای یک خرید خوب', // fallback only: shop.json «slogan» is used first
  address: 'تهران، میدان ونک، پلاک 10',
  phones: [
    { label: 'تلفن ثابت', text: '۰۲۱-۱۲۳۴۵۶۷۸', tel: '+982112345678', icon: 'i-phone' },
    { label: 'پشتیبانی موبایل', text: '۰۹۱۲-۱۲۳-۴۵۶۷', tel: '+989121234567', icon: 'i-smartphone' },
  ],
  email: 'info@arminmarket.ir',
  social: [
    { label: 'اینستاگرام', href: 'https://instagram.com/arminmarket', icon: 'i-instagram' },
    { label: 'تلگرام', href: 'https://t.me/arminmarket', icon: 'i-telegram' },
    { label: 'واتس‌اپ', href: 'https://wa.me/989121234567', icon: 'i-whatsapp' },
  ],
  copyright: '© ۱۴۰۵ تمامی حقوق برای سوپرمارکت آرمین محفوظ است.',
};

/* Our own photos. The API only knows emoji, so products/categories/banners are matched
   to the local images by name; anything without a photo gets a neutral placeholder. */
const IMG = './assets/images/';
const HERO_ART = [
  ['broccoli', 'کلم بروکلی', 560, 559],
  ['carrot', 'هویج', 357, 560],
  ['pepper', 'فلفل دلمه‌ای سبز', 502, 560],
  ['tomato', 'گوجه‌فرنگی', 541, 560],
  ['orange', 'پرتقال تامسون', 560, 466],
  ['strawberry', 'توت‌فرنگی', 518, 560],
];

/* [photo, pattern] — first match wins, so specific rules come before general ones. */
const PRODUCT_ART = [
  ['', /سیب ?زمینی/],
  ['strawberry', /چیپس ?توت/],
  ['plain-chips', /چیپس|لواشک/],
  ['popcorn', /پاپ ?کورن/],
  ['butter-biscuit', /بیسکویت|کلوچه/],
  ['croissant', /کروسان/],
  ['chocolate-donut', /دونات/],
  ['vanilla-cupcake', /کاپ ?کیک|کیک/],
  ['dark-chocolate', /شکلات/],
  ['fruit-candy', /آب ?نبات|پاستیل/],
  ['salted-peanuts', /بادام ?زمینی|آجیل/],
  ['orange-juice', /آب ?میوه|آب ?پرتقال/],
  ['mineral-water', /آب ?معدنی/],
  ['cola', /نوشابه|کولا/],
  ['sour-cherry-syrup', /شربت|آلبالو/],
  ['black-tea', /چای/],
  ['instant-coffee', /قهوه|نسکافه/],
  ['vanilla-ice-cream', /بستنی/],
  ['low-fat-milk', /(^| )شیر( |$)/],
  ['butter', /(^| )کره( |$)/],
  ['cheese', /پنیر/],
  ['yogurt', /ماست/],
  ['eggs', /تخم/],
  ['chicken-thigh', /ران ?مرغ/],
  ['chicken-breast', /سینه|مرغ/],
  ['veal-striploin', /راسته|گوساله|گوسفند/],
  ['ground-meat', /چرخ ?کرده/],
  ['trout', /ماهی|قزل/],
  ['sausage', /سوسیس|کالباس/],
  ['lavash-bread', /لواش/],
  ['gandomin-bread', /گندمین|سنگک|بربری|تافتون/],
  ['whole-grain-toast', /نان ?تست|تست|سبوس|باگت/],
  ['banana', /موز/],
  ['red-apple', /سیب/],
  ['carrot', /هویج/],
  ['orange', /پرتقال|پرتغال|نارنگی/],
  ['tomato', /گوجه/],
  ['cucumber', /خیار/],
];

const CATEGORY_ART = [
  ['produce', /fruit|produce|vegetable/i, /میوه|سبزی/],
  ['dairy', /dairy/i, /لبنیات/],
  ['bakery', /bakery|bread/i, /نان|شیرینی/],
  ['protein', /protein|meat/i, /پروتئین|گوشت/],
  ['drinks', /drink|beverage/i, /نوشیدنی/],
  ['snacks', /snack/i, /تنقلات/],
];

const BANNER_ART = [
  ['hero/breakfast-basket.png', /صبحانه/, [240, 240]],
  ['hero/hot-bread.png', /نان|شیرینی/, [240, 240]],
  ['hero/dairy.webp', /لبنیات|شیر|پنیر|ماست/, [560, 348]],
];

/* ==========================================================================
   2. Small helpers
   ========================================================================== */
const SVG_NS = 'http://www.w3.org/2000/svg';
const fa = new Intl.NumberFormat('fa-IR');
const toman = (n) => `${fa.format(n)} تومان`;
const $ = (selector, root = document) => root.querySelector(selector);

/* h('a', {class:'btn', href:'#x'}, 'text', child…) — builds elements safely (text → text nodes). */
function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value === false || value == null) continue;
    el.setAttribute(key, value === true ? '' : value);
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}

const srOnly = (text) => h('span', { class: 'sr-only' }, text);

function icon(id, extraClass = '') {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', `icon ${extraClass}`.trim());
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const use = document.createElementNS(SVG_NS, 'use');
  use.setAttribute('href', `#${id}`);
  svg.append(use);
  return svg;
}

/* Normalises Persian/Arabic letter variants, ZWNJ and spacing so names can be compared. */
const norm = (value) =>
  String(value ?? '')
    .replace(/[يى]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/ة/g, 'ه')
    .replace(/[\u200c\u200d\u200e\u200f]/g, ' ')
    .replace(/[\u064b-\u065f\u0670]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

/* First non-empty value among several possible key names (the API field names are read defensively). */
function pick(obj, keys) {
  if (!obj || typeof obj !== 'object') return undefined;
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') return obj[key];
  }
  return undefined;
}

const text = (value) => (typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '');
const asList = (data, ...keys) => (Array.isArray(data) ? data : keys.map((k) => data?.[k]).find(Array.isArray) || null);
const idKey = (value) => String(value ?? '').trim();
const isHexColor = (value) => typeof value === 'string' && /^#[0-9a-f]{3,8}$/i.test(value.trim());

/* ==========================================================================
   3. Loading data (fetch + async/await + one Promise.all)
   ========================================================================== */
class ApiError extends Error {
  constructor(kind, file, status) {
    super(`${kind}:${file}${status ? `:${status}` : ''}`);
    this.kind = kind; // 'http' | 'json' | 'shape' | 'network' | 'timeout'
    this.file = file;
    this.status = status;
  }
}

async function getJSON(name, signal) {
  const response = await fetch(`${API_BASE}${name}.json`, { signal });
  // fetch() only rejects on network failure — a 404 still "succeeds", so res.ok must be checked.
  if (!response.ok) throw new ApiError('http', `${name}.json`, response.status);
  try {
    return await response.json();
  } catch {
    throw new ApiError('json', `${name}.json`); // 200 OK but the body is not valid JSON
  }
}

/* All files are requested at the same time (not one after another). */
async function loadAll() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HARD_TIMEOUT_MS);
  try {
    const files = HOME_FROM_API ? [...API_FILES, 'home'] : API_FILES;
    const entries = await Promise.all(
      files.map(async (name) => {
        try {
          return [name, await getJSON(name, controller.signal)];
        } catch (error) {
          // a missing / broken home.json is not fatal: the defaults take over
          if (name === 'home' && error instanceof ApiError && (error.kind === 'http' || error.kind === 'json')) return [name, null];
          throw error;
        }
      }),
    );
    return Object.fromEntries(entries);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error?.name === 'AbortError') throw new ApiError('timeout', 'api');
    throw new ApiError('network', 'api');
  } finally {
    clearTimeout(timer);
  }
}

/* ==========================================================================
   4. Data model (joins products ↔ stock ↔ offers ↔ categories)
   ========================================================================== */
function discountedPrice(price, percent) {
  const raw = (price * (100 - percent)) / 100;
  const rounded = Math.round(raw / 1000) * 1000; // shop prices end in ٬۰۰۰
  return rounded > 0 && rounded < price ? rounded : Math.round(raw);
}

function productPhoto(product) {
  const name = norm(product.name);
  for (const [photo, pattern] of PRODUCT_ART) if (pattern.test(name)) return photo ? `products/${photo}.webp` : null;
  return null;
}

function categoryPhoto(category) {
  for (const [photo, slugPattern, namePattern] of CATEGORY_ART) {
    if (slugPattern.test(category.slug) || namePattern.test(norm(category.name))) return `categories/${photo}.webp`;
  }
  return null;
}

/* A carousel entry in home.json says where its cards come from; understand the common spellings. */
function resolveSource(carousel, model) {
  const findCategory = (key) => {
    const k = idKey(key).replace(/^#/, '');
    if (!k) return null;
    return model.categoryBySlug.get(norm(k)) || model.categoryById.get(k) || model.categoryByName.get(norm(k)) || null;
  };
  const isOffers = (value) => /^(offers?|deals?|discounts?|specials?|today|amazing|hot)$/i.test(idKey(value));

  const fromValue = (value) => {
    if (value == null) return null;
    if (Array.isArray(value)) {
      const products = value.map((id) => model.productById.get(idKey(id))).filter(Boolean);
      return products.length ? { kind: 'products', products } : null;
    }
    if (typeof value === 'object') {
      if (isOffers(pick(value, ['type', 'kind', 'source', 'name']))) return { kind: 'offers' };
      const ids = value.productIds || value.ids || value.products;
      if (Array.isArray(ids)) return fromValue(ids);
      const cat = findCategory(pick(value, ['categoryId', 'category', 'categorySlug', 'cat', 'slug', 'id', 'value']));
      return cat ? { kind: 'category', category: cat } : null;
    }
    const s = idKey(value);
    if (isOffers(s)) return { kind: 'offers' };
    if (/^(all|products)$/i.test(s)) return { kind: 'products', products: model.products };
    const prefixed = s.match(/^(?:category|categories|cat)\s*[:=/#_\- ]\s*(.+)$/i);
    const cat = findCategory(prefixed ? prefixed[1] : s);
    return cat ? { kind: 'category', category: cat } : null;
  };

  for (const key of ['source', 'from', 'items', 'products', 'query', 'type', 'kind', 'data']) {
    const found = fromValue(carousel[key]);
    if (found) return found;
  }
  const direct = findCategory(pick(carousel, ['categoryId', 'category', 'categorySlug', 'cat']));
  if (direct) return { kind: 'category', category: direct };
  const fragment = idKey(pick(carousel, ['fragment', 'slug', 'id', 'anchor', 'hash'])).replace(/^#/, '');
  if (isOffers(fragment)) return { kind: 'offers' };
  const byFragment = findCategory(fragment);
  return byFragment ? { kind: 'category', category: byFragment } : null;
}

/* What home.json would normally provide, derived from the other files so the page works without it. */
function defaultHome(model) {
  const firstCategory = model.categories[0];
  const percents = [...model.offerById.values()].map((o) => o.percent);
  const topPercent = percents.length ? Math.max(...percents) : 0;
  const hasCategory = (slug) => model.categoryBySlug.has(slug);

  return {
    hero: {
      title: 'میوه‌های تازه، هر روز صبح',
      text: 'مستقیم از باغ‌های اطراف شهر، تا دو ساعت بعد دم در خانه شما.',
      cta: firstCategory ? { label: `خرید ${firstCategory.name}`, href: `#${firstCategory.slug}` } : null,
    },
    side: topPercent
      ? {
          title: `تا ${fa.format(topPercent)}٪ تخفیف`,
          text: 'روی کالاهای پیشنهاد ویژه امروز',
          cta: { label: 'دیدن محصولات', href: '#offers' },
        }
      : null,
    promos: [
      { title: 'سبد صبحانه خانواده', href: hasCategory('dairy') ? '#dairy' : '#categories' },
      { title: 'نان داغ، هر روز ساعت ۷', href: hasCategory('bakery') ? '#bakery' : '#categories' },
    ],
    carousels: [
      ...(model.offerProducts.length ? [{ title: 'پیشنهاد ویژه امروز', fragment: 'offers', source: 'offers' }] : []),
      ...model.categories.map((c) => ({ title: c.name, fragment: c.slug, source: `category:${c.slug}` })),
    ],
  };
}

/* shop.json of the older API has no notice / menu / schedule — fill those from what it does have. */
function shopWithFallbacks(shop, model) {
  const result = { ...shop };
  const free = Number(shop.freeDeliveryOver);
  if (!text(shop.notice) && free > 0) result.notice = `ارسال رایگان برای خریدهای بالای ${fa.format(free)} تومان`;
  if (!asList(shop.menu, 'menu', 'items')) {
    result.menu = [
      ...(model.offerProducts.length ? [{ label: 'پیشنهاد ویژه', href: '#offers' }] : []),
      ...model.categories.slice(0, 3).map((c) => ({ label: c.name, href: `#${c.slug}` })),
      { label: 'تماس با ما', href: '#contact' },
    ];
  }
  const hours = shop.hours;
  if (!asList(shop.schedule, 'schedule') && hours && typeof hours === 'object' && hours.open && hours.close) {
    result.schedule = [`هر روز: ${hours.open.replace(/^0/, '')} تا ${hours.close}`.replace(/\d/g, (d) => fa.format(Number(d)))];
  }
  return result;
}

function buildModel(raw) {
  const productList = asList(raw.products, 'products', 'items');
  const categoryList = asList(raw.categories, 'categories', 'items');
  if (!productList) throw new ApiError('shape', 'products.json');
  if (!categoryList) throw new ApiError('shape', 'categories.json');

  const products = productList
    .filter((p) => p && p.id != null && text(p.name) && Number.isFinite(Number(p.price)))
    .map((p) => ({ ...p, price: Number(p.price) }));
  const categories = categoryList
    .filter((c) => c && c.id != null && text(c.name))
    .map((c) => ({ ...c, slug: text(c.slug) || idKey(c.id) }));

  const stockItems = raw.stock?.items && typeof raw.stock.items === 'object' ? raw.stock.items : {};
  const offerList = asList(raw.offers, 'offers', 'items') || [];

  const model = {
    shop: raw.shop && typeof raw.shop === 'object' ? raw.shop : {},
    home: {},
    products,
    categories,
    productById: new Map(products.map((p) => [idKey(p.id), p])),
    categoryById: new Map(categories.map((c) => [idKey(c.id), c])),
    categoryBySlug: new Map(categories.map((c) => [norm(c.slug), c])),
    categoryByName: new Map(categories.map((c) => [norm(c.name), c])),
    offerById: new Map(),
    stockOf: (product) => stockItems[idKey(product.id)],
    isOut: (product) => Number(stockItems[idKey(product.id)]) <= 0 && stockItems[idKey(product.id)] !== undefined,
  };

  for (const offer of offerList) {
    const percent = Number(offer?.percent);
    if (offer && percent > 0 && percent < 100 && model.productById.has(idKey(offer.productId))) {
      model.offerById.set(idKey(offer.productId), { ...offer, percent });
    }
  }

  model.offerProducts = [...model.offerById.keys()].map((id) => model.productById.get(id));
  model.shop = shopWithFallbacks(model.shop, model);
  model.home = raw.home && typeof raw.home === 'object' && !Array.isArray(raw.home) ? raw.home : defaultHome(model);

  /* carousels, in the order home.json lists them */
  const used = new Set(['top', 'main', 'categories', 'contact']);
  model.carousels = [];
  for (const entry of asList(model.home.carousels, 'carousels', 'items') || []) {
    if (!entry || typeof entry !== 'object') continue;
    const source = resolveSource(entry, model);
    if (!source) continue;
    const products =
      source.kind === 'offers'
        ? model.offerProducts
        : source.kind === 'category'
          ? products_inCategory(model, source.category)
          : source.products;
    if (!products.length) continue;

    let id = idKey(pick(entry, ['fragment', 'slug', 'id', 'anchor', 'hash']))
      .replace(/^#/, '')
      .replace(/\s+/g, '-');
    if (!id) id = source.kind === 'offers' ? 'offers' : source.category?.slug || `carousel-${model.carousels.length + 1}`;
    while (used.has(id)) id += '-2';
    used.add(id);

    model.carousels.push({
      id,
      title: text(pick(entry, ['title', 'name', 'heading', 'label'])) || source.category?.name || 'پیشنهاد ویژه امروز',
      kind: source.kind,
      category: source.category || null,
      products: products.slice(0, MAX_CAROUSEL_ITEMS),
    });
  }
  model.sectionIds = used;
  return model;
}

const products_inCategory = (model, category) =>
  model.products.filter((p) => idKey(p.categoryId) === idKey(category.id));

/* ==========================================================================
   5. Routing: home view  /   category view  ?cat=slug   (history.pushState)
   ========================================================================== */
const state = { model: null, loading: false, search: location.search };

function currentRoute(model) {
  const params = new URLSearchParams(location.search);
  const query = (params.get('q') || '').trim().replace(/\s+/g, ' ');
  if (query) return { view: 'search', q: query };
  const key = params.get('cat');
  if (!key) return { view: 'home' };
  if (idKey(key).toLowerCase() === OFFERS_VIEW) return { view: 'list', key: OFFERS_VIEW };
  const category = model?.categoryBySlug.get(norm(key)) || model?.categoryById.get(idKey(key));
  return { view: 'list', key, category: category || null };
}

const homeHref = () => location.pathname;
const listHref = (key) => `?cat=${encodeURIComponent(key)}`;
/* links that stay inside the page (category view / home) are handled with pushState instead of a reload */
const routeAttr = (href) => (href.startsWith('?') || href === homeHref() ? true : undefined);

/* Where a category link should go. Fragment (#dairy) whenever the section exists on the page, otherwise the category view. */
function categoryHref(category, model, route) {
  if (route.view === 'home') {
    const carousel = model.carousels.find((c) => c.kind === 'category' && c.category === category);
    if (carousel) return `#${carousel.id}`;
    if (model.sectionIds.has(category.slug)) return `#${category.slug}`;
  }
  return listHref(category.slug);
}

/* A link written in shop.json / home.json (usually "#something") → a link that works in the current view. */
function resolveHref(target, model, route) {
  const href = text(target);
  if (!href || href === '#') return '';
  if (!href.startsWith('#')) return href;
  const key = href.slice(1);
  const lowered = norm(key);
  const category = model.categoryBySlug.get(lowered);
  const offersCarousel = model.carousels.find((c) => c.kind === 'offers');
  const isOffersKey = /^(offers?|deals?|discounts?|specials?|today|amazing|hot)$/.test(lowered);

  if (route.view === 'home') {
    if (model.sectionIds.has(key)) return href;
    if (isOffersKey) return offersCarousel ? `#${offersCarousel.id}` : listHref(OFFERS_VIEW);
    if (/^(footer|about|contact-us|contact)$/.test(lowered)) return '#contact';
    if (/^(all-?categories|category|cats)$/.test(lowered)) return '#categories';
    if (category) return categoryHref(category, model, route);
    return href;
  }
  if (isOffersKey) return listHref(OFFERS_VIEW);
  if (/^(footer|about|contact-us|contact)$/.test(lowered)) return '#contact';
  if (/^(all-?categories|category|cats)$/.test(lowered)) return homeHref();
  if (category) return listHref(category.slug);
  return href.startsWith('#') && ['top', 'main', 'contact'].includes(key) ? href : homeHref();
}

function navigate(url) {
  history.pushState({}, '', url);
  render({ fresh: true });
}

/* ==========================================================================
   6. Cart (count persisted in localStorage)
   ========================================================================== */
let memoryCart = {};

function readCart() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CART_KEY) || '{}');
    const clean = {};
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      for (const [id, qty] of Object.entries(parsed)) if (Number.isInteger(qty) && qty > 0) clean[id] = qty;
    }
    return clean;
  } catch {
    return memoryCart; // storage blocked or corrupted → keep working in memory
  }
}

function writeCart(cart) {
  memoryCart = cart;
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  } catch {
    /* private mode / quota: the in-memory copy keeps the badge correct for this visit */
  }
}

const cartCount = (cart) => Object.values(cart).reduce((sum, qty) => sum + qty, 0);

function renderCartBadge(bump = false) {
  const count = cartCount(readCart());
  const button = $('.cart');
  $('.cart b').textContent = fa.format(count);
  button.setAttribute('aria-label', count ? `سبد خرید، ${fa.format(count)} کالا` : 'سبد خرید، خالی');
  renderMiniCart();
  syncCards();
  if (bump) {
    button.classList.remove('is-bump');
    void button.offsetWidth; // restart the CSS animation
    button.classList.add('is-bump');
  }
}

const unitPriceOf = (product, model) => {
  const offer = model.offerById.get(idKey(product.id));
  return offer ? discountedPrice(product.price, offer.percent) : product.price;
};

/* How many units may be bought: the stock number when the API gives one, otherwise unlimited. */
function stockLimit(product, model) {
  const value = model.stockOf(product);
  return value == null || !Number.isFinite(Number(value)) ? Infinity : Number(value);
}

function addToCart(id) {
  const model = state.model;
  const product = model?.productById.get(id);
  if (!product) return;
  const name = text(product.name);
  if (model.isOut(product)) {
    announce(`${name} ناموجود است`);
    return;
  }
  const cart = readCart();
  const next = (cart[id] || 0) + 1;
  if (next > stockLimit(product, model)) {
    announce(`بیشتر از موجودی ${name} نمی‌توان به سبد اضافه کرد`);
    return;
  }
  cart[id] = next;
  writeCart(cart);
  renderCartBadge(true);
  announce(
    next >= stockLimit(product, model)
      ? `${name} به سبد اضافه شد؛ به سقف موجودی رسیدید`
      : `${name} به سبد خرید اضافه شد. تعداد در سبد: ${fa.format(next)}`,
  );
}

function setQuantity(id, quantity) {
  const cart = readCart();
  if (quantity > 0) cart[id] = quantity;
  else delete cart[id];
  writeCart(cart);
  renderCartBadge();
  const name = text(state.model?.productById.get(id)?.name);
  if (name) announce(quantity > 0 ? `تعداد ${name} در سبد: ${fa.format(quantity)}` : `${name} از سبد خرید حذف شد`);
}

/* Drops saved items that no longer exist / are out of stock and clamps quantities to the stock. */
function sanitizeCart(model) {
  const cart = readCart();
  const clean = {};
  let removed = 0;
  for (const [id, quantity] of Object.entries(cart)) {
    const product = model.productById.get(id);
    if (!product || model.isOut(product)) {
      removed += 1;
      continue;
    }
    clean[id] = Math.min(quantity, stockLimit(product, model));
  }
  if (JSON.stringify(clean) !== JSON.stringify(cart)) writeCart(clean);
  renderCartBadge();
  if (removed) announce(`${fa.format(removed)} کالا به‌دلیل ناموجود شدن از سبد خرید حذف شد`);
}

/* Mini cart: hover / focus / tap on the header cart button shows what is in the basket, built from
   localStorage (ids + quantities) joined with the live API data (name, unit, price, offer, stock). */
function cartSummary(model) {
  const rows = Object.entries(readCart())
    .map(([id, quantity]) => ({ product: model.productById.get(id), quantity }))
    .filter((row) => row.product);
  let units = 0;
  let total = 0;
  let original = 0;
  for (const row of rows) {
    row.unit = unitPriceOf(row.product, model);
    row.offer = model.offerById.get(idKey(row.product.id));
    units += row.quantity;
    total += row.unit * row.quantity;
    original += row.product.price * row.quantity;
  }
  return { rows, units, total, original };
}

const percentOff = (original, total) => Math.round(((original - total) / original) * 100);

function priceBlock(total, original, percent = percentOff(original, total)) {
  const block = h('div', { class: 'mini-price' });
  if (original > total) {
    block.append(
      h('div', { class: 'mini-price__was' }, h('span', { class: 'mini-badge' }, `${fa.format(percent)}٪`, srOnly(' تخفیف')), h('del', null, srOnly('قیمت قبلی: '), fa.format(original))),
    );
  }
  block.append(h('strong', null, fa.format(total), h('span', { class: 'cur' }, 'تومان')));
  return block;
}

function miniItemPic(product) {
  const photo = SHOW_EMOJI_FIRST && text(product.emoji) ? null : productPhoto(product);
  const pic = h('div', { class: 'mini-item__pic', 'aria-hidden': 'true' });
  if (photo) pic.append(h('img', { src: `${IMG}${photo}`, alt: '', width: 72, height: 72, loading: 'lazy', decoding: 'async' }));
  else pic.append(text(product.emoji) || '');
  return pic;
}

function miniCartRow({ product, quantity, unit, offer }, model) {
  const id = idKey(product.id);
  const name = text(product.name);
  const atLimit = quantity >= stockLimit(product, model);
  const decrease =
    quantity > 1
      ? h('button', { type: 'button', 'data-cart': 'dec', 'data-id': id, 'aria-label': `کاهش تعداد ${name}` }, icon('i-minus'))
      : h('button', { type: 'button', 'data-cart': 'remove', 'data-id': id, 'aria-label': `حذف ${name} از سبد` }, icon('i-trash'));
  return h(
    'li',
    { class: 'mini-item' },
    miniItemPic(product),
    h(
      'div',
      null,
      h('p', { class: 'mini-item__name' }, name),
      h(
        'div',
        { class: 'mini-item__row' },
        h(
          'div',
          { class: 'mini-qty', role: 'group', 'aria-label': `تعداد ${name}` },
          h('button', { type: 'button', 'data-cart': 'inc', 'data-id': id, 'aria-label': `افزایش تعداد ${name}`, disabled: atLimit }, icon('i-plus')),
          h('span', { class: 'mini-qty__num' }, fa.format(quantity), atLimit && Number.isFinite(stockLimit(product, model)) ? h('span', { class: 'mini-qty__max' }, 'حداکثر') : null),
          decrease,
        ),
        priceBlock(unit * quantity, product.price * quantity, offer?.percent),
      ),
    ),
  );
}

function renderMiniCart(focusSelector) {
  const panel = $('#mini-cart');
  if (!panel) return;
  const model = state.model;
  const summary = model ? cartSummary(model) : null;
  const title = h('h2', { id: 'mini-cart-title' }, 'خلاصه سبد خرید شما');

  if (!summary || !summary.rows.length) {
    panel.replaceChildren(
      h('div', { class: 'mini-cart__head' }, title),
      h('p', { class: 'mini-cart__empty' }, model ? 'سبد خرید شما خالی است.' : 'اطلاعات فروشگاه هنوز بارگذاری نشده است.'),
    );
    return;
  }

  panel.replaceChildren(
    h('div', { class: 'mini-cart__head' }, title, h('span', { class: 'mini-cart__count' }, `${fa.format(summary.units)} کالا`)),
    h('ul', { class: 'mini-cart__list' }, summary.rows.map((row) => miniCartRow(row, model))),
    h(
      'div',
      null,
      state.checkoutNotice ? h('p', { class: 'mini-cart__notice', role: 'status' }, 'ثبت سفارش در این مرحله از پروژه فعال نیست.') : null,
      h(
        'div',
        { class: 'mini-cart__foot' },
        h('button', { class: 'mini-cart__checkout', type: 'button', 'data-cart': 'checkout' }, 'ثبت سفارش'),
        priceBlock(summary.total, summary.original),
      ),
    ),
  );
  if (focusSelector) panel.querySelector(focusSelector)?.focus();
}

function setCartOpen(open) {
  const wrap = $('#cart-wrap');
  wrap.classList.toggle('is-open', open);
  $('.cart').setAttribute('aria-expanded', String(open));
  if (open) renderMiniCart();
}

function handleCartAction(button) {
  const { cart: action, id } = button.dataset;
  if (action === 'toggle') return setCartOpen(!$('#cart-wrap').classList.contains('is-open'));
  if (action === 'checkout') {
    state.checkoutNotice = true;
    announce('ثبت سفارش در این مرحله از پروژه فعال نیست');
    return renderMiniCart('[data-cart="checkout"]');
  }
  state.checkoutNotice = false;
  const inPanel = Boolean(button.closest('#mini-cart')); // must be read before the panel is re-rendered
  const quantity = readCart()[id] || 0;
  if (action === 'inc') addToCart(id);
  if (action === 'dec') setQuantity(id, quantity - 1);
  if (action === 'remove') setQuantity(id, 0);
  // focus is only moved inside the mini cart; on product cards syncCards() keeps the focus where it was
  if (inPanel) {
    const keep = { inc: `[data-cart="inc"][data-id="${id}"]:not(:disabled)`, dec: `[data-cart="dec"][data-id="${id}"]` }[action];
    renderMiniCart(keep);
  }
}

function announce(message) {
  const live = $('#live');
  live.textContent = '';
  setTimeout(() => (live.textContent = message), 50);
}

/* ==========================================================================
   7. Building blocks (cards, carousels, sections)
   ========================================================================== */
function productPic(product, model, offer, out) {
  const pic = h('div', { class: 'pic' });
  const emoji = text(product.emoji);
  const photo = SHOW_EMOJI_FIRST && emoji ? null : productPhoto(product);
  const showPlaceholder = () => {
    pic.classList.add('pic--empty');
    // the product's own emoji from products.json is the fallback icon; a neutral glyph if the API has none
    pic.prepend(emoji ? h('span', { class: 'pic__emoji', 'aria-hidden': 'true' }, emoji) : icon('i-package', 'pic__ph'));
  };
  if (photo) {
    const img = h('img', { src: `${IMG}${photo}`, alt: '', width: 460, height: 400, loading: 'lazy', decoding: 'async' });
    img.addEventListener('error', () => {
      img.remove();
      showPlaceholder();
    });
    pic.append(img);
  } else {
    showPlaceholder();
  }
  if (out) {
    pic.append(h('span', { class: 'badge badge--out' }, 'ناموجود'));
  } else if (offer) {
    pic.append(
      h('span', { class: 'badge' }, `${fa.format(offer.percent)}٪`, srOnly(` تخفیف${text(offer.label) ? `، ${text(offer.label)}` : ''}`)),
    );
  }
  return pic;
}

/* The control in the corner of a card: «+» while the product is not in the basket, otherwise a [🗑/−] n [+] stepper. */
function cardAction(product, model, quantity) {
  const id = idKey(product.id);
  const name = text(product.name);
  const out = model.isOut(product);
  if (out || !quantity) {
    return h(
      'button',
      {
        class: 'add',
        type: 'button',
        'data-id': id,
        'data-name': name,
        'aria-label': out ? `${name} ناموجود است` : `افزودن ${name} به سبد خرید`,
        disabled: out,
      },
      '+',
    );
  }
  const atLimit = quantity >= stockLimit(product, model);
  const decrease =
    quantity > 1
      ? h('button', { type: 'button', 'data-cart': 'dec', 'data-id': id, 'aria-label': `کاهش تعداد ${name}` }, icon('i-minus'))
      : h('button', { type: 'button', 'data-cart': 'remove', 'data-id': id, 'aria-label': `حذف ${name} از سبد خرید` }, icon('i-trash'));
  return h(
    'div',
    { class: 'stepper', role: 'group', 'aria-label': `تعداد ${name} در سبد خرید` },
    h(
      'button',
      { type: 'button', 'data-cart': 'inc', 'data-id': id, 'aria-label': `افزایش تعداد ${name}`, title: atLimit ? 'به سقف موجودی رسیده‌اید' : undefined, disabled: atLimit },
      icon('i-plus'),
    ),
    h('span', { class: 'stepper__num' }, fa.format(quantity)),
    decrease,
  );
}

/* Brings every product card in line with the basket (called whenever the basket changes). */
function syncCards() {
  const model = state.model;
  if (!model) return;
  const cart = readCart();
  for (const card of document.querySelectorAll('.card[data-id]')) {
    const quantity = cart[card.dataset.id] || 0;
    if (card.dataset.qty === String(quantity)) continue;
    const product = model.productById.get(card.dataset.id);
    if (!product || model.isOut(product)) continue;
    const slot = card.querySelector('.buy__action');
    const active = slot.contains(document.activeElement) ? document.activeElement : null;
    const kind = active ? active.dataset.cart || 'add' : null; // which control had the focus
    slot.replaceChildren(cardAction(product, model, quantity));
    slot.parentElement.classList.toggle('buy--stepper', quantity > 0);
    card.dataset.qty = quantity;
    if (!kind) continue;
    const selector = quantity === 0 ? 'button.add' : kind === 'inc' || kind === 'add' ? '[data-cart="inc"]:not(:disabled)' : '[data-cart="dec"], [data-cart="remove"]';
    (slot.querySelector(selector) || slot.querySelector('button'))?.focus();
  }
}

function productCard(product, model, extra = {}) {
  const out = model.isOut(product);
  const offer = model.offerById.get(idKey(product.id));
  const name = text(product.name);

  const price = h('p', { class: 'price' });
  if (offer) {
    price.append(
      h('del', null, srOnly('قیمت قبلی: '), fa.format(product.price)),
      h('strong', null, toman(discountedPrice(product.price, offer.percent))),
    );
  } else {
    price.append(h('strong', null, toman(product.price)));
  }

  const quantity = out ? 0 : readCart()[idKey(product.id)] || 0;

  return h(
    'li',
    { class: `card${out ? ' card--out' : ''}`, id: extra.id, 'data-id': idKey(product.id), 'data-qty': quantity },
    h(
      'article',
      { class: 'card__body' },
      productPic(product, model, offer, out),
      h(extra.heading || 'h3', null, name),
      h('p', { class: 'unit' }, text(product.unit)),
      h('div', { class: `buy${quantity ? ' buy--stepper' : ''}` }, price, h('div', { class: 'buy__action' }, cardAction(product, model, quantity))),
    ),
  );
}

function endCard(id, title, href) {
  return h(
    'li',
    { class: 'card card--all', id },
    h(
      'a',
      { class: 'offer-all', href, 'data-route': true },
      h('span', { class: 'offer-all__circle' }, icon('i-arrow-right', 'icon--mirror')),
      h('span', { class: 'offer-all__text' }, 'مشاهده همه', srOnly(` ${title}`)),
    ),
  );
}

function categoryImage(category, className, width = 96) {
  const emoji = text(category.emoji);
  const photo = SHOW_EMOJI_FIRST && emoji ? null : categoryPhoto(category);
  if (!photo && emoji) return h('span', { class: `cat__icon ${className} cat__emoji`.trim(), 'aria-hidden': 'true' }, emoji);
  if (!photo) return icon('i-basket', `cat__icon ${className} cat__icon--svg`);
  return h('img', { class: `cat__icon ${className}`.trim(), src: `${IMG}${photo}`, alt: '', width, height: width, decoding: 'async' });
}

function offersCarousel(carousel, model, route) {
  const { id, title } = carousel;
  const cards = carousel.products.map((p, i) => productCard(p, model, {}));
  const intro = h(
    'div',
    { class: 'offers__intro', id: `${id}-start` },
    h('h2', { class: 'offers__title', id: `${id}-t` }, ...title.split(/\s+/).map((word) => h('span', null, word, ' '))),
    h('img', { class: 'offers__art', src: `${IMG}hero/offer.png`, alt: '', width: 320, height: 280, loading: 'lazy', decoding: 'async' }),
    h('a', { class: 'offers__all', href: listHref(OFFERS_VIEW), 'data-route': true }, 'مشاهده همه ', icon('i-chevron-right', 'icon--mirror')),
  );
  return h(
    'section',
    { class: 'shelf offers', id, 'aria-labelledby': `${id}-t` },
    h(
      'div',
      { class: 'offers__box' },
      h(
        'div',
        { class: 'offers__scroller' },
        intro,
        h('ul', { class: 'offers__list' }, cards, endCard(`${id}-end`, title, listHref(OFFERS_VIEW))),
      ),
      h('a', { class: 'offers__nav offers__nav--prev', href: `#${id}-start`, 'aria-label': `رفتن به ابتدای ${title}` }, icon('i-chevron-right')),
      h('a', { class: 'offers__nav offers__nav--next', href: `#${id}-end`, 'aria-label': `رفتن به انتهای ${title}` }, icon('i-chevron-right')),
    ),
  );
}

function railCarousel(carousel, model, route) {
  const { id, title, category } = carousel;
  const cards = carousel.products.map((p, i) => productCard(p, model, { id: i === 0 ? `${id}-start` : undefined }));
  const seeAll = category ? listHref(category.slug) : homeHref();
  return h(
    'section',
    { class: 'shelf', id, 'aria-labelledby': `${id}-t` },
    h(
      'div',
      { class: 'sec-head' },
      h('h2', { id: `${id}-t` }, category ? categoryImage(category, 'cat__icon--head') : null, ' ', title),
      h(
        'div',
        { class: 'arrows' },
        h('a', { class: 'arr arr--start', href: `#${id}-start`, 'aria-label': `رفتن به ابتدای ${title}` }, icon('i-arrow-right')),
        h('a', { class: 'arr arr--end', href: `#${id}-end`, 'aria-label': `رفتن به انتهای ${title}` }, icon('i-arrow-right')),
      ),
    ),
    h('ul', { class: 'rail' }, cards, category ? endCard(`${id}-end`, title, seeAll) : h('li', { class: 'rail__end', id: `${id}-end` })),
  );
}

function categoriesSection(model, route) {
  const list = h('ul', { class: 'cats' });
  for (const category of model.categories) {
    const tile = h('span', { class: 'cat__tile' }, categoryImage(category, ''));
    if (isHexColor(category.color)) tile.style.setProperty('--cat-bg', category.color.trim());
    list.append(
      h(
        'li',
        null,
        h('a', { class: 'cat', href: categoryHref(category, model, route), 'data-route': routeAttr(categoryHref(category, model, route)), 'aria-current': route.category === category ? 'page' : undefined }, tile, text(category.name)),
      ),
    );
  }
  return h('section', { id: 'categories', 'aria-labelledby': 'categories-t' }, h('div', { class: 'sec-head' }, h('h2', { id: 'categories-t' }, 'دسته‌بندی‌ها')), list);
}

function heroSection(model) {
  const hero = model.home.hero || {};
  const side = model.home.side || {};
  const offersCar = model.carousels.find((c) => c.kind === 'offers');
  const route = { view: 'home' };

  const cta = (item) => {
    const link = pick(item, ['cta', 'button', 'action', 'link']);
    const label = typeof link === 'string' ? '' : text(pick(link, ['label', 'text', 'title', 'name']));
    const href = typeof link === 'string' ? link : pick(link, ['href', 'link', 'url', 'to', 'fragment', 'target']);
    const resolved = resolveHref(typeof href === 'string' && !href.startsWith('#') && !/^(https?:|\/|\.|\?)/.test(href) ? `#${href}` : href, model, route);
    return label && resolved ? { label, href: resolved } : null;
  };

  const heroCta = cta(hero);
  const sideCta = cta(side);
  const title = text(pick(hero, ['title', 'heading', 'headline', 'name'])) || text(model.shop.slogan) || BRAND.tagline;
  const lead = text(pick(hero, ['text', 'subtitle', 'description', 'lead', 'body', 'subtitle']));

  const stage = h('div', { class: 'hero__stage' }, h('span', { class: 'hero__disc', 'aria-hidden': 'true' }));
  for (const [file, alt, w, hgt] of HERO_ART) {
    stage.append(
      h('img', {
        class: `hero__item hero__item--${file}`,
        src: `${IMG}hero/${file}.webp`,
        alt,
        width: w,
        height: hgt,
        decoding: 'async',
        fetchpriority: file === 'tomato' ? 'high' : undefined,
      }),
    );
  }

  /* price tag = the first discounted product that is in stock */
  const tagProduct = model.offerProducts.find((p) => !model.isOut(p));
  if (tagProduct) {
    const offer = model.offerById.get(idKey(tagProduct.id));
    stage.append(
      h(
        'a',
        { class: 'hero__tag', href: offersCar ? `#${offersCar.id}` : '#categories' },
        h('span', { class: 'hero__tag-name' }, `${text(tagProduct.name)}، ${text(tagProduct.unit)}`),
        h(
          'span',
          { class: 'hero__tag-row' },
          h('del', null, srOnly('قیمت قبلی: '), fa.format(tagProduct.price)),
          h('strong', null, toman(discountedPrice(tagProduct.price, offer.percent))),
          h('span', { class: 'hero__tag-off' }, `${fa.format(offer.percent)}٪`, srOnly(' تخفیف')),
        ),
      ),
    );
  }

  const feature = h(
    'div',
    { class: 'hero__feature' },
    h(
      'div',
      { class: 'hero__copy' },
      h('h1', { class: 'hero__title' }, h('span', { class: 'hero__brand' }, `${BRAND.name}،`), h('span', { class: 'hero__headline' }, title)),
      lead ? h('p', { class: 'hero__lead' }, lead) : null,
      h(
        'div',
        { class: 'hero__actions' },
        heroCta ? h('a', { class: 'btn', href: heroCta.href, 'data-route': routeAttr(heroCta.href) }, heroCta.label) : null,
        offersCar ? h('a', { class: 'btn btn--outline', href: `#${offersCar.id}` }, 'پیشنهادهای امروز') : null,
      ),
    ),
    stage,
  );

  const sideTitle = text(pick(side, ['title', 'heading', 'name']));
  const sideArt = bannerArt(`${sideTitle} ${text(sideCta?.label)}`, 'hero/dairy.webp');
  const promo = sideTitle
    ? h(
        'div',
        { class: 'hero__promo' },
        h(
          'div',
          { class: 'hero__promo-copy' },
          h('h2', { class: 'hero__promo-title' }, sideTitle),
          text(pick(side, ['text', 'subtitle', 'description', 'body'])) ? h('p', { class: 'hero__promo-note' }, text(pick(side, ['text', 'subtitle', 'description', 'body']))) : null,
          sideCta ? h('a', { class: 'btn btn--green', href: sideCta.href, 'data-route': routeAttr(sideCta.href) }, sideCta.label) : null,
        ),
        sideArt ? h('img', { class: 'hero__promo-art', src: `${IMG}${sideArt[0]}`, alt: '', width: sideArt[1], height: sideArt[2], decoding: 'async' }) : null,
      )
    : null;

  return h('section', { class: 'hero', 'aria-label': 'پیشنهاد اصلی' }, feature, promo);
}

function bannerArt(label, only) {
  const value = norm(label);
  const hit = BANNER_ART.find(([file, pattern]) => (only ? file === only && pattern.test(value) : pattern.test(value)));
  return hit ? [hit[0], hit[2][0], hit[2][1]] : null;
}

function bannersSection(model) {
  const promos = (asList(model.home.promos, 'promos', 'banners', 'items') || []).filter((p) => p && typeof p === 'object');
  if (!promos.length) return null;
  const route = { view: 'home' };
  const section = h('section', { class: 'banners', 'aria-label': 'پیشنهادهای تبلیغاتی' });
  for (const promo of promos) {
    const title = text(pick(promo, ['title', 'text', 'label', 'name']));
    if (!title) continue;
    const rawHref = pick(promo, ['href', 'link', 'url', 'to', 'fragment', 'target']);
    const href = resolveHref(typeof rawHref === 'string' && !/^(#|https?:|\/|\.|\?)/.test(rawHref) ? `#${rawHref}` : rawHref, model, route);
    const art = bannerArt(title);
    section.append(
      h(
        'a',
        { class: 'banner', href: href || '#categories', 'data-route': routeAttr(href || '#categories') },
        title,
        art ? h('img', { src: `${IMG}${art[0]}`, alt: '', width: art[1], height: art[2], loading: 'lazy', decoding: 'async' }) : null,
      ),
    );
  }
  return section.children.length ? section : null;
}

/* Search: matches product name, unit, category name and tags (Persian letter variants and digits are normalised) */
const searchKey = (value) =>
  norm(value)
    .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
    .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));

function searchProducts(model, query) {
  const terms = searchKey(query).split(' ').filter(Boolean);
  if (!terms.length) return [];
  const matches = model.products.filter((product) => {
    const categoryWords = searchKey(model.categoryById.get(idKey(product.categoryId))?.name).split(' ');
    const tags = Array.isArray(product.tags) ? product.tags : [];
    const haystack = searchKey([product.name, product.unit, ...tags].join(' '));
    // the category name only counts as a whole word, so «شیر» does not pull in the whole «نان و شیرینی» category
    return terms.every((term) => haystack.includes(term) || categoryWords.includes(term));
  });
  const inName = (product) => terms.every((term) => searchKey(product.name).includes(term));
  return matches.sort((a, b) => Number(inName(b)) - Number(inName(a))); // name matches first (sort is stable)
}

function searchView(model, route) {
  const results = searchProducts(model, route.q);
  const back = h('button', { class: 'btn btn--outline', type: 'button', 'data-clear-search': true }, 'پاک کردن جستجو');
  return h(
    'section',
    { class: 'catalog', 'aria-labelledby': 'catalog-t' },
    h(
      'div',
      { class: 'sec-head' },
      h('h1', { class: 'catalog__title', id: 'catalog-t' }, `نتایج جستجو برای «${route.q}»`),
      h('p', { class: 'catalog__count' }, `${fa.format(results.length)} کالا`),
    ),
    results.length
      ? [h('h2', { class: 'sr-only' }, 'فهرست کالاها'), h('ul', { class: 'products-grid' }, results.map((p) => productCard(p, model)))]
      : h('div', { class: 'state state--empty', role: 'status' }, h('p', { class: 'state__text' }, 'کالایی با این عبارت پیدا نشد. عبارت دیگری را امتحان کنید.'), back),
  );
}

let searchTimer;
function applySearch(value) {
  if (!state.model) return;
  const query = value.trim().replace(/\s+/g, ' ');
  const params = new URLSearchParams(location.search);
  const wasSearching = params.has('q');
  if (query) params.set('q', query);
  else params.delete('q');
  const queryString = params.toString();
  const url = location.pathname + (queryString ? `?${queryString}` : '');
  if (url === location.pathname + location.search) return;
  // entering search adds one history entry; typing further only rewrites it
  if (query && !wasSearching) history.pushState({}, '', url);
  else history.replaceState({}, '', url);
  render({ fresh: Boolean(query) !== wasSearching });
}

/* The category / offers view opened by «مشاهده همه» (?cat=dairy) */
function listView(model, route) {
  const isOffers = route.key === OFFERS_VIEW;
  const category = route.category;
  const products = isOffers ? model.offerProducts : category ? products_inCategory(model, category) : [];
  const title = isOffers ? model.carousels.find((c) => c.kind === 'offers')?.title || 'پیشنهاد ویژه امروز' : category?.name || '';

  const back = h('a', { class: 'back-link', href: homeHref(), 'data-route': true }, icon('i-arrow-right'), 'بازگشت به همه محصولات');
  if (!isOffers && !category) {
    return h(
      'section',
      { class: 'catalog', 'aria-labelledby': 'catalog-t' },
      back,
      h('h1', { class: 'catalog__title', id: 'catalog-t', tabindex: '-1' }, 'این دسته پیدا نشد'),
      h('p', { class: 'state__text' }, 'آدرسی که باز کرده‌اید در دسته‌های فروشگاه وجود ندارد. یکی از دسته‌های بالا را انتخاب کنید.'),
    );
  }
  const grid = h('ul', { class: 'products-grid' }, products.map((p) => productCard(p, model, { heading: 'h2' }))); // h1 → h2: no skipped heading level
  return h(
    'section',
    { class: 'catalog', 'aria-labelledby': 'catalog-t' },
    back,
    h(
      'div',
      { class: 'sec-head' },
      h('h1', { class: 'catalog__title', id: 'catalog-t', tabindex: '-1' }, category ? categoryImage(category, 'cat__icon--head') : null, ' ', title),
      h('p', { class: 'catalog__count' }, `${fa.format(products.length)} کالا`),
    ),
    products.length ? [h('h2', { class: 'sr-only' }, 'فهرست کالاها'), grid] : h('p', { class: 'state__text' }, 'در حال حاضر کالایی برای نمایش وجود ندارد.'),
  );
}

/* ==========================================================================
   8. Header / footer / page
   ========================================================================== */
function renderHeader(model, route) {
  const notice = text(pick(model.shop, ['notice', 'announcement'])) || text(pick(model.shop.notice, ['text', 'title', 'label']));
  const bar = $('.header-banner');
  $('#notice').textContent = notice;
  bar.hidden = !notice;

  $('#tagline').textContent = text(model.shop.slogan) || BRAND.tagline;
  $('#q').placeholder = `جستجو در میان ${fa.format(model.products.length)} کالا…`;

  /* mega menu: «همه دسته‌ها» */
  const mega = $('#mega-list');
  mega.replaceChildren();
  for (const category of model.categories) {
    mega.append(
      h(
        'li',
        null,
        h('a', { href: categoryHref(category, model, route), 'data-route': routeAttr(categoryHref(category, model, route)) }, categoryImage(category, 'cat__icon--menu', 96), text(category.name)),
      ),
    );
  }

  /* main menu from shop.json */
  const menu = $('#main-menu');
  for (const old of menu.querySelectorAll(':scope > li:not(.mega)')) old.remove();
  const items = asList(model.shop.menu, 'menu', 'items') || [];
  for (const item of items) {
    const label = typeof item === 'string' ? item : text(pick(item, ['label', 'title', 'name', 'text']));
    let target = typeof item === 'string' ? '' : pick(item, ['href', 'link', 'url', 'to', 'fragment', 'slug', 'anchor', 'target']);
    if (!label || /^همه ?دسته/.test(norm(label))) continue; // already the mega menu
    if (typeof target === 'string' && !/^(#|https?:|\/|\.|\?)/.test(target)) target = `#${target}`;
    const href = resolveHref(target, model, route);
    if (!href || href === '#categories') continue;
    menu.append(h('li', null, h('a', { href, 'data-route': routeAttr(href) }, label)));
  }
}

function renderFooter(model, route) {
  const grid = $('#foot-grid');
  grid.replaceChildren();
  const shop = model?.shop || {};

  /* column 1 — brand (BRAND wins; shop.json fills what BRAND does not define) */
  const about = text(shop.about);
  const address = h('address');
  const mapsQuery = encodeURIComponent(BRAND.address || text(shop.address));
  const addressText = BRAND.address || text(shop.address);
  if (addressText) {
    address.append(
      h(
        'a',
        { href: `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`, target: '_blank', rel: 'noopener noreferrer' },
        icon('i-pin'),
        ` ${addressText}`,
        srOnly(' (نمایش در گوگل مپ، در تب جدید باز می‌شود)'),
      ),
    );
  }
  const phones = BRAND.phones?.length ? BRAND.phones : text(shop.phone) ? [{ label: 'تلفن', text: text(shop.phone), tel: text(shop.phone), icon: 'i-phone' }] : [];
  for (const phone of phones) {
    address.append(h('a', { href: `tel:${phone.tel}` }, icon(phone.icon || 'i-phone'), ' ', srOnly(`${phone.label}: `), h('bdi', { dir: 'ltr' }, phone.text)));
  }
  if (BRAND.email) {
    address.append(h('a', { href: `mailto:${BRAND.email}` }, icon('i-mail'), ' ', srOnly('ایمیل: '), h('bdi', { dir: 'ltr' }, BRAND.email)));
  }
  const brandColumn = h('div', null, h('h2', null, BRAND.name), about ? h('p', null, about) : null, address);
  if (BRAND.social?.length) {
    brandColumn.append(
      h('h3', { class: 'foot-social__title', id: 'foot-social-t' }, 'ما را دنبال کنید'),
      h('ul', { class: 'foot-social', 'aria-labelledby': 'foot-social-t' }, BRAND.social.map((s) => h('li', null, h('a', { href: s.href }, icon(s.icon), ` ${s.label}`)))),
    );
  }
  grid.append(brandColumn);

  if (model) {
    /* column 2 — categories */
    const catList = h('ul');
    for (const category of model.categories) {
      catList.append(h('li', null, h('a', { href: categoryHref(category, model, route), 'data-route': routeAttr(categoryHref(category, model, route)) }, text(category.name))));
    }
    grid.append(h('nav', { 'aria-label': 'دسته‌ها در پاورقی' }, h('h2', null, 'دسته‌ها'), catList));

    /* column 3 — help links */
    const help = asList(shop.help, 'help', 'links', 'items') || [];
    if (help.length) {
      const list = h('ul');
      for (const item of help) {
        const label = typeof item === 'string' ? item : text(pick(item, ['label', 'title', 'name', 'text']));
        if (!label) continue;
        const target = typeof item === 'string' ? '' : pick(item, ['href', 'link', 'url', 'to']);
        const href = resolveHref(target, model, route);
        list.append(h('li', null, href ? h('a', { href, 'data-route': routeAttr(href) }, label) : label));
      }
      grid.append(h('div', null, h('h2', null, 'راهنما'), list));
    }

    /* column 4 — opening hours */
    const schedule = asList(shop.schedule, 'schedule', 'hours', 'items') || [];
    if (schedule.length) {
      const list = h('ul');
      for (const row of schedule) {
        const line =
          typeof row === 'string'
            ? row
            : [text(pick(row, ['days', 'day', 'label', 'title', 'name'])), text(pick(row, ['hours', 'time', 'value', 'text']))].filter(Boolean).join(': ');
        if (line) list.append(h('li', null, line));
      }
      grid.append(h('div', null, h('h2', null, 'ساعت کاری'), list));
    }
  }

  $('#copyright').textContent = BRAND.copyright || text(shop.copyright);
}

/* Loading / error states */
function skeletonBlock(className) {
  return h('div', { class: `skeleton ${className}`.trim() });
}

function showLoading() {
  const main = $('#main');
  main.setAttribute('aria-busy', 'true');
  main.replaceChildren(
    h(
      'div',
      { class: 'state state--loading', role: 'status' },
      h('p', { class: 'state__text', id: 'state-text' }, 'در حال بارگذاری فروشگاه…'),
      h('p', { class: 'state__slow', id: 'state-slow', hidden: true }, 'اتصال کند است؛ هنوز در حال دریافت اطلاعات هستیم…'),
    ),
    h('div', { class: 'skeletons', 'aria-hidden': 'true' }, skeletonBlock('skeleton--hero'), h('div', { class: 'skeleton-row' }, ...Array.from({ length: 6 }, () => skeletonBlock('skeleton--cat'))), h('div', { class: 'skeleton-row' }, ...Array.from({ length: 5 }, () => skeletonBlock('skeleton--card')))),
  );
}

function showSlowNotice() {
  const slow = $('#state-slow');
  if (slow) slow.hidden = false;
}

function errorMessage(error) {
  if (error instanceof ApiError) {
    if (error.kind === 'http') return `فایل ${error.file} پیدا نشد یا سرور خطا داد (کد ${fa.format(error.status)}).`;
    if (error.kind === 'json') return `محتوای فایل ${error.file} معتبر نیست.`;
    if (error.kind === 'shape') return `ساختار فایل ${error.file} همان چیزی نیست که انتظار می‌رفت.`;
    if (error.kind === 'timeout') return 'پاسخی از سرور نیامد و زمان انتظار تمام شد.';
  }
  return 'اتصال به سرور برقرار نشد.';
}

function showError(error) {
  console.error('[armin-market] could not load shop data:', error); // technical detail for debugging
  const main = $('#main');
  main.removeAttribute('aria-busy');
  const retry = h('button', { class: 'btn btn--green', type: 'button', 'data-retry': true }, icon('i-refresh'), ' تلاش دوباره');
  main.replaceChildren(
    h(
      'div',
      { class: 'state state--error', role: 'alert' },
      icon('i-alert', 'state__icon'),
      h('h1', { class: 'state__title' }, 'بارگذاری فروشگاه ممکن نشد'),
      h('p', { class: 'state__text' }, 'اینترنت یا سرور را بررسی کنید و دوباره تلاش کنید. سبد خرید شما از بین نرفته است.'),
      h('p', { class: 'state__detail' }, errorMessage(error)),
      retry,
    ),
  );
}

/* Renders the whole page for the current URL. */
function render({ fresh = false } = {}) {
  const model = state.model;
  if (!model) return;
  state.search = location.search;
  const route = currentRoute(model);
  const main = $('#main');
  main.removeAttribute('aria-busy');

  renderHeader(model, route);
  renderFooter(model, route);
  const input = $('#q');
  if (input && searchKey(input.value.trim()) !== searchKey(route.q || '')) input.value = route.q || '';

  const parts = [];
  if (route.view === 'search') {
    document.title = `جستجو: ${route.q} | ${BRAND.name}`;
    parts.push(searchView(model, route));
    announce(`${fa.format(searchProducts(model, route.q).length)} نتیجه برای ${route.q}`);
  } else if (route.view === 'home') {
    document.title = BRAND.name;
    parts.push(heroSection(model), categoriesSection(model, route));
    model.carousels.forEach((carousel, index) => {
      parts.push(carousel.kind === 'offers' ? offersCarousel(carousel, model, route) : railCarousel(carousel, model, route));
      if (index === 0) parts.push(bannersSection(model));
    });
    if (!model.carousels.length) parts.push(bannersSection(model));
  } else {
    const label = route.key === OFFERS_VIEW ? model.carousels.find((c) => c.kind === 'offers')?.title || 'پیشنهاد ویژه امروز' : route.category?.name;
    document.title = label ? `${label} | ${BRAND.name}` : BRAND.name;
    parts.push(categoriesSection(model, route), listView(model, route));
  }
  main.replaceChildren(...parts.filter(Boolean));
  highlightNav();

  /* sections now exist → let the browser (re)apply the #fragment so :target and the scroll position are correct */
  if (route.view === 'home' && location.hash.length > 1) {
    location.replace(location.hash);
  } else if (fresh) {
    window.scrollTo(0, 0);
    if (route.view === 'list') $('#catalog-t')?.focus({ preventScroll: true });
  }
}

/* aria-current on the nav link of the section/category being viewed */
function highlightNav() {
  const here = location.hash || (location.search ? location.search : '');
  for (const link of document.querySelectorAll('.main-nav a')) {
    const href = link.getAttribute('href');
    if (here && href === here) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  }
}

/* ==========================================================================
   9. Start-up
   ========================================================================== */
async function load() {
  if (state.loading) return;
  state.loading = true;
  showLoading();

  const dataPromise = loadAll();
  let slowTimer;
  const slowSignal = new Promise((resolve) => {
    slowTimer = setTimeout(() => resolve('slow'), SLOW_AFTER_MS);
  });

  try {
    // Promise.race: if the API needs more than 3 s, tell the visitor but keep waiting.
    const first = await Promise.race([dataPromise, slowSignal]);
    if (first === 'slow') showSlowNotice();
    const raw = first === 'slow' ? await dataPromise : first;
    state.model = buildModel(raw);
    sanitizeCart(state.model);
    render();
  } catch (error) {
    showError(error);
  } finally {
    clearTimeout(slowTimer);
    state.loading = false;
  }
}

document.addEventListener('click', (event) => {
  if (event.defaultPrevented) return;

  if (!event.target.closest('#cart-wrap')) setCartOpen(false); // tap outside closes the mini cart
  const cartControl = event.target.closest('[data-cart]');
  if (cartControl) return handleCartAction(cartControl);

  if (event.target.closest('[data-clear-search]')) {
    const input = $('#q');
    input.value = '';
    applySearch('');
    input.focus();
    return;
  }

  const addButton = event.target.closest('button.add');
  if (addButton) {
    if (!addButton.disabled) addToCart(addButton.dataset.id);
    return;
  }

  if (event.target.closest('[data-retry]')) {
    load();
    return;
  }

  const link = event.target.closest('a[data-route], a[href^="?"]');
  if (link && event.button === 0 && !(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)) {
    event.preventDefault();
    navigate(link.getAttribute('href'));
    const toggle = $('#menu-toggle');
    if (toggle) toggle.checked = false;
    return;
  }

  if (event.target.closest('.main-nav a')) {
    const toggle = $('#menu-toggle');
    if (toggle) toggle.checked = false; // close the mobile menu after choosing a link
  }
});

/* back/forward between views re-renders; a change of only the #fragment (carousel arrows, menu links) must not */
window.addEventListener('popstate', () => {
  if (location.search !== state.search) render({ fresh: true });
  else highlightNav();
});
window.addEventListener('hashchange', highlightNav);
document.addEventListener('input', (event) => {
  if (event.target.id !== 'q') return;
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => applySearch(event.target.value), 150);
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && $('#cart-wrap').classList.contains('is-open')) {
    setCartOpen(false);
    $('.cart').focus();
  }
  if (event.target.id === 'q' && event.key === 'Escape' && event.target.value) {
    event.target.value = '';
    applySearch('');
  }
});
window.addEventListener('storage', (event) => {
  if (event.key === CART_KEY || event.key === null) renderCartBadge();
});

/* brand-owned parts are shown immediately, even before (or without) the API */
renderCartBadge();
renderFooter(null, { view: 'home' });
load();
