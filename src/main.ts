import './styles.css';
import './portfolio.css';
import { isPortfolioFilter, type PortfolioFilter } from './portfolio-config';

const portfolio = document.querySelector<HTMLElement>('[data-portfolio]');
if (portfolio) {
  const filters = [...portfolio.querySelectorAll<HTMLButtonElement>('[data-portfolio-filter]')];
  const projects = [...portfolio.querySelectorAll<HTMLElement>('[data-project-category]')];
  const empty = portfolio.querySelector<HTMLElement>('[data-portfolio-empty]');
  const status = portfolio.querySelector<HTMLElement>('[data-portfolio-status]');
  const filterScroller = portfolio.querySelector<HTMLElement>('.pf-filter-container');

  function applyPortfolioFilter(category: PortfolioFilter, animate = false): void {
    let visible = 0;
    for (const project of projects) {
      project.hidden = category !== 'all' && project.dataset.projectCategory !== category;
      project.classList.remove('is-filter-result');
      if (!project.hidden) {
        visible++;
        if (animate) project.classList.add('is-filter-result');
      }
    }
    for (const filter of filters) filter.setAttribute('aria-pressed', String(filter.dataset.portfolioFilter === category));
    const activeFilter = filters.find((filter) => filter.dataset.portfolioFilter === category);
    if (filterScroller && activeFilter && filterScroller.scrollWidth > filterScroller.clientWidth) {
      const left = activeFilter.getBoundingClientRect().left - filterScroller.getBoundingClientRect().left + filterScroller.scrollLeft;
      filterScroller.scrollLeft = left - (filterScroller.clientWidth - activeFilter.offsetWidth) / 2;
    }
    if (empty) empty.hidden = visible > 0;
    if (status) {
      const label = filters.find((filter) => filter.dataset.portfolioFilter === category)?.textContent;
      status.textContent = `${label}. Liczba projektów: ${visible}.`;
    }
  }

  function readPortfolioFilter(): void {
    const category = new URL(window.location.href).searchParams.get('category');
    applyPortfolioFilter(isPortfolioFilter(category) ? category : 'all');
  }

  function selectPortfolioFilter(category: PortfolioFilter): void {
    const url = new URL(window.location.href);
    if (category === 'all') url.searchParams.delete('category');
    else url.searchParams.set('category', category);
    if (url.href !== window.location.href) window.history.pushState(null, '', url);
    applyPortfolioFilter(category, true);
  }

  for (const filter of filters) filter.addEventListener('click', () => {
    const category = filter.dataset.portfolioFilter ?? null;
    if (isPortfolioFilter(category)) selectPortfolioFilter(category);
  });
  portfolio.querySelector('[data-portfolio-reset]')?.addEventListener('click', () => {
    selectPortfolioFilter('all');
    filters[0]?.focus({ preventScroll: true });
  });
  readPortfolioFilter();
  window.addEventListener('popstate', readPortfolioFilter);
}

const header = document.querySelector<HTMLElement>('[data-header]');
const menuButton = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
const nav = document.querySelector<HTMLElement>('[data-site-nav]');
const mobile = window.matchMedia('(max-width: 767px)');

function syncHeader(): void {
  header?.classList.toggle('is-scrolled', window.scrollY > 20);
}

function closeMenu(returnFocus = false): void {
  if (!menuButton || !nav) return;
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', 'Otwórz menu');
  document.body.classList.remove('menu-open');
  nav.inert = mobile.matches;
  if (returnFocus) menuButton.focus();
}

function openMenu(): void {
  if (!menuButton || !nav) return;
  menuButton.setAttribute('aria-expanded', 'true');
  menuButton.setAttribute('aria-label', 'Zamknij menu');
  document.body.classList.add('menu-open');
  nav.inert = false;
  nav.querySelector<HTMLAnchorElement>('a')?.focus();
}

syncHeader();
window.addEventListener('scroll', syncHeader, { passive: true });
if (menuButton && nav) {
  nav.inert = mobile.matches;
  menuButton.addEventListener('click', () => {
    if (menuButton.getAttribute('aria-expanded') === 'true') closeMenu(true);
    else openMenu();
  });
  nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => closeMenu()));
  mobile.addEventListener('change', () => closeMenu());
  document.addEventListener('keydown', (event) => {
    if (!mobile.matches || menuButton.getAttribute('aria-expanded') !== 'true') return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu(true);
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = [menuButton, ...nav.querySelectorAll<HTMLAnchorElement>('a')];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  });
}

type TurnstileOptions = {
  sitekey: string;
  action?: string;
  language?: string;
  theme?: 'light' | 'dark' | 'auto';
  size?: 'normal' | 'flexible' | 'compact';
  callback?: (token: string) => void;
  'expired-callback'?: () => void;
  'error-callback'?: () => void;
};
type Turnstile = {
  render: (container: HTMLElement, options: TurnstileOptions) => string | undefined;
  reset: (widgetId?: string) => void;
  getResponse: (widgetId?: string) => string | undefined;
};
declare global {
  interface Window { turnstile?: Turnstile }
}

type FormField = HTMLInputElement | HTMLTextAreaElement;
type ContactResponse = { ok: boolean; error?: string; fields?: Record<string, string> };

const form = document.querySelector<HTMLFormElement>('[data-contact-form]');
const formStatus = form?.querySelector<HTMLElement>('[data-form-status]');
const submitButton = form?.querySelector<HTMLButtonElement>('[data-form-submit]');
const submitLabel = form?.querySelector<HTMLElement>('[data-submit-label]');
const turnstileContainer = form?.querySelector<HTMLElement>('[data-turnstile]');
const fields = form ? [...form.querySelectorAll<FormField>('.field input, .field textarea, .form-consent input')] : [];
const turnstileScriptUrl = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let turnstileWidgetId: string | undefined;
let turnstileLoading: Promise<void> | undefined;

function errorMessage(field: FormField): string {
  if (field.validity.valueMissing) return field.type === 'checkbox' ? 'Zaznacz zgodę, aby wysłać wiadomość.' : 'To pole jest wymagane.';
  if (field.validity.typeMismatch) return 'Podaj poprawny adres e-mail.';
  if (field.validity.tooShort) return `Wpisz co najmniej ${field.minLength} znaków.`;
  return 'Sprawdź tę wartość.';
}

function showFieldError(field: FormField, message: string): void {
  const error = form?.querySelector<HTMLElement>(`[data-error-for="${field.name}"]`);
  if (error) error.textContent = message;
  if (message) {
    field.setAttribute('aria-invalid', 'true');
    field.setAttribute('aria-describedby', `${field.name}-error`);
  } else {
    field.removeAttribute('aria-invalid');
    field.removeAttribute('aria-describedby');
  }
}

function updateField(field: FormField): void {
  showFieldError(field, field.validity.valid ? '' : errorMessage(field));
}

function setStatus(message: string, state: 'info' | 'success' | 'error' = 'info'): void {
  if (!formStatus) return;
  formStatus.textContent = message;
  formStatus.dataset.state = state;
}

function setSending(sending: boolean): void {
  if (submitButton) submitButton.disabled = sending;
  if (submitLabel) submitLabel.textContent = sending ? 'Wysyłanie…' : 'Wyślij wiadomość';
  form?.setAttribute('aria-busy', String(sending));
}

function renderTurnstile(): void {
  const sitekey = form?.dataset.turnstileSitekey;
  if (!window.turnstile || !turnstileContainer || !sitekey || turnstileWidgetId !== undefined) return;
  turnstileWidgetId = window.turnstile.render(turnstileContainer, {
    sitekey,
    action: 'contact',
    language: 'pl',
    theme: 'light',
    // Tryb flexible wymaga co najmniej 300 px; na najwęższych ekranach używamy kompaktowego widżetu.
    size: turnstileContainer.clientWidth < 300 ? 'compact' : 'flexible',
    'error-callback': () => setStatus('Nie udało się wczytać zabezpieczenia. Odśwież stronę i spróbuj ponownie.', 'error'),
  });
}

// Skrypt Turnstile ładujemy dopiero, gdy formularz zbliża się do ekranu, żeby nie spowalniać strony głównej.
function loadTurnstile(): Promise<void> {
  if (window.turnstile) {
    renderTurnstile();
    return Promise.resolve();
  }
  turnstileLoading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = turnstileScriptUrl;
    script.async = true;
    script.addEventListener('load', () => {
      renderTurnstile();
      resolve();
    });
    script.addEventListener('error', () => {
      turnstileLoading = undefined;
      script.remove();
      reject(new Error('Turnstile script failed to load'));
    });
    document.head.append(script);
  });
  return turnstileLoading;
}

function resetTurnstile(): void {
  if (window.turnstile && turnstileWidgetId !== undefined) window.turnstile.reset(turnstileWidgetId);
}

async function submitContactForm(contactForm: HTMLFormElement): Promise<void> {
  try {
    await loadTurnstile();
  } catch {
    setStatus('Nie udało się wczytać zabezpieczenia formularza. Sprawdź połączenie i spróbuj ponownie.', 'error');
    return;
  }

  const token = window.turnstile?.getResponse(turnstileWidgetId);
  if (!token) {
    setStatus('Poczekaj na weryfikację zabezpieczenia nad przyciskiem i wyślij ponownie.', 'error');
    return;
  }

  const data = new FormData(contactForm);
  data.set('cf-turnstile-response', token);

  setSending(true);
  setStatus('');
  try {
    const response = await fetch(contactForm.action, {
      method: 'POST',
      body: data,
      headers: { Accept: 'application/json' },
    });
    const result = (await response.json().catch(() => ({ ok: false }))) as ContactResponse;

    if (response.ok && result.ok) {
      contactForm.reset();
      fields.forEach((field) => showFieldError(field, ''));
      setStatus('Wiadomość wysłana. Odpowiem na podany adres e-mail.', 'success');
      return;
    }

    for (const field of fields) {
      const message = result.fields?.[field.name];
      if (message) showFieldError(field, message);
    }
    const firstInvalid = fields.find((field) => field.hasAttribute('aria-invalid'));
    firstInvalid?.focus();
    setStatus(result.error ?? 'Nie udało się wysłać wiadomości. Spróbuj ponownie za chwilę.', 'error');
  } catch {
    setStatus('Brak połączenia z serwerem. Sprawdź internet i wyślij ponownie.', 'error');
  } finally {
    setSending(false);
    resetTurnstile();
  }
}

if (form) {
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        loadTurnstile().catch(() => undefined);
      }
    }, { rootMargin: '400px 0px' });
    observer.observe(form);
  } else {
    loadTurnstile().catch(() => undefined);
  }
  form.addEventListener('focusin', () => { loadTurnstile().catch(() => undefined); }, { once: true });

  form.addEventListener('invalid', (event) => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) updateField(event.target);
  }, true);
  fields.forEach((field) => field.addEventListener('input', () => {
    if (field.hasAttribute('aria-invalid')) updateField(field);
  }));
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (form.getAttribute('aria-busy') === 'true') return;
    if (!form.checkValidity()) return;
    void submitContactForm(form);
  });
}
