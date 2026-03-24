import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, History, CheckCircle, XCircle, ChevronRight, Clock, Users, ArrowLeft, ToggleLeft, ToggleRight, LayoutGrid } from 'lucide-react';

export default function Admin() {
    const navigate = useNavigate();
    const [mode, setMode] = useState('non_exam');
    const [sessions, setSessions] = useState([]);
    const [selectedSessionLogs, setSelectedSessionLogs] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAdminData();
    }, []);

    const fetchAdminData = async () => {
        setLoading(true);
        try {
            const [modeRes, sessionsRes] = await Promise.all([
                fetch(`${import.meta.env.VITE_API_URL || ''}/api/mode/`),
                fetch(`${import.meta.env.VITE_API_URL || ''}/api/sessions/`)
            ]);
            if (modeRes.ok) {
                const modeData = await modeRes.json();
                setMode(modeData.mode);
            }
            if (sessionsRes.ok) {
                const sessionsData = await sessionsRes.json();
                setSessions(sessionsData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
            }
        } catch (error) {
            console.error("Admin fetch error:", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleMode = async () => {
        const newMode = mode === 'exam' ? 'non_exam' : 'exam';
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/mode/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: newMode })
            });
            if (res.ok) {
                setMode(newMode);
            }
        } catch (error) {
            console.error("Mode toggle error:", error);
        }
    };

    const viewLogs = async (session) => {
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/sessions/${session.session_key}/verifications/`);
            if (res.ok) {
                const data = await res.json();
                setSelectedSessionLogs({
                    session,
                    logs: data
                });
            }
        } catch (error) {
            console.error("Log fetch error:", error);
        }
    };

    if (loading) {
        return (
            <div className="app-container">
                <header className="header">
                    <span className="ktu-mark">ADMIN CONSOLE</span>
                </header>
                <div className="main-content">
                    <div className="skeleton mb-8" style={{ height: '120px', borderRadius: '12px' }}></div>
                    <div className="skeleton mb-4" style={{ height: '24px', width: '150px' }}></div>
                    {[1, 2, 3].map(i => (
                        <div key={i} className="skeleton mb-3" style={{ height: '64px', borderRadius: '12px' }}></div>
                    ))}
                </div>
            </div>
        );
    }

    if (selectedSessionLogs) {
        return (
            <div className="app-container">
                <header className="header">
                    <button onClick={() => setSelectedSessionLogs(null)} className="nav-btn nav-btn-muted">
                        <ArrowLeft size={16} /> Back to Archive
                    </button>
                    <span className="ktu-mark">VERIFICATION LOGS</span>
                </header>
                <main className="main-content">
                    <div className="mb-8" style={{ animation: 'fadeRise 0.4s ease-out' }}>
                        <h1 className="mb-1" style={{ fontSize: '24px' }}>{selectedSessionLogs.session.course_code}</h1>
                        <p className="text-muted text-sm">{selectedSessionLogs.session.course_name} &bull; {new Date(selectedSessionLogs.session.created_at).toLocaleDateString()}</p>
                    </div>

                    <div className="flex flex-col gap-3">
                        {selectedSessionLogs.logs.length === 0 ? (
                            <div className="card text-center py-12 text-muted italic text-sm">
                                No records found for this session.
                            </div>
                        ) : (
                            selectedSessionLogs.logs.map((log, i) => (
                                <div key={log.id} className="card p-4 mb-0 flex items-center justify-between" style={{ animation: `fadeRise 0.4s ease-out ${i * 0.05}s backwards` }}>
                                    <div>
                                        <div className="font-bold text-sm">{log.student_name}</div>
                                        <div className="text-xs text-muted">{log.student_id} &bull; {log.programme}</div>
                                    </div>
                                    <div className="text-xs font-mono font-bold text-slate-400">
                                        {new Date(log.verified_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="app-container">
            <header className="header">
                <div className="flex items-center gap-3">
                    <span className="ktu-mark">SYSTEM CONSOLE</span>
                </div>
                <button onClick={() => navigate('/dashboard')} className="nav-btn">
                    Dashboard <ChevronRight size={16} />
                </button>
            </header>

            <main className="main-content" style={{ padding: '2rem 1.5rem' }}>
                <div className="card mb-12 overflow-hidden" style={{ animation: 'fadeRise 0.5s ease-out', padding: '3rem 2rem' }}>
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] font-extrabold tracking-[0.2em] text-slate-400 mb-6 uppercase">Control Center</span>
                        <div className="flex items-center gap-10 py-2">
                            <span className={`text-sm font-extrabold tracking-widest transition-opacity duration-300 ${mode === 'non_exam' ? 'text-primary' : 'text-slate-300'}`}>NON-EXAM</span>
                            <button
                                onClick={toggleMode}
                                className="relative w-20 h-10 rounded-full bg-slate-100 flex items-center px-1.5 transition-all duration-500 shadow-inner"
                                style={{ backgroundColor: mode === 'exam' ? 'rgba(5,150,105,0.1)' : '#F1F5F9' }}
                            >
                                <div className={`w-7 h-7 rounded-full shadow-lg transition-all duration-500 transform ${mode === 'exam' ? 'translate-x-10 bg-emerald-600' : 'bg-slate-400'}`} />
                            </button>
                            <span className={`text-sm font-extrabold tracking-widest transition-opacity duration-300 ${mode === 'exam' ? 'text-emerald-600' : 'text-slate-300'}`}>EXAM MODE</span>
                        </div>
                        <div className="mt-8 text-xs font-medium text-slate-400 text-center px-10 leading-relaxed italic">
                            Toggle the operating state to enable or disable real-time academic verification flows across the campus network.
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between mb-8" style={{ animation: 'fadeRise 0.5s ease-out 0.1s backwards' }}>
                    <h2 className="section-title border-none m-0 p-0">Session Archive</h2>
                    <History size={18} className="text-slate-300" />
                </div>

                <div className="flex flex-col gap-5">
                    {sessions.map((session, i) => (
                        <div key={session.id}
                            className="card group hover:border-primary transition-all cursor-pointer"
                            onClick={() => viewLogs(session)}
                            style={{ padding: '1.5rem 2rem', marginBottom: '0', animation: `fadeRise 0.5s ease-out ${0.1 + (i * 0.05)}s backwards` }}>
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="font-bold text-2xl tracking-tight text-slate-800">{session.course_code}</span>
                                        <span className={`badge ${session.status === 'active' ? 'badge-exam' : 'badge-non-exam'}`} style={{ scale: '0.9', transformOrigin: 'left', borderRadius: '4px' }}>
                                            {session.status.toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="text-sm font-medium text-slate-500">{session.course_name}</div>
                                </div>
                                <div className="text-right flex flex-col items-end">
                                    <span className="text-[10px] font-extrabold tracking-widest text-slate-300 mb-1">VERIFIED</span>
                                    <div className="text-5xl font-semibold leading-none text-primary">
                                        {session.verified_count || 0}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between pt-5 border-t border-slate-100 opacity-60 group-hover:opacity-100 transition-opacity">
                                <div className="flex items-center gap-6 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                                    <div className="flex items-center gap-1.5"><LayoutGrid size={13} /> {session.hall}</div>
                                    <div className="flex items-center gap-1.5"><Clock size={13} /> {new Date(session.created_at).toLocaleDateString()}</div>
                                </div>
                                <div className="flex items-center gap-1 text-xs font-bold text-primary opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                    VIEW<ChevronRight size={14} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}
