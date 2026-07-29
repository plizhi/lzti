'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getStage } from '@/data/questionnaires';
import { primaryLowQuestionnaire } from '@/data/questionnaires/primary-low';
import { primaryHighQuestionnaire } from '@/data/questionnaires/primary-high';
import { middleSchoolQuestionnaire } from '@/data/questionnaires/middle-school';
import { junior3Questionnaire } from '@/data/questionnaires/junior-3';
import { senior1Questionnaire } from '@/data/questionnaires/senior-1';
import { senior3Questionnaire } from '@/data/questionnaires/senior-3';
import { isLoggedIn } from '@/lib/api/client';
import type { StageId, Questionnaire } from '@/types';

const questionnaires: Record<string, Questionnaire> = {
  'primary-low': primaryLowQuestionnaire,
  'primary-high': primaryHighQuestionnaire,
  'junior-1': middleSchoolQuestionnaire,
  'junior-3': junior3Questionnaire,
  'senior-1': senior1Questionnaire,
  'senior-3': senior3Questionnaire,
};

// 快速筛查题目：每个维度抽取1道代表性题目
function getScreeningQuestions(questionnaire: Questionnaire) {
  const parentQuestions = questionnaire.parentQuestions ?? questionnaire.questions ?? [];

  return questionnaire.dimensions.map((dimension) => {
    // 找到该维度的第一道题
    const firstQuestion = parentQuestions.find(
      (q) => q.dimensionId === dimension.id
    );
    return {
      dimensionId: dimension.id,
      dimensionName: dimension.name,
      questionId: firstQuestion?.id ?? '',
      questionText: firstQuestion?.text ?? '',
    };
  });
}

type ScreeningResult = {
  dimensionId: string;
  dimensionName: string;
  score: number;
};

export default function ScreeningPage() {
  const params = useParams();
  const router = useRouter();
  const stageId = params.stage as StageId;

  const stage = getStage(stageId);
  const questionnaire = questionnaires[stageId];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [isComplete, setIsComplete] = useState(false);
  const [results, setResults] = useState<ScreeningResult[]>([]);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    setLoggedIn(isLoggedIn());
  }, []);

  useEffect(() => {
    if (!stage || !questionnaire) {
      router.push('/');
    }
  }, [stage, questionnaire, router]);

  if (!stage || !questionnaire) {
    return null;
  }

  const screeningQuestions = getScreeningQuestions(questionnaire);
  const currentQuestion = screeningQuestions[currentIndex];
  const progress = ((currentIndex + 1) / screeningQuestions.length) * 100;

  const handleAnswer = (value: number) => {
    setAnswers({
      ...answers,
      [currentQuestion.questionId]: value,
    });
  };

  const handleNext = () => {
    if (currentIndex < screeningQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // 计算结果
      const screeningResults: ScreeningResult[] = screeningQuestions.map((q) => ({
        dimensionId: q.dimensionId,
        dimensionName: q.dimensionName,
        score: answers[q.questionId] ?? 3,
      }));
      setResults(screeningResults);
      setIsComplete(true);
    }
  };

  const isCurrentAnswered = answers[currentQuestion.questionId] !== undefined;
  const isLastQuestion = currentIndex === screeningQuestions.length - 1;

  const getScoreLabel = (score: number) => {
    if (score >= 4) return '较好';
    if (score >= 3) return '一般';
    return '需关注';
  };

  const getScoreColor = (score: number) => {
    if (score >= 4) return 'text-green-600';
    if (score >= 3) return 'text-amber-600';
    return 'text-red-600';
  };

  if (isComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white pb-12">
        <header className="bg-white/80 backdrop-blur border-b border-stone-200 sticky top-0 z-10">
          <div className="mx-auto max-w-2xl px-6 py-4">
            <h1 className="text-lg font-semibold text-stone-800">快速筛查结果</h1>
            <p className="text-sm text-stone-500 mt-1">{stage.name}</p>
          </div>
        </header>

        <main className="mx-auto max-w-2xl px-6 py-8">
          <div className="text-center mb-8">
            <div className="text-4xl mb-4">📊</div>
            <h2 className="text-xl font-semibold text-stone-800">初步观察</h2>
            <p className="text-stone-500 mt-2">
              基于快速筛查，您在以下维度的观察大概是：
            </p>
          </div>

          <div className="space-y-4">
            {results.map((result) => (
              <div
                key={result.dimensionId}
                className="rounded-xl bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-stone-700">{result.dimensionName}</h3>
                  <span className={`font-medium ${getScoreColor(result.score)}`}>
                    {getScoreLabel(result.score)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-stone-100">
                    <div
                      className={`h-2 rounded-full ${
                        result.score >= 4
                          ? 'bg-green-400'
                          : result.score >= 3
                            ? 'bg-amber-400'
                            : 'bg-red-400'
                      }`}
                      style={{ width: `${(result.score / 5) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm text-stone-400">{result.score}/5</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-xl bg-amber-50 p-5">
            <p className="text-sm text-amber-800">
              以上结果仅供参考。完成完整版测评（18题），可以获得每个维度的详细解读、亲子对比分析和个性化引导建议。
            </p>
          </div>

          <div className="mt-6 space-y-3">
            <Link
              href={`/assessment/${stageId}`}
              className="block w-full rounded-xl bg-amber-500 py-4 text-center font-medium text-white shadow-md hover:bg-amber-600 transition-colors"
            >
              完成完整版测评
            </Link>
            <Link
              href="/"
              className="block w-full rounded-xl border border-stone-300 py-4 text-center font-medium text-stone-600 hover:bg-stone-50 transition-colors"
            >
              返回首页
            </Link>
          </div>

          {!loggedIn && (
            <div className="mt-6 p-4 rounded-xl bg-stone-50 border border-stone-200">
              <p className="text-sm text-stone-600 text-center mb-3">
                登录后可保存筛查结果，获取持续追踪
              </p>
              <div className="flex gap-3">
                <Link
                  href="/login"
                  className="flex-1 rounded-lg bg-amber-500 py-2.5 text-center text-sm font-medium text-white hover:bg-amber-600"
                >
                  登录
                </Link>
                <Link
                  href="/register"
                  className="flex-1 rounded-lg border border-amber-500 py-2.5 text-center text-sm font-medium text-amber-600 hover:bg-amber-50"
                >
                  注册
                </Link>
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white pb-12">
      <header className="bg-white/80 backdrop-blur border-b border-stone-200 sticky top-0 z-10">
        <div className="mx-auto max-w-2xl px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-stone-500 hover:text-stone-700">
              ← 返回
            </Link>
            <span className="text-sm text-stone-500">
              {currentIndex + 1} / {screeningQuestions.length}
            </span>
          </div>

          <div className="mt-3 h-2 rounded-full bg-stone-200">
            <div
              className="h-2 rounded-full bg-amber-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="mt-4">
            <p className="text-xs text-amber-600 font-medium">快速筛查</p>
            <h1 className="text-lg font-semibold text-stone-800">
              {currentQuestion.dimensionName}
            </h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-8">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-stone-700 text-lg leading-relaxed">
            {currentQuestion.questionText}
          </p>
        </div>

        <div className="mt-6">
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                onClick={() => handleAnswer(value)}
                className={`flex h-14 w-full items-center justify-center rounded-xl text-lg font-medium transition-all ${
                  answers[currentQuestion.questionId] === value
                    ? 'bg-amber-500 text-white shadow-md'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {value}
              </button>
            ))}
          </div>
          <div className="mt-3 flex justify-between text-xs text-stone-400 px-1">
            <span>非常不符合</span>
            <span>非常符合</span>
          </div>
        </div>

        <div className="mt-8">
          <button
            onClick={handleNext}
            disabled={!isCurrentAnswered}
            className={`w-full rounded-xl py-4 font-medium transition-all ${
              isCurrentAnswered
                ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-md'
                : 'bg-stone-200 text-stone-400 cursor-not-allowed'
            }`}
          >
            {isLastQuestion ? '查看结果' : '下一题'}
          </button>
        </div>
      </main>
    </div>
  );
}
