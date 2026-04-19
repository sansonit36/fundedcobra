import os
import glob
import re

HEADER_PARTIAL = """
<header>
    <div id="headerpromo">
        <p><a href="https://account.fundedcobra.com/">🚀 Half the Price: Code <strong>GROWING50</strong> → <strong>50% OFF</strong> Your First Instant Account.</a></p>
        <span id="headerpromoclose">×</span>
    </div>
    <div id="headerwrapper">
        <div class="logo">
            <a href="{root}index.html" title="FundedCobra">
                <img alt="FundedCobra Logo" fetchpriority="high" src="{root}logo.png"/>
            </a>
            <button aria-label="Menu Button" id="menubutton"></button>
        </div>
        <nav id="topmenu">
            <ul>
                <li><a class="navmain navhome" href="{root}index.html">Home</a></li>
                <li><a class="navmain" href="{root}accounts">Accounts</a></li>
                <li><a class="navmain" href="{root}reviews">Reviews</a></li>
                <li><a class="navmain" href="{root}about">About Us</a></li>
                <li><a class="navmain" href="{root}faq">FAQ</a></li>
                <li><a class="navmain" href="{root}rules">Rules</a></li>
            </ul>
        </nav>
        <div class="headeractions">
            <a href="https://account.fundedcobra.com/">Log In</a>
            <a class="cta" href="https://account.fundedcobra.com/">Sign Up</a>
        </div>
    </div>
</header>
"""

FOOTER_PARTIAL = """
<footer>
    <div id="footerwrapper">
        <div class="logo">
            <a href="{root}index.html"><img alt="FundedCobra Logo" class="footerlogo" src="{root}logo.png"/></a>
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
                    <li><a href="{root}index.html">Home</a></li>
                    <li><a href="{root}accounts">Accounts</a></li>
                    <li><a href="{root}reviews">Reviews</a></li>
                    <li><a href="{root}about">About Us</a></li>
                </ul>
            </div>
            <div class="footercol">
                <h3>Legal</h3>
                <ul>
                    <li><a href="{root}terms">Terms of Service</a></li>
                    <li><a href="{root}privacy">Privacy Policy</a></li>
                    <li><a href="{root}disclosure">Risk Disclosure</a></li>
                    <li><a href="{root}compliance">Compliance</a></li>
                </ul>
            </div>
        </div>
    </div>
    <div class="footerdisclaimer">
        <p>© 2026 FundedCobra. All Rights Reserved.</p>
    </div>
</footer>
"""

def sync_site():
    base_dir = "FundedCobraSite"
    html_files = glob.glob(os.path.join(base_dir, "**/*.html"), recursive=True)
    
    for file_path in html_files:
        # Determine depth
        depth = file_path.replace(base_dir, "").count(os.sep)
        # depth 1 = root (index.html), depth 3 = Files/pages/rules.html (e.g. /Files/pages/rules.html)
        # Wait, if it's Files/pages/rules.html, depth is 2 or 3 depending on how count handles leading slash.
        # Let's count separators from the relative path.
        rel_path = os.path.relpath(file_path, base_dir)
        rel_depth = rel_path.count(os.sep)
        root_prefix = "../" * rel_depth
        
        with open(file_path, "r") as f:
            content = f.read()

        # Update Header
        header_text = HEADER_PARTIAL.replace("{root}", root_prefix)
        content = re.sub(r"<header>.*?</header>", header_text, content, flags=re.DOTALL)

        # Update Footer
        footer_text = FOOTER_PARTIAL.replace("{root}", root_prefix)
        content = re.sub(r"<footer>.*?</footer>", footer_text, content, flags=re.DOTALL)

        with open(file_path, "w") as f:
            f.write(content)
        print(f"Synced {file_path} (Depth: {rel_depth})")

if __name__ == "__main__":
    sync_site()
