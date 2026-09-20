'use client';

import { useEffect } from 'react';

export default function Error({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    const isStaleActionError =
      error.message.includes('Invalid Server Action') ||
      error.message.includes('cannot be found') ||
      (error.digest && error.digest.includes('INVALID_SERVER_ACTION'));

    if (isStaleActionError) {
      console.warn('检测到客户端版本过期，正在自动刷新页面...');
      window.location.reload();
    }
  }, [error]);

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h2>遇到一点小问题，正在为您自动恢复...</h2>
      <p>
        如果页面长时间未响应，请手动{' '}
        <button onClick={() => window.location.reload()}>点击刷新</button>
      </p>
    </div>
  );
}
