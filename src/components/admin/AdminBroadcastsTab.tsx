import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { auth } from '../../lib/firebase';
import { BroadcastMessage, BroadcastType } from '../../types/admin';
import { UserProfile } from '../../types/auth';
import { 
  sendBroadcastMessage, 
  fetchAllBroadcasts, 
  toggleBroadcastStatus, 
  deleteBroadcastMessage 
} from '../../services/adminService';
import { 
  Send, 
  Radio, 
  Megaphone, 
  Sparkles, 
  AlertCircle, 
  Gift, 
  Info, 
  Trash2, 
  Power, 
  RefreshCw, 
  CheckCircle2,
  Calendar,
  User,
  Coins
} from 'lucide-react';

export const AdminBroadcastsTab: React.FC = () => {
  const { user } = useAuth();
  const [broadcasts, setBroadcasts] = useState<BroadcastMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState<BroadcastType>('announcement');
  const [rewardCoins, setRewardCoins] = useState<number>(0);
  const [expiresDays, setExpiresDays] = useState<number>(30);

  const loadBroadcasts = async () => {
    setIsLoading(true);
    try {
      const data = await fetchAllBroadcasts();
      setBroadcasts(data);
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'تعذر تحميل الرسائل الجماعية' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBroadcasts();
  }, []);

  const getEffectiveAdminProfile = (): UserProfile | null => {
    if (user) return user;
    if (auth.currentUser) {
      return {
        uid: auth.currentUser.uid,
        email: auth.currentUser.email || null,
        displayName: auth.currentUser.displayName || 'المدير العام',
        role: 'admin',
        status: 'active',
        isPremium: true,
        virtualCoins: 999999,
        createdAt: Date.now(),
        lastLoginAt: Date.now()
      };
    }
    return null;
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[BROADCAST] Form submitted');

    const adminProfile = getEffectiveAdminProfile();
    if (!adminProfile) {
      setNotification({ type: 'error', message: 'يرجى تسجيل الدخول كمسؤول لإرسال الرسالة.' });
      return;
    }

    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();

    if (!trimmedTitle || !trimmedBody) {
      setNotification({ type: 'error', message: 'يرجى كتابة عنوان وتفاصيل الرسالة بشكل صحيح.' });
      return;
    }

    console.log('[BROADCAST] Payload validated:', { title: trimmedTitle, type, rewardCoins, expiresDays });
    setIsSubmitting(true);
    setNotification(null);

    try {
      console.log('[BROADCAST] Creating broadcast');
      const expiresAt = Date.now() + expiresDays * 24 * 60 * 60 * 1000;
      await sendBroadcastMessage(adminProfile, {
        title: trimmedTitle,
        body: trimmedBody,
        type,
        rewardCoins: Math.max(0, Number(rewardCoins) || 0),
        expiresAt,
      });

      console.log('[BROADCAST] Broadcast created successfully');
      setNotification({ type: 'success', message: 'تم إرسال الرسالة الجماعية لجميع اللاعبين بنجاح!' });
      setTitle('');
      setBody('');
      setRewardCoins(0);
      setExpiresDays(30);
      await loadBroadcasts();
    } catch (err: any) {
      console.error('Error sending broadcast:', err);
      setNotification({ type: 'error', message: err.message || 'حدث خطأ أثناء إرسال الرسالة الجماعية' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (item: BroadcastMessage) => {
    const adminProfile = getEffectiveAdminProfile();
    if (!adminProfile) return;
    try {
      await toggleBroadcastStatus(adminProfile, item.id, !item.isActive);
      setBroadcasts(prev => prev.map(b => b.id === item.id ? { ...b, isActive: !b.isActive } : b));
      setNotification({ type: 'success', message: `تم ${!item.isActive ? 'تفعيل' : 'إيقاف'} الرسالة بنجاح.` });
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'تعذر تغيير الحالة' });
    }
  };

  const handleDelete = async (broadcastId: string) => {
    const adminProfile = getEffectiveAdminProfile();
    if (!adminProfile) return;
    if (!window.confirm('هل أنت متأكد من حذف هذه الرسالة الجماعية نهائياً؟')) return;

    try {
      await deleteBroadcastMessage(adminProfile, broadcastId);
      setBroadcasts(prev => prev.filter(b => b.id !== broadcastId));
      setNotification({ type: 'success', message: 'تم حذف الرسالة بنجاح.' });
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'تعذر الحذف' });
    }
  };

  const getTypeBadge = (bType: BroadcastType) => {
    switch (bType) {
      case 'announcement':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20"><Megaphone className="w-3 h-3" /> إعلان عام</span>;
      case 'event':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20"><Sparkles className="w-3 h-3" /> حدث خاص</span>;
      case 'maintenance':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20"><AlertCircle className="w-3 h-3" /> صيانة ونظام</span>;
      case 'reward':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><Gift className="w-3 h-3" /> مكافأة وهدية</span>;
      case 'update':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"><Info className="w-3 h-3" /> تحديث جديد</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">إرسال رسالة جماعية (Admin Broadcast)</h2>
              <p className="text-xs text-slate-400">بث رسائل وإعلانات ومكافآت رسمية مباشرة إلى صندوق بريد جميع اللاعبين</p>
            </div>
          </div>
          <button
            onClick={loadBroadcasts}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
            title="تحديث القائمة"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {notification && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between text-sm ${
          notification.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="text-xs opacity-70 hover:opacity-100">إغلاق</button>
        </div>
      )}

      {/* Grid: Create Form + Broadcasts List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Creation Form */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <Send className="w-4 h-4 text-indigo-400" />
            إنشاء رسالة جماعية جديدة
          </h3>

          <form onSubmit={handleSendBroadcast} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">عنوان الرسالة</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="مثال: تحديث عالمي جديد + مكافأة 500 كوينز"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">نوع الإعلان</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'announcement', label: 'إعلان عام' },
                  { id: 'event', label: 'حدث خاص' },
                  { id: 'update', label: 'تحديث لعبة' },
                  { id: 'reward', label: 'مكافأة' },
                  { id: 'maintenance', label: 'صيانة' },
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setType(item.id as BroadcastType)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      type === item.id 
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' 
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">مكافأة كوينز (اختياري)</label>
                <div className="relative">
                  <Coins className="w-4 h-4 text-amber-400 absolute right-3 top-3" />
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={rewardCoins}
                    onChange={e => setRewardCoins(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-2.5 text-sm text-amber-400 font-bold focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">فترة الصلاحية (أيام)</label>
                <input
                  type="number"
                  min="1"
                  max="90"
                  value={expiresDays}
                  onChange={e => setExpiresDays(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">محتوى وتفاصيل الرسالة</label>
              <textarea
                rows={5}
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="اكتب تفاصيل الإعلان هنا ليصل لجميع المدربين..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {isSubmitting ? 'جاري الإرسال...' : 'بث الرسالة لجميع اللاعبين الآن'}
            </button>
          </form>
        </div>

        {/* Existing Broadcasts List */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <h3 className="text-base font-bold text-white mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-400" />
              سجل الرسائل الجماعية السابقة ({broadcasts.length})
            </span>
          </h3>

          {isLoading ? (
            <div className="text-center py-12 text-slate-500 text-sm">جاري تحميل الرسائل...</div>
          ) : broadcasts.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">لم يتم إرسال أي رسائل جماعية بعد.</div>
          ) : (
            <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
              {broadcasts.map(item => (
                <div 
                  key={item.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    item.isActive 
                      ? 'bg-slate-950/80 border-slate-800 hover:border-slate-700' 
                      : 'bg-slate-950/40 border-slate-900 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getTypeBadge(item.type)}
                        {item.isActive ? (
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">نشط</span>
                        ) : (
                          <span className="text-[10px] bg-slate-800 text-slate-400 font-bold px-2 py-0.5 rounded-full">متوقف</span>
                        )}
                        {item.rewardCoins && item.rewardCoins > 0 ? (
                          <span className="text-[10px] bg-amber-500/20 text-amber-400 font-bold px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                            <Coins className="w-3 h-3" /> {item.rewardCoins} كوينز
                          </span>
                        ) : null}
                      </div>

                      <h4 className="text-sm font-bold text-white mt-1">{item.title}</h4>
                      <p className="text-xs text-slate-400 whitespace-pre-line leading-relaxed">{item.body}</p>

                      <div className="flex items-center gap-4 text-[10px] text-slate-500 pt-2 border-t border-slate-800/60">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(item.createdAt).toLocaleDateString('ar-EG')}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {item.createdByName || 'الإدارة'}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggleStatus(item)}
                        className={`p-2 rounded-xl border transition-colors ${
                          item.isActive 
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20' 
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                        }`}
                        title={item.isActive ? 'إيقاف البث' : 'تفعيل البث'}
                      >
                        <Power className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                        title="حذف نهائي"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
