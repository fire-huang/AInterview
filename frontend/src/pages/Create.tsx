import React, { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Button, Card } from '../components/UI';
import { user, resume, interview } from '../services/api';
import { POSITION_OPTIONS, INTERVIEW_TYPES } from '../constants';
import { cn } from '../lib/utils';
import {
  CloudUpload,
  Search,
  CheckCircle2,
  ChevronDown,
  X,
  FileText,
  Clock,
  Rocket,
  Loader2,
  Eye,
} from 'lucide-react';

interface Resume {
  id: string;
  name: string;
  date: string;
  size: string;
  isParsed?: boolean;
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const CreatePage: React.FC = () => {
  const { t, state, language } = useApp();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const additionalRef = useRef<HTMLTextAreaElement>(null);

  const [position, setPosition] = useState(POSITION_OPTIONS[0]);
  const [interviewType, setInterviewType] = useState(INTERVIEW_TYPES[0].value);
  const [difficulty, setDifficulty] = useState(2);
  const [company, setCompany] = useState('');
  const [focus, setFocus] = useState<number[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const [realResumes, setRealResumes] = useState<any[]>([]);
  const [resumesLoading, setResumesLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [viewingResume, setViewingResume] = useState<any | null>(null);
  const [pdfError, setPdfError] = useState(false);
  const [showTextFallback, setShowTextFallback] = useState(false);
  const [duplicateConfirm, setDuplicateConfirm] = useState<{ file: File; existingId: string; existingName: string } | null>(null);

  const displayResumes: Resume[] = realResumes.map((r: any) => ({
    id: r.id,
    name: r.fileName,
    date: r.createdAt ? new Date(r.createdAt).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '',
    size: formatFileSize(r.fileSize || 0),
    isParsed: r.isParsed,
  }));

  const selectedResume = displayResumes.find(r => r.id === selectedResumeId);

  // Poll for unparsed resumes until they're done
  useEffect(() => {
    const hasUnparsed = realResumes.some(r => !r.isParsed);
    if (!hasUnparsed) return;
    const timer = setInterval(() => {
      refreshResumes();
    }, 3000);
    return () => clearInterval(timer);
  }, [realResumes]);

  const openResumeModal = () => {
    setShowModal(true);
    if (state.isAuthenticated && realResumes.length === 0) {
      setResumesLoading(true);
      user.getResumes()
        .then(res => {
          const resumes = res.data?.resumes || res.data || [];
          if (Array.isArray(resumes) && resumes.length > 0) {
            setRealResumes(resumes);
          }
        })
        .catch(() => {})
        .finally(() => setResumesLoading(false));
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !['pdf', 'doc', 'docx'].includes(ext)) {
      setSubmitError(language === 'zh' ? '仅支持 PDF、DOC、DOCX 格式的文件' : 'Only PDF, DOC, DOCX files are supported');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Check for duplicate file name
    const existing = realResumes.find(r => r.fileName === file.name);
    if (existing) {
      setDuplicateConfirm({ file, existingId: existing.id, existingName: existing.fileName });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setSubmitError('');
    doUploadResume(file);
  };

  const refreshResumes = async () => {
    try {
      const res = await user.getResumes();
      const fullList = Array.isArray(res.data) ? res.data : res.data?.resumes || [];
      if (fullList.length > 0) {
        setRealResumes(fullList);
        setSelectedResumeId(fullList[0].id);
      }
    } catch {}
  };

  const doUploadResume = (file: File) => {
    setUploading(true);
    resume.upload(file)
      .then(async () => await refreshResumes())
      .catch(() => {})
      .finally(() => {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      });
  };

  const handleDuplicateReplace = async () => {
    if (!duplicateConfirm) return;
    const { file, existingId } = duplicateConfirm;
    setDuplicateConfirm(null);
    try {
      await resume.delete(existingId);
    } catch {}
    setRealResumes(prev => prev.filter(r => r.id !== existingId));
    setSubmitError('');
    doUploadResume(file);
  };

  const handleDuplicateCancel = () => {
    setDuplicateConfirm(null);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError('');
    try {
      const focusLabels = ['product', 'business', 'management'];
      const body: Record<string, any> = {
        position,
        interviewType,
        difficulty: difficulty + 1,
      };
      if (company) body.company = company;
      if (selectedResumeId) body.resumeId = selectedResumeId;
      if (focus.length > 0) {
        body.focusAreas = focus.filter(i => i < focusLabels.length).map(i => focusLabels[i]);
      }
      const additionalInfo = additionalRef.current?.value?.trim();
      if (additionalInfo) body.additionalInfo = additionalInfo;

      const res = await interview.create(body);
      const data: any = res.data;
      const sessionId = data?.session?.id || data?.sessionId || data?.id;
      navigate(`/room?sessionId=${sessionId}`);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to create interview');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleFocus = (idx: number) => {
    setFocus(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);
  };

  const focusOptions = t('create.focusOptions') as unknown as string[];

  return (
    <div className="max-w-3xl mx-auto py-12">
      <div className="space-y-8">
        {/* Header */}
        <div className="space-y-3">
          <h1 className="text-4xl tracking-tight leading-tight text-gray-900">
            {t('create.title')}
          </h1>
          <p className="text-gray-500 text-base max-w-xl leading-relaxed">
            {t('create.description')}
          </p>
        </div>

        {/* Resume */}
        <Card className="bg-white/40 backdrop-blur-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold text-gray-900">
              <CloudUpload className="w-5 h-5 text-blue-600" />
              <span>{t('create.resume.title')}</span>
            </div>
            <button
              onClick={openResumeModal}
              className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1.5"
            >
              <FileText className="w-4 h-4" />
              {t('create.resume.selectExisting')}
            </button>
          </div>

          {selectedResumeId ? (
            <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{selectedResume?.name}</p>
                  <p className="text-xs text-gray-400">{selectedResume?.date} · {selectedResume?.size}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedResumeId(null)}
                className="w-9 h-9 rounded-full hover:bg-white flex items-center justify-center text-gray-400 hover:text-red-500 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-200 rounded-xl p-12 flex flex-col items-center justify-center gap-3 bg-white/40 hover:border-blue-200 transition-colors cursor-pointer"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-7 h-7 text-blue-500 animate-spin" />
                    <p className="font-medium text-gray-500">{language === 'zh' ? '解析中...' : 'Parsing...'}</p>
                  </>
                ) : (
                  <>
                    <div className="w-14 h-14 bg-gray-50 rounded-xl flex items-center justify-center text-gray-300 hover:text-blue-500 transition-colors">
                      <CloudUpload className="w-7 h-7" />
                    </div>
                    <div className="text-center space-y-1">
                      <p className="font-semibold text-gray-900">{t('create.resume.upload')}</p>
                      <p className="text-sm text-gray-400">{t('create.resume.hint')}</p>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </Card>

        {/* Position & Company */}
        <Card className="bg-white/40 backdrop-blur-2xl">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-900">{t('create.position')}</label>
              <div className="relative">
                <select
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="w-full h-12 pl-4 pr-10 bg-gray-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/10 appearance-none"
                >
                  {POSITION_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-900">{t('create.company')}</label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder={t('create.companyPlaceholder')}
                  className="w-full h-12 pl-10 pr-4 bg-gray-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/10"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Interview Type */}
        <Card className="bg-white/40 backdrop-blur-2xl space-y-3">
          <label className="text-sm font-semibold text-gray-900">{t('create.type')}</label>
          <div className="flex flex-wrap gap-3">
            {INTERVIEW_TYPES.map((it) => (
              <button
                key={it.value}
                onClick={() => setInterviewType(it.value)}
                className={cn(
                  "px-5 py-2.5 rounded-xl text-sm font-medium transition-all",
                  interviewType === it.value
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-100"
                    : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                )}
              >
                {language === 'zh' ? it.labelZh : it.labelEn}
              </button>
            ))}
          </div>
        </Card>

        {/* Difficulty */}
        <Card className="bg-white/40 backdrop-blur-2xl space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-gray-900">{t('create.difficulty')}</label>
            <span className="text-blue-600 font-semibold">Lv. {difficulty + 1}</span>
          </div>
          <input
            type="range"
            min="0"
            max="4"
            step="1"
            value={difficulty}
            onChange={(e) => setDifficulty(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex justify-between">
            {(t('create.levels') as unknown as string[]).map((level, idx) => (
              <span key={idx} className={cn(
                "text-[10px] font-semibold tracking-widest transition-colors",
                difficulty === idx ? "text-blue-600" : "text-gray-300"
              )}>
                {level}
              </span>
            ))}
          </div>
        </Card>

        {/* Focus Areas */}
        <Card className="bg-white/40 backdrop-blur-2xl space-y-3">
          <label className="text-sm font-semibold text-gray-900">{t('create.focus')}</label>
          <div className="grid md:grid-cols-3 gap-3">
            {focusOptions.map((option, idx) => (
              <div
                key={idx}
                onClick={() => toggleFocus(idx)}
                className={cn(
                  "p-4 rounded-xl flex items-center gap-3 cursor-pointer transition-all",
                  focus.includes(idx)
                    ? "bg-blue-50/50 border-2 border-blue-100"
                    : "bg-gray-50/50 border-2 border-transparent hover:bg-gray-50"
                )}
              >
                <div className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                  focus.includes(idx) ? "border-blue-600 bg-blue-600 text-white" : "border-gray-200 bg-white"
                )}>
                  {focus.includes(idx) && <CheckCircle2 className="w-3 h-3" />}
                </div>
                <span className={cn(
                  "text-sm font-semibold transition-colors",
                  focus.includes(idx) ? "text-blue-700" : "text-gray-500"
                )}>{option}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Additional Info */}
        <Card className="bg-white/40 backdrop-blur-2xl space-y-2">
          <label className="text-sm font-semibold text-gray-900">{t('create.additional')}</label>
          <textarea
            ref={additionalRef}
            rows={4}
            placeholder={t('create.additionalPlaceholder')}
            className="w-full p-5 bg-gray-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/10 placeholder:text-gray-300 resize-none"
          />
        </Card>

        {/* Error */}
        {submitError && (
          <div className="bg-red-50 border border-red-100 text-red-700 px-5 py-4 rounded-xl text-sm font-medium">
            {submitError}
          </div>
        )}

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          size="lg"
          className="w-full py-5 rounded-xl text-lg bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Creating...
            </span>
          ) : (
            <>
              {t('create.submit')} <Rocket className="w-5 h-5 ml-2 fill-current" />
            </>
          )}
        </Button>
      </div>

      {/* Resume Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-white/40 backdrop-blur-2xl rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">{t('create.resume.modal.title')}</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="w-9 h-9 rounded-full hover:bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-900 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 max-h-[400px] overflow-y-auto">
                {resumesLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {displayResumes.map((r) => (
                      <div
                        key={r.id}
                        onClick={() => r.isParsed && setSelectedResumeId(r.id)}
                        className={cn(
                          "p-5 rounded-xl cursor-pointer transition-all border-2 flex items-center justify-between",
                          r.isParsed === false
                            ? "bg-blue-50/30 border-blue-100/50"
                            : selectedResumeId === r.id
                              ? "bg-blue-50 border-blue-200"
                              : "bg-white border-gray-50 hover:border-blue-100"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                            r.isParsed === false ? "bg-blue-50 text-blue-500" :
                            selectedResumeId === r.id ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-400"
                          )}>
                            {r.isParsed === false ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{r.name}</p>
                            {r.isParsed === false ? (
                              <p className="text-xs text-blue-500 mt-0.5">{language === 'zh' ? '解析中，请稍候...' : 'Parsing, please wait...'}</p>
                            ) : (
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] font-semibold text-gray-400 flex items-center gap-1 tracking-wider">
                                  <Clock className="w-3 h-3" />
                                  {r.date}
                                </span>
                                <span className="text-[10px] font-semibold text-gray-300 tracking-wider">{r.size}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {(realResumes.find(rr => rr.id === r.id)?.isParsed || realResumes.find(rr => rr.id === r.id)?.content || (realResumes.find(rr => rr.id === r.id)?.skills?.length > 0)) && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setViewingResume(realResumes.find(rr => rr.id === r.id)); setPdfError(false); setShowTextFallback(false); }}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-blue-500 hover:bg-blue-50 transition-all"
                              title={language === 'zh' ? '查看简历' : 'View resume'}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <div className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                            selectedResumeId === r.id ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-gray-100"
                          )}>
                            {selectedResumeId === r.id && <CheckCircle2 className="w-3 h-3" />}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-6 bg-gray-50/50 flex gap-4">
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl py-3"
                  onClick={() => setShowModal(false)}
                >
                  {t('create.resume.modal.cancel')}
                </Button>
                <Button
                  className="flex-1 rounded-xl py-3 bg-blue-600"
                  disabled={!selectedResumeId}
                  onClick={() => setShowModal(false)}
                >
                  {t('create.resume.modal.confirm')}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Duplicate Name Confirm Modal */}
      <AnimatePresence>
        {duplicateConfirm && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
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
                    {language === 'zh' ? '简历名称重复' : 'Duplicate Resume Name'}
                  </h3>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {language === 'zh'
                    ? `已存在同名简历「${duplicateConfirm.existingName}」，是否替换原有简历？`
                    : `A resume named "${duplicateConfirm.existingName}" already exists. Replace it or cancel?`}
                </p>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleDuplicateCancel}
                    className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 font-medium text-sm hover:bg-gray-200 transition-all"
                  >
                    {language === 'zh' ? '取消' : 'Cancel'}
                  </button>
                  <button
                    onClick={handleDuplicateReplace}
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition-all"
                  >
                    {language === 'zh' ? '替换' : 'Replace'}
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
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
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
                    {viewingResume.content && (
                      <button onClick={() => setShowTextFallback(true)} className="mt-4 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-sm font-medium hover:bg-blue-100 transition-all">
                        {language === 'zh' ? '查看文本内容' : 'View text content'}
                      </button>
                    )}
                  </div>
                ) : (
                  <iframe
                    src={resume.getFileUrl(viewingResume.id)}
                    className="w-full border-0"
                    style={{ height: '70vh' }}
                    title={viewingResume.fileName}
                    onError={() => { setPdfError(true); }}
                  />
                )
              ) : (
                <>
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
    </div>
  );
};

export default CreatePage;