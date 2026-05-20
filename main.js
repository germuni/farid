/* ══════════════════════════════════════════
   FARID — main.js
   ══════════════════════════════════════════ */

// ── Nav scroll behavior ──────────────────
const nav = document.getElementById('nav');

window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 60);
}, { passive: true });

// ── Hamburger / Mobile menu ──────────────
const hamburger   = document.getElementById('hamburger');
const mobileMenu  = document.getElementById('mobileMenu');
const mobileLinks = document.querySelectorAll('.mobile-link');

hamburger.addEventListener('click', () => {
  const isOpen = mobileMenu.classList.toggle('open');
  hamburger.classList.toggle('active', isOpen);
  mobileMenu.setAttribute('aria-hidden', String(!isOpen));
  document.body.style.overflow = isOpen ? 'hidden' : '';
});

mobileLinks.forEach(link => {
  link.addEventListener('click', () => {
    mobileMenu.classList.remove('open');
    hamburger.classList.remove('active');
    mobileMenu.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  });
});

// ── Scroll reveal (IntersectionObserver) ─
const revealEls = document.querySelectorAll('.reveal');

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, {
  threshold: 0.08,
  rootMargin: '0px 0px -40px 0px'
});

revealEls.forEach(el => revealObserver.observe(el));

// ── Hero parallax ────────────────────────
const heroBg = document.getElementById('heroBg');

if (heroBg && window.matchMedia('(prefers-reduced-motion: no-preference)').matches) {
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (y < window.innerHeight * 1.2) {
      heroBg.style.transform = `translateY(${y * 0.38}px)`;
    }
  }, { passive: true });
}

// ── Smooth anchor links ──────────────────
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', e => {
    const target = document.querySelector(anchor.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    const offset = nav.offsetHeight;
    const top = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
  });
});

// ══════════════════════════════════════════
// CARTA TABS
// ══════════════════════════════════════════
const tabBtns   = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');

tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.tab;

    tabBtns.forEach(b => b.classList.remove('active'));
    tabPanels.forEach(p => p.classList.remove('active'));

    btn.classList.add('active');
    const panel = document.getElementById('tab-' + target);
    if (panel) panel.classList.add('active');
  });
});

// ══════════════════════════════════════════
// GALLERY LIGHTBOX
// ══════════════════════════════════════════
const galleryItems = Array.from(document.querySelectorAll('.gallery-item img'));
let currentIndex = 0;

// Build lightbox DOM
const lightbox = document.createElement('div');
lightbox.className = 'lightbox';
lightbox.setAttribute('role', 'dialog');
lightbox.setAttribute('aria-modal', 'true');
lightbox.setAttribute('aria-label', 'Visor de imagen');
lightbox.innerHTML = `
  <button class="lb-close" aria-label="Cerrar">&times;</button>
  <button class="lb-prev" aria-label="Anterior">&#8592;</button>
  <div class="lb-img-wrap">
    <img class="lb-img" src="" alt="">
    <div class="lb-counter"></div>
  </div>
  <button class="lb-next" aria-label="Siguiente">&#8594;</button>
`;
document.body.appendChild(lightbox);

const lbImg     = lightbox.querySelector('.lb-img');
const lbCounter = lightbox.querySelector('.lb-counter');
const lbClose   = lightbox.querySelector('.lb-close');
const lbPrev    = lightbox.querySelector('.lb-prev');
const lbNext    = lightbox.querySelector('.lb-next');

function openLightbox(index) {
  currentIndex = (index + galleryItems.length) % galleryItems.length;
  const src = galleryItems[currentIndex].src;
  lbImg.src = src;
  lbImg.alt = galleryItems[currentIndex].alt;
  lbCounter.textContent = `${currentIndex + 1} / ${galleryItems.length}`;
  lightbox.classList.add('open');
  document.body.style.overflow = 'hidden';
  lbClose.focus();
}

function closeLightbox() {
  lightbox.classList.remove('open');
  document.body.style.overflow = '';
}

function navigate(dir) {
  currentIndex = (currentIndex + dir + galleryItems.length) % galleryItems.length;
  lbImg.style.opacity = '0';
  setTimeout(() => {
    lbImg.src = galleryItems[currentIndex].src;
    lbImg.alt = galleryItems[currentIndex].alt;
    lbCounter.textContent = `${currentIndex + 1} / ${galleryItems.length}`;
    lbImg.style.opacity = '1';
  }, 180);
}

galleryItems.forEach((img, i) => {
  img.parentElement.style.cursor = 'pointer';
  img.parentElement.addEventListener('click', () => openLightbox(i));
});

lbClose.addEventListener('click', closeLightbox);
lbPrev.addEventListener('click', () => navigate(-1));
lbNext.addEventListener('click', () => navigate(1));

lightbox.addEventListener('click', e => {
  if (e.target === lightbox) closeLightbox();
});

document.addEventListener('keydown', e => {
  if (!lightbox.classList.contains('open')) return;
  if (e.key === 'Escape')       closeLightbox();
  if (e.key === 'ArrowLeft')    navigate(-1);
  if (e.key === 'ArrowRight')   navigate(1);
});

// Touch/swipe support for lightbox
let touchStartX = 0;
lightbox.addEventListener('touchstart', e => {
  touchStartX = e.touches[0].clientX;
}, { passive: true });

lightbox.addEventListener('touchend', e => {
  const dx = e.changedTouches[0].clientX - touchStartX;
  if (Math.abs(dx) > 50) navigate(dx < 0 ? 1 : -1);
}, { passive: true });

// ══════════════════════════════════════════
// FLOATING BUTTONS (WhatsApp + Reservar)
// ══════════════════════════════════════════
const floatGroup = document.createElement('div');
floatGroup.className = 'float-group';

const floatWa = document.createElement('a');
floatWa.className   = 'float-btn float-btn-wa';
floatWa.href        = 'https://api.whatsapp.com/send/?phone=%2B19894613643&text&type=phone_number&app_absent=0';
floatWa.target      = '_blank';
floatWa.rel         = 'noopener';
floatWa.setAttribute('aria-label', 'Escribinos por WhatsApp');
floatWa.innerHTML   = `
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
  <span>WhatsApp</span>
`;

const floatReservar = document.createElement('a');
floatReservar.className   = 'float-btn float-btn-reservar';
floatReservar.href        = 'https://monline.com.ar/FaridReservas';
floatReservar.target      = '_blank';
floatReservar.rel         = 'noopener';
floatReservar.setAttribute('aria-label', 'Reservar mesa');
floatReservar.innerHTML   = `
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
  <span>Reservar</span>
`;

floatGroup.appendChild(floatWa);
floatGroup.appendChild(floatReservar);
document.body.appendChild(floatGroup);

// Show buttons only after hero scrolls out of view
const floatObserver = new IntersectionObserver(([entry]) => {
  floatGroup.classList.toggle('visible', !entry.isIntersecting);
}, { threshold: 0.1 });

floatObserver.observe(document.getElementById('hero'));
