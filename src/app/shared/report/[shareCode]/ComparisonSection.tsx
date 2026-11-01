'use client';

// 分享报告页的「跨视角对比」区
//
// 2026-11-01 新增。朋大大拍板：「每份报告都带对比」。
// 所以这个区**永远渲染** —— 哪怕只有 1 个视角，也要把进度、初步判断和
// 关注引导摆出来，而不是整块消失（报告不留白）。
//
// 文案口径：只标「一致 / 差异」，不评判谁对错。
// 差异本身是信息，值得家庭一起讨论。

export type ComparisonRole = 'parent' | 'student' | 'teacher';

const roleLabels: Record<ComparisonRole, string> = {
  parent: '家长观察',
  student: '学生自评',
  teacher: '教师评价',
};

const roleOrder: ComparisonRole[] = ['parent', 'student', 'teacher'];

const focusLevelStyles: Record<string, string> = {
  priority: 'bg-red-50 text-red-700 border-red-200',
  watch: 'bg-amber-50 text-amber-700 border-amber-200',
  improve: 'bg-sky-50 text-sky-700 border-sky-200',
  maintain: 'bg-green-50 text-green-700 border-green-200',
  neutral: 'bg-stone-100 text-stone-500 border-stone-200',
};

interface ComparisonSlot {
  quadrantType: string;
  quadrantName: string;
  scores: { axis1: number; axis2: number };
}

interface ComparisonStatus {
  dimensionId: string;
  dimensionName: string;
  parent?: ComparisonSlot;
  student?: ComparisonSlot;
  teacher?: ComparisonSlot;
  isConsistent: boolean;
}

interface ComparisonSuggestion {
  dimensionId: string;
  dimensionName: string;
  differenceDescription: string;
  possibleReasons: string[];
  suggestions: string[];
  priority: string;
}

interface SkippedDimension {
  dimensionId: string;
  dimensionName: string;
  reason: 'incomplete' | 'neutral';
  missingRole?: ComparisonRole;
}

interface SingleViewDimensionFocus {
  dimensionId: string;
  dimensionName: string;
  level: string;
  levelLabel: string;
  quadrantType?: string;
  quadrantName?: string;
  focus: string;
  profile?: string;
  coreNeed?: string;
  parentAction?: string;
}

interface SingleViewSummary {
  role: ComparisonRole;
  roleLabel: string;
  attemptId: string;
  dimensions: SingleViewDimensionFocus[];
  suggestions: Array<{
    dimensionId: string;
    dimensionName: string;
    priority: string;
    quadrantType: string;
    quadrantName: string;
    guidance: string;
  }>;
}

export interface SessionComparison {
  kind: 'none' | 'two-roles' | 'parent-child' | 'home-school';
  completedRoles: ComparisonRole[];
  missingRoles: ComparisonRole[];
  note: string;
  roles?: ComparisonRole[];
  singleView?: SingleViewSummary;
  report?: {
    comparisonStatuses: ComparisonStatus[];
    comparisonSuggestions: ComparisonSuggestion[];
    highlights: Array<{ dimensionId: string; description: string }>;
    developmentAreas: Array<{ dimensionId: string; description: string }>;
    consensusDimensions?: string[];
    homeSchoolDifferences?: Array<{
      dimensionId: string;
      homePerformance: string;
      schoolPerformance: string;
    }>;
    skippedDimensions?: SkippedDimension[];
  };
}

function slotOf(status: ComparisonStatus, role: ComparisonRole): ComparisonSlot | undefined {
  if (role === 'parent') return status.parent;
  if (role === 'student') return status.student;
  return status.teacher;
}

/** 参与对比的视角（按 parent → student → teacher 排序） */
function involvedRoles(comparison: SessionComparison): ComparisonRole[] {
  const roles = comparison.roles ?? comparison.completedRoles;
  return roleOrder.filter((r) => roles.includes(r));
}

/** 进度条式的完成情况 */
function ProgressLine({ comparison }: { comparison: SessionComparison }) {
  const done = comparison.completedRoles.length;
  const doneLabels = comparison.completedRoles.map((r) => roleLabels[r]).join('、');
  const missingLabels = comparison.missingRoles.map((r) => roleLabels[r]).join('、');

  return (
    <div className="rounded-xl bg-amber-50 p-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-stone-700">
          本场已完成 {done}/3 个视角
        </span>
        {done > 0 && <span className="text-xs text-stone-500">（{doneLabels}）</span>}
      </div>
      <div className="mt-2 flex gap-1.5">
        {roleOrder.map((role) => {
          const finished = comparison.completedRoles.includes(role);
          return (
            <span
              key={role}
              className={`px-2 py-0.5 rounded-full text-xs ${
                finished
                  ? 'bg-amber-500 text-white'
                  : 'bg-white text-stone-400 border border-stone-200'
              }`}
            >
              {roleLabels[role]}
              {finished ? ' ✓' : ''}
            </span>
          );
        })}
      </div>
      {missingLabels && (
        <p className="mt-2 text-xs text-stone-500">
          还缺 {missingLabels}。其余视角完成后，这里会自动更新。
        </p>
      )}
    </div>
  );
}

/** 单视角状态：进度 + 初步判断声明 + 该视角的关注引导 */
function SingleViewBlock({ comparison }: { comparison: SessionComparison }) {
  const singleView = comparison.singleView;
  if (!singleView) {
    return (
      <p className="text-sm text-stone-500">
        这是基于单一视角的初步判断，其他视角完成后结论会更新。
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-sky-50 border border-sky-100 p-4">
        <p className="text-sm text-sky-800">
          <span className="font-medium">这是基于单一视角（{singleView.roleLabel}）的初步判断，
          其他视角完成后结论会更新。</span>
        </p>
        <p className="mt-1 text-xs text-sky-700/80">
          单一视角看到的是「这个视角里的样子」，不是全貌。等孩子、老师也完成后，
          这里会自动出现「一致 / 差异」的对照。
        </p>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-stone-700 mb-2">
          {singleView.roleLabel}的关注引导
        </h3>
        <div className="space-y-3">
          {singleView.dimensions.map((d) => (
            <div key={d.dimensionId} className="border-l-4 border-stone-200 pl-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-stone-700 text-sm">{d.dimensionName}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs border ${
                    focusLevelStyles[d.level] ?? focusLevelStyles.neutral
                  }`}
                >
                  {d.levelLabel}
                </span>
                {d.quadrantName && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-stone-100 text-stone-600">
                    {d.quadrantName}
                  </span>
                )}
              </div>
              <p className="text-sm text-stone-600 mt-1">{d.focus}</p>
              {d.coreNeed && (
                <p className="text-xs text-stone-500 mt-1">核心需要：{d.coreNeed}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {singleView.suggestions.length > 0 && (
        <div className="rounded-xl bg-amber-50 p-4">
          <h3 className="text-sm font-semibold text-stone-700 mb-2">优先关注</h3>
          <ul className="space-y-2">
            {singleView.suggestions.map((s) => (
              <li key={s.dimensionId} className="text-sm text-stone-700">
                <span className="font-medium">{s.dimensionName}</span>
                {s.quadrantName ? `（${s.quadrantName}）` : ''}
                {s.guidance ? `：${s.guidance}` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** 逐维度一致 / 差异 */
function DimensionList({ comparison }: { comparison: SessionComparison }) {
  const report = comparison.report;
  if (!report) return null;
  const roles = involvedRoles(comparison);
  const suggestionsByDimension = new Map(
    report.comparisonSuggestions.map((s) => [s.dimensionId, s])
  );

  if (report.comparisonStatuses.length === 0) {
    return (
      <p className="text-sm text-stone-500">
        这次没有可对比的维度（各视角的数据都接近中性或存在缺失），完成更多视角后会更有参考价值。
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {report.comparisonStatuses.map((status) => {
        const suggestion = suggestionsByDimension.get(status.dimensionId);
        return (
          <div key={status.dimensionId} className="border-b border-stone-100 pb-3 last:border-0 last:pb-0">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="font-medium text-stone-700 text-sm">{status.dimensionName}</h3>
              <span
                className={`px-2 py-0.5 rounded-full text-xs ${
                  status.isConsistent
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                {status.isConsistent ? '一致' : '差异'}
              </span>
            </div>

            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-600">
              {roles.map((role) => {
                const slot = slotOf(status, role);
                if (!slot) return null;
                return (
                  <span key={role}>
                    {roleLabels[role]}「{slot.quadrantName || '—'}」
                  </span>
                );
              })}
            </div>

            {suggestion && (
              <div className="mt-2 rounded-lg bg-stone-50 p-3">
                <p className="text-xs text-stone-700">
                  <span className="text-stone-500">差异描述：</span>
                  {suggestion.differenceDescription}
                </p>
                {suggestion.possibleReasons.length > 0 && (
                  <div className="mt-1">
                    <p className="text-xs text-stone-500">可能有这些原因：</p>
                    <ul className="mt-0.5 list-disc list-inside text-xs text-stone-600">
                      {suggestion.possibleReasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {suggestion.suggestions.length > 0 && (
                  <div className="mt-1">
                    <p className="text-xs text-stone-500">可以这样聊：</p>
                    <ul className="mt-0.5 list-disc list-inside text-xs text-amber-700">
                      {suggestion.suggestions.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function ComparisonSection({ comparison }: { comparison: SessionComparison }) {
  const report = comparison.report;

  const isHomeSchool = comparison.kind === 'home-school';

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-stone-800 mb-4">🔍 跨视角对比</h2>

      <div className="space-y-4">
        <ProgressLine comparison={comparison} />

        {comparison.kind === 'none' ? (
          <SingleViewBlock comparison={comparison} />
        ) : (
          <>
            {isHomeSchool && report && (
              <>
                {report.consensusDimensions && report.consensusDimensions.length > 0 && (
                  <div className="rounded-xl bg-green-50 p-4">
                    <h3 className="text-sm font-semibold text-stone-700 mb-2">
                      三方共识维度（{report.consensusDimensions.length} 个）
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {report.consensusDimensions.map((id) => {
                        const status = report.comparisonStatuses.find((s) => s.dimensionId === id);
                        return (
                          <span
                            key={id}
                            className="px-2 py-0.5 rounded-full text-xs bg-white text-green-700 border border-green-200"
                          >
                            {status?.dimensionName ?? id}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {report.homeSchoolDifferences && report.homeSchoolDifferences.length > 0 && (
                  <div className="rounded-xl bg-amber-50 p-4">
                    <h3 className="text-sm font-semibold text-stone-700 mb-2">家校差异</h3>
                    <div className="space-y-1.5">
                      {report.homeSchoolDifferences.map((d) => {
                        const status = report.comparisonStatuses.find((s) => s.dimensionId === d.dimensionId);
                        return (
                          <p key={d.dimensionId} className="text-xs text-stone-700">
                            <span className="font-medium">{status?.dimensionName ?? d.dimensionId}</span>
                            ：家庭「{d.homePerformance}」 / 学校「{d.schoolPerformance}」
                          </p>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}

            <div>
              <h3 className="text-sm font-semibold text-stone-700 mb-2">逐维度对照</h3>
              <DimensionList comparison={comparison} />
            </div>

            {report && report.highlights.length > 0 && (
              <div className="rounded-xl bg-green-50 p-4">
                <h3 className="text-sm font-semibold text-stone-700 mb-2">亮点</h3>
                <ul className="space-y-1">
                  {report.highlights.map((h) => (
                    <li key={h.dimensionId} className="text-xs text-stone-700">
                      · {h.description}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {report && report.developmentAreas.length > 0 && (
              <div className="rounded-xl bg-stone-50 p-4">
                <h3 className="text-sm font-semibold text-stone-700 mb-2">待引导</h3>
                <ul className="space-y-1">
                  {report.developmentAreas.map((d) => (
                    <li key={d.dimensionId} className="text-xs text-stone-700">
                      · {d.description}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {report?.skippedDimensions && report.skippedDimensions.length > 0 && (
              <div className="rounded-xl bg-stone-50 p-3">
                <p className="text-xs text-stone-500">
                  注：有 {report.skippedDimensions.length} 个维度未纳入对比（原因如下）
                </p>
                <ul className="mt-1 space-y-0.5">
                  {report.skippedDimensions.map((d, i) => (
                    <li key={`${d.dimensionId}-${d.missingRole ?? 'x'}-${i}`} className="text-xs text-stone-400">
                      · {d.dimensionName || d.dimensionId}
                      {d.missingRole ? `（${roleLabels[d.missingRole] ?? d.missingRole}视角）` : ''}
                      {d.reason === 'neutral' ? '数据接近中性，没有明显倾向' : '该视角缺少数据'}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        <p className="text-xs text-stone-400 border-t border-stone-100 pt-3">
          「一致 / 差异」只是不同视角看到的样子不一样，不代表谁对谁错 ——
          差异本身就是值得和家人、老师一起聊一聊的信息。
        </p>
      </div>
    </div>
  );
}
