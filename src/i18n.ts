export type Locale = 'pl' | 'en';

const englishRoutes: Record<string, string> = {
  '/': '/en/',
  '/portfolio/': '/en/portfolio/',
  '/polityka-prywatnosci/': '/en/privacy-policy/',
  '/uslugi/automatyzacja/': '/en/services/automation/',
  '/uslugi/aplikacje-na-miare/': '/en/services/custom-applications/',
  '/uslugi/ai/': '/en/services/ai-integrations/',
};

/** Input is a Polish page URL; assets, external URLs and API URLs stay shared. */
export function localizedHref(href: string, locale: Locale): string {
  if (locale === 'pl' || !href.startsWith('/') || href.startsWith('//')) return href;
  const splitAt = href.search(/[?#]/);
  const path = splitAt < 0 ? href : href.slice(0, splitAt);
  const suffix = splitAt < 0 ? '' : href.slice(splitAt);
  const normalized = path.endsWith('/') ? path : `${path}/`;
  const route = englishRoutes[normalized]
    ?? (normalized.startsWith('/uslugi/strony-internetowe/')
      ? normalized.replace('/uslugi/strony-internetowe/', '/en/services/websites/')
      : normalized.startsWith('/portfolio/') ? `/en${normalized}` : path);
  // Preserve the entire query and fragment, including when both are present.
  return route + suffix;
}

export const englishMessages = {
  'Technologia dla małych firm': 'Technology for small businesses',
  'strona główna': 'home', 'Strona główna': 'Home',
  'Usługi': 'Services', 'O mnie': 'About me', 'Kontakt': 'Contact',
  'Porozmawiajmy': 'Let’s talk', 'Przejdź do treści': 'Skip to content',
  'Otwórz menu': 'Open menu', 'Zamknij menu': 'Close menu',
  'Menu główne': 'Main navigation', 'Menu w stopce': 'Footer navigation',
  'Wybierz język': 'Choose a language',
  'Zapamiętamy Twój wybór również na kolejne wizyty.': 'We’ll remember your choice for future visits.',
  'Zobacz projekt:': 'View project:', 'Podgląd projektu': 'Preview of',
  'Strona internetowa': 'Website', 'Strony internetowe': 'Websites',
  'Automatyzacje': 'Automation', 'Aplikacja': 'Application',
  'Aplikacje': 'Applications', 'Integracje': 'Integrations', 'Wszystkie': 'All',
  'Filtruj projekty': 'Filter projects', 'Liczba projektów:': 'Number of projects:',
  'Poznaj usługi': 'Explore services', 'Dowiedz się więcej': 'Learn more',
  'Makieta aplikacji z panelem zadań i wykresami na ekranie laptopa': 'Application mockup with a task dashboard and charts on a laptop screen',
  'Portret Jakuba': 'Portrait of Jakub',
  'Dlaczego warto': 'Why work with me',
  'Zweryfikowane dane kontaktowe pojawią się tutaj przed publikacją.': 'Verified contact details will be added before publication.',
  'Strona WWW': 'Website', 'Imię i nazwisko': 'Full name', 'Adres e-mail': 'Email address',
  'O czym chcesz porozmawiać?': 'What would you like to discuss?',
  'Wyrażam zgodę na kontakt w sprawie mojego zapytania i zapoznałem/am się z': 'I agree to be contacted about my enquiry and have read the',
  'polityką prywatności': 'privacy policy',
  'Wyślij wiadomość': 'Send message', 'Wysyłanie…': 'Sending…',
  'Formularz jest chroniony przed automatycznymi zgłoszeniami.': 'This form is protected against automated submissions.',
  'Omówmy potrzeby Twojej firmy': 'Let’s discuss your business needs',
  'Wróć do formularza kontaktowego': 'Back to the contact form',
  'Ścieżka strony': 'Breadcrumbs', 'Zobacz działającą stronę': 'Visit the live website',
  'Wróć do:': 'Back to:',
  'Zaznacz zgodę, aby wysłać wiadomość.': 'Please give your consent to send the message.',
  'To pole jest wymagane.': 'This field is required.',
  'Podaj poprawny adres e-mail.': 'Enter a valid email address.',
  'Wpisz co najmniej': 'Enter at least', 'znaków.': 'characters.',
  'Sprawdź tę wartość.': 'Check this value.',
  'Nie udało się wczytać zabezpieczenia. Odśwież stronę i spróbuj ponownie.': 'The security check could not load. Refresh the page and try again.',
  'Nie udało się wczytać zabezpieczenia formularza. Sprawdź połączenie i spróbuj ponownie.': 'The form’s security check could not load. Check your connection and try again.',
  'Poczekaj na weryfikację zabezpieczenia nad przyciskiem i wyślij ponownie.': 'Wait for the security check above the button, then try sending again.',
  'Wiadomość wysłana. Odpowiem na podany adres e-mail.': 'Message sent. I’ll reply to the email address you provided.',
  'Nie udało się wysłać wiadomości. Spróbuj ponownie za chwilę.': 'Your message could not be sent. Try again shortly.',
  'Brak połączenia z serwerem. Sprawdź internet i wyślij ponownie.': 'Unable to connect to the server. Check your connection and try again.',
} as const;

export function message(text: keyof typeof englishMessages, locale: Locale): string {
  return locale === 'en' ? englishMessages[text] : text;
}
