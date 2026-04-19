import os
import glob
import re

# SEO MAPPING: Page Filename -> {Title, Description}
SEO_DATA = {
    "index.html": {
        "title": "FundedCobra | Best Instant Funded Accounts & Prop Firm Programs",
        "description": "Start trading with a FundedCobra instant funded account. Skip evaluations, trade up to $200k in real capital, and keep up to 90% of profits. Top-rated prop firm for forex traders."
    },
    "rules.html": {
        "title": "Prop Firm Trading Rules | FundedCobra Instant Funding Conditions",
        "description": "Transparent and fair trading rules for FundedCobra prop accounts. Learn about our 8% daily drawdown, 12% max drawdown, and no-evaluation instant funding process."
    },
    "accounts.html": {
        "title": "Instant Funded Trading Accounts | Choose Your Funding Size",
        "description": "Compare FundedCobra's instant funded account types. From $10K to $100K+ instant capital available. No challenges, just trade and get paid."
    },
    "about.html": {
        "title": "About FundedCobra | The Trader's Private Bank Prop Firm",
        "description": "Learn about FundedCobra, the professional prop trading firm built by traders for traders. We provide real capital, fast payouts, and 24/7 human support."
    },
    "faq-page.html": {
        "title": "FundedCobra Help Center | Prop Firm FAQ & Support",
        "description": "Got questions about funded accounts, payouts, or rules? Find everything you need in the FundedCobra FAQ. 24/7 support for our global community of traders."
    }
    # Add more as needed
}

DEFAULT_TITLE = "FundedCobra - High-Growth Instant Funded Accounts for Traders"
DEFAULT_DESC = "Get funded to trade forex with FundedCobra. Professional prop firm with simple rules, fast payouts, and real capital."

def sync_seo():
    base_dir = "FundedCobraSite"
    html_files = glob.glob(os.path.join(base_dir, "**/*.html"), recursive=True)
    
    for file_path in html_files:
        filename = os.path.basename(file_path)
        seo = SEO_DATA.get(filename, {"title": DEFAULT_TITLE, "description": DEFAULT_DESC})
        
        rel_path = os.path.relpath(file_path, base_dir)
        clean_url = "https://fundedcobra.com/" + rel_path.replace("Files/pages/", "").replace(".html", "")
        if "index" in clean_url: clean_url = "https://fundedcobra.com/"

        with open(file_path, "r") as f:
            content = f.read()

        # 1. Update Title
        content = re.sub(r"<title>.*?</title>", f"<title>{seo['title']}</title>", content)
        
        # 2. Update Description
        content = re.sub(r'<meta content=".*?" name="description"/>', f'<meta name="description" content="{seo["description"]}">', content)
        
        # 3. Add/Update Canonical
        canonical_tag = f'<link rel="canonical" href="{clean_url}" />'
        if '<link rel="canonical"' in content:
            content = re.sub(r'<link rel="canonical" href=".*?" />', canonical_tag, content)
        else:
            content = content.replace("</head>", f"    {canonical_tag}\n</head>")

        # 4. Open Graph Tags
        og_tags = f"""
    <meta property="og:title" content="{seo['title']}" />
    <meta property="og:description" content="{seo['description']}" />
    <meta property="og:image" content="https://fundedcobra.com/logo.png" />
    <meta property="og:url" content="{clean_url}" />
    <meta name="twitter:card" content="summary_large_image">
        """
        # Inject before </head>
        content = content.replace("</head>", og_tags + "\n</head>")

        with open(file_path, "w") as f:
            f.write(content)
        print(f"SEO Optimized: {file_path}")

sync_seo()
