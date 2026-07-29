import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

// 创建 transporter（使用环境变量配置）
function createTransporter() {
  // 如果没有配置 SMTP，返回 null，邮件功能将跳过但不会报错
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const transporter = createTransporter();

  // 如果没有配置 transporter，记录日志并返回
  if (!transporter) {
    console.log('[Email] SMTP not configured, skipping email send:', options.subject);
    return false;
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"LZTI" <support@nzyy.cc>',
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html || options.text,
    });
    console.log('[Email] Sent successfully:', options.subject);
    return true;
  } catch (error) {
    console.error('[Email] Send failed:', error);
    return false;
  }
}

// 发送反馈通知邮件
export async function sendFeedbackNotification(
  category: string,
  content: string,
  contact?: string | null
): Promise<boolean> {
  const categoryLabel: Record<string, string> = {
    complaint: '投诉',
    bug: 'Bug报告',
    suggestion: '建议',
    inquiry: '咨询',
  };

  const subject = `【LZTI反馈】${categoryLabel[category] || category} - ${new Date().toLocaleDateString('zh-CN')}`;

  const text = `
新用户反馈

类型：${categoryLabel[category] || category}
联系方式：${contact || '未提供'}
内容：
${content}

---
请及时处理
  `.trim();

  return sendEmail({
    to: 'support@nzyy.cc',
    subject,
    text,
  });
}
