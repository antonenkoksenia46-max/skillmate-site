'use strict';

/* ===== Допоміжні функції ===== */
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

/* ===== 1. Мобільна навігація ===== */
function initNavigation() {
  const burger = $('#burger');
  const nav = $('#main-nav');
  if (!burger || !nav) return;

  const setOpen = (isOpen) => {
    nav.classList.toggle('is-open', isOpen);
    burger.setAttribute('aria-expanded', String(isOpen));
    burger.setAttribute('aria-label', isOpen ? 'Закрити меню' : 'Відкрити меню');
  };

  burger.addEventListener('click', () => {
    setOpen(burger.getAttribute('aria-expanded') !== 'true');
  });

  // Делегування: один обробник на все меню
  nav.addEventListener('click', (event) => {
    if (event.target.closest('a')) setOpen(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setOpen(false);
  });

  // Підсвічування пункту меню відповідно до видимого розділу
  const links = $$('.main-nav a[href^="#"]').filter((a) => a.getAttribute('href').length > 1);
  const sections = links
    .map((a) => $(a.getAttribute('href')))
    .filter(Boolean);

  if ('IntersectionObserver' in window && sections.length) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((a) => {
          const active = a.getAttribute('href') === '#' + entry.target.id;
          a.classList.toggle('is-active', active);
          if (active) a.setAttribute('aria-current', 'true');
          else a.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-40% 0px -50% 0px' });
    sections.forEach((section) => observer.observe(section));
  }
}

/* ===== 2. Пошук і фільтри каталогу ===== */
const priceRanges = {
  lt30: (p) => p <= 30000,
  mid: (p) => p > 30000 && p <= 60000,
  gt60: (p) => p >= 60000
};

function initCatalogFilter() {
  const form = $('#search-form');
  const input = $('#query');
  const selects = {
    price: $('#f-price'),
    exp: $('#f-exp'),
    city: $('#f-city'),
    format: $('#f-format')
  };
  const cards = $$('.card');
  const info = $('#results-info');
  const empty = $('#empty-msg');
  const reset = $('#reset-btn');
  if (!form || !cards.length) return;

  const matches = (card, query, filters) => {
    const text = card.textContent.toLowerCase();
    if (query && !text.includes(query)) return false;

    if (filters.price) {
      const price = Number(card.dataset.price);
      if (!price || !priceRanges[filters.price](price)) return false;
    }
    if (filters.exp && card.dataset.exp !== filters.exp) return false;
    if (filters.city && card.dataset.city !== filters.city) return false;
    if (filters.format && card.dataset.format !== filters.format) return false;
    return true;
  };

  const pluralize = (n) => {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return 'фахівця';
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'фахівці';
    return 'фахівців';
  };

  const apply = () => {
    const query = input.value.trim().toLowerCase();
    const filters = {
      price: selects.price.value,
      exp: selects.exp.value,
      city: selects.city.value,
      format: selects.format.value
    };
    let visible = 0;
    cards.forEach((card) => {
      const show = matches(card, query, filters);
      card.hidden = !show;
      if (show) visible += 1;
    });
    empty.hidden = visible !== 0;
    info.textContent = visible
      ? `Знайдено ${visible} ${pluralize(visible)} з ${cards.length}`
      : '';
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    apply();
    $('#catalog').scrollIntoView({ behavior: 'smooth' });
  });
  input.addEventListener('input', apply);
  Object.values(selects).forEach((select) => select.addEventListener('change', apply));
  reset.addEventListener('click', () => {
    form.reset();
    Object.values(selects).forEach((select) => { select.selectedIndex = 0; });
    apply();
  });

  apply();
}

/* ===== 3. Обране (делегування подій + localStorage) ===== */
const favorites = {
  key: 'skillmate:favorites',
  ids: new Set(),

  load() {
    try {
      const saved = JSON.parse(localStorage.getItem(this.key));
      if (Array.isArray(saved)) this.ids = new Set(saved);
    } catch (e) {
      this.ids = new Set();
    }
  },
  save() {
    try {
      localStorage.setItem(this.key, JSON.stringify([...this.ids]));
    } catch (e) { /* сховище недоступне, працюємо без збереження */ }
  },
  toggle(id) {
    if (this.ids.has(id)) this.ids.delete(id);
    else this.ids.add(id);
    this.save();
  }
};

function initFavorites() {
  const container = $('#cards');
  const counter = $('#fav-count');
  if (!container) return;

  const render = () => {
    $$('.card', container).forEach((card) => {
      const button = $('.fav-btn', card);
      const active = favorites.ids.has(card.dataset.id);
      card.classList.toggle('is-favorite', active);
      button.setAttribute('aria-pressed', String(active));
      button.textContent = active ? 'В обраному' : 'В обране';
    });
    counter.textContent = favorites.ids.size;
  };

  favorites.load();
  render();

  // Один обробник на весь список карток
  container.addEventListener('click', (event) => {
    const button = event.target.closest('.fav-btn');
    if (!button) return;
    favorites.toggle(button.closest('.card').dataset.id);
    render();
  });
}

/* ===== 4. Форма заявки: перевірка даних ===== */
const validators = {
  name(value) {
    const v = value.trim();
    if (!v) return 'Введіть імʼя та прізвище.';
    if (v.length < 2) return 'Імʼя має містити щонайменше 2 символи.';
    if (!/^[A-Za-zА-Яа-яІіЇїЄєҐґ'’ʼ\s-]+$/.test(v)) return 'Імʼя може містити лише літери, пробіл і дефіс.';
    if (v.split(/\s+/).length < 2) return 'Вкажіть імʼя та прізвище через пробіл.';
    return '';
  },
  email(value) {
    const v = value.trim();
    if (!v) return 'Введіть електронну пошту.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'Невірний формат пошти. Приклад: name@example.com.';
    return '';
  },
  insta(value) {
    const v = value.trim();
    if (!v) return 'Вкажіть акаунт Instagram.';
    if (!/^@[A-Za-z0-9._]{2,30}$/.test(v)) return 'Акаунт має починатися з @ і містити 2 до 30 латинських літер, цифр, крапок або підкреслень.';
    return '';
  },
  spec(value) {
    return value ? '' : 'Оберіть спеціалізацію зі списку.';
  },
  msg(value) {
    const v = value.trim();
    if (!v) return 'Розкажіть коротко про себе.';
    if (v.length < 20) return `Опис занадто короткий: ще мінімум ${20 - v.length} символів.`;
    return '';
  },
  agree(checked) {
    return checked ? '' : 'Потрібна згода на обробку даних.';
  }
};

function initForm() {
  const form = $('#spec-form');
  if (!form) return;

  const fields = {
    name: $('#f-name'),
    email: $('#f-email'),
    insta: $('#f-insta'),
    spec: $('#f-spec'),
    msg: $('#f-msg'),
    agree: $('#f-agree')
  };
  const success = $('#form-success');
  const counter = $('#msg-count');

  const getValue = (key) => (key === 'agree' ? fields.agree.checked : fields[key].value);

  const showError = (key, message) => {
    const field = fields[key];
    const output = $('#err-' + key);
    output.textContent = message;
    field.classList.toggle('is-invalid', Boolean(message));
    if (message) field.setAttribute('aria-invalid', 'true');
    else field.removeAttribute('aria-invalid');
  };

  const validateField = (key) => {
    const message = validators[key](getValue(key));
    showError(key, message);
    return !message;
  };

  // Перевірка поля під час введення (після першого візиту) і при втраті фокусу
  Object.keys(fields).forEach((key) => {
    const field = fields[key];
    field.addEventListener('blur', () => validateField(key));
    field.addEventListener(field.type === 'checkbox' || field.tagName === 'SELECT' ? 'change' : 'input', () => {
      if (field.classList.contains('is-invalid')) validateField(key);
    });
  });

  fields.msg.addEventListener('input', () => {
    counter.textContent = fields.msg.value.length;
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    success.hidden = true;

    const results = Object.keys(fields).map((key) => validateField(key));
    if (results.includes(false)) {
      const firstInvalid = $('.is-invalid', form);
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    const name = fields.name.value.trim();
    success.textContent = `Дякуємо, ${name}! Заявку отримано. Ми звʼяжемося з вами за адресою ${fields.email.value.trim()}.`;
    success.hidden = false;
    form.reset();
    counter.textContent = '0';
    Object.keys(fields).forEach((key) => showError(key, ''));
  });
}

/* ===== Запуск ===== */
initNavigation();
initCatalogFilter();
initFavorites();
initForm();
