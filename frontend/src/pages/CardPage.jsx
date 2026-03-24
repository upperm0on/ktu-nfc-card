import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle, AlertCircle, User, Building, UserCheck, ShieldCheck, ChevronRight } from 'lucide-react';
import { API_BASE_URL, WS_BASE_URL } from '../config/api';

export default function CardPage() {
    const [searchParams] = useSearchParams();
    const studentId = searchParams.get('id');
    const sessionKey = searchParams.get('session');

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [mode, setMode] = useState(null);
    const [student, setStudent] = useState(null);
    const [session, setSession] = useState(null);

    const [wsStatus, setWsStatus] = useState('disconnected');
    const [verificationStatus, setVerificationStatus] = useState('idle'); // idle, verifying, success
    const ws = useRef(null);

    useEffect(() => {
        if (!studentId) {
            setError("Invalid Card URL: Missing Student ID");
            setLoading(false);
            return;
        }
        initPage();

        return () => {
            if (ws.current) ws.current.close();
        };
    }, [studentId, sessionKey]);

    const initPage = async () => {
        setLoading(true);
        try {
            const modeRes = await fetch(`${API_BASE_URL}/api/mode/`);
            if (!modeRes.ok) throw new Error("Failed to fetch system mode.");
            const modeData = await modeRes.json();
            setMode(modeData.mode);

            const studentRes = await fetch(`${API_BASE_URL}/api/student/${studentId}/`);
            if (!studentRes.ok) {
                if (studentRes.status === 404) throw new Error(`Student ID ${studentId} not found in the records.`);
                throw new Error("Unable to retrieve student profile.");
            }
            const studentData = await studentRes.json();
            setStudent(studentData);

            if (modeData.mode === 'exam') {
                let currentSession = null;
                if (sessionKey) {
                    const sessionRes = await fetch(`${API_BASE_URL}/api/sessions/${sessionKey}/`);
                    if (sessionRes.ok) currentSession = await sessionRes.json();
                }
                if (!currentSession) {
                    const activeRes = await fetch(`${API_BASE_URL}/api/sessions/active/`);
                    if (!activeRes.ok) throw new Error("No exams are currently active in this session.");
                    currentSession = await activeRes.json();
                }
                setSession(currentSession);
                connectWebSocket(currentSession.session_key);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            // Artificial delay to show beautiful skeleton/loading states
            setTimeout(() => setLoading(false), 800);
        }
    };

    const connectWebSocket = (key) => {
        ws.current = new WebSocket(`${WS_BASE_URL}/ws/session/${key}/`);
        ws.current.onopen = () => setWsStatus('connected');
        ws.current.onclose = () => setWsStatus('disconnected');
        ws.current.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'student_verified' && data.log?.student_id === studentId) {
                setVerificationStatus('success');
                setTimeout(() => window.close(), 3000);
            }
        };
    };

    const handleVerify = () => {
        if (!ws.current || ws.current.readyState !== WebSocket.OPEN) return;
        setVerificationStatus('verifying');
        ws.current.send(JSON.stringify({
            action: 'verify_student',
            student_id: student.student_id,
            student_name: student.full_name,
            programme: student.programme,
            level: student.level,
            invigilator_name: session.invigilator_name
        }));
    };

    if (loading) {
        return (
            <div className="app-container">
                <header className="header">
                    <span className="ktu-mark">KTU SECURE</span>
                </header>
                <div className="main-content">
                    <div className="flex flex-col items-center mb-8">
                        <div className="skeleton skeleton-circle mb-6" style={{ width: '120px', height: '120px' }}></div>
                        <div className="skeleton mb-2" style={{ width: '200px', height: '32px' }}></div>
                        <div className="skeleton" style={{ width: '100px', height: '20px' }}></div>
                    </div>
                    <div className="grid-2 mb-8">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i}>
                                <div className="skeleton mb-1" style={{ width: '50px', height: '12px' }}></div>
                                <div className="skeleton" style={{ width: '100%', height: '18px' }}></div>
                            </div>
                        ))}
                    </div>
                    <div className="skeleton rounded-lg" style={{ width: '100%', height: '100px', marginBottom: '2rem' }}></div>
                    <div className="skeleton rounded-lg" style={{ width: '100%', height: '52px' }}></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="app-container">
                <header className="header">
                    <span className="ktu-mark">KTU SECURE</span>
                </header>
                <div className="main-content flex flex-col items-center justify-center text-center">
                    <div className="p-4 rounded-full bg-red-50 mb-6" style={{ animation: 'shake 0.5s ease-in-out' }}>
                        <AlertCircle size={48} color="var(--color-error)" />
                    </div>
                    <h1 className="mb-2" style={{ fontSize: '24px' }}>Access Unavailable</h1>
                    <p className="text-muted mb-8" style={{ fontSize: '15px', maxWidth: '280px' }}>{error}</p>
                    <button className="btn btn-primary" onClick={() => window.location.reload()} style={{ width: 'auto' }}>
                        Try Again
                    </button>
                </div>
                <style>{`
                    @keyframes shake {
                        0%, 100% { transform: translateX(0); }
                        25% { transform: translateX(-5px); }
                        75% { transform: translateX(5px); }
                    }
                `}</style>
            </div>
        );
    }

    if (verificationStatus === 'success') {
        return (
            <div className="verification-success">
                <div className="checkmark-anim">
                    <CheckCircle size={48} />
                </div>
                <h1 className="mb-2">Verified</h1>
                <p className="text-muted">Identity logged successfully</p>
                <div className="mt-12 text-sm text-center text-muted opacity-50">
                    This window will close automatically
                </div>
            </div>
        );
    }

    return (
        <div className="app-container">
            <header className="header">
                <span className="ktu-mark">KTU SECURE</span>
                {mode === 'exam' && (
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-800 bg-blue-50 px-3 py-1 rounded-full">
                        <ShieldCheck size={12} /> Exam Mode
                    </div>
                )}
            </header>

            <main className="main-content" style={{ padding: '2rem 1.5rem' }}>
                <div className="flex flex-col items-center mb-10" style={{ animation: 'fadeRise 0.5s ease-out 0.1s backwards' }}>
                    <div className="mb-8">
                        <div className="rounded-3xl flex items-center justify-center overflow-hidden border-4 border-white shadow-soft"
                            style={{ width: '140px', height: '140px', background: 'var(--color-surface-alt)' }}>
                            {student.photo_url ? (
                                <img src={student.photo_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <User size={64} className="text-slate-300" />
                            )}
                        </div>
                    </div>

                    <h1 className="display-name mb-3 text-center" style={{ fontSize: '42px', fontWeight: 800 }}>{student.full_name}</h1>
                    <div className="px-4 py-1.5 rounded-full text-xs font-mono font-black tracking-[0.2em] text-slate-500 uppercase border border-slate-200"
                        style={{ background: 'white' }}>
                        ID {student.student_id}
                    </div>
                </div>

                <div className="card" style={{ animation: 'fadeRise 0.5s ease-out 0.2s backwards' }}>
                    <h3 className="section-title">Academic Profile</h3>
                    <div className="grid-2">
                        <div>
                            <span className="metadata-label">PROGRAMME</span>
                            <div className="metadata-value">{student.programme}</div>
                        </div>
                        <div>
                            <span className="metadata-label">DEPARTMENT</span>
                            <div className="metadata-value">{student.department}</div>
                        </div>
                        <div>
                            <span className="metadata-label">LEVEL</span>
                            <div className="metadata-value">{student.level}</div>
                        </div>
                        <div>
                            <span className="metadata-label">YEAR</span>
                            <div className="metadata-value">{student.academic_year || '2025/2026'}</div>
                        </div>
                    </div>
                </div>

                {mode === 'exam' && session && (
                    <div className="card" style={{ borderColor: 'var(--color-primary)', borderLeftWidth: '6px', animation: 'fadeRise 0.5s ease-out 0.3s backwards' }}>
                        <div className="flex items-center gap-2 mb-4">
                            <ShieldCheck size={16} className="text-blue-700" />
                            <span className="text-xs font-bold tracking-widest text-blue-700 uppercase">Verification Context</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <div className="font-bold text-xl leading-tight mb-1 text-blue-900">{session.course_code}</div>
                                <div className="text-sm text-slate-500 font-medium">{session.course_name}</div>
                            </div>
                            <div className="pl-6 border-l border-slate-200 text-right shrink-0">
                                <div className="text-[10px] font-extrabold text-slate-400 mb-1 uppercase tracking-widest">HALL</div>
                                <div className="text-base font-bold text-slate-700">{session.hall}</div>
                            </div>
                        </div>
                    </div>
                )}

                {!mode === 'exam' && (
                    <div className="text-center text-sm text-muted py-8 border-t border-border mt-8" style={{ borderColor: 'var(--color-border)', animation: 'fadeRise 0.5s ease-out 0.3s backwards' }}>
                        System is currently in Non-Exam Mode.<br />Basic student identity displayed.
                    </div>
                )}

                {mode === 'exam' && (
                    <div style={{ animation: 'fadeRise 0.5s ease-out 0.4s backwards' }}>
                        <button
                            className={`btn btn-success ${verificationStatus === 'verifying' ? 'opacity-80' : ''}`}
                            onClick={handleVerify}
                            disabled={verificationStatus !== 'idle' || wsStatus !== 'connected'}
                        >
                            {verificationStatus === 'verifying' ? (
                                <div className="spinner" style={{ width: '1.25rem', height: '1.25rem' }}></div>
                            ) : (
                                <><UserCheck size={18} /> Verify Identity</>
                            )}
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
}
