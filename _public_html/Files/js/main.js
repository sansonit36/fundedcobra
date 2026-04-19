(function () {
    ['payouttrackleft', 'payouttrackright', 'payouttrackrecent'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML += el.innerHTML;
    });

    const iB = document.querySelector('.interviewbox');
    let currentIndex = 0, autoCycleInterval = 0;

    const getPointers = () => iB ? iB.querySelectorAll('.pointer') : [];

    const updateSlider = (index) => {
        if (!iB) return;
        const track = iB.querySelector('.interview-track');
        const pointers = getPointers();
        const len = pointers.length;
        if (!len) return;
        if (index >= len) index = 0;
        if (index < 0) index = len - 1;
        currentIndex = index;
        const active = iB.querySelector('.pointer.active');
        if (active) active.classList.remove('active');
        pointers[currentIndex].classList.add('active');
        if (track) track.style.transform = `translate3d(-${currentIndex * 100}%,0,0)`;
        const playing = iB.querySelectorAll('.videobox.playing');
        for (let i = 0; i < playing.length; i++) {
            playing[i].classList.remove('playing');
            const f = playing[i].querySelector('iframe');
            if (f) f.src = '';
        }
    };

    const startAutoCycle = () => {
        if (!iB) return;
        clearInterval(autoCycleInterval);
        autoCycleInterval = setInterval(() => {
            if (!iB.querySelector('.videobox.playing')) updateSlider(currentIndex + 1);
        }, 3000);
    };

    if (iB) {
        let startX = 0;
        iB.addEventListener('touchstart', e => {
            startX = e.changedTouches[0].screenX;
            clearInterval(autoCycleInterval);
        }, { passive: true });

        iB.addEventListener('touchend', e => {
            const diff = startX - e.changedTouches[0].screenX;
            if (Math.abs(diff) > 0.1 * window.innerWidth) updateSlider(diff > 0 ? currentIndex + 1 : currentIndex - 1);
            startAutoCycle();
        }, { passive: true });

        startAutoCycle();
    }

    document.addEventListener('click', e => {
        const t = e.target;
        
        // Intercom Custom Button Trigger
        if(t.closest('.intercomchat')) {
            e.preventDefault();
            if (window.Intercom) { 
                window.Intercom('show'); 
            } else if (window.loadIntercom) { 
                window.loadIntercom(function() { window.Intercom('show'); }); 
            }
            return;
        }

        const vBox = t.closest('.videobox');
        if (vBox && !vBox.classList.contains('playing')) {
            clearInterval(autoCycleInterval);
            vBox.classList.add('playing');
            const f = vBox.querySelector('iframe');
            const s = f && f.getAttribute('data-src');
            if (s) f.src = s + (s.includes('?') ? '&' : '?') + 'autoplay=1';
            return;
        }

        if (iB) {
            const pointer = t.closest('.pointer');
            const next = t.closest('.nextarrow');
            const prev = t.closest('.prevarrow');
            if (pointer || next || prev) {
                if (pointer) {
                    const pointers = getPointers();
                    for (let i = 0; i < pointers.length; i++) {
                        if (pointers[i] === pointer) {
                            updateSlider(i);
                            break;
                        }
                    }
                } else {
                    updateSlider(next ? currentIndex + 1 : currentIndex - 1);
                }
                startAutoCycle();
                return;
            }
        }

        const faq = t.closest('.faqbox');
        if (faq) {
            faq.classList.toggle('active');
            return;
        }

        const btn = t.closest('.copybtn');
        if (btn) {
            const valEl = btn.parentElement.querySelector('.value');
            if (!valEl) return;
            const code = valEl.innerText;
            if (navigator.clipboard) {
                navigator.clipboard.writeText(code);
            } else {
                const ta = document.createElement('textarea');
                ta.value = code;
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
            }
            const old = btn.innerText;
            btn.innerText = 'Copied!';
            setTimeout(() => btn.innerText = old, 2000);
            return;
        }

        const pLink = t.closest('.program, .producttypes a');
        if (pLink) {
            e.preventDefault();
            const id = pLink.getAttribute('rel');
            if (!id) return;
            const link = document.querySelector(`.program[rel="${id}"]`);
            const cont = document.getElementById(id);
            if (!link || !cont) return;
            const activeEls = document.querySelectorAll('.program.active, .productscroll.active');
            for (let i = 0; i < activeEls.length; i++) activeEls[i].classList.remove('active');
            link.classList.add('active');
            cont.classList.add('active');
            if (pLink.closest('.producttypes')) {
                const sec = document.getElementById('challengetypes');
                if (sec) window.scrollTo({ top: sec.offsetTop - 100, behavior: 'smooth' });
            }
        }
    });

    const aS = document.getElementById('calcaccount');
    const rS = document.getElementById('calcrate');
    if (aS && rS) {
        const aD = document.getElementById('calcaccountdisplay');
        const rD = document.getElementById('calcratedisplay');
        const resD = document.getElementById('calcresult');
        const vals = [10000, 25000, 50000, 100000, 200000];

        const update = () => {
            const size = vals[aS.value] || 0;
            const rate = +rS.value;
            aS.style.setProperty('--percent', (aS.value / aS.max * 100) + '%');
            rS.style.setProperty('--percent', ((rate - rS.min) / (rS.max - rS.min) * 100) + '%');
            if (aD) aD.textContent = `$${size.toLocaleString()}`;
            if (rD) rD.textContent = `${rate}%`;
            if (resD) resD.textContent = `$${(size * rate / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        };

        aS.addEventListener('input', update);
        rS.addEventListener('input', update);
        update();
    }

    const params = new URLSearchParams(location.search);
    const pre = params.get('predefined') || sessionStorage.getItem('user_predefined');
    const prm = params.get('promo') || sessionStorage.getItem('user_promo');
    if (pre) sessionStorage.setItem('user_predefined', pre);
    if (prm) sessionStorage.setItem('user_promo', prm);

    if (pre || prm) {
        document.querySelectorAll('a[href*="app.fundingtraders.com/checkout"], a[href*="app.fundingtraders.com/express_checkout"]').forEach(l => {
            const url = new URL(l.href, location.origin);
            if (pre && !url.searchParams.has('predefined')) url.searchParams.set('predefined', pre);
            if (prm && l.href.includes('express_checkout') && !url.searchParams.has('promo')) url.searchParams.set('promo', prm);
            l.href = url.toString();
        });
    }

    window.addEventListener('beforeunload', () => clearInterval(autoCycleInterval));
})();