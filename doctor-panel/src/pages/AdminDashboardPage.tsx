import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { adminService } from "../services/adminService";
import type { AdminStats, DoctorActivity, AdminDoctorRating } from "../services/adminService";
import { api } from "../services/api";
import { Activity, Image, CheckCircle, Users, Plus, Shield, X } from "lucide-react";

export function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [activities, setActivities] = useState<DoctorActivity[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states for doctor ratings
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorActivity | null>(null);
  const [doctorRatings, setDoctorRatings] = useState<AdminDoctorRating[]>([]);
  const [loadingRatings, setLoadingRatings] = useState(false);

  // Form states for creating doctor
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState("");

  useEffect(() => {
    Promise.all([
      adminService.getStats(),
      adminService.getDoctorActivity()
    ])
    .then(([s, a]) => {
      setStats(s);
      setActivities(a);
      setLoading(false);
    })
    .catch(console.error);
  }, []);

  async function handleCreateDoctor(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateMsg("");
    try {
      await api.post("/users", {
        firstName,
        lastName,
        email,
        password,
        role: "DOCTOR"
      });
      setCreateMsg("Doctor account created successfully!");
      setFirstName("");
      setLastName("");
      setEmail("");
      setPassword("");
    } catch (err: any) {
      setCreateMsg(err.message || "Failed to create doctor.");
    } finally {
      setCreating(false);
    }
  }

  async function handleDoctorClick(doctor: DoctorActivity) {
    setSelectedDoctor(doctor);
    setLoadingRatings(true);
    try {
      const ratings = await adminService.getDoctorRatings(doctor.doctorId);
      setDoctorRatings(ratings);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRatings(false);
    }
  }

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center" }}>Loading...</div>;
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 20px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 12 }}>
        <Shield color="var(--accent-blue)" />
        Admin Dashboard
      </h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 20, marginBottom: 40 }}>
        <div className="soft-card" style={{ padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, color: "var(--text-secondary)" }}>
            <Image />
            <span>Total Images</span>
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: "var(--text-primary)" }}>{stats?.totalImages || 0}</div>
        </div>
        <div className="soft-card" style={{ padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, color: "var(--text-secondary)" }}>
            <Activity color="var(--accent-warning)" />
            <span>Pending Review</span>
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: "var(--text-primary)" }}>{stats?.pendingReview || 0}</div>
        </div>
        <div className="soft-card" style={{ padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, color: "var(--text-secondary)" }}>
            <CheckCircle color="var(--accent-success)" />
            <span>Completed Ratings</span>
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: "var(--text-primary)" }}>{stats?.completed || 0}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: 30 }}>
        <div className="soft-card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
            <Users size={20} />
            Doctor Activity Leaderboard
          </h2>
          {activities.length === 0 ? (
            <div style={{ color: "var(--text-secondary)" }}>No activity recorded yet.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border)", textAlign: "left" }}>
                  <th style={{ padding: "12px 8px", color: "var(--text-secondary)" }}>Doctor Name</th>
                  <th style={{ padding: "12px 8px", color: "var(--text-secondary)" }}>Email</th>
                  <th style={{ padding: "12px 8px", color: "var(--text-secondary)" }}>Rated Images</th>
                </tr>
              </thead>
              <tbody>
                {activities.map(act => (
                  <tr key={act.doctorId} onClick={() => handleDoctorClick(act)} style={{ borderBottom: "1px solid var(--border)", cursor: "pointer" }} onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ padding: "16px 8px", fontWeight: 600 }}>{act.doctorName}</td>
                    <td style={{ padding: "16px 8px", color: "var(--text-secondary)" }}>{act.email}</td>
                    <td style={{ padding: "16px 8px" }}>
                      <span style={{ background: "var(--accent-blue-light)", color: "var(--accent-blue)", padding: "4px 10px", borderRadius: 99, fontWeight: 700 }}>
                        {act.ratedCount}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="soft-card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
            <Plus size={20} />
            Create Doctor Account
          </h2>
          <form onSubmit={handleCreateDoctor} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, marginBottom: 6, fontWeight: 600 }}>First Name</label>
              <input required value={firstName} onChange={e => setFirstName(e.target.value)} type="text" style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg-muted)", color: "var(--text-primary)" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, marginBottom: 6, fontWeight: 600 }}>Last Name</label>
              <input required value={lastName} onChange={e => setLastName(e.target.value)} type="text" style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg-muted)", color: "var(--text-primary)" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, marginBottom: 6, fontWeight: 600 }}>Email</label>
              <input required value={email} onChange={e => setEmail(e.target.value)} type="email" style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg-muted)", color: "var(--text-primary)" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, marginBottom: 6, fontWeight: 600 }}>Password</label>
              <input required value={password} onChange={e => setPassword(e.target.value)} type="password" style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg-muted)", color: "var(--text-primary)" }} />
            </div>
            {createMsg && (
              <div style={{ padding: 10, borderRadius: 6, fontSize: 13, background: createMsg.includes("success") ? "var(--accent-success)" : "var(--accent-error)", color: "#fff" }}>
                {createMsg}
              </div>
            )}
            <button disabled={creating} type="submit" className="primary-btn" style={{ marginTop: 8, opacity: creating ? 0.7 : 1 }}>
              {creating ? "Creating..." : "Create Account"}
            </button>
          </form>
        </div>
      </div>

      {selectedDoctor && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setSelectedDoctor(null)}>
          <div style={{ background: "var(--bg-surface)", width: 600, maxWidth: "90%", maxHeight: "80vh", borderRadius: 12, display: "flex", flexDirection: "column", boxShadow: "0 10px 40px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 style={{ margin: 0, fontSize: 18, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 10 }}>
                <Activity size={20} color="var(--accent-blue)" />
                Ratings by {selectedDoctor.doctorName}
              </h2>
              <button onClick={() => setSelectedDoctor(null)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: 24, overflowY: "auto", flex: 1 }}>
              {loadingRatings ? (
                <div style={{ textAlign: "center", color: "var(--text-secondary)" }}>Loading ratings...</div>
              ) : doctorRatings.length === 0 ? (
                <div style={{ textAlign: "center", color: "var(--text-secondary)" }}>No ratings found.</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid var(--border)", textAlign: "left" }}>
                      <th style={{ padding: "8px 0", color: "var(--text-secondary)" }}>Date</th>
                      <th style={{ padding: "8px 0", color: "var(--text-secondary)" }}>Level</th>
                      <th style={{ padding: "8px 0", color: "var(--text-secondary)", textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doctorRatings.map((rating, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "12px 0", color: "var(--text-primary)" }}>
                          {new Date(rating.createdAt).toLocaleString()}
                        </td>
                        <td style={{ padding: "12px 0" }}>
                          <span style={{ background: "var(--accent-blue-light)", color: "var(--accent-blue)", padding: "2px 8px", borderRadius: 6, fontWeight: 600 }}>
                            {rating.level || `Points: ${rating.totalPoints}`}
                          </span>
                        </td>
                        <td style={{ padding: "12px 0", textAlign: "right" }}>
                          <Link to={`/patients/${rating.patientId}/examinations/${rating.examinationId}`} style={{ color: "var(--accent-blue)", textDecoration: "none", fontWeight: 500, fontSize: 13 }}>
                            View Image
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
