import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Search, BookOpen, ChevronRight, ArrowLeft, Eye, Star, ThumbsUp, ThumbsDown } from 'lucide-react';

interface Category {
  id: string; name: string; slug: string; description: string; icon: string; sort_order: number;
}
interface Article {
  id: string; category_id: string; title: string; slug: string; content: string;
  excerpt: string; is_featured: boolean; views: number; created_at: string; updated_at: string;
}

// Simple markdown-to-HTML renderer
function renderContent(content: string): string {
  if (content.trim().startsWith('<')) return content; // Already HTML
  return content
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" style="color:#bd4dd6">$1</a>')
    .replace(/^> (.*$)/gm, '<blockquote style="border-left:3px solid #bd4dd6;padding-left:12px;color:#8B949E;margin:8px 0">$1</blockquote>')
    .replace(/^- (.*$)/gm, '<li style="margin-left:16px">$1</li>')
    .replace(/^(\d+)\. (.*$)/gm, '<li style="margin-left:16px;list-style-type:decimal">$2</li>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
}

export default function HelpCenter() {
  const { categorySlug, articleSlug } = useParams<{ categorySlug?: string; articleSlug?: string }>();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [featured, setFeatured] = useState<Article[]>([]);
  const [currentCat, setCurrentCat] = useState<Category | null>(null);
  const [currentArticle, setCurrentArticle] = useState<Article | null>(null);
  const [catArticles, setCatArticles] = useState<Article[]>([]);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const [articleCounts, setArticleCounts] = useState<Record<string, number>>({});

  // Fetch all categories
  useEffect(() => {
    (async () => {
      const { data: cats } = await supabase.from('kb_categories').select('*').eq('is_published', true).order('sort_order');
      if (cats) setCategories(cats);
      const { data: arts } = await supabase.from('kb_articles').select('*').eq('status', 'published').order('sort_order');
      if (arts) {
        setArticles(arts);
        setFeatured(arts.filter(a => a.is_featured));
        const counts: Record<string, number> = {};
        arts.forEach(a => { counts[a.category_id] = (counts[a.category_id] || 0) + 1; });
        setArticleCounts(counts);
      }
      setLoading(false);
    })();
  }, []);

  // Handle route changes
  useEffect(() => {
    if (categorySlug && categories.length) {
      const cat = categories.find(c => c.slug === categorySlug);
      setCurrentCat(cat || null);
      if (cat) {
        const arts = articles.filter(a => a.category_id === cat.id);
        setCatArticles(arts);
        if (articleSlug) {
          const art = arts.find(a => a.slug === articleSlug);
          setCurrentArticle(art || null);
          if (art) {
            supabase.from('kb_articles').update({ views: (art.views || 0) + 1 }).eq('id', art.id);
          }
        } else {
          setCurrentArticle(null);
        }
      }
    } else {
      setCurrentCat(null);
      setCurrentArticle(null);
    }
  }, [categorySlug, articleSlug, categories, articles]);

  // Search
  useEffect(() => {
    if (search.length >= 2) {
      const q = search.toLowerCase();
      setSearchResults(articles.filter(a => a.title.toLowerCase().includes(q) || a.excerpt.toLowerCase().includes(q)).slice(0, 8));
    } else {
      setSearchResults([]);
    }
  }, [search, articles]);

  const findCatForArticle = (art: Article) => categories.find(c => c.id === art.category_id);

  // Styles
  const page: React.CSSProperties = { minHeight: '100vh', background: '#0D1117', color: '#E6EDF3' };
  const container: React.CSSProperties = { maxWidth: 900, margin: '0 auto', padding: '0 24px' };
  const card: React.CSSProperties = { background: '#161B22', border: '1px solid #30363D', borderRadius: 12, padding: 20, cursor: 'pointer', transition: 'border-color 0.2s, transform 0.15s' };
  const heroStyle: React.CSSProperties = { background: 'linear-gradient(135deg, #0D1117 0%, #1a0e2e 50%, #0D1117 100%)', padding: '48px 24px', textAlign: 'center' };

  if (loading) return <div style={{ ...page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><BookOpen size={32} style={{ color: '#bd4dd6', animation: 'pulse 1.5s infinite' }} /></div>;

  // ARTICLE VIEW
  if (currentArticle && currentCat) {
    const relatedArticles = catArticles.filter(a => a.id !== currentArticle.id).slice(0, 3);
    return (
      <div style={page}>
        <div style={container}>
          {/* Breadcrumb */}
          <nav style={{ padding: '20px 0', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#8B949E', flexWrap: 'wrap' }}>
            <Link to="/help" style={{ color: '#bd4dd6', textDecoration: 'none' }}>Help Center</Link>
            <ChevronRight size={14} />
            <Link to={`/help/${currentCat.slug}`} style={{ color: '#bd4dd6', textDecoration: 'none' }}>{currentCat.name}</Link>
            <ChevronRight size={14} />
            <span style={{ color: '#E6EDF3' }}>{currentArticle.title}</span>
          </nav>

          {/* Article */}
          <article style={{ ...card, cursor: 'default', padding: '32px 40px', marginBottom: 24 }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 8px', color: '#E6EDF3' }}>{currentArticle.title}</h1>
            <div style={{ color: '#8B949E', fontSize: 13, marginBottom: 24, display: 'flex', gap: 16 }}>
              <span>Updated {new Date(currentArticle.updated_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Eye size={13} /> {currentArticle.views}</span>
            </div>
            <div className="kb-article-content" style={{ fontSize: 15, lineHeight: 1.8, color: '#C9D1D9' }} dangerouslySetInnerHTML={{ __html: renderContent(currentArticle.content) }} />
          </article>

          {/* Feedback */}
          <div style={{ ...card, cursor: 'default', textAlign: 'center', marginBottom: 24 }}>
            <p style={{ color: '#8B949E', margin: '0 0 12px', fontSize: 15 }}>Was this article helpful?</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
              <button onClick={() => setFeedback('up')} style={{ background: feedback === 'up' ? '#10B981' : '#21262D', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                <ThumbsUp size={16} /> Yes
              </button>
              <button onClick={() => setFeedback('down')} style={{ background: feedback === 'down' ? '#F87171' : '#21262D', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                <ThumbsDown size={16} /> No
              </button>
            </div>
            {feedback && <p style={{ color: '#8B949E', margin: '12px 0 0', fontSize: 13 }}>Thanks for the feedback!</p>}
          </div>

          {/* Related */}
          {relatedArticles.length > 0 && (
            <div style={{ marginBottom: 40 }}>
              <h3 style={{ color: '#8B949E', fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Related Articles</h3>
              {relatedArticles.map(a => (
                <div key={a.id} onClick={() => navigate(`/help/${currentCat.slug}/${a.slug}`)} style={{ ...card, marginBottom: 8, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <ChevronRight size={14} style={{ color: '#bd4dd6', flexShrink: 0 }} />
                  <span style={{ fontWeight: 600 }}>{a.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // CATEGORY VIEW
  if (currentCat) {
    return (
      <div style={page}>
        <div style={container}>
          <nav style={{ padding: '20px 0', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#8B949E' }}>
            <Link to="/help" style={{ color: '#bd4dd6', textDecoration: 'none' }}>Help Center</Link>
            <ChevronRight size={14} />
            <span style={{ color: '#E6EDF3' }}>{currentCat.name}</span>
          </nav>
          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 32 }}>{currentCat.icon}</span> {currentCat.name}
            </h1>
            <p style={{ color: '#8B949E', margin: 0, fontSize: 15 }}>{currentCat.description}</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {catArticles.length === 0 && <p style={{ color: '#8B949E', textAlign: 'center', padding: 40 }}>No articles in this category yet.</p>}
            {catArticles.map(art => (
              <div key={art.id} onClick={() => navigate(`/help/${currentCat.slug}/${art.slug}`)} style={{ ...card, display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px' }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#bd4dd6'; (e.currentTarget as HTMLDivElement).style.transform = 'translateX(4px)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#30363D'; (e.currentTarget as HTMLDivElement).style.transform = 'none'; }}>
                <ChevronRight size={16} style={{ color: '#bd4dd6', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 600, fontSize: 15 }}>{art.title}</span>
                  {art.excerpt && <p style={{ color: '#8B949E', fontSize: 13, margin: '4px 0 0' }}>{art.excerpt}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // HOME VIEW
  return (
    <div style={page}>
      {/* Hero */}
      <div style={heroStyle}>
        <div style={container}>
          <h1 style={{ fontSize: 36, fontWeight: 800, margin: '0 0 8px' }}>
            <span style={{ color: '#bd4dd6' }}>FundedCobra</span> Help Center
          </h1>
          <p style={{ color: '#8B949E', fontSize: 16, margin: '0 0 24px' }}>Find answers to your questions about trading, payouts, and more.</p>
          <div style={{ position: 'relative', maxWidth: 540, margin: '0 auto' }}>
            <Search size={18} style={{ position: 'absolute', left: 16, top: 14, color: '#8B949E' }} />
            <input style={{ width: '100%', background: '#161B22', border: '1px solid #30363D', borderRadius: 12, padding: '14px 18px 14px 44px', color: '#E6EDF3', fontSize: 16, boxSizing: 'border-box', outline: 'none' }} placeholder="Search for articles..." value={search} onChange={e => setSearch(e.target.value)} />
            {searchResults.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#161B22', border: '1px solid #30363D', borderRadius: 12, marginTop: 4, overflow: 'hidden', zIndex: 100, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
                {searchResults.map(art => {
                  const cat = findCatForArticle(art);
                  return (
                    <div key={art.id} onClick={() => { setSearch(''); navigate(`/help/${cat?.slug}/${art.slug}`); }} style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #21262D', transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#21262D')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{art.title}</div>
                      <div style={{ color: '#8B949E', fontSize: 12 }}>{cat?.icon} {cat?.name}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={container}>
        {/* Featured Articles */}
        {featured.length > 0 && (
          <div style={{ margin: '32px 0' }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Star size={20} style={{ color: '#F59E0B' }} /> Featured Articles
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
              {featured.map(art => {
                const cat = findCatForArticle(art);
                return (
                  <div key={art.id} onClick={() => navigate(`/help/${cat?.slug}/${art.slug}`)} style={{ ...card, padding: 16 }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = '#bd4dd6')} onMouseLeave={e => (e.currentTarget.style.borderColor = '#30363D')}>
                    <div style={{ fontSize: 13, color: '#8B949E', marginBottom: 6 }}>{cat?.icon} {cat?.name}</div>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{art.title}</div>
                    <p style={{ color: '#8B949E', fontSize: 13, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{art.excerpt}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Categories Grid */}
        <div style={{ margin: '32px 0 48px' }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Browse by Topic</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
            {categories.map(cat => (
              <div key={cat.id} onClick={() => navigate(`/help/${cat.slug}`)} style={card}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#bd4dd6'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#30363D'; (e.currentTarget as HTMLDivElement).style.transform = 'none'; }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>{cat.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{cat.name}</div>
                <p style={{ color: '#8B949E', fontSize: 13, margin: '0 0 8px' }}>{cat.description}</p>
                <span style={{ color: '#bd4dd6', fontSize: 13, fontWeight: 600 }}>{articleCounts[cat.id] || 0} articles →</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
