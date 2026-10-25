# DocMind frontend (React + Vite)

    npm install
    npm run dev        # http://localhost:5173, proxies /api -> http://localhost:8080

Expected backend endpoints
- POST /api/auth/register | /api/auth/login   body {email,password}  -> {token}
- GET  /api/documents                          -> [{id, filename, status: PROCESSING|READY|FAILED}]
- POST /api/documents (multipart, field "file")
- DELETE /api/documents/{id}
- POST /api/chat  body {conversationId, message, documentIds[]}  -> text/event-stream
      data:<token>   ...   event:sources + data:[{"filename":"a.pdf","page":3}]
