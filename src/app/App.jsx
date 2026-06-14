import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../context/AuthProvider';
import ProtectedRoute from './ProtectedRoute';
import AppBanner from '../components/AppBanner';

// 즉시 로드
import Login from '../pages/Login';
import Home  from '../pages/Home';

// 지연 로드 (Phase 2)
const LevelSelect = lazy(() => import('../features/jlpt/LevelSelect'));
const JlptExam    = lazy(() => import('../features/jlpt/Exam'));
const JlptResult  = lazy(() => import('../features/jlpt/Result'));

// 지연 로드 (Phase 3)
const SjptSetup   = lazy(() => import('../features/sjpt/Setup'));
const SjptExam    = lazy(() => import('../features/sjpt/Exam'));
const SjptResult  = lazy(() => import('../features/sjpt/Result'));

// 지연 로드 (미니 테스트)
const JlptMiniLevelSelect = lazy(() => import('../features/jlpt/MiniLevelSelect'));
const JlptMiniExam        = lazy(() => import('../features/jlpt/MiniExam'));
const JlptMiniResult      = lazy(() => import('../features/jlpt/Result'));
const SjptMiniSetup       = lazy(() => import('../features/sjpt/MiniSetup'));
const SjptMiniExam        = lazy(() => import('../features/sjpt/MiniExam'));
const SjptMiniResult      = lazy(() => import('../features/sjpt/MiniResult'));

// 지연 로드 (서브 페이지)
const History = lazy(() => import('../pages/History'));
const Profile = lazy(() => import('../pages/Profile'));

const Fallback = () => (
  <div className="nm-app" style={{ alignItems: 'center', justifyContent: 'center' }}>
    <p style={{ fontSize: '3rem' }}>🐱</p>
  </div>
);

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppBanner />
        <div className="nm-app">
          <Suspense fallback={<Fallback />}>
            <Routes>
              <Route path="/login" element={<Login />} />

              <Route path="/" element={
                <ProtectedRoute><Home /></ProtectedRoute>
              } />

              {/* Phase 2 — JLPT */}
              <Route path="/jlpt" element={
                <ProtectedRoute><LevelSelect /></ProtectedRoute>
              } />
              <Route path="/jlpt/exam" element={
                <ProtectedRoute><JlptExam /></ProtectedRoute>
              } />
              <Route path="/jlpt/result/:id" element={
                <ProtectedRoute><JlptResult /></ProtectedRoute>
              } />

              {/* Phase 3 — SJPT */}
              <Route path="/sjpt" element={
                <ProtectedRoute><SjptSetup /></ProtectedRoute>
              } />
              <Route path="/sjpt/exam" element={
                <ProtectedRoute><SjptExam /></ProtectedRoute>
              } />
              <Route path="/sjpt/result/:id" element={
                <ProtectedRoute><SjptResult /></ProtectedRoute>
              } />

              {/* 미니 테스트 — JLPT */}
              <Route path="/jlpt/mini" element={
                <ProtectedRoute><JlptMiniLevelSelect /></ProtectedRoute>
              } />
              <Route path="/jlpt/mini/exam" element={
                <ProtectedRoute><JlptMiniExam /></ProtectedRoute>
              } />
              <Route path="/jlpt/mini/result/:id" element={
                <ProtectedRoute><JlptMiniResult /></ProtectedRoute>
              } />

              {/* 미니 테스트 — SJPT */}
              <Route path="/sjpt/mini" element={
                <ProtectedRoute><SjptMiniSetup /></ProtectedRoute>
              } />
              <Route path="/sjpt/mini/exam" element={
                <ProtectedRoute><SjptMiniExam /></ProtectedRoute>
              } />
              <Route path="/sjpt/mini/result" element={
                <ProtectedRoute><SjptMiniResult /></ProtectedRoute>
              } />

              <Route path="/history" element={
                <ProtectedRoute><History /></ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute><Profile /></ProtectedRoute>
              } />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
