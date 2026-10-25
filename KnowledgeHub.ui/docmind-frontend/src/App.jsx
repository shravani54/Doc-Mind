import { useCallback, useEffect, useState } from 'react';
import { api, getToken } from './api';
import Auth from './Auth.jsx';
import Sidebar from './Sidebar.jsx';
import Chat from './Chat.jsx';

export default function App() {
  const [signedIn, setSignedIn] = useState(!!getToken());
  const [docs, setDocs] = useState([]);
  const [selected, setSelected] = useState([]);           // empty = search every document
  const [conversationId, setConversationId] = useState(() => crypto.randomUUID());

  const refresh = useCallback(() => api.listDocs().then(setDocs).catch(() => {}), []);

  useEffect(() => {
    const out = () => setSignedIn(false);
    window.addEventListener('logout', out);
    return () => window.removeEventListener('logout', out);
  }, []);

  useEffect(() => { if (signedIn) refresh(); }, [signedIn, refresh]);

  // Poll while any document is still being chunked and embedded.
  useEffect(() => {
    if (!docs.some((d) => d.status === 'PROCESSING')) return;
    const t = setInterval(refresh, 3000);
    return () => clearInterval(t);
  }, [docs, refresh]);

  if (!signedIn) return <Auth onSignedIn={() => setSignedIn(true)} />;

  const logout = () => { localStorage.removeItem('token'); setSignedIn(false); setDocs([]); };

  return (
    <div className="app">
      <Sidebar docs={docs} selected={selected} setSelected={setSelected} refresh={refresh}
               onNewChat={() => setConversationId(crypto.randomUUID())} onLogout={logout} />
      <Chat conversationId={conversationId} documentIds={selected} canAsk={docs.some((d) => d.status === 'READY')} />
    </div>
  );
}
