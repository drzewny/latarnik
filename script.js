// Uzupełnij rzeczywiste dane przed publikacją. Link do kalendarza jest używany
// przez przyciski kontaktowe na wszystkich stronach.
const SITE_CONFIG = {
  calendarUrl: "",
  contactEmail: "",
};

document.querySelectorAll("[data-calendar]").forEach((link) => {
  if (SITE_CONFIG.calendarUrl) {
    link.href = SITE_CONFIG.calendarUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.removeAttribute("aria-describedby");
  } else {
    link.href = "#kontakt";
    link.setAttribute("aria-describedby", "calendar-setup-note");
  }
});

document.querySelectorAll("[data-contact-setup]").forEach((note) => {
  if (SITE_CONFIG.calendarUrl) note.hidden = true;
  else note.id = "calendar-setup-note";
});

document.querySelectorAll("[data-email]").forEach((link) => {
  if (SITE_CONFIG.contactEmail) {
    link.href = `mailto:${SITE_CONFIG.contactEmail}`;
    link.textContent = SITE_CONFIG.contactEmail;
  }
});

document.querySelectorAll("[data-year]").forEach((node) => {
  node.textContent = new Date().getFullYear();
});

const menuButton = document.querySelector(".menu-toggle");
const mainNav = document.querySelector(".main-nav");
if (menuButton && mainNav) {
  const closeMenu = (returnFocus = false) => {
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.querySelector(".sr-only").textContent = "Otwórz menu";
    mainNav.classList.remove("is-open");
    if (returnFocus) menuButton.focus();
  };
  menuButton.addEventListener("click", () => {
    const isOpen = menuButton.getAttribute("aria-expanded") === "true";
    menuButton.setAttribute("aria-expanded", String(!isOpen));
    menuButton.querySelector(".sr-only").textContent = isOpen ? "Otwórz menu" : "Zamknij menu";
    mainNav.classList.toggle("is-open", !isOpen);
  });
  mainNav.querySelectorAll("a").forEach((link) =>
    link.addEventListener("click", () => closeMenu()),
  );
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu(true);
  });
}

const faqButtons = [...document.querySelectorAll(".faq-item button[aria-controls]")];
faqButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const answer = document.getElementById(button.getAttribute("aria-controls"));
    const isOpen = button.getAttribute("aria-expanded") === "true";

    faqButtons.forEach((otherButton) => {
      const otherAnswer = document.getElementById(otherButton.getAttribute("aria-controls"));
      otherButton.setAttribute("aria-expanded", "false");
      if (otherAnswer) otherAnswer.hidden = true;
    });

    if (!isOpen && answer) {
      button.setAttribute("aria-expanded", "true");
      answer.hidden = false;
    }
  });
});

const exampleViewport = document.querySelector("[data-example-viewport]");
const exampleTrack = document.querySelector("[data-example-track]");
if (exampleViewport && exampleTrack) {
  const examples = [...exampleTrack.querySelectorAll(".workflow-example")];
  const previousButton = document.querySelector("[data-example-previous]");
  const nextButton = document.querySelector("[data-example-next]");
  const counter = document.querySelector("[data-example-count]");
  let activeExample = 0;

  const isMobileCarousel = () => window.matchMedia("(max-width: 639px)").matches;
  const renderExampleState = () => {
    if (counter) counter.textContent = `${String(activeExample + 1).padStart(2, "0")} / ${String(examples.length).padStart(2, "0")}`;
    if (previousButton) previousButton.disabled = activeExample === 0;
    if (nextButton) nextButton.disabled = activeExample === examples.length - 1;
    if (!isMobileCarousel()) exampleTrack.style.transform = `translateX(-${activeExample * 100}%)`;
  };

  const moveExample = (direction) => {
    activeExample = Math.max(0, Math.min(examples.length - 1, activeExample + direction));
    renderExampleState();
    if (isMobileCarousel()) examples[activeExample]?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
  };

  previousButton?.addEventListener("click", () => moveExample(-1));
  nextButton?.addEventListener("click", () => moveExample(1));
  exampleViewport.addEventListener("scroll", () => {
    if (!isMobileCarousel()) return;
    window.requestAnimationFrame(() => {
      const firstSlide = examples[0]?.getBoundingClientRect();
      if (!firstSlide) return;
      const distance = firstSlide.width + Number.parseFloat(getComputedStyle(exampleTrack).columnGap || "0");
      activeExample = Math.max(0, Math.min(examples.length - 1, Math.round(exampleViewport.scrollLeft / distance)));
      renderExampleState();
    });
  }, { passive: true });
  window.addEventListener("resize", renderExampleState, { passive: true });
  renderExampleState();
}

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const revealTargets = document.querySelectorAll(".home-page .reveal, .home-page .hero-visual, .home-page .final-cta");
if (revealTargets.length && !reduceMotion && "IntersectionObserver" in window) {
  document.body.classList.add("js-ready");
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -24px 0px" });
  revealTargets.forEach((target) => revealObserver.observe(target));
} else {
  revealTargets.forEach((target) => target.classList.add("is-visible"));
}
