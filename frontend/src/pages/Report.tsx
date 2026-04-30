import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { Card, Button } from '../components/UI';
import { report as reportApi } from '../services/api';
import {
  RotateCw,
  TrendingUp,
  Trophy,
  Zap,
  Code,
  MessageSquare,
  Target,
  Anchor,
  FileText,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { cn } from '../lib/utils';

const MetricBar: React.FC<{ icon: any; label: string; score: number; color: string }> = ({ icon: Icon, label, score, color }) => (
  <div className="space-y-2">
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4" />
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-sm font-bold text-gray-900 ml-auto">{score}</span>
    </div>
    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${score}%` }}
        transition={{ duration: 1, ease: "easeOut" }}
        className={cn("h-full rounded-full", color)}
      />
    </div>
  </div>
);

const ReportPage: React.FC = () => {
  const { t } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('sessionId');

  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await reportApi.get(sessionId);
        setReportData(res.data);
      } catch (err: any) {
        setError(err.message || 'Failed to load report');
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId]);

  const handleRegenerate = async () => {
    if (!sessionId) return;
    setRegenerating(true);
    try {
      await reportApi.regenerate(sessionId);
      const res = await reportApi.get(sessionId);
      setReportData(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to regenerate');
    } finally {
      setRegenerating(false);
    }
  };

  if (!sessionId && !loading) {
    return (
      <div className="max-w-5xl mx-auto flex items-center justify-center min-h-[60vh]">
        <Card className="p-8 text-center max-w-md space-y-4">
          <AlertCircle className="w-10 h-10 text-orange-400 mx-auto" />
          <h2 className="text-lg font-semibold text-gray-900">{t('report.noData')}</h2>
          <Button onClick={() => navigate('/history')}>{t('report.actions.toHistory')}</Button>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="max-w-5xl mx-auto flex items-center justify-center min-h-[60vh]">
        <Card className="p-8 text-center max-w-md space-y-4">
          <AlertCircle className="w-10 h-10 text-orange-400 mx-auto" />
          <h2 className="text-lg font-semibold text-gray-900">{t('report.noData')}</h2>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => navigate('/history')}>{t('report.actions.toHistory')}</Button>
            <Button variant="secondary" onClick={() => navigate('/create')}>{t('report.actions.newInterview')}</Button>
          </div>
        </Card>
      </div>
    );
  }

  const totalScore = reportData.totalScore ?? 0;
  const percentile = reportData.percentile ?? 0;
  const breakdown = reportData.scoreBreakdown || {};
  const strengths = reportData.strengths || [];
  const weaknesses = reportData.weaknesses || [];
  const suggestions = reportData.suggestions || [];
  const summary = reportData.summary || '';

  const metrics = [
    { icon: Code, label: t('report.metrics.technical'), score: breakdown.technical ?? 0, color: 'bg-blue-600' },
    { icon: MessageSquare, label: t('report.metrics.expression'), score: breakdown.expression ?? 0, color: 'bg-teal-500' },
    { icon: Target, label: t('report.metrics.project'), score: breakdown.project ?? 0, color: 'bg-orange-500' },
    { icon: Anchor, label: t('report.metrics.stability'), score: breakdown.stability ?? 0, color: 'bg-green-600' },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-24 pt-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
            <FileText className="w-4 h-4" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">{t('report.title')}</h1>
        </div>
        <Button
          size="sm"
          onClick={handleRegenerate}
          disabled={regenerating}
        >
          {regenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <><RotateCw className="w-3.5 h-3.5 mr-1.5" />{t('report.regenerate')}</>}
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Score Overview */}
      <Card className="p-6 bg-white/40 backdrop-blur-2xl border-white/20 shadow-[0_15px_50px_rgba(0,0,0,0.02)] space-y-6">
        <div className="flex items-center justify-between">
          <div>
            {summary && <p className="text-sm text-gray-500 mb-2 max-w-md">{summary}</p>}
            <div className="text-5xl font-bold text-teal-600">{totalScore}</div>
            <p className="text-sm text-gray-400">{t('report.totalScore')}</p>
            {percentile > 0 && (
              <p className="text-sm text-teal-600 mt-1 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" />
                {t('report.percentile', { percent: percentile })}
              </p>
            )}
          </div>
        </div>

        {/* Metrics */}
        <div className="space-y-4">
          {metrics.map(m => (
            <MetricBar key={m.label} {...m} />
          ))}
        </div>
      </Card>

      {/* Strengths */}
      {strengths.length > 0 && (
        <Card className="p-6 bg-white/40 backdrop-blur-2xl border-white/20 shadow-[0_15px_50px_rgba(0,0,0,0.02)] space-y-4">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-green-500" />{t('report.strengths.title')}
          </h2>
          <ul className="space-y-2">
            {strengths.map((s: string, i: number) => (
              <li key={i} className="text-sm text-gray-600 bg-green-50/30 px-4 py-3 rounded-xl">{s}</li>
            ))}
          </ul>
        </Card>
      )}

      {/* Weaknesses */}
      {weaknesses.length > 0 && (
        <Card className="p-6 bg-white/40 backdrop-blur-2xl border-white/20 shadow-[0_15px_50px_rgba(0,0,0,0.02)] space-y-4">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-400" />{t('report.weaknesses.title')}
          </h2>
          <ul className="space-y-2">
            {weaknesses.map((w: string, i: number) => (
              <li key={i} className="text-sm text-gray-600 bg-orange-50/30 px-4 py-3 rounded-xl">{w}</li>
            ))}
          </ul>
        </Card>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <Card className="p-6 bg-white/40 backdrop-blur-2xl border-white/20 shadow-[0_15px_50px_rgba(0,0,0,0.02)] space-y-4">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-500" />{t('report.suggestions.title')}
          </h2>
          <ul className="space-y-2">
            {suggestions.map((s: string, i: number) => (
              <li key={i} className="flex gap-3 items-start text-sm text-gray-600">
                <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs shrink-0">{i + 1}</span>
                {s}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-center gap-4 pt-4">
        <Button onClick={() => navigate('/create')}>{t('report.actions.newInterview')}</Button>
        <Button variant="secondary" onClick={() => navigate('/history')}>{t('report.actions.toHistory')}</Button>
      </div>
    </div>
  );
};

export default ReportPage;