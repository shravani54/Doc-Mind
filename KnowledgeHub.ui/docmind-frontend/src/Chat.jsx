import { useEffect, useRef, useState } from 'react';
import { streamChat } from './api';

export default function Chat({ conversationId, documentIds, canAsk }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const abortRef = useRef(null);
  const endRef = useRef(null);

  useEffect(() => { abortRef.current?.abort(); setMessages([]); setBusy(false); }, [conversationId]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Update the last (assistant) message while tokens arrive.
  const patchLast = (fn) =>
    setMessages((m) => { const c = [...m]; c[c.length - 1] = fn(c[c.length - 1]); return c; });

  async function send(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    setBusy(true);
    setMessages((m) => [...m, { role: 'user', text }, { role: 'assistant', text: '', sources: [] }]);

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      await streamChat(
        { conversationId, message: text, documentIds },
        {
          signal: ctrl.signal,
          onToken: (t) => patchLast((a) => ({ ...a, text: a.text + t })),
          onSources: (s) => patchLast((a) => ({ ...a, sources: s })),
        }
      );
    } catch (err) {
      if (err.name !== 'AbortError') patchLast((a) => ({ ...a, error: 'The answer could not be completed. Try again.' }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="chat">
      <div className="thread" aria-live="polite">
        {messages.length === 0 && (
          <div className="empty">
            <h2>Ask anything about your documents</h2>
            <p className="muted">
              {canAsk
                ? 'Try: “Summarise the main points” or “What does the contract say about termination?”'
                : 'Upload a document and wait until it shows Ready.'}
            </p>
          </div>
        )}
        {messages.map((m, i) => (
          <article key={i} className={`msg ${m.role}`}>
            {m.role === 'user' ? (
              <p>{m.text}</p>
            ) : (
              <>
                <p className="answer">{m.text || (busy && i === messages.length - 1 ? <span className="dots">Reading your documents</span> : '')}</p>
                {m.error && <p className="error">{m.error}</p>}
                {m.sources?.length > 0 && (
                  <ul className="sources" aria-label="Sources">
                    {m.sources.map((s, j) => (
                      <li key={j}>{s.filename}{s.page ? `, p. ${s.page}` : ''}</li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </article>
        ))}
        <div ref={endRef} />
      </div>

      <form className="composer" onSubmit={send}>
        <input value={input} onChange={(e) => setInput(e.target.value)} disabled={!canAsk}
               placeholder={canAsk ? 'Ask a question about your documents' : 'No ready documents yet'}
               aria-label="Your question" />
        {busy
          ? <button type="button" className="ghost" onClick={() => abortRef.current?.abort()}>Stop</button>
          : <button className="primary" disabled={!canAsk || !input.trim()}>Ask</button>}
      </form>
    </section>
  );
}
