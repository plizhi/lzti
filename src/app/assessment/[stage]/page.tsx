'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getStage, getQuestionnaire } from '@/data/questionnaires';
import { assessment } from '@/lib/api/client';
import type { StageId, Questionnaire, Question } from '@/types';
import type { DimensionAnswers } from '@/types/assessment';

type QuestionnaireType = 'student' | 'parent' | 'teacher';

const typeLabels: Record<QuestionnaireType, string> = {
  student: '学生自评',
  parent: '家长观察',
  teacher: '教师评价',
};

const ASSESSMENT_FLOW: QuestionnaireType[] = ['parent', 'student', 'teacher'];

function getNextQuestionnaireType(current: QuestionnaireType): QuestionnaireType | null {
  const currentIndex = ASSESSMENT_FLOW.indexOf(current);
  if (currentIndex < 0 || currentIndex >= ASSESSMENT_FLOW.length - 1) return null;
  return ASSESSMENT_FLOW[currentIndex + 1];
}

function getQuestionsForType(questionnaire: Questionnaire, type: QuestionnaireType): Question[] {
  switch (type) {
    case 'student':
      return questionnaire.studentQuestions ?? questionnaire.questions ?? [];
    case 'parent':
      return questionnaire.parentQuestions ?? questionnaire.questions ?? [];
    case 'teacher':
      return questionnaire.teacherQuestions ?? questionnaire.questions ?? [];
    default:
      return questionnaire.questions ?? [];
  }
}

function isTypeAvailable(questionnaire: Questionnaire, type: QuestionnaireType): boolean {
  const questions = getQuestionsForType(questionnaire, type);
  return questions.length > 0;
}

export default function AssessmentPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const stageId = params.stage as StageId;
  const typeParam = searchParams.get('type') as QuestionnaireType | null;
  const sessionIdParam = searchParams.get('sessionId');

  const stage = getStage(stageId);
  const questionnaire = getQuestionnaire(stageId);

  const [sessionId, setSessionId] = useState<string | null>(sessionIdParam);
  const [questionnaireType, setQuestionnaireType] = useState<QuestionnaireType>(
    typeParam && ['student', 'parent', 'teacher'].includes(typeParam) ? typeParam : 'parent'
  );
  const [currentDimensionIndex, setCurrentDimensionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!stage || !questionnaire) {
      router.push('/');
    }
  }, [stage, questionnaire, router]);

  if (!stage || !questionnaire) {
    return null;
  }

  const allQuestions = getQuestionsForType(questionnaire, questionnaireType);
  const availableTypes: QuestionnaireType[] = ASSESSMENT_FLOW.filter((type) =>
    isTypeAvailable(questionnaire, type)
  );

  const currentDimension = questionnaire.dimensions[currentDimensionIndex];
  const dimensionQuestions = allQuestions.filter((q) => q.dimensionId === currentDimension.id);

  const progress = ((currentDimensionIndex + 1) / questionnaire.dimensions.length) * 100;

  const handleAnswer = (questionId: string, value: number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const isDimensionComplete = () => {
    return dimensionQuestions.every((q) => answers[q.id] !== undefined);
  };

  const handleNext = () => {
    if (currentDimensionIndex < questionnaire.dimensions.length - 1) {
      setCurrentDimensionIndex(currentDimensionIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentDimensionIndex > 0) {
      setCurrentDimensionIndex(currentDimensionIndex - 1);
    }
  };

  const handleSubmit = async () => {
    if (!sessionId) return;
    setIsSubmitting(true);

    try {
      const result = await assessment.submitAttempt(sessionId, {
        questionnaireType,
        answers,
      });

      // 跳转到报告页
      router.push(`/report/${result.attemptId}?sessionId=${sessionId}`);
    } catch (err) {
      console.error('提交失败:', err);
      setIsSubmitting(false);
    }
  };

  const handleTypeChange = (newType: QuestionnaireType) => {
    setQuestionnaireType(newType);
    setCurrentDimensionIndex(0);
    setAnswers({});
    if (sessionId) {
      router.replace(`/assessment/${stageId}?type=${newType}&sessionId=${sessionId}`, { scroll: false });
    }
  };

  const isLastDimension = currentDimensionIndex === questionnaire.dimensions.length - 1;
  const allDimensionsComplete = questionnaire.dimensions.every((dim) => {
    const dimQuestions = allQuestions.filter((q) => q.dimensionId === dim.id);
    return dimQuestions.every((q) => answers[q.id] !== undefined);
  });

  const nextType = getNextQuestionnaireType(questionnaireType);
  const hasNextType = nextType && isTypeAvailable(questionnaire, nextType);

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white pb-20">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-stone-200">
        <div className="mx-auto max-w-2xl px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-stone-500 hover:text-stone-700">
              ← 返回
            </Link>
            <span className="text-sm text-stone-500">
              {currentDimensionIndex + 1} / {questionnaire.dimensions.length}
            </span>
          </div>

          <div className="mt-3 flex items-center justify-center gap-2 text-sm">
            {availableTypes.map((type, index) => {
              const isActive = type === questionnaireType;
              const isPast = availableTypes.indexOf(questionnaireType) > index;
              return (
                <div key={type} className="flex items-center gap-2">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                      isActive
                        ? 'bg-amber-500 text-white'
                        : isPast
                          ? 'bg-green-500 text-white'
                          : 'bg-stone-200 text-stone-500'
                    }`}
                  >
                    {isPast ? '✓' : index + 1}
                  </div>
                  <span className={isActive ? 'text-amber-600 font-medium' : 'text-stone-400'}>
                    {typeLabels[type]}
                  </span>
                  {index < availableTypes.length - 1 && (
                    <div className="w-8 h-px bg-stone-200" />
                  )}
                </div>
              );
            })}
          </div>

          {availableTypes.length > 1 && (
            <div className="mt-3 flex gap-2">
              {availableTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => handleTypeChange(type)}
                  className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
                    questionnaireType === type
                      ? 'bg-amber-500 text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {typeLabels[type]}
                </button>
              ))}
            </div>
          )}

          <div className="mt-3 h-2 rounded-full bg-stone-200">
            <div
              className="h-2 rounded-full bg-amber-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <h1 className="mt-3 text-lg font-semibold text-stone-800">
            {currentDimension.name}
          </h1>
          <p className="mt-1 text-sm text-stone-500">{currentDimension.description}</p>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-8">
        <div className="space-y-6">
          {dimensionQuestions.map((question, qIndex) => {
            const currentAnswer = answers[question.id];

            return (
              <div key={question.id} className="rounded-xl bg-white p-5 shadow-sm">
                <p className="mb-4 text-stone-700">
                  <span className="mr-2 text-amber-500">Q{qIndex + 1}.</span>
                  {question.text}
                </p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      onClick={() => handleAnswer(question.id, value)}
                      className={`flex h-12 w-12 items-center justify-center rounded-full text-lg font-medium transition-all ${
                        currentAnswer === value
                          ? 'bg-amber-500 text-white shadow-md'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex justify-between text-xs text-stone-400">
                  <span>非常不符合</span>
                  <span>非常符合</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 flex gap-4">
          {currentDimensionIndex > 0 && (
            <button
              onClick={handlePrev}
              className="flex-1 rounded-xl border border-stone-300 py-4 font-medium text-stone-600 transition-colors hover:bg-stone-50"
            >
              上一维
            </button>
          )}
          {isLastDimension ? (
            <button
              onClick={handleSubmit}
              disabled={!allDimensionsComplete || isSubmitting || !sessionId}
              className={`flex-1 rounded-xl py-4 font-medium transition-all ${
                allDimensionsComplete && !isSubmitting && sessionId
                  ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-md'
                  : 'bg-stone-200 text-stone-400 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? '提交中...' : '提交'}
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={!isDimensionComplete()}
              className={`flex-1 rounded-xl py-4 font-medium transition-all ${
                isDimensionComplete()
                  ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-md'
                  : 'bg-stone-200 text-stone-400 cursor-not-allowed'
              }`}
            >
              下一维
            </button>
          )}
        </div>

        {isLastDimension && hasNextType && (
          <div className="mt-4 text-center text-sm text-stone-500">
            完成当前问卷后，可以继续填写 {typeLabels[nextType!]} {typeLabels[questionnaireType]} 已完成 ✓
          </div>
        )}
      </main>
    </div>
  );
}
