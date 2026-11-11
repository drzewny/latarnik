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

const form = document.querySelector<HTMLFormElement>('[data-contact-form]');
const formStatus = form?.querySelector<HTMLElement>('[data-form-status]');
const fields = form ? [...form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea')] : [];

function errorMessage(field: HTMLInputElement | HTMLTextAreaElement): string {
  if (field.validity.valueMissing) return 'To pole jest wymagane.';
  if (field.validity.typeMismatch) return 'Podaj poprawny adres e-mail.';
  if (field.validity.tooShort) return `Wpisz co najmniej ${field.minLength} znaków.`;
  return 'Sprawdź tę wartość.';
}

function updateField(field: HTMLInputElement | HTMLTextAreaElement): void {
  const message = field.validity.valid ? '' : errorMessage(field);
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

if (form) {
  form.addEventListener('invalid', (event) => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) updateField(event.target);
  }, true);
  fields.forEach((field) => field.addEventListener('input', () => {
    if (field.hasAttribute('aria-invalid')) updateField(field);
  }));
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(form);
    if (!form.checkValidity() || !data.get('name') || !data.get('email') || !data.get('message')) return;
    if (formStatus) formStatus.textContent = 'Dane wyglądają poprawnie. To podgląd formularza — wiadomość nie została wysłana.';
  });
}
