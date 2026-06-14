import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../context/AuthProvider';
import ProtectedRoute from './ProtectedRoute';
import AppBanner from '../components/AppBanner';

// 즉시 로드 — 홈에서 바로 진입하는 화면은 클릭 즉시 표시되어야 함
import Login              from '../pages/Login';
import Home               from '../pages/Home';
import LevelSelect        from '../features/jlpt/LevelSelect';
import SjptSetup          from '../features/sjpt/Setup';
import JlptMiniLevelSelect from '../features/jlpt/MiniLevelSelect';
import SjptMiniSetup      from '../features/sjpt/MiniSetup';

// 지연 로드 — 시험 중 화면은 진입 전 준비 시간이 있어 lazy 허용
const JlptExam    = lazy(() => import('../features/jlpt/Exam'));
const JlptResult  = lazy(() => import('../features/jlpt/Result'));
const SjptExam    = lazy(() => import('../features/sjpt/Exam'));
const SjptResult  = lazy(() => import('../features/sjpt/Result'));
const JlptMiniExam   = lazy(() => import('../features/jlpt/MiniExam'));
const JlptMiniResult = lazy(() => import('../features/jlpt/MiniResult'));
const SjptMiniExam   = lazy(() => import('../features/sjpt/MiniExam'));
const SjptMiniResult = lazy(() => import('../features/sjpt/MiniResult'));
const History = lazy(() => import('../pages/History'));
const Profile = lazy(() => import('../pages/Profile'));

const Fallback = () => (
  <div style={{ display:'flex', alignItems:'center', justifyContent:'center', flex:1 }}>
    <div style={{ width:28, height:28, borderRadius:'50%', border:'3px solid #F9C8DA', borderTopColor:'#E05C8A', animation:'spin 0.7s linear infinite' }} />
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
