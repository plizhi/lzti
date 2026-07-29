import { Metadata } from 'next';
import { getSharedReport } from '@/lib/services/report-share.service';
import { SharedReportClient } from './SharedReportClient';

interface Props {
  params: Promise<{ shareCode: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { shareCode } = await params;

  try {
    const data = await getSharedReport(shareCode);
    const { child, stageName } = data.report;

    return {
      title: `${child.name}的学习状态报告`,
      description: `${child.name}在${stageName}的学习状态评估报告，基于内在结构养育理论的多维度分析`,
      openGraph: {
        title: `${child.name}的学习状态报告`,
        description: `点击查看${child.name}在${stageName}的详细学习状态分析`,
        type: 'website',
      },
      twitter: {
        card: 'summary',
        title: `${child.name}的学习状态报告`,
        description: `基于内在结构养育理论的多维度学习状态评估`,
      },
    };
  } catch {
    return {
      title: '分享报告',
      description: '学习状态评估报告分享',
    };
  }
}

export default async function SharedReportPage({ params }: Props) {
  const { shareCode } = await params;
  return <SharedReportClient shareCode={shareCode} />;
}
