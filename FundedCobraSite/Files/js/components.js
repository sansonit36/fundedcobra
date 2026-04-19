document.addEventListener("DOMContentLoaded", function() {
    // 1. Detect Path Prefix (adjusts for Files/pages/ depth)
    const isSubPage = window.location.pathname.includes('/Files/pages/') || 
                      (window.location.pathname.split('/').length > 2 && !window.location.pathname.includes('index.html'));
    const prefix = isSubPage ? '../../' : './';
    const rootPath = isSubPage ? '../../' : '';

    // 2. HEADER COMPONENT
    const headerHTML = `
        <div id="headerpromo">
            <p><a href="https://account.fundedcobra.com/">🚀 Half the Price: Code <strong>GROWING50</strong> → <strong>50% OFF</strong> Your First Instant Account.</a></p>
            <span id="headerpromoclose">×</span>
        </div>
        <div id="headerwrapper">
            <div class="logo">
                <a href="${rootPath}index.html" title="FundedCobra">
                    <img alt="FundedCobra Logo" fetchpriority="high" src="${rootPath}logo.png"/>
                </a>
                <button aria-label="Menu Button" id="menubutton"></button>
            </div>
            <nav id="topmenu">
                <ul>
                    <li><a class="navmain navhome" href="${rootPath}index.html">Home</a></li>
                    <li><a class="navmain" href="${rootPath}accounts">Accounts</a></li>
                    <li><a class="navmain" href="${rootPath}reviews">Reviews</a></li>
                    <li><a class="navmain" href="${rootPath}about">About Us</a></li>
                    <li><a class="navmain" href="${rootPath}faq">FAQ</a></li>
                    <li><a class="navmain" href="${rootPath}rules">Rules</a></li>
                </ul>
            </nav>
            <div class="headeractions">
                <a href="https://account.fundedcobra.com/">Log In</a>
                <a class="cta" href="https://account.fundedcobra.com/">Sign Up</a>
            </div>
        </div>
    `;

    // 3. FOOTER COMPONENT
    const footerHTML = `
        <div id="footerwrapper">
            <div class="logo">
                <a href="${rootPath}index.html"><img alt="FundedCobra Logo" class="footerlogo" src="${rootPath}logo.png"/></a>
                <h3>Funding Successful Traders world wide</h3>
                <div class="sociallinks">
                    <ul>
                        <li><a href="https://instagram.com/fundedcobra" target="_NEW"></a></li>
                        <li><a href="https://discord.gg/fundedcobra" target="_NEW"></a></li>
                        <li><a href="https://www.youtube.com/@FundedCobra" target="_NEW"></a></li>
                        <li><a href="https://www.facebook.com/fundedcobra" target="_NEW"></a></li>
                    </ul>
                </div>
            </div>
            <div class="footerlinks">
                <div class="footercol">
                    <h3>Company</h3>
                    <ul>
                        <li><a href="${rootPath}index.html">Home</a></li>
                        <li><a href="${rootPath}accounts">Accounts</a></li>
                        <li><a href="${rootPath}reviews">Reviews</a></li>
                        <li><a href="${rootPath}about">About Us</a></li>
                    </ul>
                </div>
                <div class="footercol">
                    <h3>Legal</h3>
                    <ul>
                        <li><a href="${rootPath}terms">Terms of Service</a></li>
                        <li><a href="${rootPath}privacy">Privacy Policy</a></li>
                        <li><a href="${rootPath}disclosure">Risk Disclosure</a></li>
                        <li><a href="${rootPath}compliance">Compliance</a></li>
                    </ul>
                </div>
            </div>
        </div>
        <div class="footerdisclaimer">
            <p>Margin trading involves a high level of risk... [Full Disclaimer text would go here]</p>
            <p>© 2026 FundedCobra. All Rights Reserved.</p>
        </div>
    `;

    // Inject if elements exist
    const headerElem = document.querySelector('header');
    if (headerElem) headerElem.innerHTML = headerHTML;

    const footerElem = document.querySelector('footer');
    if (footerElem) footerElem.innerHTML = footerHTML;
    
    // Re-initialize menu toggle (logic from main.js)
    const menuBtn = document.getElementById('menubutton');
    if(menuBtn) {
        menuBtn.addEventListener('click', () => document.body.classList.toggle('menuopen'));
    }
});
