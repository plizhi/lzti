'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getStage } from '@/data/questionnaires';
import { primaryLowQuestionnaire } from '@/data/questionnaires/primary-low';
import { primaryHighQuestionnaire } from '@/data/questionnaires/primary-high';
import { middleSchoolQuestionnaire } from '@/data/questionnaires/middle-school';
import { junior3Questionnaire } from '@/data/questionnaires/junior-3';
import { senior1Questionnaire } from '@/data/questionnaires/senior-1';
import { senior3Questionnaire } from '@/data/questionnaires/senior-3';
import type { StageId, DimensionAnswers, QuestionAnswers, Questionnaire, Question } from '@/types';

const questionnaires: Record<string, Questionnaire> = {
  'primary-low': primaryLowQuestionnaire,
  'primary-high': primaryHighQuestionnaire,
  'junior-1': middleSchoolQuestionnaire,
  'junior-3': junior3Questionnaire,
  'senior-1': senior1Questionnaire,
  'senior-3': senior3Questionnaire,
};

type QuestionnaireType = 'student' | 'parent' | 'teacher';

const typeLabels: Record<QuestionnaireType, string> = {
  student: '学生自评',
  parent: '家长观察',
  teacher: '教师评价',
};

function getQuestionsForType(questionnaire: Questionnaire, type: QuestionnaireType): Question[] {
  switch (type) {
    case 'student':
      return questionnaire.studentQuestions ?? questionnaire.questions ?? [];
    case 'parent':
      return questionnaire.parentQuestions ?? [];
    case 'teacher':
      return questionnaire.teacherQuestions ?? [];
    default:
      return questionnaire.questions ?? [];
  }
}

function getQuestionnaireTitle(type: QuestionnaireType, stageName: string): string {
  return `${stageName} - ${typeLabels[type]}问卷`;
}

export default function AssessmentPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const stageId = params.stage as StageId;
  const typeParam = searchParams.get('type') as QuestionnaireType | null;

  const stage = getStage(stageId);
  const questionnaire = questionnaires[stageId];

  const [questionnaireType, setQuestionnaireType] = useState<QuestionnaireType>(
    typeParam && ['student', 'parent', 'teacher'].includes(typeParam) ? typeParam : 'student'
  );
  const [currentDimensionIndex, setCurrentDimensionIndex] = useState(0);
  const [answers, setAnswers] = useState<DimensionAnswers>({});
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
  const availableTypes: QuestionnaireType[] = [
    'student',
    ...(questionnaire.parentQuestions?.length ? ['parent' as const] : []),
    ...(questionnaire.teacherQuestions?.length ? ['teacher' as const] : []),
  ];

  const currentDimension = questionnaire.dimensions[currentDimensionIndex];
  const dimensionQuestions = allQuestions.filter(
    (q) => q.dimensionId === currentDimension.id
  );

  const progress = ((currentDimensionIndex + 1) / questionnaire.dimensions.length) * 100;

  const handleAnswer = (questionId: string, value: number) => {
    const dimensionAnswers = answers[currentDimension.id] ?? {};
    setAnswers({
      ...answers,
      [currentDimension.id]: {
        ...dimensionAnswers,
        [questionId]: value,
      },
    });
  };

  const isDimensionComplete = () => {
    const dimensionAnswers = answers[currentDimension.id] ?? {};
    return dimensionQuestions.every((q) => dimensionAnswers[q.id] !== undefined);
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
    setIsSubmitting(true);

    const attemptId = crypto.randomUUID();

    const result = {
      id: attemptId,
      stageId,
      questionnaireType,
      answers,
    };

    sessionStorage.setItem('assessment-result', JSON.stringify(result));

    router.push(`/report/${attemptId}`);
  };

  const handleTypeChange = (newType: QuestionnaireType) => {
    setQuestionnaireType(newType);
    setCurrentDimensionIndex(0);
    setAnswers({});
    router.replace(`/assessment/${stageId}?type=${newType}`, { scroll: false });
  };

  const isLastDimension = currentDimensionIndex === questionnaire.dimensions.length - 1;
  const allDimensionsComplete = questionnaire.dimensions.every((dim) => {
    const dimAnswers = answers[dim.id] ?? {};
    const dimQuestions = allQuestions.filter((q) => q.dimensionId === dim.id);
    return dimQuestions.every((q) => dimAnswers[q.id] !== undefined);
  });

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

          {/* 问卷类型切换 */}
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
            const currentAnswer = answers[currentDimension.id]?.[question.id];

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
              disabled={!allDimensionsComplete || isSubmitting}
              className={`flex-1 rounded-xl py-4 font-medium transition-all ${
                allDimensionsComplete && !isSubmitting
                  ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-md'
                  : 'bg-stone-200 text-stone-400 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? '提交中...' : '提交测评'}
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
      </main>
    </div>
  );
}
