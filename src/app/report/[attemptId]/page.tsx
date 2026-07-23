'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { primaryLowQuestionnaire } from '@/data/questionnaires/primary-low';
import { primaryHighQuestionnaire } from '@/data/questionnaires/primary-high';
import { middleSchoolQuestionnaire } from '@/data/questionnaires/middle-school';
import { junior3Questionnaire } from '@/data/questionnaires/junior-3';
import { senior1Questionnaire } from '@/data/questionnaires/senior-1';
import { senior3Questionnaire } from '@/data/questionnaires/senior-3';
import { calculateAllDimensionScores } from '@/lib/scoring/calculator';
import { generateReport } from '@/lib/report/generator';
import { getStage } from '@/data/questionnaires';
import { saveAttempt, getPreviousAttempt } from '@/lib/storage';
import type { AssessmentAttempt, DimensionQuadrants, QuadrantResult, Questionnaire } from '@/types';

const questionnaires: Record<string, Questionnaire> = {
  'primary-low': primaryLowQuestionnaire,
  'primary-high': primaryHighQuestionnaire,
  'junior-1': middleSchoolQuestionnaire,
  'junior-3': junior3Questionnaire,
  'senior-1': senior1Questionnaire,
  'senior-3': senior3Questionnaire,
};

function getQuadrantDetails(questionnaire: Questionnaire) {
  const details: Record<string, QuadrantResult> = {};
  const quadrantTypeMap: Record<string, QuadrantResult['type']> = {
    '探索坚持型': 'optimal',
    '浅尝辄止型': 'strategy',
    '被动游离型': 'passive',
    '尽责完成型': 'overwhelmed',
    '习惯养成型': 'optimal',
    '需提醒但有序型': 'strategy',
    '督促依赖型': 'passive',
    '假性自动化型': 'overwhelmed',
    '通透调节型': 'optimal',
    '外显积压型': 'strategy',
    '内敛稳定型': 'passive',
    '沉默积压型': 'overwhelmed',
    '成长掌控型': 'optimal',
    '勤能补拙型': 'strategy',
    '习得性无助型': 'passive',
    '潜在自信型': 'overwhelmed',
    '灵活应对型': 'optimal',
    '苦撑型': 'strategy',
    '退缩等待型': 'passive',
    '策略意识型': 'overwhelmed',
    '自我滋养型': 'optimal',
    '外源满足型': 'strategy',
    '情感淡漠型': 'passive',
    '内源确认型': 'overwhelmed',
    '统筹兼顾型': 'optimal',
    '纸上谈兵型': 'strategy',
    '随波逐流型': 'passive',
    '野蛮生长型': 'overwhelmed',
    '志存高远型': 'optimal',
    '空想家型': 'strategy',
    '无舵之舟型': 'passive',
    '实干家型': 'overwhelmed',
    '成长型思维': 'optimal',
    '自负型思维': 'strategy',
    '习得性无助': 'passive',
    '焦灼型思维': 'overwhelmed',
    '大心脏型': 'optimal',
    '玻璃心型': 'strategy',
    '雷打不动型': 'passive',
    '敏感而坚韧': 'overwhelmed',
    // 初三四象限
    '策略整合型': 'optimal',
    '按部就班型': 'strategy',
    '重点突击型': 'passive',
    '被动应付型': 'overwhelmed',
    '意义驱动型': 'optimal',
    '兴趣脆弱型': 'strategy',
    '务实扛压型': 'passive',
    '动力匮乏型': 'overwhelmed',
    '有效利用型': 'optimal',
    '复盘未转化型': 'strategy',
    '直觉利用型': 'passive',
    '反馈流失型': 'overwhelmed',
    '韧性充沛型': 'optimal',
    '独立调节型': 'strategy',
    '连接支撑型': 'passive',
    '高压积压型': 'overwhelmed',
    // 高一二四象限
    '清晰接纳型': 'optimal',
    '认知模糊型': 'strategy',
    '自我否定型': 'passive',
    '理想化型': 'overwhelmed',
    '方向探索活跃型': 'optimal',
    '有想法无行动型': 'strategy',
    '被动等待型': 'passive',
    '方向迷茫型': 'overwhelmed',
    '意义建构型': 'optimal',
    '功利型': 'strategy',
    '表层型': 'passive',
    '意义迷失型': 'overwhelmed',
    // 高一二四象限（定稿版）
    '自知自洽型': 'optimal',
    '苛责清晰型': 'strategy',
    '自在成长型': 'passive',
    '迷茫苛责型': 'overwhelmed',
    '探索行动型': 'optimal',
    '想法待动型': 'strategy',
    '跟随尝试型': 'passive',
    '方向待寻型': 'overwhelmed',
    '策略灵活型': 'optimal',
    '策略单一型': 'strategy',
    '被动灵活型': 'passive',
    '方法薄弱型': 'overwhelmed',
    '主动连接型': 'optimal',
    '感知未用型': 'strategy',
    '关系待建型': 'passive',
    '独自支撑型': 'overwhelmed',
    // 高三四象限
    '笃定自主型': 'optimal',
    '方向明确被动型': 'strategy',
    '探索积极型': 'passive',
    '方向迷茫回避型': 'overwhelmed',
    '知行合一型': 'optimal',
    '有目标无行动型': 'strategy',
    '光想不动型': 'passive',
    '行动强迫型': 'overwhelmed',
    '坚韧稳定型': 'optimal',
    '调节未行型': 'strategy',
    '硬撑维持型': 'passive',
    '压力超载型': 'overwhelmed',
    '协商自主型': 'optimal',
    '和谐依赖型': 'strategy',
    '独立疏离型': 'passive',
    '冲突依赖型': 'overwhelmed',
  };

  for (const dim of questionnaire.dimensions) {
    dim.quadrants.forEach((q) => {
      details[dim.id] = {
        type: quadrantTypeMap[q.name] || 'passive',
        name: q.name,
        description: q.description,
        guidance: q.guidance,
      } as QuadrantResult;
    });
  }
  return details;
}

export default function ReportPage() {
  const params = useParams();
  const router = useRouter();
  const attemptId = params.attemptId as string;

  const [report, setReport] = useState<ReturnType<typeof generateReport> | null>(null);
  const [stageId, setStageId] = useState<string | null>(null);
  const [questionnaireType, setQuestionnaireType] = useState<string | null>(null);
  const [quadrantDetails, setQuadrantDetails] = useState<Record<string, QuadrantResult>>({});

  useEffect(() => {
    const resultStr = sessionStorage.getItem('assessment-result');
    if (!resultStr) {
      router.push('/');
      return;
    }

    const result = JSON.parse(resultStr) as {
      id: string;
      stageId: string;
      questionnaireType?: string;
      answers: import('@/types').DimensionAnswers;
    };

    const questionnaire = questionnaires[result.stageId];
    if (!questionnaire) {
      router.push('/');
      return;
    }

    const scores = calculateAllDimensionScores(questionnaire, result.answers);

    const quadrants: DimensionQuadrants = {};
    const qDetails = getQuadrantDetails(questionnaire);
    setQuadrantDetails(qDetails);

    for (const [dimId, score] of Object.entries(scores) as [string, { axis1: number; axis2: number }][]) {
      const dim = questionnaire.dimensions.find((d) => d.id === dimId);
      if (!dim) continue;

      const threshold = 50;
      const axis1High = score.axis1 >= threshold;
      const axis2High = score.axis2 >= threshold;

      let type: QuadrantResult['type'];
      let name: string;

      if (axis1High && axis2High) {
        type = 'optimal';
        name = dim.quadrants[0]?.name ?? '理想型';
      } else if (!axis1High && axis2High) {
        type = 'strategy';
        name = dim.quadrants[1]?.name ?? '策略型';
      } else if (!axis1High && !axis2High) {
        type = 'passive';
        name = dim.quadrants[2]?.name ?? '被动型';
      } else {
        type = 'overwhelmed';
        name = dim.quadrants[3]?.name ?? '过度型';
      }

      quadrants[dimId] = type;
    }

    // 保存到本地历史记录
    saveAttempt({
      id: result.id,
      stageId: result.stageId,
      questionnaireType: (result.questionnaireType as 'student' | 'parent' | 'teacher') ?? 'student',
      answers: result.answers,
      scores,
      quadrants,
      createdAt: new Date().toISOString(),
    });

    // 获取上一次的测评记录用于趋势对比
    const previousAttemptData = getPreviousAttempt(result.stageId, result.id);
    const previousAttempt = previousAttemptData ? {
      id: previousAttemptData.id,
      userId: 'anonymous',
      stageId: previousAttemptData.stageId as any,
      answers: previousAttemptData.answers,
      scores: previousAttemptData.scores,
      quadrants: previousAttemptData.quadrants,
      createdAt: new Date(previousAttemptData.createdAt),
    } : null;

    const attempt: AssessmentAttempt = {
      id: result.id,
      userId: 'anonymous',
      stageId: result.stageId as any,
      answers: result.answers,
      scores,
      quadrants,
      createdAt: new Date(),
    };

    const generatedReport = generateReport({
      currentAttempt: attempt,
      previousAttempt,
      questionnaire,
    });

    setReport(generatedReport);
    setStageId(result.stageId);
    setQuestionnaireType(result.questionnaireType ?? 'student');
  }, [attemptId, router]);

  if (!report) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-amber-50 to-white">
        <div className="text-center">
          <div className="text-4xl mb-4">📊</div>
          <p className="text-stone-600">正在生成报告...</p>
        </div>
      </div>
    );
  }

  const quadrantLabels: Record<string, string> = {
    optimal: 'bg-green-100 text-green-700',
    strategy: 'bg-amber-100 text-amber-700',
    passive: 'bg-stone-100 text-stone-600',
    overwhelmed: 'bg-red-100 text-red-700',
  };

  const trendLabels: Record<string, string> = {
    'up': '↑ 提升',
    'stable': '→ 稳定',
    'down': '↓ 下降',
    'significant-up': '⬆⬆ 显著提升',
    'significant-down': '⬇⬇ 显著下降',
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white pb-12">
      <header className="bg-white/80 backdrop-blur border-b border-stone-200 sticky top-0 z-10">
        <div className="mx-auto max-w-2xl px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-stone-500 hover:text-stone-700">
              ← 返回首页
            </Link>
            <span className="text-sm text-stone-500">
              {new Date(report.createdAt).toLocaleDateString('zh-CN')}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-8 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-stone-800">测评报告</h1>
          <p className="mt-2 text-stone-500">
            {stageId ? getStage(stageId as any)?.name : ''}
            {questionnaireType === 'parent' ? ' - 家长观察' : questionnaireType === 'teacher' ? ' - 教师评价' : ''}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-800 mb-4">📍 当下位置</h2>
          <div className="space-y-4">
            {report.currentStatus.map((status) => (
              <div key={status.dimensionId} className="border-b border-stone-100 pb-4 last:border-0 last:pb-0">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-stone-700">{status.dimensionName}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs ${quadrantLabels[status.quadrantType]}`}>
                    {status.quadrantName}
                  </span>
                </div>
                <p className="text-sm text-stone-600">{status.description}</p>
                <div className="mt-2 flex gap-4 text-xs text-stone-400">
                  <span>维度1: {status.scores.axis1.toFixed(1)}分</span>
                  <span>维度2: {status.scores.axis2.toFixed(1)}分</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {report.trendAnalysis && (
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-stone-800 mb-4">📈 变化趋势</h2>
            <div className="mb-4">
              <span className="text-2xl">{trendLabels[report.trendAnalysis.overallTrend]}</span>
              <p className="text-sm text-stone-500 mt-1">整体趋势</p>
            </div>
            <div className="space-y-2">
              {report.trendAnalysis.dimensionTrends.map((dt) => (
                <div key={dt.dimensionId} className="flex items-center justify-between text-sm">
                  <span className="text-stone-600">{dt.dimensionName}</span>
                  <span className={dt.change >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {trendLabels[dt.trend]} ({dt.change >= 0 ? '+' : ''}{dt.change.toFixed(1)})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-800 mb-4">🎯 关注建议</h2>
          <div className="space-y-4">
            {report.suggestions.map((s) => (
              <div key={s.dimensionId} className="border-l-4 border-amber-400 pl-4">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium text-stone-700">{s.dimensionName}</h3>
                  {s.priority === 'high' && (
                    <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-xs">优先关注</span>
                  )}
                </div>
                <p className="text-sm text-stone-600 mb-2">{s.suggestion}</p>
                <p className="text-sm text-amber-600 italic">{s.guidance}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-stone-100 p-6">
          <h2 className="text-lg font-semibold text-stone-800 mb-2">💡 使用建议</h2>
          <ul className="text-sm text-stone-600 space-y-1">
            <li>• 本报告仅供参考，不作为诊断依据</li>
            <li>• 建议在平静状态下与孩子沟通</li>
            <li>• 关注建议可根据实际情况灵活调整</li>
            <li>• 定期复测可追踪变化趋势</li>
          </ul>
        </div>

        <div className="flex gap-4">
          <Link
            href="/"
            className="flex-1 text-center rounded-xl border border-stone-300 py-4 font-medium text-stone-600 transition-colors hover:bg-stone-50"
          >
            返回首页
          </Link>
          <button
            onClick={() => window.print()}
            className="flex-1 rounded-xl bg-amber-500 py-4 font-medium text-white transition-colors hover:bg-amber-600 shadow-md"
          >
            打印报告
          </button>
        </div>
      </main>
    </div>
  );
}
