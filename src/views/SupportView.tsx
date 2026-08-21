import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { SupportTicket } from '../types';
import {
  Headphones,
  MessageCircle,
  Plus,
  Send,
  CheckCircle2,
  Clock,
  User,
  ShieldCheck,
  Phone,
  Mail,
  Sparkles
} from 'lucide-react';

export const SupportView: React.FC = () => {
  const {
    state,
    currentUser,
    createSupportTicket,
    addSupportMessage,
    language,
    t,
  } = useStore();

  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(
    state.supportTickets[0]?.id || null
  );
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newCategory, setNewCategory] = useState<'order_inquiry' | 'technical_help' | 'activation_help' | 'general'>('activation_help');
  const [newInitialMessage, setNewInitialMessage] = useState('');
  const [replyText, setReplyText] = useState('');

  const userTickets = state.supportTickets.filter((tk) => {
    if (currentUser?.role === 'customer') {
      return tk.userId === currentUser.id;
    }
    return true;
  });

  const activeTicket = state.supportTickets.find((tk) => tk.id === selectedTicketId);

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !newInitialMessage.trim()) return;

    const res = createSupportTicket(newSubject.trim(), newCategory, newInitialMessage.trim());
    if (res.success && res.ticket) {
      setSelectedTicketId(res.ticket.id);
      setIsCreatingNew(false);
      setNewSubject('');
      setNewInitialMessage('');
    }
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketId || !replyText.trim()) return;
    addSupportMessage(selectedTicketId, replyText.trim());
    setReplyText('');
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent('مرحباً فريق الدعم الفني في متجر كوادر ستور 🎮');
    window.open(`https://wa.me/${state.settings.whatsappNumber.replace(/[^0-9]/g, '')}?text=${text}`, '_blank');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl glass-card border border-white/10">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-purple-400 mb-1">
            <Headphones className="w-4 h-4" />
            <span>{t.support}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-100 font-cairo">
            {language === 'ar' ? 'مركز الدعم الفني وتذاكر المساعدة' : 'Support Center & Tickets'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {language === 'ar'
              ? 'مساعدة مباشرة في تفعيل الحسابات وشحن بطاقات الستور والطلبات'
              : 'Direct assistance for account activation, wallet top-ups, and orders'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="support-new-ticket-btn"
            onClick={() => setIsCreatingNew(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-lg shadow-purple-900/30 font-cairo"
          >
            <Plus className="w-4 h-4" />
            <span>{language === 'ar' ? 'فتح تذكرة جديدة' : 'New Ticket'}</span>
          </button>

          <button
            id="support-whatsapp-btn"
            onClick={handleWhatsApp}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-900/30"
          >
            <MessageCircle className="w-4 h-4" />
            <span>{language === 'ar' ? 'واتساب مباشر' : 'WhatsApp'}</span>
          </button>
        </div>
      </div>

      {/* Main Support Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Tickets Sidebar List (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <h3 className="text-xs font-bold text-slate-400 px-1 font-cairo">
            {language === 'ar' ? 'التذاكر والمحادثات المفتوحة' : 'Your Support Tickets'} ({userTickets.length})
          </h3>

          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {userTickets.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6 glass-panel border border-white/10 rounded-2xl">
                {language === 'ar' ? 'لا توجد تذاكر دعم مفتوحة' : 'No tickets opened'}
              </p>
            ) : (
              userTickets.map((tk) => {
                const isSelected = selectedTicketId === tk.id;
                return (
                  <div
                    key={tk.id}
                    id={`support-ticket-tab-${tk.id}`}
                    onClick={() => {
                      setSelectedTicketId(tk.id);
                      setIsCreatingNew(false);
                    }}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-purple-950/60 border-purple-500 text-white shadow-lg'
                        : 'glass-panel border-white/10 text-slate-300 hover:border-purple-500/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-950 border border-slate-700 text-purple-300">
                        {tk.category}
                      </span>
                      <span className={`text-[10px] font-bold ${tk.status === 'open' ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {tk.status === 'open' ? '● نشطة' : '○ مغلقة'}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-100 truncate">{tk.subject}</h4>
                    <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                      {tk.messages[tk.messages.length - 1]?.text}
                    </p>
                    <span className="text-[10px] text-slate-500 mt-2 block">
                      {new Date(tk.updatedAt).toLocaleDateString(language === 'ar' ? 'ar-JO' : 'en-US')}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Conversation Thread or New Ticket Form (8 cols) */}
        <div className="lg:col-span-8">
          {isCreatingNew ? (
            /* New Ticket Form */
            <div className="p-6 rounded-3xl glass-card border border-white/10 space-y-4">
              <h3 className="text-base font-bold text-slate-100 font-cairo">
                {language === 'ar' ? 'إنشاء تذكرة دعم فني جديدة' : 'Create Support Ticket'}
              </h3>

              <form onSubmit={handleCreateTicket} className="space-y-4">
                <div>
                  <label className="block text-xs text-slate-300 font-semibold mb-1">
                    {language === 'ar' ? 'عنوان المشكلة / الموضوع' : 'Subject'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    placeholder={language === 'ar' ? 'مثال: مساعدة في تفعيل حساب لعبة FIFA 25' : 'e.g. Help with account activation'}
                    className="w-full p-3.5 rounded-2xl text-xs bg-white/5 border border-white/10 text-slate-100 focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-300 font-semibold mb-1">
                    {language === 'ar' ? 'تصنيف الطلب' : 'Category'}
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full p-3.5 rounded-2xl text-xs bg-white/5 border border-white/10 text-slate-200 focus:border-purple-500 focus:outline-none"
                  >
                    <option value="activation_help" className="bg-slate-900 text-slate-100">{language === 'ar' ? 'مساعدة بالتفعيل والسوني' : 'Activation Help'}</option>
                    <option value="order_inquiry" className="bg-slate-900 text-slate-100">{language === 'ar' ? 'استفسار عن كود أو طلب' : 'Order Inquiry'}</option>
                    <option value="technical_help" className="bg-slate-900 text-slate-100">{language === 'ar' ? 'مشكلة تقنية أو خطأ' : 'Technical Problem'}</option>
                    <option value="general" className="bg-slate-900 text-slate-100">{language === 'ar' ? 'عام / أخرى' : 'General'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-300 font-semibold mb-1">
                    {language === 'ar' ? 'تفاصيل الرسالة أو المشكلة' : 'Message Details'} *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={newInitialMessage}
                    onChange={(e) => setNewInitialMessage(e.target.value)}
                    placeholder={language === 'ar' ? 'اشرح بالتفصيل ما الذي تريده من فريق الدعم...' : 'Provide details...'}
                    className="w-full p-3.5 rounded-2xl text-xs bg-white/5 border border-white/10 text-slate-100 focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-full bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-900/30 transition-all font-cairo"
                  >
                    {language === 'ar' ? 'إرسال التذكرة' : 'Send Ticket'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreatingNew(false)}
                    className="px-4 py-2.5 rounded-full glass-panel border border-white/10 text-slate-400 text-xs font-bold"
                  >
                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>
                </div>
              </form>
            </div>
          ) : activeTicket ? (
            /* Active Ticket Conversation Box */
            <div className="rounded-3xl glass-card border border-white/10 overflow-hidden flex flex-col h-[520px]">
              {/* Thread Header */}
              <div className="p-4 border-b border-white/10 bg-slate-950/60 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-100 font-cairo">{activeTicket.subject}</h4>
                  <span className="text-[11px] text-purple-400 font-semibold">
                    {activeTicket.userName} ({activeTicket.userPhone})
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                  {activeTicket.status === 'open' ? 'نشطة ومفتوحة' : 'مغلقة'}
                </span>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-950/30">
                {activeTicket.messages.map((msg) => {
                  const isStaff = msg.senderRole === 'owner' || msg.senderRole === 'staff';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col max-w-[80%] ${
                        isStaff ? 'ms-auto items-end' : 'me-auto items-start'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 text-[10px]">
                        <span className={`font-bold ${isStaff ? 'text-purple-400' : 'text-slate-300'}`}>
                          {msg.senderName}
                        </span>
                        {isStaff && (
                          <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-purple-950 text-purple-300 border border-purple-500/30">
                            فريق الدعم
                          </span>
                        )}
                        <span className="text-slate-500">
                          {new Date(msg.createdAt).toLocaleTimeString(language === 'ar' ? 'ar-JO' : 'en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <div
                        className={`p-3 rounded-2xl text-xs leading-relaxed ${
                          isStaff
                            ? 'bg-purple-600 text-white rounded-te-none'
                            : 'glass-panel border border-white/10 text-slate-200 rounded-ts-none'
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reply Input Bar */}
              <form onSubmit={handleSendReply} className="p-3 border-t border-white/10 bg-slate-950/80 flex gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={language === 'ar' ? 'اكتب ردك هنا...' : 'Type your reply...'}
                  className="flex-1 px-3.5 py-2.5 rounded-full text-xs bg-white/5 border border-white/10 text-slate-100 focus:border-purple-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{language === 'ar' ? 'إرسال' : 'Send'}</span>
                </button>
              </form>
            </div>
          ) : (
            <div className="p-12 rounded-3xl glass-panel border border-white/10 text-center">
              <Headphones className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-xs text-slate-400">
                {language === 'ar' ? 'حدد تذكرة لعرض المحادثة أو افتح تذكرة جديدة' : 'Select a ticket to view thread'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
