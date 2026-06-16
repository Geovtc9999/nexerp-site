(function () {
    'use strict';

    // ---- Header scroll effect ----
    const header = document.getElementById('header');
    const onScroll = () => {
        if (window.scrollY > 10) header.classList.add('scrolled');
        else header.classList.remove('scrolled');
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // ---- Mobile menu ----
    const menuToggle = document.getElementById('menuToggle');
    const nav = document.getElementById('nav');
    if (menuToggle && nav) {
        menuToggle.addEventListener('click', () => {
            menuToggle.classList.toggle('open');
            nav.classList.toggle('open');
        });
        nav.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                menuToggle.classList.remove('open');
                nav.classList.remove('open');
            });
        });
    }

    // ---- Year in footer ----
    const yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // ---- Pre-fill "Type de besoin" from URL hash (e.g. #contact?besoin=sprint) ----
    const handleBesoinPrefill = () => {
        const hash = window.location.hash;
        const match = hash.match(/besoin=([a-z]+)/i);
        if (match) {
            const subject = document.getElementById('subject');
            if (subject) {
                const valid = Array.from(subject.options).find(o => o.value === match[1].toLowerCase());
                if (valid) subject.value = match[1].toLowerCase();
            }
        }
    };
    window.addEventListener('hashchange', handleBesoinPrefill);
    handleBesoinPrefill();

    // ---- Generic AJAX form handler ----
    const handleForm = (formEl, statusEl, endpoint, opts = {}) => {
        if (!formEl) return;
        const submitBtn = formEl.querySelector('button[type="submit"]');
        formEl.addEventListener('submit', async (e) => {
            e.preventDefault();
            statusEl.className = 'form-status';
            statusEl.textContent = '';

            const data = Object.fromEntries(new FormData(formEl).entries());

            // Honeypot
            if (data.website) {
                statusEl.className = 'form-status success';
                statusEl.textContent = opts.successMsg || 'Merci.';
                formEl.reset();
                return;
            }

            // Required fields check
            const required = opts.required || ['firstName', 'lastName', 'email', 'rgpd'];
            for (const f of required) {
                if (!data[f]) {
                    statusEl.className = 'form-status error';
                    statusEl.textContent = 'Merci de remplir tous les champs obligatoires.';
                    return;
                }
            }

            // Email validation
            const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRx.test(data.email)) {
                statusEl.className = 'form-status error';
                statusEl.textContent = 'Adresse email invalide.';
                return;
            }

            submitBtn.disabled = true;
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Envoi en cours…';

            try {
                const res = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                });
                const json = await res.json().catch(() => ({}));
                if (!res.ok || !json.ok) {
                    throw new Error(json.error || 'Erreur lors de l\'envoi.');
                }
                statusEl.className = 'form-status success';
                statusEl.textContent = opts.successMsg || 'Merci, votre message a bien été envoyé.';
                formEl.reset();
            } catch (err) {
                statusEl.className = 'form-status error';
                statusEl.textContent = err.message || 'Une erreur est survenue. Vous pouvez nous écrire à contact@nexerp.fr.';
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        });
    };

    // Contact form
    handleForm(
        document.getElementById('contactForm'),
        document.getElementById('formStatus'),
        '/api/contact',
        {
            required: ['firstName', 'lastName', 'email', 'company', 'role', 'domain', 'problem', 'subject', 'message', 'rgpd'],
            successMsg: 'Merci, votre demande est reçue. Un co-fondateur vous répondra sous 48h ouvrées.',
        }
    );

    // Lead magnet form
    handleForm(
        document.getElementById('leadMagnetForm'),
        document.getElementById('lmStatus'),
        '/api/lead-magnet',
        {
            required: ['firstName', 'lastName', 'email', 'company', 'rgpd'],
            successMsg: 'Merci ! Vous recevez la checklist par email sous quelques minutes.',
        }
    );

    // ---- Animation on scroll (reveal) ----
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('in-view');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });

    document.querySelectorAll('.problem-card, .step, .phase-card, .offer-card, .usecase-card, .domain-card, .pillar, .gov-card, .roi-card, .founder-card, .pub-card')
        .forEach(el => observer.observe(el));
})();
