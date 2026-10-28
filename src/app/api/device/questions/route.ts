import { NextRequest } from 'next/server';
import { apiSuccess, ApiError } from '@/lib/api/response';
import { withDeviceAuth } from '@/lib/device-auth';
import { getDeviceQuestions, type DeviceQuestionnaireType } from '@/lib/device-questions';
import { speakToBase64 } from '@/lib/minimax-tts';
import { validateStageId, validateQuestionnaireType } from '@/lib/validators';

/** 并发生成音频的批大小（MiniMax 侧有并发限制） */
const AUDIO_BATCH_SIZE = 5;

interface QuestionAudio {
  questionId: string;
  audioBase64: string;
}

/**
 * 给一组题目生成语音（分批并发，单条失败不影响其他条）。
 */
async function generateAudio(
  questions: { id: string; text: string }[]
): Promise<QuestionAudio[]> {
  const result: QuestionAudio[] = [];

  for (let i = 0; i < questions.length; i += AUDIO_BATCH_SIZE) {
    const batch = questions.slice(i, i + AUDIO_BATCH_SIZE);
    const settled = await Promise.allSettled(
      batch.map(async (q) => ({
        questionId: q.id,
        audioBase64: await speakToBase64(q.text),
      }))
    );

    for (const item of settled) {
      if (item.status === 'fulfilled') {
        result.push(item.value);
      } else {
        console.error('[device/questions] 生成音频失败:', item.reason);
      }
    }
  }

  return result;
}

/**
 * GET /api/device/questions
 * 取当前维度的题目（按维度分页，一次只给一个维度）。
 *
 * query:
 * - stageId        必填，学段 ID
 * - type           问卷视角，默认 parent
 * - dimensionIndex 维度序号，默认 0
 * - includeAudio   传 1 时额外返回该维度每道题的 mp3（base64）
 */
export const GET = withDeviceAuth(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);

  const stageId = validateStageId(searchParams.get('stageId'));
  const questionnaireType = validateQuestionnaireType(
    searchParams.get('type') ?? 'parent'
  ) as DeviceQuestionnaireType;

  const rawIndex = searchParams.get('dimensionIndex') ?? '0';
  const dimensionIndex = Number.parseInt(rawIndex, 10);
  if (!Number.isInteger(dimensionIndex)) {
    throw new ApiError('题目索引越界', 400);
  }

  const payload = getDeviceQuestions(stageId, questionnaireType, dimensionIndex);

  let audio: QuestionAudio[] = [];
  if (searchParams.get('includeAudio') === '1') {
    const currentDimension = payload.dimensions[0];
    try {
      audio = await generateAudio(currentDimension?.questions ?? []);
    } catch (err) {
      // 音频失败不能影响主流程
      console.error('[device/questions] 批量生成音频失败:', err);
      audio = [];
    }
  }

  return apiSuccess({ ...payload, audio });
});
