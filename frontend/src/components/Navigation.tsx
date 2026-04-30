import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { Languages, Settings, LogOut, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './UI';
import { motion, AnimatePresence } from 'motion/react';

export const Navbar: React.FC = () => {
  const { language, setLanguage, t, state, logout } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isAuthPage = ['/login', '/register'].includes(location.pathname);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className={cn(
      "absolute top-0 left-0 right-0 z-50 transition-all duration-500",
      isScrolled ? "bg-white/70 backdrop-blur-xl border-b border-gray-100 py-0" : "bg-transparent border-transparent py-4"
    )}>
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-12">
          <NavLink to="/" className="text-xl font-bold tracking-tighter text-blue-600">
            Ainterview
          </NavLink>
          
          {!isAuthPage && (
            <div className="hidden md:flex items-center gap-8">
              {['home', 'create', 'history'].map((item) => (
                <NavLink
                  key={item}
                  to={item === 'home' ? '/' : `/${item}`}
                  className={({ isActive }) => cn(
                    "text-sm font-bold transition-all hover:text-blue-600 py-2 relative",
                    isActive ? "text-blue-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-600 after:rounded-full" : "text-gray-400"
                  )}
                >
                  {t(`nav.${item}`)}
                </NavLink>
              ))}
            </div>
          )}
        </div>

        {!isAuthPage ? (
          <div className="flex items-center gap-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLanguage(language === 'en' ? 'zh' : 'en')}
              className="text-gray-400 hover:text-blue-600 font-bold"
            >
              <Languages className="w-4 h-4 mr-2" />
              <span className="uppercase">{language}</span>
            </Button>

            <div className="h-8 w-px bg-gray-100 mx-1" />

            {state.isAuthenticated ? (
              <div 
                className="relative"
                onMouseEnter={() => setDropdownOpen(true)}
                onMouseLeave={() => setDropdownOpen(false)}
              >
                <div className="flex items-center gap-3 bg-slate-50 pl-4 pr-2 py-1.5 rounded-2xl border border-slate-100 cursor-pointer hover:bg-slate-100 transition-all group">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-black text-slate-900 leading-tight">{state.user.name}</p>
                    <p className="text-[10px] font-bold text-blue-500 tracking-widest">{language === 'zh' ? '设置' : 'Settings'}</p>
                  </div>
                  <div className="relative">
                    <img
                      src={state.user.avatar}
                      alt="Avatar"
                      className="w-10 h-10 rounded-xl border-2 border-white shadow-sm object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
                  </div>
                  <ChevronDown className={cn("w-4 h-4 text-slate-300 transition-transform duration-300", dropdownOpen && "rotate-180")} />
                </div>

                {dropdownOpen && (
                  <div className="absolute top-full right-0 w-56 pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-slate-50 p-2 overflow-hidden">
                      <Link to="/profile" className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors text-sm font-bold text-slate-600">
                        <Settings className="w-4 h-4 text-blue-500" />
                        {t('auth.dropdown.settings')}
                      </Link>
                      <div className="h-px bg-slate-50 my-1" />
                      <button 
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 transition-colors text-sm font-bold text-red-500"
                      >
                        <LogOut className="w-4 h-4" />
                        {t('auth.dropdown.logout')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3 text-sm">
                <NavLink to="/login" className="px-5 py-2.5 font-black text-slate-400 hover:text-blue-600 transition-all">
                  {t('auth.register.loginNow')}
                </NavLink>
                <Button size="sm" className="rounded-xl px-6 py-2.5 font-black bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-100" onClick={() => navigate('/register')}>
                  {t('auth.login.registerNow')}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLanguage(language === 'en' ? 'zh' : 'en')}
              className="text-gray-400 hover:text-blue-600 font-bold"
            >
              <Languages className="w-4 h-4 mr-2" />
              <span className="uppercase">{language}</span>
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
};

export const BackToTop: React.FC = () => {
  const [visible, setVisible] = useState(false);

  React.useEffect(() => {
    const toggleVisible = () => {
      const scrolled = document.documentElement.scrollTop;
      if (scrolled > 300) {
        setVisible(true);
      } else if (scrolled <= 300) {
        setVisible(false);
      }
    };
    window.addEventListener('scroll', toggleVisible);
    return () => window.removeEventListener('scroll', toggleVisible);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.5, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.5, y: 20 }}
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 z-[60] w-12 h-12 bg-blue-600 text-white rounded-2xl shadow-xl shadow-blue-200 flex items-center justify-center hover:bg-blue-700 transition-colors group"
        >
          <ChevronUp className="w-6 h-6 group-hover:-translate-y-1 transition-transform" />
        </motion.button>
      )}
    </AnimatePresence>
  );
};

export const Footer: React.FC = () => {
  const { t } = useApp();
  
  return (
    <footer className="bg-white py-12 border-t border-gray-100 mt-20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col items-center justify-center gap-6">
          <span className="text-xl font-bold tracking-tighter text-blue-600 opacity-50">Ainterview</span>
          <p className="text-sm text-gray-400">{t('footer.copy')}</p>
          <div className="flex gap-8">
            {['privacy', 'terms', 'twitter', 'discord'].map((item) => (
              <a key={item} href="#" className="text-xs font-medium text-gray-400 hover:text-blue-600 transition-colors">
                {t(`footer.${item}`)}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};
