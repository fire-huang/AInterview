import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Button, Card } from '../components/UI';
import { ProgressRing } from '../components/Visuals';
import { training, interview } from '../services/api';
import { Cpu, FileText, Edit3, PlayCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

const weakTagIcon: Record<string, any> = {
  technical: Cpu,
  communication: FileText,
};

const HomePage: React.FC = () => {
  const { t, state, updateState } = useApp();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState<any[]>([]);
  const [latestSession, setLatestSession] = useState<any>(null);

  useEffect(() => {
    if (!state.isAuthenticated) return;
    training.list({ status: 'todo', limit: 5 })
      .then(res => {
        const items = (res.data?.tasks || []).map((item: any) => ({
          id: item.id,
          title: item.title,
          description: item.description,
          weakTag: item.weakTag || '',
        }));
        setTasks(items);
      })
      .catch(() => {});
  }, [state.isAuthenticated]);

  useEffect(() => {
    if (!state.isAuthenticated) return;
    interview.history({ limit: '1' })
      .then(res => {
        const recs = res.data?.records || [];
        if (recs.length > 0) {
          const r = recs[0];
          setLatestSession({
            id: r.sessionId,
            date: r.finishedAt ? new Date(r.finishedAt).toLocaleDateString() : '',
            summary: r.role || 'Latest Interview',
            analysis: {
              strengths: r.weakTags?.length ? `Focus areas: ${r.weakTags.join(', ')}` : '',
              weaknesses: '',
              suggestions: '',
            },
          });
        }
      })
      .catch(() => {});
  }, [state.isAuthenticated]);

  const markDone = async (id: string) => {
    try {
      await training.complete(id);
      setTasks(prev => prev.filter(t => t.id !== id));
      const res = await training.list({ status: 'todo', limit: 5 });
      const items = (res.data?.tasks || []).map((item: any) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        weakTag: item.weakTag || '',
      }));
      setTasks(items);
    } catch {}
  };

  return (
    <div className="space-y-16 pb-20">
      {/* Hero */}
      <section className="pt-12 space-y-6">
        <h1 className="text-3xl font-semibold text-gray-900">
          {t('hero.title')}
        </h1>
        <p className="text-base text-gray-500 max-w-xl leading-relaxed">
          {t('hero.description')}
        </p>
        <Button size="lg" onClick={() => navigate(state.isAuthenticated ? '/create' : '/register')}>
          <PlayCircle className="w-5 h-5 mr-2" />
          {t('hero.start')}
        </Button>
      </section>

      {/* Rhythm Panel */}
      {state.isAuthenticated && (
        <section>
          <Card className="p-8 bg-white/40 backdrop-blur-2xl border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.04)] rounded-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-gray-800">{t('rhythm.title')}</h3>
            </div>

            <div className="flex items-center gap-10">
              <div className="flex flex-col items-center">
                <ProgressRing progress={state.rhythm.readiness} />
                <p className="mt-3 text-xs text-gray-400 font-medium">{t('rhythm.readiness')}</p>
              </div>

              <div className="flex-1 grid grid-cols-2 gap-6">
                <div className="bg-white/60 rounded-xl p-4 text-center">
                  <p className="text-2xl font-semibold text-gray-900">{state.user.stats.mocksCount}</p>
                  <p className="text-xs text-gray-400 mt-1">{t('rhythm.mocksCount')}</p>
                </div>
                <div className="bg-white/60 rounded-xl p-4 text-center">
                  <p className="text-2xl font-semibold text-gray-900">{Math.round(state.user.stats.avgScore)}</p>
                  <p className="text-xs text-gray-400 mt-1">{t('rhythm.avgScore')}</p>
                </div>
              </div>
            </div>
          </Card>
        </section>
      )}

      {/* Latest Session */}
      {state.isAuthenticated && latestSession && (
        <section>
          <Card className="p-8 bg-white/40 backdrop-blur-2xl border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.04)] rounded-2xl">
            <div className="flex items-start justify-between mb-6">
              <div>
                <span className="text-xs text-gray-400 uppercase tracking-wider">{t('latest.tag')}</span>
                <h2 className="text-xl font-semibold text-gray-900 mt-1">{latestSession.summary}</h2>
              </div>
              <span className="text-xs text-gray-400">{latestSession.date}</span>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {latestSession.analysis.strengths && (
                <div>
                  <h5 className="text-sm font-semibold text-blue-600 mb-2">{t('latest.strengths')}</h5>
                  <p className="text-sm text-gray-500 leading-relaxed">{latestSession.analysis.strengths}</p>
                </div>
              )}
              {latestSession.analysis.weaknesses && (
                <div>
                  <h5 className="text-sm font-semibold text-red-600 mb-2">{t('latest.weaknesses')}</h5>
                  <p className="text-sm text-gray-500 leading-relaxed">{latestSession.analysis.weaknesses}</p>
                </div>
              )}
              {latestSession.analysis.suggestions && (
                <div>
                  <h5 className="text-sm font-semibold text-green-600 mb-2">{t('latest.suggestions')}</h5>
                  <p className="text-sm text-gray-500 leading-relaxed">{latestSession.analysis.suggestions}</p>
                </div>
              )}
            </div>
          </Card>
        </section>
      )}

      {/* Training Tasks */}
      {state.isAuthenticated && tasks.length > 0 && (
        <section>
          <Card className="p-8 bg-white/40 backdrop-blur-2xl border-white/20 rounded-2xl">
            <h3 className="font-semibold text-gray-800 mb-6">{t('tasks.title')}</h3>

            <div className="space-y-3">
              {tasks.map(task => {
                const Icon = weakTagIcon[task.weakTag] || Edit3;
                return (
                  <div key={task.id} className="flex items-center gap-4 p-3 bg-white/60 rounded-xl hover:bg-white/80 transition-colors">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className="text-sm font-medium text-gray-900 truncate">{task.title}</h5>
                      {task.description && (
                        <p className="text-xs text-gray-400 truncate">{task.description}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markDone(task.id)}
                    >
                      {t('tasks.markDone')}
                    </Button>
                  </div>
                );
              })}
            </div>
          </Card>
        </section>
      )}
    </div>
  );
};

export default HomePage;