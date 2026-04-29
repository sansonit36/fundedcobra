import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { BookOpen, Plus, Edit2, Trash2, Eye, EyeOff, ChevronDown, ChevronUp, Search, Star, StarOff, ArrowLeft, Code, FileText, GripVertical, ExternalLink } from 'lucide-react';

interface Category {
  id: string; name: string; slug: string; description: string; icon: string;
  sort_order: number; is_published: boolean; created_at: string;
}
interface Article {
  id: string; category_id: string; title: string; slug: string; content: string;
  excerpt: string; status: string; is_featured: boolean; sort_order: number;
  views: number; created_at: string; updated_at: string;
}

const ICONS = ['📚','❓','🚀','📋','💰','📊','📉','🖥️','💳','⚙️','🔒','📝','🎯','💡','🏆','📢','🔔','👥','🌍','📞'];

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export default function HelpCenterAdmin() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [view, setView] = useState<'categories' | 'articles' | 'editArticle'>('categories');
  const [selectedCat, setSelectedCat] = useState<Category | null>(null);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [showCatModal, setShowCatModal] = useState(false);
  const [catForm, setCatForm] = useState({ name: '', slug: '', description: '', icon: '📚', is_published: true, id: '' });
  const [artForm, setArtForm] = useState({ title: '', slug: '', content: '', excerpt: '', status: 'draft', is_featured: false, category_id: '', id: '' });
  const [editorMode, setEditorMode] = useState<'visual' | 'html'>('visual');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchCategories = useCallback(async () => {
    const { data } = await supabase.from('kb_categories').select('*').order('sort_order');
    if (data) setCategories(data);
    setLoading(false);
  }, []);

  const fetchArticles = useCallback(async (catId: string) => {
    const { data } = await supabase.from('kb_articles').select('*').eq('category_id', catId).order('sort_order');
    if (data) setArticles(data);
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const getArticleCount = (catId: string) => {
    // We'll fetch counts inline
    return articles.filter(a => a.category_id === catId).length;
  };

  // Category CRUD
  const openCatModal = (cat?: Category) => {
    if (cat) {
      setCatForm({ name: cat.name, slug: cat.slug, description: cat.description, icon: cat.icon, is_published: cat.is_published, id: cat.id });
    } else {
      setCatForm({ name: '', slug: '', description: '', icon: '📚', is_published: true, id: '' });
    }
    setShowCatModal(true);
  };

  const saveCat = async () => {
    setSaving(true);
    const payload = { name: catForm.name, slug: catForm.slug || slugify(catForm.name), description: catForm.description, icon: catForm.icon, is_published: catForm.is_published };
    if (catForm.id) {
      await supabase.from('kb_categories').update(payload).eq('id', catForm.id);
    } else {
      await supabase.from('kb_categories').insert({ ...payload, sort_order: categories.length });
    }
    setShowCatModal(false);
    setSaving(false);
    fetchCategories();
  };

  const deleteCat = async (id: string) => {
    if (!confirm('Delete this category and ALL its articles?')) return;
    await supabase.from('kb_categories').delete().eq('id', id);
    fetchCategories();
  };

  const toggleCatPublish = async (cat: Category) => {
    await supabase.from('kb_categories').update({ is_published: !cat.is_published }).eq('id', cat.id);
    fetchCategories();
  };

  const moveCat = async (cat: Category, dir: 'up' | 'down') => {
    const idx = categories.findIndex(c => c.id === cat.id);
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= categories.length) return;
    const other = categories[swapIdx];
    await supabase.from('kb_categories').update({ sort_order: other.sort_order }).eq('id', cat.id);
    await supabase.from('kb_categories').update({ sort_order: cat.sort_order }).eq('id', other.id);
    fetchCategories();
  };

  // Articles
  const openCategory = async (cat: Category) => {
    setSelectedCat(cat);
    await fetchArticles(cat.id);
    setView('articles');
  };

  const openArticleEditor = (art?: Article) => {
    if (art) {
      setArtForm({ title: art.title, slug: art.slug, content: art.content, excerpt: art.excerpt, status: art.status, is_featured: art.is_featured, category_id: art.category_id, id: art.id });
      setEditingArticle(art);
    } else {
      setArtForm({ title: '', slug: '', content: '', excerpt: '', status: 'draft', is_featured: false, category_id: selectedCat!.id, id: '' });
      setEditingArticle(null);
    }
    setView('editArticle');
  };

  const saveArticle = async () => {
    setSaving(true);
    const payload = { title: artForm.title, slug: artForm.slug || slugify(artForm.title), content: artForm.content, excerpt: artForm.excerpt, status: artForm.status, is_featured: artForm.is_featured, category_id: artForm.category_id };
    if (artForm.id) {
      await supabase.from('kb_articles').update(payload).eq('id', artForm.id);
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('kb_articles').insert({ ...payload, sort_order: articles.length, created_by: user?.id });
    }
    setSaving(false);
    if (selectedCat) {
      await fetchArticles(selectedCat.id);
    }
    setView('articles');
  };

  const deleteArticle = async (id: string) => {
    if (!confirm('Delete this article?')) return;
    await supabase.from('kb_articles').delete().eq('id', id);
    if (selectedCat) fetchArticles(selectedCat.id);
  };

  const toggleArticleStatus = async (art: Article) => {
    const next = art.status === 'published' ? 'draft' : 'published';
    await supabase.from('kb_articles').update({ status: next }).eq('id', art.id);
    if (selectedCat) fetchArticles(selectedCat.id);
  };

  const toggleFeatured = async (art: Article) => {
    await supabase.from('kb_articles').update({ is_featured: !art.is_featured }).eq('id', art.id);
    if (selectedCat) fetchArticles(selectedCat.id);
  };

  // Styles
  const card: React.CSSProperties = { background: '#161B22', border: '1px solid #30363D', borderRadius: 12, padding: 20 };
  const btn = (bg: string): React.CSSProperties => ({ background: bg, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 6 });
  const input: React.CSSProperties = { width: '100%', background: '#0D1117', border: '1px solid #30363D', borderRadius: 8, padding: '10px 14px', color: '#E6EDF3', fontSize: 14, boxSizing: 'border-box' };
  const label: React.CSSProperties = { color: '#8B949E', fontSize: 13, fontWeight: 600, marginBottom: 4, display: 'block' };

  if (loading) return <div style={{ color: '#E6EDF3', padding: 40, textAlign: 'center' }}>Loading Help Center...</div>;

  // ARTICLE EDITOR VIEW
  if (view === 'editArticle') {
    return (
      <div style={{ padding: '24px 32px', maxWidth: 1100, margin: '0 auto' }}>
        <button onClick={() => setView('articles')} style={{ ...btn('transparent'), color: '#8B949E', padding: 0, marginBottom: 16 }}>
          <ArrowLeft size={16} /> Back to Articles
        </button>
        <h2 style={{ color: '#E6EDF3', margin: '0 0 24px', fontSize: 24 }}>
          {editingArticle ? 'Edit Article' : 'New Article'}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={label}>Title</label>
              <input style={input} value={artForm.title} onChange={e => setArtForm({ ...artForm, title: e.target.value, slug: artForm.id ? artForm.slug : slugify(e.target.value) })} placeholder="Article title..." />
            </div>
            <div>
              <label style={label}>Slug</label>
              <input style={input} value={artForm.slug} onChange={e => setArtForm({ ...artForm, slug: e.target.value })} />
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <label style={{ ...label, margin: 0 }}>Content</label>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => setEditorMode('visual')} style={{ ...btn(editorMode === 'visual' ? '#bd4dd6' : '#21262D'), padding: '4px 10px', fontSize: 12 }}>
                    <FileText size={12} /> Markdown
                  </button>
                  <button onClick={() => setEditorMode('html')} style={{ ...btn(editorMode === 'html' ? '#bd4dd6' : '#21262D'), padding: '4px 10px', fontSize: 12 }}>
                    <Code size={12} /> HTML
                  </button>
                </div>
              </div>
              <textarea style={{ ...input, minHeight: 400, fontFamily: editorMode === 'html' ? 'monospace' : 'inherit', fontSize: 14, lineHeight: 1.6, resize: 'vertical' }} value={artForm.content} onChange={e => setArtForm({ ...artForm, content: e.target.value })} placeholder={editorMode === 'html' ? '<h2>Your HTML content...</h2>' : '## Your markdown content...\n\nUse **bold**, *italic*, [links](url), and more.'} />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={card}>
              <label style={label}>Status</label>
              <select style={input} value={artForm.status} onChange={e => setArtForm({ ...artForm, status: e.target.value })}>
                <option value="draft">📝 Draft</option>
                <option value="published">✅ Published</option>
                <option value="archived">📦 Archived</option>
              </select>
            </div>
            <div style={card}>
              <label style={label}>Excerpt (Preview Text)</label>
              <textarea style={{ ...input, minHeight: 80, resize: 'vertical' }} value={artForm.excerpt} onChange={e => setArtForm({ ...artForm, excerpt: e.target.value })} placeholder="Short description for listings..." />
            </div>
            <div style={card}>
              <label style={{ ...label, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={artForm.is_featured} onChange={e => setArtForm({ ...artForm, is_featured: e.target.checked })} />
                ⭐ Featured Article
              </label>
              <p style={{ color: '#8B949E', fontSize: 12, margin: '8px 0 0' }}>Featured articles appear on the help center home page.</p>
            </div>
            <div style={card}>
              <label style={label}>Category</label>
              <select style={input} value={artForm.category_id} onChange={e => setArtForm({ ...artForm, category_id: e.target.value })}>
                {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={saveArticle} disabled={saving || !artForm.title} style={{ ...btn('#bd4dd6'), flex: 1, justifyContent: 'center', opacity: saving || !artForm.title ? 0.5 : 1 }}>
                {saving ? 'Saving...' : 'Save Article'}
              </button>
            </div>
            {/* Live Preview */}
            <div style={card}>
              <label style={label}>Preview</label>
              <div style={{ color: '#E6EDF3', fontSize: 14, lineHeight: 1.7, maxHeight: 300, overflow: 'auto' }}>
                {editorMode === 'html' ? (
                  <div dangerouslySetInnerHTML={{ __html: artForm.content }} />
                ) : (
                  <div style={{ whiteSpace: 'pre-wrap' }}>
                    {artForm.content.split('\n').map((line, i) => {
                      if (line.startsWith('## ')) return <h2 key={i} style={{ fontSize: 18, margin: '12px 0 4px' }}>{line.slice(3)}</h2>;
                      if (line.startsWith('### ')) return <h3 key={i} style={{ fontSize: 16, margin: '10px 0 4px' }}>{line.slice(4)}</h3>;
                      if (line.startsWith('- ')) return <li key={i} style={{ marginLeft: 16 }}>{line.slice(2)}</li>;
                      if (line.startsWith('> ')) return <blockquote key={i} style={{ borderLeft: '3px solid #bd4dd6', paddingLeft: 12, color: '#8B949E', margin: '8px 0' }}>{line.slice(2)}</blockquote>;
                      if (!line.trim()) return <br key={i} />;
                      return <p key={i} style={{ margin: '4px 0' }}>{line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>')}</p>;
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ARTICLES LIST VIEW
  if (view === 'articles' && selectedCat) {
    const filtered = articles.filter(a => !search || a.title.toLowerCase().includes(search.toLowerCase()));
    return (
      <div style={{ padding: '24px 32px', maxWidth: 1100, margin: '0 auto' }}>
        <button onClick={() => { setView('categories'); setSelectedCat(null); }} style={{ ...btn('transparent'), color: '#8B949E', padding: 0, marginBottom: 16 }}>
          <ArrowLeft size={16} /> Back to Categories
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ color: '#E6EDF3', margin: 0 }}>{selectedCat.icon} {selectedCat.name} <span style={{ color: '#8B949E', fontSize: 16 }}>({articles.length} articles)</span></h2>
          <button onClick={() => openArticleEditor()} style={btn('#bd4dd6')}><Plus size={16} /> New Article</button>
        </div>
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#8B949E' }} />
          <input style={{ ...input, paddingLeft: 36 }} placeholder="Search articles..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.length === 0 && <p style={{ color: '#8B949E', textAlign: 'center', padding: 40 }}>No articles yet. Create your first one!</p>}
          {filtered.map(art => (
            <div key={art.id} style={{ ...card, display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px' }}>
              <GripVertical size={16} style={{ color: '#484F58', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#E6EDF3', fontWeight: 600, fontSize: 15 }}>{art.title}</span>
                  {art.is_featured && <Star size={14} style={{ color: '#F59E0B' }} />}
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, fontWeight: 700, background: art.status === 'published' ? 'rgba(16,185,129,0.15)' : art.status === 'draft' ? 'rgba(245,158,11,0.15)' : 'rgba(107,114,128,0.15)', color: art.status === 'published' ? '#10B981' : art.status === 'draft' ? '#F59E0B' : '#6B7280' }}>
                    {art.status}
                  </span>
                </div>
                <p style={{ color: '#8B949E', fontSize: 13, margin: '4px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{art.excerpt || 'No excerpt'}</p>
              </div>
              <span style={{ color: '#484F58', fontSize: 12, flexShrink: 0 }}>{art.views} views</span>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <button onClick={() => toggleFeatured(art)} style={{ ...btn('transparent'), padding: 6, color: art.is_featured ? '#F59E0B' : '#484F58' }} title="Toggle featured">
                  {art.is_featured ? <Star size={16} /> : <StarOff size={16} />}
                </button>
                <button onClick={() => toggleArticleStatus(art)} style={{ ...btn('transparent'), padding: 6, color: art.status === 'published' ? '#10B981' : '#F59E0B' }} title="Toggle publish">
                  {art.status === 'published' ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
                <button onClick={() => openArticleEditor(art)} style={{ ...btn('transparent'), padding: 6, color: '#8B949E' }} title="Edit">
                  <Edit2 size={16} />
                </button>
                <button onClick={() => deleteArticle(art.id)} style={{ ...btn('transparent'), padding: 6, color: '#F87171' }} title="Delete">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // CATEGORIES VIEW (default)
  return (
    <div style={{ padding: '24px 32px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ color: '#E6EDF3', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <BookOpen size={28} style={{ color: '#bd4dd6' }} /> Help Center Manager
          </h1>
          <p style={{ color: '#8B949E', margin: '4px 0 0', fontSize: 14 }}>Manage categories and articles for the knowledge base</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a href="/help" target="_blank" style={{ ...btn('#21262D'), textDecoration: 'none' }}><ExternalLink size={14} /> View Live</a>
          <button onClick={() => openCatModal()} style={btn('#bd4dd6')}><Plus size={16} /> New Category</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Categories', value: categories.length, icon: '📂' },
          { label: 'Published', value: categories.filter(c => c.is_published).length, icon: '✅' },
          { label: 'Total Articles', value: '—', icon: '📝' },
        ].map((s, i) => (
          <div key={i} style={card}>
            <div style={{ fontSize: 28 }}>{s.icon}</div>
            <div style={{ color: '#E6EDF3', fontSize: 28, fontWeight: 800 }}>{s.value}</div>
            <div style={{ color: '#8B949E', fontSize: 13 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Categories List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {categories.map((cat, idx) => (
          <div key={cat.id} style={{ ...card, display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px', cursor: 'pointer', transition: 'border-color 0.2s' }} onClick={() => openCategory(cat)}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
              <button onClick={() => moveCat(cat, 'up')} disabled={idx === 0} style={{ ...btn('transparent'), padding: 2, color: idx === 0 ? '#21262D' : '#8B949E' }}><ChevronUp size={14} /></button>
              <button onClick={() => moveCat(cat, 'down')} disabled={idx === categories.length - 1} style={{ ...btn('transparent'), padding: 2, color: idx === categories.length - 1 ? '#21262D' : '#8B949E' }}><ChevronDown size={14} /></button>
            </div>
            <span style={{ fontSize: 28, flexShrink: 0 }}>{cat.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#E6EDF3', fontWeight: 700, fontSize: 16 }}>{cat.name}</span>
                {!cat.is_published && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: 'rgba(245,158,11,0.15)', color: '#F59E0B', fontWeight: 700 }}>Hidden</span>}
              </div>
              <p style={{ color: '#8B949E', fontSize: 13, margin: '2px 0 0' }}>{cat.description}</p>
            </div>
            <span style={{ color: '#484F58', fontSize: 13, flexShrink: 0 }}>/{cat.slug}</span>
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
              <button onClick={() => toggleCatPublish(cat)} style={{ ...btn('transparent'), padding: 6, color: cat.is_published ? '#10B981' : '#F59E0B' }}>
                {cat.is_published ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
              <button onClick={() => openCatModal(cat)} style={{ ...btn('transparent'), padding: 6, color: '#8B949E' }}><Edit2 size={16} /></button>
              <button onClick={() => deleteCat(cat.id)} style={{ ...btn('transparent'), padding: 6, color: '#F87171' }}><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
      </div>

      {/* Category Modal */}
      {showCatModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowCatModal(false)}>
          <div style={{ ...card, width: 480, maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: '#E6EDF3', margin: '0 0 20px' }}>{catForm.id ? 'Edit Category' : 'New Category'}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={label}>Icon</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {ICONS.map(ic => (
                    <button key={ic} onClick={() => setCatForm({ ...catForm, icon: ic })} style={{ fontSize: 22, padding: 6, background: catForm.icon === ic ? '#bd4dd6' : '#21262D', border: catForm.icon === ic ? '2px solid #bd4dd6' : '2px solid transparent', borderRadius: 8, cursor: 'pointer' }}>{ic}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={label}>Name</label>
                <input style={input} value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value, slug: catForm.id ? catForm.slug : slugify(e.target.value) })} placeholder="e.g. General FAQ" />
              </div>
              <div>
                <label style={label}>Slug</label>
                <input style={input} value={catForm.slug} onChange={e => setCatForm({ ...catForm, slug: e.target.value })} />
              </div>
              <div>
                <label style={label}>Description</label>
                <textarea style={{ ...input, minHeight: 60, resize: 'vertical' }} value={catForm.description} onChange={e => setCatForm({ ...catForm, description: e.target.value })} placeholder="Short category description..." />
              </div>
              <label style={{ ...label, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={catForm.is_published} onChange={e => setCatForm({ ...catForm, is_published: e.target.checked })} />
                Published (visible to users)
              </label>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={() => setShowCatModal(false)} style={btn('#21262D')}>Cancel</button>
                <button onClick={saveCat} disabled={saving || !catForm.name} style={{ ...btn('#bd4dd6'), opacity: saving || !catForm.name ? 0.5 : 1 }}>
                  {saving ? 'Saving...' : 'Save Category'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
