import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { Button, Card } from '../components/UI';
import { user, resume as resumeApi, settings as settingsApi } from '../services/api';
import {
  User,
  Mail,
  Briefcase,
  FileText,
  Trash2,
  BarChart3,
  Star,
  RefreshCcw,
  CheckCircle,
  Plus,
  Camera,
  ChevronDown,
  LogOut,
  Eye,
  X,
  Loader2,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { POSITION_OPTIONS } from '../constants';

const ProfilePage: React.FC = () => {
  const { t, state, updateState, logout, language, setLanguage } = useApp();
  const [showToast, setShowToast] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(state.user.name);
  const [role, setRole] = useState(state.user.role);
  const [resumes, setResumes] = useState<any[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<HTMLInputElement | null>(null);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [viewingResume, setViewingResume] = useState<any | null>(null);
  const [pdfError, setPdfError] = useState(false);
  const [showTextFallback, setShowTextFallback] = useState(false);
  const [duplicateConfirm, setDuplicateConfirm] = useState<{ file: File; existingId: string; existingName: string } | null>(null);

  // Settings state
  const [aiPersonality, setAiPersonality] = useState('professional');
  const [feedbackLevel, setFeedbackLevel] = useState('medium');
  const [savingSettings, setSavingSettings] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    setName(state.user.name);
    setRole(state.user.role);
  }, [state.user.name, state.user.role]);

  useEffect(() => {
    refreshResumes();
  }, []);

  // Poll for unparsed resumes until they're done
  useEffect(() => {
    const hasUnparsed = resumes.some(r => !r.isParsed);
    if (!hasUnparsed) return;
    const timer = setInterval(() => {
      refreshResumes();
    }, 3000);
    return () => clearInterval(timer);
  }, [resumes]);

  useEffect(() => {
    if (state.isAuthenticated) {
      settingsApi.get().then(res => {
        const s = res.data;
        if (s) {
          setAiPersonality(s.aiPersonality || 'professional');
          setFeedbackLevel(s.feedbackLevel || 'medium');
        }
      }).catch(() => {});
    }
  }, [state.isAuthenticated]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await user.updateMe({ name, role });
      updateState({ user: { ...state.user, name, role } });
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch {} finally {
      setSaving(false);
    }
  };

  const handleUploadResume = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Frontend file type validation
    const ext = file.name.toLowerCase().split('.').pop();
    if (!ext || !['pdf', 'doc', 'docx'].includes(ext)) {
      alert(language === 'zh' ? '仅支持 PDF、DOC、DOCX 格式' : 'Only PDF, DOC, DOCX formats are supported');
      e.target.value = '';
      return;
    }
    // Check for duplicate file name
    const existing = resumes.find(r => r.fileName === file.name);
    if (existing) {
      setDuplicateConfirm({ file, existingId: existing.id, existingName: existing.fileName });
      e.target.value = '';
      return;
    }
    // No duplicate, proceed with upload
    await doUploadResume(file);
    e.target.value = '';
  };

  const refreshResumes = async () => {
    try {
      const res = await user.getResumes();
      setResumes(Array.isArray(res.data) ? res.data : res.data?.resumes || []);
    } catch (err) {
      console.error('Failed to refresh resume list:', err);
    }
  };

  const doUploadResume = async (file: File) => {
    setUploadingResume(true);
    try {
      await resumeApi.upload(file);
    } catch (err) {
      console.error('Resume upload failed:', err);
    }
    await refreshResumes();
    setUploadingResume(false);
  };

  const handleDuplicateReplace = async () => {
    if (!duplicateConfirm) return;
    const { file, existingId } = duplicateConfirm;
    setDuplicateConfirm(null);
    try {
      await resumeApi.delete(existingId);
    } catch (err) {
      console.error('Failed to delete existing resume:', err);
    }
    await doUploadResume(file);
  };

  const handleDuplicateCancel = () => {
    setDuplicateConfirm(null);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string;
      try {
        await user.updateMe({ avatar: base64 });
        updateState({ user: { ...state.user, avatar: base64 } });
      } catch {}
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteResume = async (id: string) => {
    setDeleting(id);
    try {
      await resumeApi.delete(id);
      setResumes(prev => prev.filter(r => r.id !== id));
    } catch {} finally {
      setDeleting(null);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await settingsApi.update({
        aiPersonality,
        feedbackLevel,
        language,
      });
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch {} finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-24 pt-10">
      {/* Header */}
      <header>
        <h1 className="text-3xl font-bold text-gray-900">{t('profile.title')}</h1>
        <p className="text-gray-400 mt-1">{t('profile.subtitle')}</p>
      </header>

      {/* Basic Info */}
      <Card className="p-6 bg-white/40 backdrop-blur-2xl border-white/20 shadow-[0_15px_50px_rgba(0,0,0,0.02)] space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">{t('profile.basic.title')}</h2>
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? '...' : t('profile.basic.save')}
          </Button>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-2 group/avatar shrink-0">
            <div
              className="relative w-24 h-24 bg-gray-100 rounded-xl flex items-center justify-center overflow-hidden cursor-pointer border border-gray-200/50"
              onClick={() => avatarFile?.click()}
            >
              {state.user.avatar ? (
                <img src={state.user.avatar} alt="Avatar" className="w-full h-full object-cover group-hover/avatar:scale-105 transition-transform" referrerPolicy="no-referrer" />
              ) : (
                <User className="w-10 h-10 text-gray-300" />
              )}
              <div className="absolute inset-0 bg-gray-900/30 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="w-5 h-5 text-white" />
              </div>
            </div>
            <input type="file" accept="image/*" ref={setAvatarFile} onChange={handleAvatarChange} className="hidden" />
            <button className="text-xs text-blue-600 font-medium hover:underline" onClick={() => avatarFile?.click()}>
              {t('profile.basic.avatarChange')}
            </button>
          </div>

          {/* Fields */}
          <div className="flex-1 grid md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-400">{t('profile.basic.name')}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200/50 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-200 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-400 flex items-center gap-1"><Mail className="w-3 h-3" />{t('profile.basic.email')}</label>
              <input type="email" value={state.user.email} disabled className="w-full bg-gray-50 border border-gray-200/50 rounded-xl px-4 py-2.5 text-sm text-gray-400 cursor-not-allowed" />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-medium text-gray-400 flex items-center gap-1"><Briefcase className="w-3 h-3" />{t('profile.basic.target')}</label>
              <div className="relative">
                <select
                  value={POSITION_OPTIONS.includes(role) ? role : ''}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200/50 rounded-xl px-4 py-2.5 pr-8 text-sm font-medium text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-200 transition-all appearance-none cursor-pointer"
                >
                  <option value="" disabled>选择目标岗位</option>
                  {POSITION_OPTIONS.map(pos => <option key={pos} value={pos}>{pos}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                {!POSITION_OPTIONS.includes(role) && role && (
                  <p className="text-xs text-gray-400 mt-1">当前: {role}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Resumes */}
      <Card className="p-6 bg-white/40 backdrop-blur-2xl border-white/20 shadow-[0_15px_50px_rgba(0,0,0,0.02)] space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">{t('profile.resume.title')}</h2>
          <button className="flex items-center gap-1.5 text-blue-600 font-medium text-xs hover:underline" onClick={() => !uploadingResume && document.getElementById('resume-upload-input')?.click()}>
            {uploadingResume ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />{language === 'zh' ? '解析中...' : 'Parsing...'}</> : <><Plus className="w-3.5 h-3.5" />{t('profile.resume.upload')}</>}
          </button>
          <input id="resume-upload-input" type="file" accept=".pdf,.doc,.docx" onChange={handleUploadResume} className="hidden" />
        </div>

        <div className="space-y-2">
          {resumes.length > 0 ? resumes.map((r: any) => (
            <div key={r.id} className={cn("flex items-center justify-between p-3 rounded-xl border transition-all group", r.isParsed ? "bg-gray-50/50 hover:bg-white hover:shadow-sm border-transparent hover:border-gray-100" : "bg-blue-50/30 border-blue-100/50")}>
              <div className="flex items-center gap-3">
                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", r.isParsed ? (r.fileType === 'pdf' ? "bg-red-50 text-red-500" : "bg-blue-50 text-blue-500") : "bg-blue-50 text-blue-500")}>
                  {r.isParsed ? <FileText className="w-4 h-4" /> : <Loader2 className="w-4 h-4 animate-spin" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{r.fileName}</p>
                  {r.isParsed ? (
                    <p className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })} · {(r.fileSize / 1024).toFixed(0)} KB</p>
                  ) : (
                    <p className="text-xs text-blue-500">{language === 'zh' ? '解析中，请稍候...' : 'Parsing, please wait...'}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {(r.isParsed || r.content || (r.skills && r.skills.length > 0)) && (
                  <button onClick={() => { setViewingResume(r); setPdfError(false); setShowTextFallback(false); }} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-300 hover:text-blue-500 hover:bg-blue-50 transition-all" title={language === 'zh' ? '查看简历' : 'View resume'}>
                    <Eye className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => handleDeleteResume(r.id)} disabled={deleting === r.id} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-50">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )) : (
            <p className="text-sm text-gray-400 text-center py-6">{t('profile.resume.empty')}</p>
          )}
        </div>
      </Card>

      {/* Stats */}
      <Card className="p-6 bg-white/40 backdrop-blur-2xl border-white/20 shadow-[0_15px_50px_rgba(0,0,0,0.02)] space-y-5">
        <h2 className="text-lg font-semibold text-gray-800">{t('profile.stats.title')}</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="flex items-center gap-4 p-4 rounded-xl bg-blue-50/40">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-200">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 leading-none">{state.user.stats.mocksCount}</p>
              <p className="text-xs text-gray-400 mt-0.5">{t('profile.stats.total')}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 rounded-xl bg-green-50/40">
            <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center text-white shadow-sm shadow-green-200">
              <Star className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 leading-none">
                {Math.round(state.user.stats.avgScore)}<span className="text-sm text-gray-400 font-normal ml-1">/100</span>
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{t('profile.stats.score')}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Interview Preferences */}
      <Card className="p-6 bg-white/40 backdrop-blur-2xl border-white/20 shadow-[0_15px_50px_rgba(0,0,0,0.02)] space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">{t('profile.preferences.title')}</h2>
          <Button onClick={handleSaveSettings} disabled={savingSettings} size="sm">
            {savingSettings ? '...' : t('profile.basic.save')}
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {/* AI Personality */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-400">{t('profile.preferences.personality')}</label>
            <div className="space-y-2">
              {[
                { value: 'professional', label: t('profile.preferences.personalities.professional') },
                { value: 'encouraging', label: t('profile.preferences.personalities.encouraging') },
                { value: 'stress', label: t('profile.preferences.personalities.stress') },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setAiPersonality(opt.value)}
                  className={cn(
                    "w-full px-4 py-2.5 rounded-xl text-sm font-medium transition-all border",
                    aiPersonality === opt.value
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-gray-50 text-gray-600 border-gray-200/50 hover:border-blue-200"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Feedback Level */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-400">{t('profile.preferences.feedback')}</label>
            <div className="space-y-2">
              {[
                { value: 'short', label: t('profile.preferences.feedbackLevels.short') },
                { value: 'medium', label: t('profile.preferences.feedbackLevels.medium') },
                { value: 'deep', label: t('profile.preferences.feedbackLevels.deep') },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setFeedbackLevel(opt.value)}
                  className={cn(
                    "w-full px-4 py-2.5 rounded-xl text-sm font-medium transition-all border",
                    feedbackLevel === opt.value
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-gray-50 text-gray-600 border-gray-200/50 hover:border-blue-200"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Language */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-400">{t('profile.preferences.language')}</label>
            <div className="space-y-2">
              {[
                { value: 'zh', label: '中文' },
                { value: 'en', label: 'English' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setLanguage(opt.value as any)}
                  className={cn(
                    "w-full px-4 py-2.5 rounded-xl text-sm font-medium transition-all border",
                    language === opt.value
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-gray-50 text-gray-600 border-gray-200/50 hover:border-blue-200"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Logout */}
      <div className="flex justify-center pt-4">
        <button
          onClick={() => { logout(); navigate('/'); }}
          className="flex items-center gap-2 px-8 py-3 rounded-xl border border-dashed border-gray-200 text-gray-400 hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50/30 transition-all text-sm font-medium"
        >
          <LogOut className="w-4 h-4" />
          {t('profile.logout')}
        </button>
      </div>

      {/* Duplicate Name Confirm Modal */}
      <AnimatePresence>
        {duplicateConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleDuplicateCancel}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-amber-500" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900">
                    {t('profile.resume.duplicateTitle')}
                  </h3>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {t('profile.resume.duplicateMsg').replace('{name}', duplicateConfirm.existingName)}
                </p>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleDuplicateCancel}
                    className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 font-medium text-sm hover:bg-gray-200 transition-all"
                  >
                    {t('profile.resume.cancel')}
                  </button>
                  <button
                    onClick={handleDuplicateReplace}
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition-all"
                  >
                    {t('profile.resume.replace')}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Resume View Modal */}
      <AnimatePresence>
        {viewingResume && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingResume(null)}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-blue-500" />
                  <h3 className="text-lg font-semibold text-gray-900">{viewingResume.fileName}</h3>
                </div>
                <button onClick={() => setViewingResume(null)} className="w-9 h-9 rounded-full hover:bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-900 transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {viewingResume.fileType === 'pdf' && !showTextFallback ? (
                pdfError ? (
                  <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                    <FileText className="w-12 h-12 mb-3" />
                    <p className="text-sm font-medium">{language === 'zh' ? '无法加载 PDF 文件' : 'Failed to load PDF file'}</p>
                    <p className="text-xs mt-1">{language === 'zh' ? '请尝试重新上传或查看文本内容' : 'Try re-uploading or view text content'}</p>
                    {viewingResume.content && (
                      <button onClick={() => setShowTextFallback(true)} className="mt-4 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-sm font-medium hover:bg-blue-100 transition-all">
                        {language === 'zh' ? '查看文本内容' : 'View text content'}
                      </button>
                    )}
                  </div>
                ) : (
                  <iframe
                    src={resumeApi.getFileUrl(viewingResume.id)}
                    className="w-full border-0"
                    style={{ height: '70vh' }}
                    title={viewingResume.fileName}
                    onError={() => { setPdfError(true); }}
                  />
                )
              ) : (
                <>
                  {/* Skills */}
                  {viewingResume.skills?.length > 0 && (
                    <div className="px-6 pt-4">
                      <h4 className="text-xs font-bold text-gray-400 mb-2">{language === 'zh' ? '技能标签' : 'Skills'}</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {viewingResume.skills.map((skill: string, i: number) => (
                          <span key={i} className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 text-xs font-medium">{skill}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Content */}
                  <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
                    <h4 className="text-xs font-bold text-gray-400 mb-2">{language === 'zh' ? '简历内容' : 'Resume Content'}</h4>
                    <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{viewingResume.content}</div>
                  </div>
                </>
              )}

              <div className="p-4 bg-gray-50/50 border-t border-gray-100">
                <button onClick={() => setViewingResume(null)} className="w-full py-2.5 rounded-xl bg-gray-100 text-gray-600 font-medium text-sm hover:bg-gray-200 transition-all">
                  {language === 'zh' ? '关闭' : 'Close'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100]"
          >
            <div className="bg-gray-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="font-medium text-sm">{t('profile.toast')}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProfilePage;