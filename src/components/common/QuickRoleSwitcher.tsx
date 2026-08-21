import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { ShieldCheck, Crown, User, RefreshCw, ChevronDown, Check } from 'lucide-react';
import { UserRole } from '../../types';

export const QuickRoleSwitcher: React.FC = () => {
  const { currentUser, switchDemoRole, language, t } = useStore();
  const [isOpen, setIsOpen] = useState(false);

  const roles: { role: UserRole; titleAr: string; titleEn: string; descAr: string; descEn: string; icon: any; color: string }[] = [
    {
      role: 'owner',
      titleAr: 'مالك المتجر (Owner)',
      titleEn: 'Store Owner',
      descAr: 'صلاحيات مطلقة: إعدادات، موظفين، نسخ احتياطي، منتجات وطلبات',
      descEn: 'Full permissions: settings, staff, backup, products & orders',
      icon: Crown,
      color: 'from-amber-500 to-yellow-600 text-amber-300 border-amber-500/40 bg-amber-950/30',
    },
    {
      role: 'staff',
      titleAr: 'مشرف المبيعات (Staff)',
      titleEn: 'Store Staff',
      descAr: 'صلاحيات تشغيلية: إدارة وتحديث الطلبات والدعم والمنتجات فقط',
      descEn: 'Operational permissions: manage orders, support & products',
      icon: ShieldCheck,
      color: 'from-blue-500 to-cyan-600 text-cyan-300 border-cyan-500/40 bg-cyan-950/30',
    },
    {
      role: 'customer',
      titleAr: 'الزبون / العميل (Customer)',
      titleEn: 'Customer Account',
      descAr: 'تجربة المشتري: شراء فوري، تتبع الطلبات والتايم لاين، مراجعات ودعم',
      descEn: 'Customer flow: checkout, order timeline tracking & reviews',
      icon: User,
      color: 'from-emerald-500 to-teal-600 text-emerald-300 border-emerald-500/40 bg-emerald-950/30',
    },
  ];

  const currentRoleInfo = roles.find((r) => r.role === (currentUser?.role || 'customer')) || roles[2];
  const CurrentIcon = currentRoleInfo.icon;

  return (
    <div className="relative inline-block text-start">
      <button
        id="demo-role-switcher-toggle-btn"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-md backdrop-blur-md ${currentRoleInfo.color} hover:brightness-110`}
        title={language === 'ar' ? 'تبديل دور المستخدم للتجربة السريعة' : 'Switch demo role for quick evaluation'}
      >
        <CurrentIcon className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">
          {language === 'ar' ? currentRoleInfo.titleAr : currentRoleInfo.titleEn}
        </span>
        <span className="sm:hidden uppercase">{currentUser?.role || 'customer'}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          id="demo-role-switcher-dropdown"
          className="absolute z-50 mt-2 end-0 w-72 rounded-2xl glass-panel p-2 shadow-2xl border border-violet-500/30 text-slate-100 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="px-3 py-2 border-b border-slate-800/80 mb-1.5 flex items-center justify-between">
            <span className="text-xs font-bold text-violet-300 flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 text-violet-400" />
              {language === 'ar' ? 'تبديل الدور التجريبي السريع' : 'Quick Demo Role Switcher'}
            </span>
          </div>

          <div className="space-y-1">
            {roles.map((item) => {
              const Icon = item.icon;
              const isSelected = (currentUser?.role || 'customer') === item.role;

              return (
                <button
                  key={item.role}
                  id={`switch-to-role-${item.role}`}
                  onClick={() => {
                    switchDemoRole(item.role);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-start gap-2.5 p-2.5 rounded-xl text-start transition-all ${
                    isSelected
                      ? 'bg-violet-600/25 border border-violet-500/40 text-white'
                      : 'hover:bg-slate-800/60 text-slate-300'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg border flex-shrink-0 ${item.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-100">
                        {language === 'ar' ? item.titleAr : item.titleEn}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                      {language === 'ar' ? item.descAr : item.descEn}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-2 pt-2 border-t border-slate-800/80 px-2 text-[10px] text-slate-500 text-center">
            {language === 'ar' ? 'يمكنك اختبار صلاحيات المالك والموظف والمشتري بضغطة واحدة' : 'Test Owner, Staff & Customer flow with 1-click'}
          </div>
        </div>
      )}
    </div>
  );
};
