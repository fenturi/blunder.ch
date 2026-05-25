import { useEffect, useState } from "react";
import { apiUrl } from "../lib/api.js";

function buttonStyle(danger = false) {
  return {
    background: danger ? "rgba(180,70,70,0.16)" : "rgba(255,255,255,0.06)",
    border: danger ? "1px solid rgba(255,140,140,0.35)" : "1px solid rgba(255,255,255,0.12)",
    borderRadius: "6px",
    color: danger ? "#ffc4c4" : "rgba(255,255,255,0.74)",
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: "12px",
    padding: "7px 10px",
  };
}

export default function DevPanel() {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [status, setStatus] = useState("");

  async function loadUsers() {
    try {
      const response = await fetch(apiUrl("/api/dev/users"));
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to load dev users");
      }

      setUsers(payload.users || []);
      setStatus("");
    } catch (error) {
      setStatus(error.message || "Unable to load dev users");
    }
  }

  useEffect(() => {
    if (!open) return undefined;

    const timeoutId = window.setTimeout(loadUsers, 0);
    const intervalId = window.setInterval(loadUsers, 5000);
    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
    };
  }, [open]);

  async function deleteUser(user) {
    if (!window.confirm(`Delete ${user.provider}/${user.username} and all data?`)) return;

    const response = await fetch(apiUrl(`/api/dev/users/${user.id}`), { method: "DELETE" });
    if (!response.ok) {
      const payload = await response.json();
      setStatus(payload.error || "Unable to delete user");
      return;
    }

    await loadUsers();
  }

  async function resetAll() {
    const first = window.confirm("This deletes all local dev data. Continue?");
    if (!first) return;

    const typed = window.prompt("Type RESET to confirm");
    if (typed !== "RESET") return;

    const response = await fetch(apiUrl("/api/dev/reset"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ confirm: true }),
    });

    if (!response.ok) {
      const payload = await response.json();
      setStatus(payload.error || "Unable to reset data");
      return;
    }

    await loadUsers();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        style={{
          position: "fixed",
          right: "18px",
          bottom: "18px",
          zIndex: 50,
          background: "#202226",
          color: "#fff",
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: "8px",
          padding: "10px 14px",
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        Dev
      </button>

      {open ? (
        <aside
          style={{
            position: "fixed",
            right: "18px",
            bottom: "66px",
            zIndex: 50,
            width: "min(520px, calc(100vw - 36px))",
            maxHeight: "70vh",
            overflow: "auto",
            background: "#111214",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "8px",
            color: "#fff",
            padding: "16px",
            boxShadow: "0 18px 60px rgba(0,0,0,0.45)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center", marginBottom: "14px" }}>
            <strong style={{ fontWeight: 300 }}>Dev data</strong>
            <button type="button" onClick={resetAll} style={buttonStyle(true)}>Nuke all data</button>
          </div>

          {status ? (
            <div style={{ color: "#ffc4c4", fontSize: "13px", marginBottom: "12px" }}>{status}</div>
          ) : null}

          <div style={{ display: "grid", gap: "8px" }}>
            {users.map((user) => (
              <div
                key={user.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: "12px",
                  alignItems: "center",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "6px",
                  padding: "10px",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {user.provider}/{user.username}
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.42)", fontSize: "12px", marginTop: "4px" }}>
                    {user.import_count} imports / {user.game_count} games
                  </div>
                </div>
                <button type="button" onClick={() => deleteUser(user)} style={buttonStyle(true)}>Delete</button>
              </div>
            ))}
            {users.length === 0 ? (
              <div style={{ color: "rgba(255,255,255,0.42)", fontSize: "13px" }}>No users yet.</div>
            ) : null}
          </div>
        </aside>
      ) : null}
    </>
  );
}
