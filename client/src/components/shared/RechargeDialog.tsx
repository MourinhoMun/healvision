import { useState } from 'react';
import { X, KeyRound, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

interface Props {
  onClose: () => void;
}

export function RechargeDialog({ onClose }: Props) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const recharge = useAuthStore((s) => s.recharge);
  const balance = useAuthStore((s) => s.balance);

  const handleRecharge = async () => {
    if (!code.trim()) return;
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await recharge(code.trim());
      setSuccess('充值成功！');
      setCode('');
    } catch (err: any) {
      setError(err.message || '充值失败，请检查充值码');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleRecharge();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">充值积分</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
            <X size={20} />
          </button>
        </div>

        <p className="text-sm text-gray-500 mb-4">
          当前余额：<span className="font-semibold text-primary-600">{balance}</span> 积分
        </p>

        <div className="space-y-3">
          <div className="relative">
            <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入充值码..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              autoFocus
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-2.5 bg-red-50 text-red-700 rounded-lg text-xs">
              <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-start gap-2 p-2.5 bg-green-50 text-green-700 rounded-lg text-xs">
              <CheckCircle size={14} className="mt-0.5 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <button
            onClick={handleRecharge}
            disabled={loading || !code.trim()}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : null}
            充值
          </button>
        </div>

        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500 text-center">
            如需购买充值码，请添加鹏哥微信：
            <span className="font-semibold text-primary-600">peng_ip</span>
          </p>
        </div>
      </div>
    </div>
  );
}
