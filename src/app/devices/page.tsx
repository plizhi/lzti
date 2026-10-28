'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { devices, type DeviceInfo } from '@/lib/api/client';

/**
 * 设备管理页 —— 家长在这里把语音测评设备连到自己的账号。
 *
 * 交互流程（对应设备端的自助配对机制）：
 *   1. 点「添加设备」→ 生成 6 位配对码
 *   2. 把码念给设备 / 在设备上输入
 *   3. 设备自己去取码并完成配对
 *   4. 这��页轮询设备列表，出现新设备即配对成功
 *
 * 为什么是「设备自己去取码」而不是「家长在设备上输入」：
 * 设备是个摆件，没有键盘。让家长把码显示出来、设备自己去取，
 * 少一次在设备上按数字的动作，孩子和长辈都能用。
 */

type PairingState = {
  code: string;
  expiresAt: string;
} | null;

export default function DevicesPage() {
  const router = useRouter();
  const [deviceList, setDeviceList] = useState<DeviceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [pairing, setPairing] = useState<PairingState>(null);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);

  const loadDevices = useCallback(async () => {
    try {
      const list = await devices.list();
      setDeviceList(list);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  // 配对码倒计时
  useEffect(() => {
    if (!pairing) return;
    const tick = () => {
      const left = Math.max(0, Math.floor((new Date(pairing.expiresAt).getTime() - Date.now()) / 1000));
      setCountdown(left);
      if (left === 0) setPairing(null);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [pairing]);

  // 有配对码时轮询设备列表，等设备自己来认领
  useEffect(() => {
    if (!pairing) return;
    const timer = setInterval(async () => {
      try {
        const list = await devices.list();
        setDeviceList(list);
        // 设备已连上（活跃设备数增加）→ 配对成功
        const active = list.filter((d) => d.status === 'active');
        if (active.some((d) => d.lastSeenAt && Date.now() - new Date(d.lastSeenAt).getTime() < 120000)) {
          setPairing(null);
        }
      } catch {
        // 轮询失败不打断流程
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [pairing]);

  const startPairing = async () => {
    try {
      const res = await devices.createPairingCode();
      setPairing({ code: res.code, expiresAt: res.expiresAt });
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成配对码失败');
    }
  };

  const revokeDevice = async (id: string, name: string) => {
    if (!confirm(`确定要解绑「${name}」吗？解绑后这台设备需要重新配对才能使用。`)) {
      return;
    }
    try {
      await devices.revoke(id);
      await loadDevices();
    } catch (err) {
      setError(err instanceof Error ? err.message : '解绑失败');
    }
  };

  const formatTime = (iso: string | null) => {
    if (!iso) return '从未连接';
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return '刚刚在线';
    if (min < 60) return `${min} 分钟前在线`;
    const hour = Math.floor(min / 60);
    if (hour < 24) return `${hour} 小时前在线`;
    return `${Math.floor(hour / 24)} 天前在线`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      <header className="px-6 py-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-stone-800">语音测评设备</h1>
          <p className="text-sm text-stone-500">把设备连到账号，孩子就能说话答题</p>
        </div>
        <Link
          href="/"
          className="px-4 py-2 rounded-full bg-white text-stone-600 border border-stone-200 hover:bg-stone-50 transition text-sm"
        >
          返回首页
        </Link>
      </header>

      <main className="px-6 pb-12 max-w-2xl mx-auto space-y-6">
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* 配对卡片 */}
        <section className="rounded-2xl bg-white shadow-sm border border-stone-200 p-6">
          <h2 className="text-base font-semibold text-stone-800 mb-1">添加设备</h2>

          {pairing ? (
            <div className="mt-4">
              <p className="text-sm text-stone-600 mb-4">
                请把这 6 位数字念给设备，或在设备上手动输入：
              </p>
              <div className="flex gap-2 justify-center mb-4">
                {pairing.code.split('').map((digit, i) => (
                  <div
                    key={i}
                    className="w-11 h-14 flex items-center justify-center rounded-xl bg-amber-50 border-2 border-amber-200 text-2xl font-bold text-amber-700"
                  >
                    {digit}
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-stone-500">
                  {countdown > 0 ? `${Math.floor(countdown / 60)} 分 ${countdown % 60} 秒后失效` : '配对码已失效'}
                </span>
                <button
                  onClick={() => setPairing(null)}
                  className="text-sm text-stone-500 hover:text-stone-700 underline"
                >
                  取消
                </button>
              </div>
              <p className="mt-4 text-xs text-stone-400 flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                正在等待设备连接…
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-stone-600 leading-relaxed">
                设备是一只无需电脑的语音终端：它会念出题目，孩子直接说话就能作答，全程不用按键。
                <br />
                首次使用需要把设备连到你的账号。
              </p>
              <button
                onClick={startPairing}
                className="mt-4 px-5 py-2.5 rounded-xl bg-amber-500 text-white font-medium hover:bg-amber-600 transition"
              >
                生成配对码
              </button>
            </>
          )}
        </section>

        {/* 设备列表 */}
        <section className="rounded-2xl bg-white shadow-sm border border-stone-200 p-6">
          <h2 className="text-base font-semibold text-stone-800 mb-4">我的设备</h2>

          {loading ? (
            <p className="text-sm text-stone-400">加载中…</p>
          ) : deviceList.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-3xl mb-2">🔌</div>
              <p className="text-sm text-stone-500">还没有连接任何设备</p>
              <p className="text-xs text-stone-400 mt-1">点上面「生成配对码」开始</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {deviceList.map((device) => (
                <li
                  key={device.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-stone-200"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-stone-800 truncate">{device.name}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          device.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-stone-100 text-stone-500'
                        }`}
                      >
                        {device.status === 'active' ? '已连接' : '已解绑'}
                      </span>
                    </div>
                    <p className="text-xs text-stone-400 mt-1 font-mono">
                      {device.deviceKey}
                    </p>
                    <p className="text-xs text-stone-500 mt-1">{formatTime(device.lastSeenAt)}</p>
                  </div>
                  {device.status === 'active' && (
                    <button
                      onClick={() => revokeDevice(device.id, device.name)}
                      className="shrink-0 text-sm text-stone-400 hover:text-red-600 transition px-2"
                    >
                      解绑
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 怎么用 */}
        <section className="rounded-2xl bg-white/60 border border-stone-200 p-6">
          <h2 className="text-base font-semibold text-stone-800 mb-3">怎么用</h2>
          <ol className="space-y-3 text-sm text-stone-600">
            <li className="flex gap-3">
              <span className="shrink-0 w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-xs flex items-center justify-center">
                1
              </span>
              <span>给设备接上电源，它会亮起屏幕等待配对</span>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-xs flex items-center justify-center">
                2
              </span>
              <span>点「生成配对码」，把 6 位数字念给设备</span>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-xs flex items-center justify-center">
                3
              </span>
              <span>设备自动连上，列表里出现它就成功了</span>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-xs flex items-center justify-center">
                4
              </span>
              <span>在手机上开始测评，设备会念题、听孩子回答</span>
            </li>
          </ol>
          <button
            onClick={() => router.push('/select-child')}
            className="mt-5 w-full py-2.5 rounded-xl bg-stone-800 text-white font-medium hover:bg-stone-900 transition"
          >
            开始语音测评
          </button>
        </section>
      </main>
    </div>
  );
}
