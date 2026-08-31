import React, { useRef, useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Order, PaymentMethod } from '../types';
import { ArrowLeft, Building2, CheckCircle2, Clipboard, CreditCard, Mail, MessageCircle, Phone, ShieldCheck, ShoppingBag, Store, Trash2, Truck, Upload, Wallet, X } from 'lucide-react';

const MAX_RECEIPT_SIZE = 5 * 1024 * 1024;
const jordanPhonePattern = /^(?:\+962|00962|0)7[789]\d{7}$/;

export const CheckoutView: React.FC = () => {
  const { state, currentUser, cart, clearCart, applyPromoCode, appliedPromo, removePromoCode, createOrder, language, navigateTo } = useStore();
  const [name, setName] = useState(currentUser?.name || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [deliveryChannel, setDeliveryChannel] = useState<'whatsapp' | 'email' | 'both'>('whatsapp');
  const [fulfillment, setFulfillment] = useState<'pickup' | 'delivery'>('pickup');
  const [governorate, setGovernorate] = useState('');
  const [address, setAddress] = useState('');
  const [payment, setPayment] = useState<PaymentMethod>('bank_transfer');
  const [transferor, setTransferor] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [promo, setPromo] = useState('');
  const [promoError, setPromoError] = useState('');
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<{ dataUrl: string; name: string; size: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const governors = (state.settings.fulfillment?.governorates || []).filter((item) => item.active);
  const selectedGovernor = governors.find((item) => item.id === governorate) || governors[0];
  const subtotal = cart.reduce((sum, item) => sum + item.product.priceJOD * item.quantity, 0);
  const subtotalUSD = cart.reduce((sum, item) => sum + item.product.priceUSD * item.quantity, 0);
  const discount = appliedPromo?.discountPercent ? subtotal * appliedPromo.discountPercent / 100 : Math.min(appliedPromo?.discountFixedJOD || 0, subtotal);
  const discountUSD = appliedPromo?.discountPercent ? subtotalUSD * appliedPromo.discountPercent / 100 : discount * state.settings.usdExchangeRate;
  const shipping = fulfillment === 'delivery' && subtotal < (state.settings.fulfillment?.freeDeliveryThresholdJOD || Infinity) ? selectedGovernor?.priceJOD || 0 : 0;
  const total = Math.max(0, subtotal - discount + shipping);
  const totalUSD = Math.max(0, subtotalUSD - discountUSD + shipping * state.settings.usdExchangeRate);
  const needsProof = payment === 'bank_transfer' || payment === 'cliq';

  const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return setError('يرجى اختيار صورة JPG أو PNG أو WEBP.');
    if (file.size > MAX_RECEIPT_SIZE) return setError('حجم الصورة كبير جداً. الحد الأقصى 5 ميجابايت.');
    setError('');
    const reader = new FileReader();
    reader.onload = () => setReceipt({ dataUrl: String(reader.result), name: file.name, size: file.size });
    reader.readAsDataURL(file);
  };

  const placeOrder = () => {
    if (isSubmitting) return;
    if (!name.trim()) return setError('يرجى إدخال الاسم الكامل.');
    if (!phone.trim() || !jordanPhonePattern.test(phone.replace(/[\s-]/g, ''))) return setError('يرجى إدخال رقم هاتف أردني صحيح.');
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) return setError('يرجى إدخال بريد إلكتروني صحيح.');
    if (fulfillment === 'delivery' && !address.trim()) return setError('يرجى إدخال عنوان التوصيل.');
    if (needsProof && !transferor.trim()) return setError('يرجى إدخال اسم صاحب الحساب الذي تم التحويل منه.');
    if (needsProof && !receipt) return setError('يرجى رفع صورة إيصال التحويل.');
    setError('');
    setIsSubmitting(true);
    const created = createOrder({
      customerName: name.trim(), customerPhone: phone.trim(), customerEmail: email.trim(), preferredDeliveryMethod: deliveryChannel,
      fulfillmentType: fulfillment, shippingGovernorate: fulfillment === 'delivery' ? selectedGovernoratorName(selectedGovernor, language) : undefined,
      shippingAddress: fulfillment === 'delivery' ? address.trim() : undefined, shippingCostJOD: shipping,
      shippingCostUSD: shipping * state.settings.usdExchangeRate, paymentMethod: payment,
      paymentReference: [transferor.trim(), reference.trim()].filter(Boolean).join(' | ') || undefined,
      paymentProofImage: receipt?.dataUrl, paymentProofFileName: receipt?.name, paymentProofFileSize: receipt?.size,
      notes: notes.trim() || undefined,
    });
    setOrder(created);
    clearCart();
    setIsSubmitting(false);
  };

  if (order) return <Success order={order} navigateTo={navigateTo} />;
  if (!cart.length) return <Empty navigateTo={navigateTo} />;

  return <main dir="rtl" className="min-h-screen bg-[#f7f8fa] px-4 py-6 text-slate-900 sm:px-6 lg:py-10">
    <div className="mx-auto max-w-7xl">
      <header className="mb-8 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0b5ed7] text-white"><ShoppingBag className="h-5 w-5" /></div><div><strong className="block">متجر قويدر</strong><small className="text-xs text-slate-500">Qwader Game</small></div></div><button onClick={() => navigateTo('#store')} className="flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-bold text-slate-600 hover:bg-slate-100"><ArrowLeft className="h-4 w-4" />العودة للمتجر</button></header>
      <div className="mb-7"><p className="text-sm font-bold text-[#0b5ed7]">الدفع</p><h1 className="mt-2 text-3xl font-black text-slate-950">إتمام الطلب</h1><p className="mt-2 text-sm text-slate-500">أكمل بياناتك واختر طريقة الدفع المناسبة لإتمام طلبك.</p><div className="mt-5 flex max-w-xl items-center gap-2 text-xs font-bold text-slate-400"><span>السلة</span><span>←</span><span>بيانات الطلب</span><span>←</span><b className="rounded-full bg-[#0b5ed7] px-3 py-1.5 text-white">الدفع</b><span>←</span><span>تم الطلب</span></div></div>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5"><Panel icon={<Phone />} title="بيانات العميل"><div className="grid gap-4 sm:grid-cols-2"><Field label="الاسم الكامل *" value={name} change={setName} placeholder="أدخل الاسم الكامل" /><Field label="رقم الهاتف *" value={phone} change={setPhone} placeholder="+962 7X XXX XXXX" type="tel" dir="ltr" /><Field label="البريد الإلكتروني" value={email} change={setEmail} placeholder="لإرسال نسخة من الطلب (اختياري)" type="email" dir="ltr" wide /></div><p className="mt-5 mb-2 text-sm font-bold">طريقة استلام المنتجات الرقمية</p><div className="grid grid-cols-3 gap-2">{(['whatsapp', 'email', 'both'] as const).map((item) => <button key={item} onClick={() => setDeliveryChannel(item)} className={`min-h-11 rounded-lg border text-xs font-bold ${deliveryChannel === item ? 'border-[#0b5ed7] bg-blue-50 text-[#0b5ed7]' : 'border-slate-200 text-slate-500'}`}>{item === 'whatsapp' ? 'واتساب' : item === 'email' ? 'إيميل' : 'كلاهما'}</button>)}</div></Panel>
        <Panel icon={<Truck />} title="طريقة الاستلام"><div className="grid gap-3 sm:grid-cols-2"><Choice active={fulfillment === 'pickup'} click={() => setFulfillment('pickup')} icon={<Store />} title="استلام من المتجر" text="بدون رسوم توصيل" /><Choice active={fulfillment === 'delivery'} click={() => setFulfillment('delivery')} icon={<Truck />} title="توصيل للمنزل" text="حسب المحافظة" /></div>{fulfillment === 'delivery' && <div className="mt-4 grid gap-4"><label className="text-sm font-bold">المحافظة *<select value={governorate || selectedGovernor?.id || ''} onChange={(event) => setGovernorate(event.target.value)} className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"><option value="">اختر المحافظة</option>{governors.map((item) => <option key={item.id} value={item.id}>{item.nameAr} - {item.priceJOD.toFixed(2)} د.أ</option>)}</select></label><Field label="عنوان التوصيل *" value={address} change={setAddress} placeholder="المدينة، الحي، الشارع، رقم المبنى" /></div>}</Panel>
        <Panel icon={<CreditCard />} title="طريقة الدفع"><div className="space-y-3"><Choice active={payment === 'bank_transfer'} click={() => setPayment('bank_transfer')} icon={<Building2 />} title="تحويل بنكي" text="حوّل قيمة الطلب ثم ارفع الإيصال" /><Choice active={payment === 'cliq'} click={() => setPayment('cliq')} icon={<Wallet />} title="CliQ" text="تحويل يدوي مع إيصال" /><Choice active={payment === 'cash_pickup'} click={() => setPayment('cash_pickup')} icon={<Wallet />} title="الدفع عند الاستلام" text="عند الاستلام أو التوصيل" /></div>{needsProof && <div className="mt-5 space-y-4 rounded-lg border border-blue-100 bg-blue-50 p-4"><p className="text-sm leading-6 text-slate-600">قم بالتحويل إلى البيانات الموجودة في إعدادات المتجر، ثم ارفع صورة واضحة للإيصال.</p><BankDetails settings={state.settings} /><Field label="اسم صاحب الحساب الذي تم التحويل منه *" value={transferor} change={setTransferor} placeholder="أدخل الاسم كما يظهر في الحساب البنكي" /><Receipt receipt={receipt} pick={() => fileInput.current?.click()} remove={() => setReceipt(null)} /><input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} className="hidden" /><Field label="الرقم المرجعي للتحويل (اختياري)" value={reference} change={setReference} placeholder="أدخل الرقم المرجعي إن وجد" dir="ltr" /></div>}<label className="mt-5 block text-sm font-bold">ملاحظات إضافية<textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 text-sm" /></label></Panel>{error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}<button disabled={isSubmitting} onClick={placeOrder} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#0b5ed7] text-base font-black text-white shadow-lg disabled:opacity-60"><CheckCircle2 className="h-5 w-5" />{isSubmitting ? 'جارٍ إرسال الطلب...' : needsProof ? 'إرسال الطلب وإيصال التحويل' : 'إكمال الطلب'}</button><p className="flex items-center justify-center gap-2 text-center text-xs text-slate-500"><ShieldCheck className="h-4 w-4 text-emerald-600" />لا نؤكد الدفع قبل مراجعة العملية والإيصال فعلياً.</p></div>
        <aside className="space-y-4 lg:sticky lg:top-5"><Summary cart={cart} subtotal={subtotal} discount={discount} shipping={shipping} total={total} promo={promo} setPromo={setPromo} apply={applyPromoCode} applied={appliedPromo} remove={removePromoCode} promoError={promoError} setPromoError={setPromoError} /></aside>
      </div>
    </div>
  </main>;
};

const selectedGovernoratorName = (governor: any, language: string) => governor ? (language === 'ar' ? governor.nameAr : governor.nameEn) : undefined;
const Panel = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><h2 className="mb-5 flex items-center gap-2 text-lg font-black"><span className="text-[#0b5ed7]">{icon}</span>{title}</h2>{children}</section>;
const Field = ({ label, value, change, placeholder, type = 'text', dir, wide }: { label: string; value: string; change: (value: string) => void; placeholder: string; type?: string; dir?: 'ltr'; wide?: boolean }) => <label className={`${wide ? 'sm:col-span-2' : ''} block text-sm font-bold text-slate-700`}>{label}<input type={type} dir={dir} value={value} onChange={(event) => change(event.target.value)} placeholder={placeholder} className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm font-normal outline-none focus:border-[#0b5ed7] focus:ring-2 focus:ring-blue-100" /></label>;
const Choice = ({ active, click, icon, title, text }: { active: boolean; click: () => void; icon: React.ReactNode; title: string; text: string }) => <button type="button" onClick={click} className={`flex w-full items-center gap-3 rounded-lg border p-4 text-right ${active ? 'border-[#0b5ed7] bg-blue-50 ring-1 ring-[#0b5ed7]' : 'border-slate-200 hover:border-slate-300'}`}><span className={`h-5 w-5 rounded-full border-2 p-1 ${active ? 'border-[#0b5ed7] bg-[#0b5ed7] bg-clip-content' : 'border-slate-300'}`} /><span className="text-[#0b5ed7]">{icon}</span><span className="flex-1"><strong className="block text-sm font-black">{title}</strong><small className="mt-1 block text-xs font-normal text-slate-500">{text}</small></span></button>;
const BankDetails = ({ settings }: { settings: any }) => { const rows = [['البنك', settings.bankNameAr], ['اسم صاحب الحساب', settings.bankAccountName], ['رقم الحساب / CliQ', settings.cliqAlias], ['IBAN', settings.bankIBAN]].filter(([, value]) => value); return rows.length ? <div className="space-y-2 text-sm">{rows.map(([label, value]) => <div key={label} className="flex items-center justify-between gap-3 border-b border-blue-100 py-2 last:border-0"><span className="text-slate-500">{label}</span><span className="flex items-center gap-2 text-left font-bold" dir={label === 'IBAN' || label === 'رقم الحساب / CliQ' ? 'ltr' : undefined}>{value}<button type="button" aria-label={`نسخ ${label}`} onClick={() => navigator.clipboard?.writeText(String(value))} className="rounded p-1 text-[#0b5ed7] hover:bg-white"><Clipboard className="h-4 w-4" /></button></span></div>)}</div> : <p className="rounded-lg bg-amber-50 p-3 text-sm font-bold text-amber-800">لم تتم إضافة بيانات التحويل بعد. يرجى مراجعة إدارة المتجر.</p>; };
const Receipt = ({ receipt, pick, remove }: { receipt: { name: string; size: number; dataUrl: string } | null; pick: () => void; remove: () => void }) => receipt ? <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3"><img src={receipt.dataUrl} alt="معاينة إيصال التحويل" className="h-16 w-16 rounded object-cover" /><span className="min-w-0 flex-1"><b className="block truncate text-sm">{receipt.name}</b><small className="text-slate-500">{(receipt.size / 1024 / 1024).toFixed(2)} MB</small></span><button type="button" onClick={remove} aria-label="حذف الإيصال" className="text-red-600"><Trash2 className="h-4 w-4" /></button></div> : <button type="button" onClick={pick} className="flex min-h-28 w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 text-sm font-bold text-slate-600 hover:border-[#0b5ed7]"><Upload className="h-6 w-6 text-[#0b5ed7]" />اختيار صورة<small className="font-normal text-slate-400">JPG، PNG أو WEBP حتى 5 MB</small></button>;
const Summary = ({ cart, subtotal, discount, shipping, total, promo, setPromo, apply, applied, remove, promoError, setPromoError }: any) => <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-4 text-lg font-black">ملخص الطلب</h2><div className="space-y-3">{cart.map((item: any) => <div key={item.product.id} className="flex gap-3 border-b border-slate-100 pb-3"><img loading="lazy" src={item.product.image} alt={item.product.nameAr} className="h-16 w-16 rounded-lg object-cover" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{item.product.nameAr}</p><p className="text-xs text-slate-500">الكمية: {item.quantity}</p><p className="text-sm font-black">{(item.product.priceJOD * item.quantity).toFixed(2)} د.أ</p></div></div>)}</div><form onSubmit={(event) => { event.preventDefault(); const result = apply(promo); if (result.success) { setPromo(''); setPromoError(''); } else setPromoError('رمز الخصم غير صالح أو منتهي.'); }} className="mt-5 flex gap-2">{applied ? <div className="flex w-full items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">كوبون {applied.code}<button type="button" onClick={remove} aria-label="إزالة الكوبون"><X className="h-4 w-4" /></button></div> : <><input value={promo} onChange={(event) => setPromo(event.target.value)} placeholder="أدخل رمز الكوبون" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 text-sm" /><button className="rounded-lg bg-slate-900 px-4 text-sm font-bold text-white">تطبيق</button></>}</form>{promoError && <p className="mt-2 text-xs font-bold text-red-600">{promoError}</p>}<div className="mt-5 space-y-3 border-t border-slate-100 pt-4 text-sm"><Line label="المجموع الفرعي" value={`${subtotal.toFixed(2)} د.أ`} /><Line label="الخصم" value={`-${discount.toFixed(2)} د.أ`} green /><Line label="التوصيل" value={shipping ? `${shipping.toFixed(2)} د.أ` : 'مجاني'} /><div className="flex justify-between border-t border-slate-200 pt-4 font-black"><span>الإجمالي</span><span className="text-2xl text-[#0b5ed7]">{total.toFixed(2)} د.أ</span></div></div></section>;
const Line = ({ label, value, green }: { label: string; value: string; green?: boolean }) => <div className="flex justify-between"><span className="text-slate-500">{label}</span><span className={green ? 'font-bold text-emerald-600' : 'font-bold'}>{value}</span></div>;
const Empty = ({ navigateTo }: { navigateTo: (route: string) => void }) => <main dir="rtl" className="min-h-[70vh] bg-[#f7f8fa] px-4 py-20"><div className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm"><ShoppingBag className="mx-auto h-14 w-14 text-[#0b5ed7]" /><h1 className="mt-5 text-xl font-black">سلة التسوق فارغة</h1><p className="mt-2 text-sm text-slate-500">أضف منتجات إلى السلة للمتابعة.</p><button onClick={() => navigateTo('#store')} className="mt-6 rounded-lg bg-[#0b5ed7] px-6 py-3 text-sm font-black text-white">العودة إلى المتجر</button></div></main>;
const Success = ({ order, navigateTo }: { order: Order; navigateTo: (route: string) => void }) => <main dir="rtl" className="min-h-[70vh] bg-[#f7f8fa] px-4 py-12"><div className="mx-auto max-w-xl rounded-xl border border-slate-200 bg-white p-7 text-center shadow-sm sm:p-10"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><CheckCircle2 className="h-9 w-9" /></div><p className="mt-6 font-bold text-emerald-600">تم استلام طلبك بنجاح</p><h1 className="mt-2 text-2xl font-black">شكراً لثقتك بمتجر قويدر</h1><div className="mt-7 space-y-3 rounded-lg bg-slate-50 p-5 text-sm"><Line label="رقم الطلب" value={order.orderNumber} /><Line label="الإجمالي" value={`${order.totalJOD.toFixed(2)} د.أ`} /><Line label="الحالة" value="بانتظار مراجعة الدفع" /></div><p className="mt-5 text-sm leading-6 text-slate-500">سنراجع إيصال التحويل ونتواصل معك عند تأكيد الدفع. لم يتم اعتبار الدفع مؤكداً بعد.</p><div className="mt-7 flex flex-col gap-3 sm:flex-row"><button onClick={() => navigateTo(`#track-order/${order.orderNumber}`)} className="flex min-h-11 flex-1 items-center justify-center rounded-lg bg-[#0b5ed7] text-sm font-black text-white">متابعة الطلب</button><button onClick={() => navigateTo('#store')} className="min-h-11 flex-1 rounded-lg border border-slate-300 text-sm font-black">العودة إلى المتجر</button></div></div></main>;
