import React from 'react';
import { Routes, Route } from 'react-router-dom';
import CardPage from './pages/CardPage';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';

export default function App() {
    return (
        <Routes>
            {/* P4 — Student Card Page (NFC tap lands here) */}
            <Route path="/card" element={<CardPage />} />

            {/* P6 — Invigilator Dashboard */}
            <Route path="/dashboard" element={<Dashboard />} />

            {/* P9 — System Admin */}
            <Route path="/admin-panel" element={<Admin />} />

            {/* Default redirect to admin for demo */}
            <Route path="/" element={<Admin />} />
        </Routes>
    );
}
