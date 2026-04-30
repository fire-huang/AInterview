import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { Navbar, Footer, BackToTop } from './components/Navigation';
import Background from './components/Background';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import Home from './pages/Home';
import Create from './pages/Create';
import Room from './pages/Room';
import Login from './pages/Login';
import Register from './pages/Register';
import Report from './pages/Report';
import Profile from './pages/Profile';
import History from './pages/History';

const PageWrapper = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
    className="w-full"
  >
    {children}
  </motion.div>
);

const AppContent = () => {
  const location = useLocation();
  const isAuthPage = ['/login', '/register'].includes(location.pathname);
  const isRoomPage = location.pathname === '/room';

  return (
    <div className={cn(
        "relative font-sans selection:bg-blue-100 selection:text-blue-600 overflow-x-hidden",
        isRoomPage ? "h-screen overflow-hidden" : "min-h-screen"
      )}>
      <Background />
      {!isAuthPage && !isRoomPage && <Navbar />}
      <main className={cn(
        "relative z-10",
        isRoomPage ? "h-screen" : "min-h-[calc(100vh-80px)] max-w-5xl mx-auto px-6 pt-20 pb-12"
      )}>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<PageWrapper><Home /></PageWrapper>} />
            <Route path="/create" element={<PageWrapper><Create /></PageWrapper>} />
            <Route path="/room" element={<PageWrapper><Room /></PageWrapper>} />
                        <Route path="/login" element={<PageWrapper><Login /></PageWrapper>} />
            <Route path="/register" element={<PageWrapper><Register /></PageWrapper>} />
            <Route path="/report" element={<PageWrapper><Report /></PageWrapper>} />
            <Route path="/profile" element={<PageWrapper><Profile /></PageWrapper>} />
            <Route path="/history" element={<PageWrapper><History /></PageWrapper>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
      </main>
      {!isAuthPage && !isRoomPage && <BackToTop />}
      {!isAuthPage && !isRoomPage && <Footer />}
    </div>
  );
};

export default function App() {
  return (
    <Router>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </Router>
  );
}