'use client';

import { useState } from 'react';

interface ReportUpgradePromptProps {
  className?: string;
}

export function ReportUpgradePrompt({ className = '' }: ReportUpgradePromptProps) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div className={`rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 p-6 ${className}`}>
        <h3 className="font-semibold text-amber-800 mb-2">
          看见孩子的变化
        </h3>
        <p className="text-sm text-amber-700 mb-4">
          首次评估是一个起点。每月一次追踪，能让您看清：
          哪些维度在好转，哪些需要持续关注。
        </p>
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold text-amber-600">199元</span>
          <span className="text-sm text-stone-500">/季度</span>
        </div>
        <p className="text-xs text-stone-400 mt-1">
          相当于每周不到2元，一次线下咨询的1/10
        </p>
        <button
          onClick={() => setShowModal(true)}
          className="mt-4 w-full rounded-xl bg-amber-500 py-3 text-white font-medium hover:bg-amber-600 transition-colors"
        >
          咨询订阅
        </button>
      </div>

      {/* 企微联系弹窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-stone-800">咨询订阅</h3>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-stone-100 text-stone-400"
              >
                ✕
              </button>
            </div>

            <p className="text-sm text-stone-600 mb-4 text-center">
              扫码添加客服微信<br />
              了解全年订阅详情
            </p>

            <div className="flex justify-center mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/wecom.png"
                alt="企业微信二维码"
                className="w-48 h-48 rounded-lg"
              />
            </div>

            <p className="text-xs text-stone-400 text-center">
              长按识别二维码添加客服
            </p>
          </div>
        </div>
      )}
    </>
  );
}
