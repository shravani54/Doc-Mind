import { useRef, useState } from 'react';
import { api } from './api';

const STATUS = { PROCESSING: 'Indexing…', READY: 'Ready', FAILED: 'Failed to index' };

export default function Sidebar({ docs, selected, setSelected, refresh, onNewChat, onLogout }) {
  const fileRef = useRef(null);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  async function upload(files) {
    setError('');
    setUploading(true);
    for (const file of files) {
      if (!/\.(pdf|docx)$/i.test(file.name)) { setError(`${file.name}: only PDF and Word (.docx) files are supported.`); continue; }
      try { await api.uploadDoc(file); } catch (e) { setError(`${file.name}: ${e.message}`); }
    }
    setUploading(false);
    refresh();
  }

  const toggle = (id) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  async function remove(id) {
    if (!confirm('Delete this document and its indexed content?')) return;
    await api.deleteDoc(id);
    setSelected((s) => s.filter((x) => x !== id));
    refresh();
  }

  return (
    <aside className="sidebar">
      <header>
        <h1>DocMind</h1>
        <button className="link" onClick={onLogout}>Sign out</button>
      </header>

      <div
        className={`drop ${drag ? 'over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); upload([...e.dataTransfer.files]); }}
      >
        <p>{uploading ? 'Uploading…' : 'Drop PDF or Word files here'}</p>
        <button className="primary" onClick={() => fileRef.current.click()} disabled={uploading}>Choose files</button>
        <input ref={fileRef} type="file" accept=".pdf,.docx" multiple hidden
               onChange={(e) => { upload([...e.target.files]); e.target.value = ''; }} />
      </div>
      {error && <p className="error" role="alert">{error}</p>}

      <div className="list-head">
        <h2>Your documents</h2>
        <span className="muted">{selected.length ? `${selected.length} selected` : 'Searching all'}</span>
      </div>

      {docs.length === 0 ? (
        <p className="muted pad">No documents yet. Upload one to start asking questions.</p>
      ) : (
        <ul className="docs">
          {docs.map((d) => (
            <li key={d.id}>
              <label>
                <input type="checkbox" checked={selected.includes(d.id)} disabled={d.status !== 'READY'}
                       onChange={() => toggle(d.id)} />
                <span className="name" title={d.filename}>{d.filename}</span>
              </label>
              <span className={`status ${d.status.toLowerCase()}`}>{STATUS[d.status] ?? d.status}</span>
              <button className="link danger" onClick={() => remove(d.id)} aria-label={`Delete ${d.filename}`}>Delete</button>
            </li>
          ))}
        </ul>
      )}

      <button className="ghost" onClick={onNewChat}>Start a new chat</button>
    </aside>
  );
}
