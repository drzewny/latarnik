import { localizedHref, type Locale } from './i18n';

export const portfolioCategories = [
  { value: 'all', label: 'Wszystkie' },
  { value: 'website', label: 'Strony internetowe' },
  { value: 'automation', label: 'Automatyzacje' },
  { value: 'web-app', label: 'Aplikacje' },
  { value: 'integration', label: 'Integracje' },
] as const;

export type PortfolioFilter = typeof portfolioCategories[number]['value'];
export type PortfolioCategory = Exclude<PortfolioFilter, 'all'>;

export function isPortfolioFilter(value: string | null): value is PortfolioFilter {
  return portfolioCategories.some((category) => category.value === value);
}

export const servicePortfolioCategories: Record<string, PortfolioCategory> = {
  'strony-internetowe': 'website',
  'aplikacje-na-miare': 'web-app',
  automatyzacja: 'automation',
  ai: 'integration',
};

export function portfolioHref(category: PortfolioCategory, locale: Locale = 'pl'): string {
  return localizedHref(`/portfolio/?category=${category}#projekty`, locale);
}
