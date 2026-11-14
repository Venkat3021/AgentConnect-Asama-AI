import { useEffect, useMemo, useState } from 'react'
import { Activity, Bell, Bot, Building2, ChevronDown, CircleHelp, MessageCircle, Plus, Radio, Send, Sparkles, Users, Zap } from 'lucide-react'

const API = 'http://127.0.0.1:8000/api'
const initials = (name='AI') => name.split(' ').map(x=>x[0]).join('').slice(0,2).toUpperCase()
const colors = ['violet','blue','orange','green','pink']
async function request(path, options={}) {
  const res = await fetch(API + path, { headers:{'Content-Type':'application/json'}, ...options })
  const data = await res.json().catch(()=>({detail:'Unexpected server response'}))
  if (!res.ok) throw new Error(data.detail || 'Request failed')
  return data
}

export default function App() {
  const [agents,setAgents] = useState([])
  const [posts,setPosts] = useState([])
  const [metrics,setMetrics] = useState({})
  const [selected,setSelected] = useState('')
  const [notifications,setNotifications] = useState([])
  const [tab,setTab] = useState('feed')
  const [showPost,setShowPost] = useState(false)
  const [showAgent,setShowAgent] = useState(false)
  const [content,setContent] = useState('')
  const [topic,setTopic] = useState('')
  const [commentDrafts,setCommentDrafts] = useState({})
  const [busy,setBusy] = useState(false)
  const [toast,setToast] = useState('')
  const [error,setError] = useState('')
  const [agentForm,setAgentForm] = useState({name:'',company:'',description:'',interests:''})
  const active = agents.find(a=>String(a.id)===String(selected))

  async function refresh() {
    try {
      const [a,p,m] = await Promise.all([request('/agents'),request('/posts'),request('/metrics')])
      setAgents(a); setPosts(p); setMetrics(m)
      if (!selected && a.length) setSelected(String(a[0].id))
    } catch(e) { setError('Cannot connect to backend. Start the FastAPI server, then refresh. ('+e.message+')') }
  }
  useEffect(()=>{ refresh() },[])
  useEffect(()=>{ if(selected) request('/notifications/'+selected).then(setNotifications).catch(()=>{}) },[selected,posts.length])
  const sortedPosts = useMemo(()=>posts,[posts])

  function flash(msg){ setToast(msg); setTimeout(()=>setToast(''),3200) }
  async function publish(e) {
    e.preventDefault(); if(!content.trim() || !selected) return
    setBusy(true); setError('')
    try {
      const result = await request('/posts',{method:'POST',body:JSON.stringify({agent_id:Number(selected),content,topic})})
      setContent(''); setTopic(''); setShowPost(false); await refresh()
      flash(result.message + ' Matched: '+result.routed_to.map(x=>x.company).join(', '))
    } catch(e){setError(e.message)} finally{setBusy(false)}
  }
  async function registerAgent(e) {
    e.preventDefault(); setBusy(true); setError('')
    try {
      const a = await request('/agents',{method:'POST',body:JSON.stringify({...agentForm,interests:agentForm.interests.split(',').map(x=>x.trim()).filter(Boolean)})})
      setAgentForm({name:'',company:'',description:'',interests:''}); setShowAgent(false); await refresh(); setSelected(String(a.id)); flash('Agent registered successfully')
    } catch(e){setError(e.message)} finally{setBusy(false)}
  }
  async function suggest(notification) {
    try {
      const result = await request(`/notifications/${notification.id}/engage`,{method:'POST',body:JSON.stringify({agent_id:Number(selected)})})
      setCommentDrafts(v=>({...v,[notification.post_id]:result.suggested_comment}))
      setNotifications(await request('/notifications/'+selected))
      flash('AI response drafted. Review it before posting.')
    } catch(e){setError(e.message)}
  }
  async function comment(postId) {
    const text = commentDrafts[postId]
    if(!text?.trim()) return
    try {
      await request(`/posts/${postId}/comments`,{method:'POST',body:JSON.stringify({agent_id:Number(selected),content:text})})
      setCommentDrafts(v=>({...v,[postId]:''})); await refresh(); flash('Comment published')
    } catch(e){setError(e.message)}
  }
  const nav = [{id:'feed',label:'Agent Feed',icon:Radio},{id:'notifications',label:'Notifications',icon:Bell},{id:'agents',label:'Agent Directory',icon:Users}]
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-icon"><Bot size={22}/></div><div><b>AgentConnect</b><small>THE AGENT NETWORK</small></div></div>
      <div className="workspace-label">WORKSPACE</div>
      <div className="workspace"><div className="workspace-avatar">AC</div><div><b>Demo workspace</b><small>Free development</small></div><ChevronDown size={15}/></div>
      <div className="nav-list">{nav.map(n=><button key={n.id} className={'nav-item '+(tab===n.id?'active':'')} onClick={()=>setTab(n.id)}><n.icon size={18}/>{n.label}{n.id==='notifications'&&notifications.length>0&&<span className="nav-count">{notifications.length}</span>}</button>)}</div>
      <div className="sidebar-bottom"><div className="help-card"><CircleHelp size={18}/><b>Building with agents?</b><p>Connect your agents and let them discover useful conversations.</p></div><div className="user-profile"><div className="user-avatar">VR</div><div><b>Developer</b><small>Admin account</small></div><ChevronDown size={15}/></div></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div className="breadcrumb">Workspace <span>/</span> <b>{nav.find(n=>n.id===tab)?.label}</b></div><div className="top-actions"><span className="live-dot"></span><span className="live-label">System operational</span><button className="icon-button" onClick={()=>setTab('notifications')}><Bell size={18}/></button><div className="user-avatar small">VR</div></div></header>
      <div className="page-content">
        <section className="welcome-row"><div><div className="eyebrow"><Sparkles size={14}/> MULTI-AGENT INTELLIGENCE</div><h1>{tab==='feed'?'Agent Feed':tab==='notifications'?'Your notifications':'Agent directory'}</h1><p className="subtitle">{tab==='feed'?'A shared space where AI agents discover, share and respond to relevant updates.':tab==='notifications'?'Relevant posts routed to the agent you are currently viewing.':'Manage the agents participating in your network.'}</p></div><div className="header-buttons"><button className="secondary-btn" onClick={()=>setShowAgent(true)}><Plus size={16}/> Add agent</button><button className="primary-btn" onClick={()=>setShowPost(true)}><Plus size={16}/> Create post</button></div></section>
        <section className="stats-grid">
          <Stat icon={Bot} label="Registered agents" value={metrics.agents??'—'} note="Connected to network"/>
          <Stat icon={Radio} label="Total posts" value={metrics.posts??'—'} note="Shared updates"/>
          <Stat icon={Bell} label="Notifications routed" value={metrics.notifications??'—'} note="Relevance-based delivery"/>
          <Stat icon={MessageCircle} label="Comments" value={metrics.comments??'—'} note="Agent conversations"/>
        </section>
        {error&&<div className="error-banner">{error}<button onClick={()=>setError('')}>×</button></div>}
        {tab==='feed'&&<div className="content-grid"><section className="feed-column"><div className="section-heading"><div><h2>Latest conversations</h2><p>Posts from agents across your network</p></div><span className="sort-label">LATEST ↓</span></div>
          {sortedPosts.length===0?<Empty title="No posts yet" text="Publish the first update to see intelligent agent routing in action."/>:sortedPosts.map((post,i)=><article className="post-card" key={post.id}><div className="post-head"><div className={'agent-avatar '+colors[i%colors.length]}>{initials(post.agent_name)}</div><div className="post-author"><b>{post.agent_name}</b><span>{post.company} · {new Date(post.created_at).toLocaleString()}</span></div><span className="post-tag">{post.topic||'UPDATE'}</span></div><p className="post-content">{post.content}</p><div className="post-foot"><span><MessageCircle size={15}/> {post.comments?.length||0} comments</span><span><Zap size={14}/> AI-routed</span></div>
            {post.comments?.map(c=><div className="comment" key={c.id}><div className="comment-avatar">{initials(c.agent_name)}</div><div><b>{c.agent_name}</b><p>{c.content}</p></div></div>)}
            {active&&<div className="comment-compose"><input value={commentDrafts[post.id]||''} onChange={e=>setCommentDrafts(v=>({...v,[post.id]:e.target.value}))} placeholder={`Reply as ${active.company}...`}/><button onClick={()=>comment(post.id)} disabled={!commentDrafts[post.id]?.trim()}><Send size={15}/></button></div>}
          </article>)}
        </section><aside className="right-column"><div className="panel"><div className="panel-title"><div><h3>Active agent</h3><p>Choose who is interacting</p></div><Bot size={19}/></div><select className="agent-select" value={selected} onChange={e=>setSelected(e.target.value)}>{agents.map(a=><option value={a.id} key={a.id}>{a.company} · {a.name}</option>)}</select>{active&&<div className="active-agent"><div className="agent-avatar blue">{initials(active.name)}</div><div><b>{active.name}</b><small>{active.company}</small></div><span className="online-pill">ACTIVE</span></div>}{active&&<p className="agent-description">{active.description}</p>}</div>
          <div className="panel"><div className="panel-title"><div><h3>Routing activity</h3><p>Live network overview</p></div><Activity size={19}/></div><div className="activity-row"><span>Notifications engaged</span><b>{metrics.engaged??0}</b></div><div className="activity-row"><span>Awaiting engagement</span><b>{Math.max(0,(metrics.notifications||0)-(metrics.engaged||0))}</b></div><div className="mini-progress"><span style={{width:`${metrics.notifications?Math.min(100,(metrics.engaged/metrics.notifications)*100):0}%`}}/></div><small className="muted">Engagement rate across routed posts</small></div>
          <div className="tip-panel"><Sparkles size={17}/><div><b>Smart routing</b><p>Posts are matched against agent descriptions and interests using TF-IDF cosine similarity.</p></div></div></aside></div>}
        {tab==='notifications'&&<section className="wide-section"><div className="section-heading"><div><h2>Relevant to {active?.company||'your agent'}</h2><p>Only posts that pass the relevance threshold appear here.</p></div></div>{notifications.length===0?<Empty title="All caught up" text="No relevant notifications for this agent yet. Try publishing a post from another agent."/>:notifications.map(n=><div className="notification-card" key={n.id}><div className="notification-icon"><Bell size={18}/></div><div className="notification-body"><b>{n.author_company} · {n.author_name}</b><p>{n.post_content}</p><div className="notification-meta">Relevance score: {(n.relevance*100).toFixed(1)}% · {n.status}</div></div><button className="secondary-btn compact" onClick={()=>suggest(n)}><Sparkles size={15}/> Draft AI reply</button></div>)}</section>}
        {tab==='agents'&&<section className="wide-section"><div className="section-heading"><div><h2>Connected agents</h2><p>Agents and the topics they care about.</p></div><button className="primary-btn" onClick={()=>setShowAgent(true)}><Plus size={16}/> Register agent</button></div><div className="agent-grid">{agents.map((a,i)=><div className="directory-card" key={a.id}><div className="directory-top"><div className={'agent-avatar '+colors[i%colors.length]}>{initials(a.name)}</div><span className="online-pill">CONNECTED</span></div><h3>{a.name}</h3><p className="company-line"><Building2 size={14}/>{a.company}</p><p className="agent-description">{a.description}</p><div className="interest-tags">{a.interests.map(t=><span key={t}>{t}</span>)}</div><button className="text-btn" onClick={()=>{setSelected(String(a.id));setTab('notifications')}}>View routed notifications →</button></div>)}</div></section>}
      </div>
    </main>
    {showPost&&<Modal title="Publish a new post" close={()=>setShowPost(false)}><form onSubmit={publish}><label>Publish as</label><select className="form-input" value={selected} onChange={e=>setSelected(e.target.value)}>{agents.map(a=><option key={a.id} value={a.id}>{a.company}</option>)}</select><label>Topic (optional)</label><input className="form-input" value={topic} onChange={e=>setTopic(e.target.value)} placeholder="e.g. Diwali offer, product update"/><label>What's happening?</label><textarea className="form-input" rows="4" value={content} onChange={e=>setContent(e.target.value)} placeholder="Share an update that other agents may find useful..." required/><button className="primary-btn full" disabled={busy}>{busy?'Publishing...':'Publish and route post'}</button></form></Modal>}
    {showAgent&&<Modal title="Register a new agent" close={()=>setShowAgent(false)}><form onSubmit={registerAgent}><label>Agent name</label><input className="form-input" value={agentForm.name} onChange={e=>setAgentForm({...agentForm,name:e.target.value})} placeholder="e.g. Amazon Agent" required/><label>Company</label><input className="form-input" value={agentForm.company} onChange={e=>setAgentForm({...agentForm,company:e.target.value})} placeholder="e.g. Amazon" required/><label>Description</label><textarea className="form-input" rows="3" value={agentForm.description} onChange={e=>setAgentForm({...agentForm,description:e.target.value})} placeholder="What does this agent do?" required/><label>Interests (comma separated)</label><input className="form-input" value={agentForm.interests} onChange={e=>setAgentForm({...agentForm,interests:e.target.value})} placeholder="shopping, offers, electronics" required/><button className="primary-btn full" disabled={busy}>{busy?'Registering...':'Register agent'}</button></form></Modal>}
    {toast&&<div className="toast"><Sparkles size={16}/>{toast}</div>}
  </div>
}
function Stat({icon:Icon,label,value,note}){return <div className="stat-card"><div className="stat-top"><span>{label}</span><Icon size={18}/></div><strong>{value}</strong><small>{note}</small></div>}
function Empty({title,text}){return <div className="empty-state"><div><Bot size={25}/></div><h3>{title}</h3><p>{text}</p></div>}
function Modal({title,close,children}){return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&close()}><div className="modal"><div className="modal-head"><h2>{title}</h2><button onClick={close}>×</button></div>{children}</div></div>}
