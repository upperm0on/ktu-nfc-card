import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, LayoutDashboard, QrCode, Play, Square, CheckCircle, ShieldCheck, Download, Clock, Activity, LogOut } from 'lucide-react';
import { API_BASE_URL, WS_BASE_URL } from '../config/api';

export default function Dashboard() {
    const navigate = useNavigate();
    const [activeSession, setActiveSession] = useState(null);
    const [verifiedStudents, setVerifiedStudents] = useState([]);
    const [wsStatus, setWsStatus] = useState('disconnected');
    const [currentTime, setCurrentTime] = useState(new Date());
    const [mode, setMode] = useState('non_exam');
    const ws = useRef(null);
    const [deferredPrompt, setDeferredPrompt] = useState(null);

    const [formData, setFormData] = useState({
        course_code: '',
        course_name: '',
        hall: '',
        invigilator_name: '',
    });
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);

        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        fetchInitialData();

        return () => {
            clearInterval(timer);
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            if (ws.current) ws.current.close();
        };
    }, []);

    const [isEnding, setIsEnding] = useState(false);
    const [confirmEnd, setConfirmEnd] = useState(false);

    const toggleMode = async () => {
        const newMode = mode === 'exam' ? 'non_exam' : 'exam';
        try {
            const res = await fetch(`${API_BASE_URL}/api/mode/`, {
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

    const fetchInitialData = async () => {
        try {
            const [modeRes, sessionsRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/mode/`),
                fetch(`${API_BASE_URL}/api/sessions/active/`)
            ]);

            if (modeRes.ok) {
                const modeData = await modeRes.json();
                setMode(modeData.mode);
            }

            if (sessionsRes.ok) {
                const sessionData = await sessionsRes.json();
                setActiveSession(sessionData);
                connectWebSocket(sessionData.session_key);
                fetchVerifications(sessionData.session_key);
            }
        } catch (error) {
            console.error("Dashboard init error:", error);
        }
    };

    const fetchVerifications = async (key) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/sessions/${key}/verifications/`);
            if (res.ok) {
                const data = await res.json();
                setVerifiedStudents(data);
            }
        } catch (error) {
            console.error("Error fetching logs:", error);
        }
    };

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') setDeferredPrompt(null);
    };

    const connectWebSocket = (sessionKey) => {
        ws.current = new WebSocket(`${WS_BASE_URL}/ws/session/${sessionKey}/`);

        ws.current.onopen = () => setWsStatus('connected');
        ws.current.onclose = () => setWsStatus('disconnected');

        ws.current.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'student_verified' && data.log) {
                    setVerifiedStudents(prev => [data.log, ...prev]);
                }
            } catch (err) {
                console.error("WebSocket message error:", err);
            }
        };
    };

    const handleCreateSession = async (e) => {
        e.preventDefault();
        setIsCreating(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/sessions/create/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                const data = await res.json();
                setActiveSession(data);
                connectWebSocket(data.session_key);
            }
        } catch (error) {
            console.error("Session creation error:", error);
        } finally {
            setIsCreating(false);
        }
    };

    const handleEndSession = async () => {
        if (!activeSession) return;

        if (!confirmEnd) {
            setConfirmEnd(true);
            setTimeout(() => setConfirmEnd(false), 3000); // Reset after 3 seconds
            return;
        }

        setIsEnding(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/sessions/${activeSession.session_key}/close/`, {
                method: 'POST'
            });
            if (res.ok) {
                setActiveSession(null);
                setVerifiedStudents([]);
                setConfirmEnd(false);
                if (ws.current) ws.current.close();
            } else {
                const err = await res.json();
                alert(`Error: ${err.error || 'Could not end session'}`);
            }
        } catch (error) {
            console.error("Error ending session:", error);
            alert("Network error while ending session.");
        } finally {
            setIsEnding(false);
        }
    };

    return (
        <div className="app-container">
            {deferredPrompt && (
                <div style={{ backgroundColor: 'var(--color-primary)', color: 'white', padding: '0.75rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>Optimize your workflow with the PWA.</span>
                    <button className="btn btn-success" onClick={handleInstallClick} style={{ height: '32px', padding: '0 0.75rem', fontSize: '12px', width: 'auto' }}>
                        <Download size={14} /> Install
                    </button>
                </div>
            )}

            <header className="header">
                <div className="flex items-center gap-3">
                    <span className="ktu-mark">KTU SECURE</span>
                    <button
                        onClick={toggleMode}
                        className={`badge cursor-pointer hover:opacity-80 transition-all border-none flex items-center gap-2 ${mode === 'exam' ? 'badge-exam' : 'badge-non-exam'}`}
                        style={{ textTransform: 'uppercase', scale: '0.9', padding: '0.4rem 0.8rem' }}
                    >
                        <div className={`w-1.5 h-1.5 rounded-full ${mode === 'exam' ? 'bg-white animate-pulse' : 'bg-slate-400'}`}></div>
                        {mode.replace('_', ' ')}
                    </button>
                </div>
                <div className="flex items-center gap-6">
                    <button onClick={() => navigate('/admin-panel')} className="nav-btn nav-btn-muted">
                        <ShieldCheck size={16} /> Admin Console
                    </button>
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-400 tabular-nums">
                        <Clock size={14} /> {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                </div>
            </header>

            <main className="main-content" style={{ padding: '2rem 1.5rem' }}>
                {(!activeSession || mode === 'non_exam') ? (
                    <div style={{ animation: 'fadeRise 0.5s ease-out' }}>
                        <div className="card text-center flex flex-col items-center py-16 mb-10" style={{ borderStyle: 'dotted', borderWidth: '2px', backgroundColor: 'transparent', boxShadow: 'none' }}>
                            <div className="p-5 rounded-full mb-6" style={{ backgroundColor: 'var(--color-surface-alt)' }}>
                                <Activity size={40} className={mode === 'exam' ? 'text-slate-300' : 'text-primary'} />
                            </div>
                            <h1 className="mb-3" style={{ fontSize: '28px' }}>{mode === 'exam' ? 'No active session' : 'Non-Exam Mode'}</h1>
                            <p className="text-slate-500 text-sm max-w-[280px]">
                                {mode === 'exam'
                                    ? 'Initialize a new exam session to begin real-time student verifications.'
                                    : 'System is currently serving identification requests only. Switch to Exam Mode to manage sessions.'}
                            </p>
                        </div>

                        {mode === 'exam' && (
                            <div className="card">
                                <h2 className="section-title">New Session</h2>
                                <form onSubmit={handleCreateSession} className="mt-4">
                                    <div className="input-group">
                                        <label className="input-label">COURSE CODE</label>
                                        <input type="text" placeholder="e.g. CS301" required value={formData.course_code} onChange={e => setFormData({ ...formData, course_code: e.target.value.toUpperCase() })} />
                                    </div>
                                    <div className="input-group">
                                        <label className="input-label">COURSE NAME</label>
                                        <input type="text" placeholder="e.g. Data Structures" required value={formData.course_name} onChange={e => setFormData({ ...formData, course_name: e.target.value })} />
                                    </div>
                                    <div className="grid-2 mb-8">
                                        <div className="input-group mb-0">
                                            <label className="input-label">HALL</label>
                                            <input type="text" placeholder="Hall A" required value={formData.hall} onChange={e => setFormData({ ...formData, hall: e.target.value })} />
                                        </div>
                                        <div className="input-group mb-0">
                                            <label className="input-label">INVIGILATOR</label>
                                            <input type="text" placeholder="Dr. Mensah" required value={formData.invigilator_name} onChange={e => setFormData({ ...formData, invigilator_name: e.target.value })} />
                                        </div>
                                    </div>
                                    <button type="submit" className="btn btn-primary" disabled={isCreating} style={{ height: '52px' }}>
                                        {isCreating ? <div className="spinner" style={{ width: '1.25rem', height: '1.25rem' }}></div> : <><Play size={18} /> Start Session</>}
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                ) : (
                    <div style={{ animation: 'fadeRise 0.5s ease-out' }}>
                        <div className="card mb-8" style={{ background: 'var(--color-primary)', color: 'white', border: 'none', boxShadow: 'var(--shadow-md)', overflow: 'hidden', padding: '0' }}>
                            <div className="p-8 pb-10">
                                <div className="flex justify-between items-start mb-8">
                                    <div>
                                        <span className="text-[10px] font-extrabold tracking-[0.2em] text-white/60 mb-2 block">ACTIVE EXAM SESSION</span>
                                        <h1 style={{ color: 'white', marginBottom: '8px', fontSize: '42px', fontWeight: 800 }}>{activeSession.course_code}</h1>
                                        <p style={{ opacity: 0.9, fontSize: '15px', fontWeight: 500 }}>{activeSession.course_name}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] font-extrabold tracking-[0.2em] text-white/60 mb-2 block">VERIFIED</span>
                                        <div style={{ fontSize: '56px', fontWeight: 900, lineHeight: 0.8 }}>
                                            {verifiedStudents.length}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="px-8 py-5 flex items-center justify-between" style={{ backgroundColor: 'rgba(0,0,0,0.15)' }}>
                                <div className="text-sm font-semibold opacity-90 tracking-wide">
                                    {activeSession.hall} &bull; {activeSession.invigilator_name}
                                </div>
                                <button
                                    onClick={handleEndSession}
                                    className={`nav-btn ${confirmEnd ? 'bg-red-600 text-white border-red-600' : 'nav-btn-danger'}`}
                                    style={{ scale: '0.9', padding: '0.4rem 0.8rem', textTransform: 'uppercase', fontSize: '11px' }}
                                    disabled={isEnding}
                                >
                                    {isEnding ? (
                                        <div className="spinner" style={{ width: '1rem', height: '1rem', borderTopColor: 'white' }}></div>
                                    ) : (
                                        <><LogOut size={14} /> {confirmEnd ? 'Confirm End?' : 'End Session'}</>
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="card" style={{ padding: '1.5rem', animationDelay: '0.1s' }}>
                            <div className="text-[10px] font-extrabold tracking-[0.2em] text-slate-400 mb-3 flex items-center gap-2 uppercase"><QrCode size={14} /> Global Entry Link</div>
                            <div className="font-mono text-xs p-4 rounded-lg bg-slate-50 border border-slate-100 break-all select-all" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                                {window.location.origin}/card?id=STU001
                            </div>
                        </div>

                        <div className="flex justify-between items-end mb-6 mt-10">
                            <h2 className="section-title border-none m-0 p-0">Live Verification Log</h2>
                            <div className={`text-[10px] font-extrabold tracking-[0.2em] flex items-center gap-2 ${wsStatus === 'connected' ? 'text-emerald-600' : 'text-orange-500'}`}>
                                <span className={`w-2 h-2 rounded-full ${wsStatus === 'connected' ? 'animate-pulse' : ''}`} style={{ backgroundColor: 'currentColor' }}></span>
                                {wsStatus.toUpperCase()}
                            </div>
                        </div>

                        {verifiedStudents.length === 0 ? (
                            <div className="p-16 text-center text-slate-300 border border-slate-200 border-dashed rounded-2xl bg-white/50">
                                <Activity size={32} className="mx-auto mb-4 opacity-40 animate-pulse" />
                                <span className="text-sm font-medium italic">System ready. Waiting for student taps...</span>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4 mb-10">
                                {verifiedStudents
                                    .filter(log => log && log.student_name)
                                    .map((log, i) => (
                                        <div key={log.id} className="card p-4 flex items-center justify-between" style={{ marginBottom: '0', animation: i === 0 ? 'logArrival 0.6s cubic-bezier(0.16, 1, 0.3, 1)' : '' }}>
                                            <div className="flex items-center gap-5">
                                                <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm shadow-sm border border-slate-100" style={{ backgroundColor: 'var(--color-surface-alt)', color: 'var(--color-primary)' }}>
                                                    {log.student_name.split(' ').map(n => n[0]).join('')}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-base tracking-tight text-slate-800">{log.student_name}</div>
                                                    <div className="text-xs text-slate-500 font-medium">{log.student_id} &bull; {log.programme}</div>
                                                </div>
                                            </div>
                                            <div className="text-right text-[11px] font-bold tabular-nums text-slate-400 bg-slate-50 px-2 py-1 rounded">
                                                {new Date(log.verified_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        )}
                    </div>
                )}
            </main>
            <style>{`
                @keyframes logArrival {
                    from { opacity: 0; transform: translateY(-20px) scale(0.95); background-color: var(--color-surface); }
                    to { opacity: 1; transform: translateY(0) scale(1); background-color: white; }
                }
            `}</style>
        </div>
    );
}
