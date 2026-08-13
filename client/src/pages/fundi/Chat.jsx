import { useEffect, useRef, useState } from "react";
import FundiLayout from "./FundiLayout";
import { Spinner } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import api, { errMsg } from "../../lib/api";

export default function Chat() {
  const { user, platformConfig } = useAuth();
  const [conversations, setConversations] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [adminUsers, setAdminUsers] = useState([]);
  const bottomRef = useRef();

  async function loadConversations() {
    try {
      const { data } = await api.get("/messages/conversations");
      setConversations(data.conversations);
      
      // Load admin users if none exist in conversations
      if (!data.conversations.length) {
        const { data: usersData } = await api.get("/admin/users");
        const admins = usersData.users.filter(u => u.role === "admin");
        setAdminUsers(admins);
        if (admins.length > 0 && !selectedUser) {
          setSelectedUser(admins[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load conversations:", err);
    }
  }

  async function loadThread(userId) {
    if (!userId) return;
    try {
      const { data } = await api.get(`/messages/thread/${userId}`);
      setMessages(data.messages);
    } catch (err) {
      console.error("Failed to load thread:", err);
    }
  }

  useEffect(() => {
    loadConversations();
    const t = setInterval(loadConversations, 8000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (selectedUser) {
      loadThread(selectedUser);
      const t = setInterval(() => loadThread(selectedUser), 5000);
      return () => clearInterval(t);
    }
  }, [selectedUser]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(e) {
    e.preventDefault();
    if (!body.trim() || !selectedUser) return;
    setSending(true);
    try {
      await api.post("/messages", { to_user_id: selectedUser, body });
      setBody("");
      await loadThread(selectedUser);
    } catch (err) {
      alert(errMsg(err));
    } finally {
      setSending(false);
    }
  }

  function formatTime(iso) {
    const d = new Date(iso);
    const today = new Date().toDateString() === d.toDateString();
    return today ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : d.toLocaleDateString();
  }

  const allRecipients = conversations || adminUsers;
  const selectedRecipient = allRecipients.find(c => c.id === selectedUser || c.other_id === selectedUser);

  return (
    <FundiLayout title="Support Chat">
      <div className="max-w-4xl flex gap-4" style={{ height: "calc(100vh - 140px)" }}>
        {/* Contacts sidebar */}
        <div className="w-64 flex flex-col card">
          <h3 className="font-semibold mb-3 pb-3 border-b" style={{ color: "var(--ink)", borderColor: "var(--border)" }}>
            Contacts
          </h3>
          <div className="flex-1 overflow-y-auto space-y-1">
            {conversations === null ? (
              <Spinner />
            ) : allRecipients.length === 0 ? (
              <p className="text-xs text-center py-4" style={{ color: "var(--muted)" }}>
                No contacts yet
              </p>
            ) : (
              allRecipients.map((c) => {
                const recipientId = c.other_id || c.id;
                const recipientName = c.other_name || c.name || "Support";
                return (
                  <button
                    key={recipientId}
                    onClick={() => setSelectedUser(recipientId)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      selectedUser === recipientId
                        ? "bg-terracotta/10 border-2 border-terracotta"
                        : "hover:bg-sand/30"
                    }`}
                  >
                    <p className="font-semibold text-sm truncate" style={{ color: "var(--ink)" }}>
                      {recipientName}
                    </p>
                    {c.last_message && (
                      <p className="text-xs truncate" style={{ color: "var(--muted)" }}>
                        {c.last_message}
                      </p>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col">
          {!selectedUser ? (
            <div className="card flex items-center justify-center h-full">
              <p className="text-center" style={{ color: "var(--muted)" }}>
                Select a contact to start chatting
              </p>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="card mb-3 flex items-center gap-3 py-3">
                <div className="h-10 w-10 rounded-full bg-terracotta flex items-center justify-center text-white font-bold shrink-0">
                  {(selectedRecipient?.other_name || selectedRecipient?.name || "S")[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm" style={{ color: "var(--ink)" }}>
                    {selectedRecipient?.other_name || selectedRecipient?.name || "Support"}
                  </p>
                  <p className="text-xs" style={{ color: "var(--muted)" }}>
                    Chat here or WhatsApp:{" "}
                    <a
                      href={`https://wa.me/254${(platformConfig?.support_whatsapp || "").replace(/^0/, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-terracotta font-semibold"
                    >
                      {platformConfig?.support_whatsapp}
                    </a>
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto space-y-3 pb-2 px-1">
                {messages.length === 0 ? (
                  <p className="text-center text-sm py-10" style={{ color: "var(--muted)" }}>
                    No messages yet. Say hello 👋
                  </p>
                ) : (
                  messages.map((m) => (
                    <div key={m.id}>
                      {m.from_user_id === user.id ? (
                        <div className="flex flex-col items-end gap-0.5">
                          <div className="bubble-out">{m.body}</div>
                          <p className="text-[10px]" style={{ color: "var(--muted)" }}>
                            {formatTime(m.created_at)}
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-start gap-0.5">
                          <div className="bubble-in">{m.body}</div>
                          <p className="text-[10px]" style={{ color: "var(--muted)" }}>
                            {formatTime(m.created_at)}
                          </p>
                        </div>
                      )}
                    </div>
                  ))
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <form onSubmit={send} className="flex gap-2 pt-3 border-t mt-2" style={{ borderColor: "var(--border)" }}>
                <input
                  className="input flex-1"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Type a message…"
                  autoComplete="off"
                />
                <button className="btn-primary px-5" disabled={sending || !body.trim()}>
                  Send
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </FundiLayout>
  );
}
