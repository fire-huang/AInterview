import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Card, Button } from '../components/UI';
import { interview } from '../services/api';
import { Search, Eye, Play, ChevronLeft, ChevronRight, Loader2, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { INTERVIEW_TYPES } from '../constants';

const HistoryPage: React.FC = () => {
  const { t, state, language } = useApp();
  const navigate = useNavigate();

  const [records, setRecords] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const LIMIT = 10;

  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (sessionId: string) => {
    if (!window.confirm(language === 'zh' ? '确定删除这条面试记录？删除后不可恢复。' : 'Delete this interview record? This cannot be undone.')) return;
    setDeleting(sessionId);
    try {
      await interview.delete(sessionId);
      fetchHistory();
    } catch {} finally {
      setDeleting(null);
    }
  };

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        limit: String(LIMIT),
        offset: String((page - 1) * LIMIT),
      };
      if (searchQuery) params.role = searchQuery;
      if (typeFilter) params.interviewType = typeFilter;
      if (statusFilter) params.status = statusFilter;

      const res = await interview.history(params);
      setRecords(res.data?.records || []);
      setTotal(res.data?.total || 0);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!state.isAuthenticated) {
      setLoading(false);
      return;
    }
    fetchHistory();
  }, [page, typeFilter, statusFilter, searchQuery, state.isAuthenticated]);

  const handleSearch = () => {
    setSearchQuery(searchInput);
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const getTypeLabel = (type: string) => {
    const found = INTERVIEW_TYPES.find(it => it.value === type);
    if (!found) return type;
    return language === 'zh' ? found.labelZh : found.labelEn;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-24 pt-10">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">{t('history.title')}</h1>
        <p className="text-gray-400 mt-1">{t('history.subtitle')}</p>
      </header>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row items-center gap-3">
        <div className="flex-1 relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder={t('history.searchPlaceholder')}
            className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm appearance-none cursor-pointer min-w-[140px]"
        >
          <option value="">{t('history.allTypes')}</option>
          {INTERVIEW_TYPES.map(it => (
            <option key={it.value} value={it.value}>{language === 'zh' ? it.labelZh : it.labelEn}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm appearance-none cursor-pointer min-w-[140px]"
        >
          <option value="">{t('history.allStatus')}</option>
          <option value="completed">{t('history.statusLabels.completed')}</option>
          <option value="in_progress">{t('history.statusLabels.in_progress')}</option>
        </select>
        <Button onClick={handleSearch} size="sm">{t('history.search')}</Button>
      </div>

      {/* Records */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
        </div>
      ) : records.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-400 mb-4">{t('history.noResults')}</p>
          <Button onClick={() => navigate('/create')}>{t('history.createInterview') || (language === 'zh' ? '新建面试' : 'New Interview')}</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((record: any) => {
            const isCompleted = record.status === 'completed';
            return (
              <div key={record.sessionId} className="flex items-center justify-between p-4 rounded-xl bg-white/40 border border-gray-100 hover:shadow-sm transition-all">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold",
                    isCompleted ? "bg-green-50 text-green-600" : "bg-orange-50 text-orange-500"
                  )}>
                    {isCompleted ? record.totalScore || 0 : '--'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{record.role || getTypeLabel(record.interviewType)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {getTypeLabel(record.interviewType)} · {record.finishedAt ? new Date(record.finishedAt).toLocaleDateString() : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isCompleted ? (
                    <>
                      <Button variant="secondary" size="sm" onClick={() => navigate(`/report?sessionId=${record.sessionId}`)}>
                        <Eye className="w-3.5 h-3.5 mr-1.5" />{t('history.viewReport')}
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" onClick={() => navigate(`/room?sessionId=${record.sessionId}`)}>
                      <Play className="w-3.5 h-3.5 mr-1.5 fill-white" />{t('history.continue')}
                    </Button>
                  )}
                  <button
                    onClick={() => handleDelete(record.sessionId)}
                    disabled={deleting === record.sessionId}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-30"
                    title={language === 'zh' ? '删除' : 'Delete'}
                  >
                    {deleting === record.sessionId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-6">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-50 text-gray-400 hover:bg-gray-100 disabled:opacity-30">
            <ChevronLeft className="w-4 h-4" />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)} className={cn("w-8 h-8 rounded-lg flex items-center justify-center font-medium transition-all", page === p ? "bg-blue-600 text-white" : "bg-gray-50 text-gray-400 hover:bg-gray-100")}>
              {p}
            </button>
          ))}
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-50 text-gray-400 hover:bg-gray-100 disabled:opacity-30">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default HistoryPage;