-- Knowledge Base Tables for Help Center
-- Categories
CREATE TABLE IF NOT EXISTS kb_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT DEFAULT '',
    icon TEXT DEFAULT '📚',
    sort_order INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Articles
CREATE TABLE IF NOT EXISTS kb_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES kb_categories(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    content TEXT DEFAULT '',
    excerpt TEXT DEFAULT '',
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    is_featured BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    views INTEGER DEFAULT 0,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_kb_articles_category ON kb_articles(category_id);
CREATE INDEX idx_kb_articles_status ON kb_articles(status);
CREATE INDEX idx_kb_articles_slug ON kb_articles(slug);
CREATE INDEX idx_kb_categories_slug ON kb_categories(slug);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_kb_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER kb_categories_updated_at
    BEFORE UPDATE ON kb_categories
    FOR EACH ROW EXECUTE FUNCTION update_kb_updated_at();

CREATE TRIGGER kb_articles_updated_at
    BEFORE UPDATE ON kb_articles
    FOR EACH ROW EXECUTE FUNCTION update_kb_updated_at();

-- RLS
ALTER TABLE kb_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_articles ENABLE ROW LEVEL SECURITY;

-- Public read for published content
CREATE POLICY "Anyone can read published categories" ON kb_categories
    FOR SELECT USING (is_published = true);

CREATE POLICY "Anyone can read published articles" ON kb_articles
    FOR SELECT USING (status = 'published');

-- Admin full access (using service role or is_admin check)
CREATE POLICY "Admins can manage categories" ON kb_categories
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins can manage articles" ON kb_articles
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Admins can also read drafts
CREATE POLICY "Admins can read all articles" ON kb_articles
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins can read all categories" ON kb_categories
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Seed default categories
INSERT INTO kb_categories (name, slug, description, icon, sort_order) VALUES
    ('General FAQ', 'general-faq', 'Frequently asked questions about FundedCobra accounts and services.', '❓', 1),
    ('Getting Started', 'getting-started', 'Everything you need to know to begin your trading journey with us.', '🚀', 2),
    ('Trading Rules', 'trading-rules', 'Detailed rules and guidelines for all account types.', '📋', 3),
    ('Payout Policies', 'payout-policies', 'How payouts work, timelines, methods, and requirements.', '💰', 4),
    ('Account Types', 'account-types', 'Learn about Instant, 1-Step, and 2-Step evaluation accounts.', '📊', 5),
    ('Drawdowns', 'drawdowns', 'Understanding daily loss limits and max drawdown rules.', '📉', 6),
    ('Platform & Tools', 'platform-tools', 'MT5 setup, platform guides, and trading tools.', '🖥️', 7),
    ('Billing & Payments', 'billing-payments', 'Payment methods, refunds, and billing questions.', '💳', 8)
ON CONFLICT (slug) DO NOTHING;

-- Seed a few starter articles
INSERT INTO kb_articles (category_id, title, slug, content, excerpt, status, is_featured, sort_order) VALUES
(
    (SELECT id FROM kb_categories WHERE slug = 'general-faq'),
    'When will I receive my credentials?',
    'when-will-i-receive-credentials',
    'You will receive your trading credentials **immediately** after making a purchase. In rare cases of delay, your credentials will be provided within a maximum of **24 business hours**.\n\nIf you do not receive your credentials promptly, please contact our live support team via the chat widget or email us at **support@fundedcobra.com**.',
    'Credentials are delivered immediately after purchase, with a maximum delay of 24 hours.',
    'published', true, 1
),
(
    (SELECT id FROM kb_categories WHERE slug = 'general-faq'),
    'Which trading platform is supported?',
    'which-trading-platform',
    'FundedCobra exclusively uses **MetaTrader 5 (MT5)** as our trading platform.\n\n## Key Features\n- Full Expert Advisor (EA) support\n- Advanced charting and analytics\n- Available on Desktop, Web, and Mobile\n- All major instruments supported\n\nYou can download MT5 from the official MetaQuotes website or through the links provided in your dashboard after purchase.',
    'We use MetaTrader 5 (MT5) — available on desktop, web, and mobile.',
    'published', true, 2
),
(
    (SELECT id FROM kb_categories WHERE slug = 'general-faq'),
    'What instruments can I trade?',
    'what-instruments-can-i-trade',
    'You can trade all instruments available on our MT5 platform, including:\n\n- **Forex** — All major, minor, and exotic pairs\n- **Indices** — US30, NAS100, SPX500, and more\n- **Commodities** — Gold (XAUUSD), Silver, Oil\n- **Crypto** — BTC, ETH (availability may vary)\n\n> **Note:** Some instruments may have different leverage or margin requirements. Check your MT5 platform for exact specifications.',
    'Trade Forex, Indices, Commodities, and Crypto on our MT5 platform.',
    'published', false, 3
),
(
    (SELECT id FROM kb_categories WHERE slug = 'payout-policies'),
    'How do I request a payout?',
    'how-to-request-payout',
    'To request a payout, follow these steps:\n\n1. Log into your **FundedCobra Dashboard**\n2. Navigate to the **Payouts** tab\n3. Select the trading account you want to withdraw from\n4. Enter the amount you wish to withdraw\n5. Choose your preferred payout method (Crypto or Rise)\n6. Submit your request\n\n## Processing Time\nAll payout requests are processed within **12 hours**. If we miss this window, you are entitled to our **$1,000 Payout Guarantee** ($500 cash + $500 credit).\n\n## Requirements\n- Your account must have met the **withdrawal target** (typically 5%)\n- You must have completed the minimum trading days requirement\n- KYC verification must be completed before your first payout',
    'Request payouts through your dashboard. Processed within 12 hours guaranteed.',
    'published', true, 4
),
(
    (SELECT id FROM kb_categories WHERE slug = 'payout-policies'),
    'What payout methods are available?',
    'payout-methods-available',
    'FundedCobra currently supports the following payout methods:\n\n## Cryptocurrency\n- **USDT (TRC-20)** — Recommended for fastest processing\n- **Bitcoin (BTC)**\n\n## Bank Transfer\n- **Rise** — International bank transfers\n\n> **Important:** Make sure your wallet address or bank details are correctly entered. We are not responsible for funds sent to incorrect addresses.',
    'Payouts via USDT, Bitcoin, or Rise bank transfers.',
    'published', false, 5
),
(
    (SELECT id FROM kb_categories WHERE slug = 'drawdowns'),
    'Understanding Daily Loss Limits',
    'understanding-daily-loss-limits',
    'The **Daily Loss Limit** is a trailing, equity-based drawdown that resets every day at **server midnight (00:00 UTC)**.\n\n## How It Works\n- The daily loss limit is calculated based on your **equity at the start of each trading day**\n- If your equity drops below the limit at any point during the day, your account will be breached\n- This includes both **floating (unrealized)** and **realized** losses\n\n## Example\nIf your account has $10,000 equity at the start of the day, and your daily loss limit is 4%:\n- Your maximum loss for the day = $400\n- If your equity drops to $9,600 or below at any point, the account is breached\n\n> **Important:** The daily loss limit is **trailing** — it tracks based on your highest equity of the day, not your starting balance.',
    'Daily loss is trailing and equity-based, resetting at midnight UTC each day.',
    'published', true, 6
),
(
    (SELECT id FROM kb_categories WHERE slug = 'drawdowns'),
    'Understanding Maximum Drawdown',
    'understanding-max-drawdown',
    'The **Maximum Drawdown** (Max Loss) is a static, equity-based rule that applies for the entire lifetime of your account.\n\n## How It Works\n- The max drawdown is calculated from your **initial account balance**\n- It does **not** trail — it remains fixed at the same level\n- If your equity drops below this level at any point, your account will be breached\n\n## Example\nIf your account starts at $10,000 and your max drawdown is 12%:\n- Your absolute floor = $8,800\n- Even if your account grows to $15,000, the floor remains at $8,800\n\n> **Key Difference:** Unlike daily loss (which is trailing), max drawdown is **static** — giving you more room as your account grows.',
    'Max drawdown is static and equity-based, calculated from your initial balance.',
    'published', true, 7
);
