import React, { useRef, useState } from "react";
import { useStore } from "../context/StoreContext";
import { Order, PaymentMethod } from "../types";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clipboard,
  CreditCard,
  Mail,
  MessageCircle,
  Phone,
  ShieldCheck,
  ShoppingBag,
  Store,
  Trash2,
  Truck,
  Upload,
  Wallet,
  X,
} from "lucide-react";

const MAX_RECEIPT_SIZE = 5 * 1024 * 1024;
const jordanPhonePattern = /^(?:\+962|00962|0)7[789]\d{7}$/;

export const CheckoutView: React.FC = () => {
  const {
    state,
    currentUser,
    cart,
    clearCart,
    applyPromoCode,
    appliedPromo,
    removePromoCode,
    createOrder,
    language,
    t,
    navigateTo,
    formatPrice,
  } = useStore();
  const checkoutCopy = language === "ar"
    ? {
        brand: "متجر قويدر", back: "العودة للمتجر", payment: "الدفع", title: "إتمام الطلب",
        subtitle: "أكمل بياناتك واختر طريقة الدفع المناسبة لإتمام طلبك.", cart: "السلة", details: "بيانات الطلب", done: "تم الطلب",
        customer: "بيانات العميل", fullName: "الاسم الكامل *", fullNamePlaceholder: "أدخل الاسم الكامل", phone: "رقم الهاتف *",
        email: "البريد الإلكتروني", emailPlaceholder: "لإرسال نسخة من الطلب (اختياري)", receive: "طريقة استلام المنتجات الرقمية",
        whatsapp: "واتساب", emailShort: "إيميل", both: "كلاهما", fulfillment: "طريقة الاستلام", pickup: "استلام من المتجر",
        noDeliveryFee: "بدون رسوم توصيل", homeDelivery: "توصيل للمنزل", noShipping: "بدون رسوم شحن حالياً", remote: "التسليم عبر الهاتف / عن بُعد",
        remoteText: "إرسال الحساب أو الكود عبر قناة تختارها", country: "الدولة *", city: "المدينة *", governorate: "المحافظة *",
        chooseGovernorate: "اختر المحافظة", address: "العنوان التفصيلي *", addressPlaceholder: "الحي، الشارع، رقم المبنى",
        contactNote: "سيتم استخدام رقم الهاتف المدخل في بيانات العميل للتواصل والتوصيل.", contactChannel: "اختر قناة التواصل لإرسال الحساب أو الكود *",
        noChannels: "لا توجد قنوات تواصل مضافة حالياً.", accountHandle: "اسم المستخدم أو رابط حسابك على المنصة *", accountPlaceholder: "اكتب اسم المستخدم أو رابط حسابك", paymentMethod: "طريقة الدفع", bank: "تحويل بنكي", bankText: "حوّل قيمة الطلب ثم ارفع الإيصال",
        cliq: "CliQ", cliqText: "تحويل يدوي مع إيصال", cash: "الدفع عند الاستلام", cashText: "عند الاستلام أو التوصيل",
        remoteCash: "لا يتوفر الدفع عند الاستلام للطلبات الرقمية/عن بُعد. يرجى اختيار تحويل بنكي أو CliQ.", transferNote: "قم بالتحويل إلى البيانات الموجودة في إعدادات المتجر، ثم ارفع صورة واضحة للإيصال.",
        notes: "ملاحظات إضافية", submit: "إرسال الطلب وإيصال التحويل", complete: "إكمال الطلب", submitting: "جارٍ إرسال الطلب...", proofNote: "لا نؤكد الدفع قبل مراجعة العملية والإيصال فعلياً.",
        summary: "ملخص الطلب", quantity: "الكمية", promoInvalid: "رمز الخصم غير صالح أو منتهي.", apply: "تطبيق", promoPlaceholder: "أدخل رمز الكوبون", total: "الإجمالي",
      }
    : {
        brand: "QWADER STORE", back: "Back to store", payment: "Payment", title: "Complete your order",
        subtitle: "Enter your details and choose a payment method to place your order.", cart: "Cart", details: "Order details", done: "Complete",
        customer: "Customer details", fullName: "Full name *", fullNamePlaceholder: "Enter your full name", phone: "Phone number *",
        email: "Email address", emailPlaceholder: "For an order copy (optional)", receive: "Digital delivery method",
        whatsapp: "WhatsApp", emailShort: "Email", both: "Both", fulfillment: "Fulfillment method", pickup: "Store pickup",
        noDeliveryFee: "No delivery fee", homeDelivery: "Home delivery", noShipping: "No shipping fee currently", remote: "Phone / remote delivery",
        remoteText: "Send the account or code through a channel you choose", country: "Country *", city: "City *", governorate: "Governorate *",
        chooseGovernorate: "Choose governorate", address: "Detailed address *", addressPlaceholder: "Area, street, building number",
        contactNote: "We will use the customer phone number for contact and delivery.", contactChannel: "Choose a contact channel for the account or code *",
        noChannels: "No contact channels are currently configured.", accountHandle: "Your username or profile link *", accountPlaceholder: "Enter your username or profile link", paymentMethod: "Payment method", bank: "Bank transfer", bankText: "Transfer the order amount and upload the receipt",
        cliq: "CliQ", cliqText: "Manual transfer with receipt", cash: "Cash on delivery", cashText: "At pickup or delivery",
        remoteCash: "Cash on delivery is unavailable for digital or remote orders. Choose bank transfer or CliQ.", transferNote: "Transfer to the account details below, then upload a clear receipt.",
        notes: "Additional notes", submit: "Submit order and transfer receipt", complete: "Complete order", submitting: "Submitting order...", proofNote: "Payment is confirmed only after the transfer and receipt are reviewed.",
        summary: "Order summary", quantity: "Quantity", promoInvalid: "Invalid or expired promo code.", apply: "Apply", promoPlaceholder: "Enter promo code", total: "Total",
      };
  const [name, setName] = useState(currentUser?.name || "");
  const [phone, setPhone] = useState(currentUser?.phone || "");
  const [email, setEmail] = useState(currentUser?.email || "");
  const [fulfillment, setFulfillment] = useState<
    "pickup" | "delivery" | "remote"
  >("pickup");
  const [deliveryContactChannel, setDeliveryContactChannel] = useState("");
  const [deliveryContactHandle, setDeliveryContactHandle] = useState("");
  const [country, setCountry] = useState("الأردن");
  const [city, setCity] = useState("");
  const [governorate, setGovernorate] = useState("");
  const [address, setAddress] = useState("");
  const [payment, setPayment] = useState<PaymentMethod>("bank_transfer");
  const [transferor, setTransferor] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [promo, setPromo] = useState("");
  const [promoError, setPromoError] = useState("");
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<{
    dataUrl: string;
    name: string;
    size: number;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const bankDetailsLabels = {
    bank: language === "ar" ? "البنك" : "Bank",
    accountHolder: language === "ar" ? "اسم صاحب الحساب" : "Account holder",
    cliq: language === "ar" ? "رقم الحساب / CliQ" : "Account number / CliQ",
    iban: "IBAN",
  };

  const governors = (state.settings.fulfillment?.governorates || []).filter(
    (item) => item.active,
  );
  const socialOptions = [
    { key: "email", url: "", label: language === "ar" ? "البريد الإلكتروني" : "Email" },
    ...Object.entries(state.settings.socialLinks || {})
    .filter(([key, value]) => (Boolean(value) || key === "facebook") && !["tiktok", "youtube"].includes(key))
    .map(([key, value]) => ({
      key,
      url: String(value || (key === "facebook" ? "https://facebook.com/qwaderstore" : "")),
      label:
        (
          {
            whatsapp: "واتساب",
            facebook: "فيسبوك",
            instagram: "إنستغرام",
            telegram: "تيليجرام",
            twitter: "تويتر",
            discord: "ديسكورد",
            snapchat: "سناب شات",
            linkedin: "لينكدإن",
          } as Record<string, string>
        )[key] || key,
    })),
  ];
  const selectedSocial = socialOptions.find(
    (item) => item.key === deliveryContactChannel,
  );
  const selectedGovernor =
    governors.find((item) => item.id === governorate) || governors[0];
  const subtotal = cart.reduce(
    (sum, item) =>
      sum + (Number(item.product.priceJOD) || 0) * (Number(item.quantity) || 0),
    0,
  );
  const subtotalUSD = cart.reduce(
    (sum, item) =>
      sum + (Number(item.product.priceUSD) || 0) * (Number(item.quantity) || 0),
    0,
  );
  const discount = appliedPromo?.discountPercent
    ? (subtotal * appliedPromo.discountPercent) / 100
    : Math.min(appliedPromo?.discountFixedJOD || 0, subtotal);
  const discountUsdAmount = appliedPromo?.discountPercent
    ? (subtotalUSD * appliedPromo.discountPercent) / 100
    : discount * state.settings.usdExchangeRate;
  const shipping = 0;
  const total = Math.max(0, subtotal - discount + shipping);
  const totalUSD = Math.max(
    0,
    subtotalUSD - discountUsdAmount + shipping * state.settings.usdExchangeRate,
  );
  const needsProof = payment === "bank_transfer" || payment === "cliq";

  const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
      return setError(t.receiptTypeError);
    if (file.size > MAX_RECEIPT_SIZE)
      return setError(t.receiptSizeError);
    setError("");
    const reader = new FileReader();
    reader.onload = () =>
      setReceipt({
        dataUrl: String(reader.result),
        name: file.name,
        size: file.size,
      });
    reader.readAsDataURL(file);
  };

  const placeOrder = async () => {
    if (isSubmitting) return;
    if (!name.trim()) return setError(t.fullNameRequired);
    if (!phone.trim() || !jordanPhonePattern.test(phone.replace(/[\s-]/g, "")))
      return setError(t.phoneInvalid);
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim()))
      return setError(t.emailInvalid);
    if (fulfillment === "delivery" && !country.trim())
      return setError(t.countryRequired);
    if (fulfillment === "delivery" && !city.trim())
      return setError(t.cityRequired);
    if (fulfillment === "delivery" && !governorate && !selectedGovernor)
      return setError(t.governorateRequired);
    if (fulfillment === "delivery" && !address.trim())
      return setError(t.addressRequired);
    if (fulfillment === "remote" && !selectedSocial)
      return setError(t.deliveryChannelRequired);
    if (fulfillment === "remote" && !deliveryContactHandle.trim())
      return setError(language === "ar" ? "يرجى كتابة اسم المستخدم أو رابط حسابك" : "Please enter your username or profile link");
    if (fulfillment === "remote" && deliveryContactChannel === "email" && !/^\S+@\S+\.\S+$/.test(deliveryContactHandle.trim()))
      return setError(language === "ar" ? "يرجى كتابة بريد إلكتروني صحيح" : "Please enter a valid email address");
    if (needsProof && !transferor.trim())
      return setError(t.transferorRequired);
    if (needsProof && !receipt) return setError(t.receiptRequired);
    setError("");
    setIsSubmitting(true);
    try {
      const created = await createOrder({
        customerName: name.trim(),
        customerPhone: phone.trim(),
        customerEmail: email.trim(),
        preferredDeliveryMethod: "email",
        fulfillmentType: fulfillment === "remote" ? "delivery" : fulfillment,
        deliveryContactChannel: selectedSocial?.key,
        deliveryContactUrl: fulfillment === "remote" ? deliveryContactHandle.trim() : undefined,
        shippingCountry:
          fulfillment === "delivery" ? country.trim() : undefined,
        shippingCity: fulfillment === "delivery" ? city.trim() : undefined,
        shippingGovernorate:
          fulfillment === "delivery"
            ? selectedGovernoratorName(selectedGovernor, language)
            : undefined,
        shippingAddress:
          fulfillment === "delivery" ? address.trim() : undefined,
        shippingCostJOD: shipping,
        shippingCostUSD: shipping * state.settings.usdExchangeRate,
        paymentMethod: payment,
        paymentReference:
          [transferor.trim(), reference.trim()].filter(Boolean).join(" | ") ||
          undefined,
        paymentProofImage: receipt?.dataUrl,
        paymentProofFileName: receipt?.name,
        paymentProofFileSize: receipt?.size,
        notes: notes.trim() || undefined,
      });
      setOrder(created);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : t.orderCreationError,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (order) return <Success order={order} navigateTo={navigateTo} language={language} formatPrice={formatPrice} />;
  if (!cart.length) return <Empty navigateTo={navigateTo} language={language} copy={checkoutCopy} />;

  return (
    <main
      dir={language === "ar" ? "rtl" : "ltr"}
      className="min-h-screen bg-[#f7f8fa] px-4 py-6 text-slate-900 sm:px-6 lg:py-10"
    >
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#A855F7] text-white">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <strong className="block">{checkoutCopy.brand}</strong>
              <small className="text-xs text-slate-500">Qwader Game</small>
            </div>
          </div>
          <button
            onClick={() => navigateTo("#store")}
            className="flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-bold text-slate-600 hover:bg-slate-100"
          >
            <ArrowLeft className="h-4 w-4" />
            {checkoutCopy.back}
          </button>
        </header>
        <div className="mb-7">
          <p className="text-sm font-bold text-[#A855F7]">{checkoutCopy.payment}</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">
            {checkoutCopy.title}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {checkoutCopy.subtitle}
          </p>
          <div className="mt-5 flex max-w-xl items-center gap-2 text-xs font-bold text-slate-400">
            <span>{checkoutCopy.cart}</span>
            <span>←</span>
            <span>{checkoutCopy.details}</span>
            <span>←</span>
              <b className="rounded-full bg-[#A855F7] px-3 py-1.5 text-white">
              {checkoutCopy.payment}
            </b>
            <span>←</span>
            <span>{checkoutCopy.done}</span>
          </div>
        </div>
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            <Panel icon={<Phone />} title={checkoutCopy.customer}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label={checkoutCopy.fullName}
                  value={name}
                  change={setName}
                  placeholder={checkoutCopy.fullNamePlaceholder}
                />
                <Field
                  label={checkoutCopy.phone}
                  value={phone}
                  change={setPhone}
                  placeholder="+962 7X XXX XXXX"
                  type="tel"
                  dir="ltr"
                />
                <Field
                  label={checkoutCopy.email}
                  value={email}
                  change={setEmail}
                  placeholder={checkoutCopy.emailPlaceholder}
                  type="email"
                  dir="ltr"
                  wide
                />
              </div>
            </Panel>
            <Panel icon={<Truck />} title={checkoutCopy.fulfillment}>
              <div className="grid gap-3 sm:grid-cols-2">
                <Choice
                  active={fulfillment === "pickup"}
                  click={() => setFulfillment("pickup")}
                  icon={<Store />}
                  title={checkoutCopy.pickup}
                  text={checkoutCopy.noDeliveryFee}
                />
                <Choice
                  active={fulfillment === "delivery"}
                  click={() => setFulfillment("delivery")}
                  icon={<Truck />}
                  title={checkoutCopy.homeDelivery}
                  text={checkoutCopy.noShipping}
                />
                <Choice
                  active={fulfillment === "remote"}
                  click={() => {
                    setFulfillment("remote");
                    if (payment === "cash_pickup") setPayment("bank_transfer");
                  }}
                  icon={<Phone />}
                  title={checkoutCopy.remote}
                  text={checkoutCopy.remoteText}
                />
              </div>
              {fulfillment === "delivery" && (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field
                    label={checkoutCopy.country}
                    value={country}
                    change={setCountry}
                    placeholder={language === "ar" ? "الأردن" : "Jordan"}
                  />
                  <Field
                    label={checkoutCopy.city}
                    value={city}
                    change={setCity}
                    placeholder={language === "ar" ? "عمّان" : "Amman"}
                  />
                  <label className="text-sm font-bold">
                    {checkoutCopy.governorate}
                    <select
                      value={governorate || selectedGovernor?.id || ""}
                      onChange={(event) => setGovernorate(event.target.value)}
                      className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
                    >
                      <option value="">{checkoutCopy.chooseGovernorate}</option>
                      {governors.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.nameAr}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Field
                    label={checkoutCopy.address}
                    value={address}
                    change={setAddress}
                    placeholder={checkoutCopy.addressPlaceholder}
                  />
                  <p className="text-xs text-slate-500 sm:col-span-2">
                    {checkoutCopy.contactNote}
                  </p>
                </div>
              )}
              {fulfillment === "remote" && (
                <div className="mt-4">
                  <p className="mb-2 text-sm font-bold">
                    {checkoutCopy.contactChannel}
                  </p>
                  {socialOptions.length > 0 ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {socialOptions.map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => {
                            setDeliveryContactChannel(item.key);
                            setDeliveryContactHandle("");
                          }}
                          className={`rounded-lg border p-3 text-right text-sm font-bold ${selectedSocial?.key === item.key ? "border-[#A855F7] bg-purple-50 text-[#A855F7]" : "border-slate-200 text-slate-600"}`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-lg bg-amber-50 p-3 text-sm font-bold text-amber-800">
                      {checkoutCopy.noChannels}
                    </p>
                  )}
                  {selectedSocial && (
                    <div className="mt-4">
                      <Field
                        label={`${checkoutCopy.accountHandle} (${selectedSocial.label})`}
                        value={deliveryContactHandle}
                        change={setDeliveryContactHandle}
                        type={selectedSocial.key === "email" ? "email" : "text"}
                        placeholder={selectedSocial.key === "email" ? (language === "ar" ? "اكتب بريدك الإلكتروني" : "Enter your email") : checkoutCopy.accountPlaceholder}
                        dir="ltr"
                      />
                    </div>
                  )}
                </div>
              )}
            </Panel>
            <Panel icon={<CreditCard />} title={checkoutCopy.paymentMethod}>
              <div className="space-y-3">
                <Choice
                  active={payment === "bank_transfer"}
                  click={() => setPayment("bank_transfer")}
                  icon={<Building2 />}
                  title={checkoutCopy.bank}
                  text={checkoutCopy.bankText}
                />
                <Choice
                  active={payment === "cliq"}
                  click={() => setPayment("cliq")}
                  icon={<Wallet />}
                  title={checkoutCopy.cliq}
                  text={checkoutCopy.cliqText}
                />
                <Choice
                  active={payment === "cash_pickup"}
                  click={() => setPayment("cash_pickup")}
                  disabled={fulfillment === "remote"}
                  icon={<Wallet />}
                  title={checkoutCopy.cash}
                  text={checkoutCopy.cashText}
                />
              </div>
              {fulfillment === "remote" && payment === "cash_pickup" && (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-800">
                  {checkoutCopy.remoteCash}
                </div>
              )}
              {needsProof && (
                <div className="mt-5 space-y-4 rounded-lg border border-purple-100 bg-purple-50 p-4">
                  <p className="text-sm leading-6 text-slate-600">
                    {checkoutCopy.transferNote}
                  </p>
                  <BankDetails settings={state.settings} language={language} />
                  <Field
                    label={language === "ar" ? "اسم صاحب الحساب الذي تم التحويل منه *" : "Transfer account holder name *"}
                    value={transferor}
                    change={setTransferor}
                    placeholder={language === "ar" ? "أدخل الاسم كما يظهر في الحساب البنكي" : "Enter the name shown on the bank account"}
                  />
                  <Receipt
                    receipt={receipt}
                    pick={() => fileInput.current?.click()}
                    remove={() => setReceipt(null)}
                    language={language}
                  />
                  <input
                    ref={fileInput}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFile}
                    className="hidden"
                  />
                  <Field
                    label={language === "ar" ? "الرقم المرجعي للتحويل (اختياري)" : "Transfer reference (optional)"}
                    value={reference}
                    change={setReference}
                    placeholder={language === "ar" ? "أدخل الرقم المرجعي إن وجد" : "Enter the reference if available"}
                    dir="ltr"
                  />
                </div>
              )}
              <label className="mt-5 block text-sm font-bold">
                {checkoutCopy.notes}
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 text-sm"
                />
              </label>
            </Panel>
            {error && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700"
              >
                {error}
              </div>
            )}
            <button
              disabled={isSubmitting}
              onClick={placeOrder}
              className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#A855F7] text-base font-black text-white shadow-lg disabled:opacity-60"
            >
              <CheckCircle2 className="h-5 w-5" />
              {isSubmitting
                ? checkoutCopy.submitting
                : needsProof
                  ? checkoutCopy.submit
                  : checkoutCopy.complete}
            </button>
            <p className="flex items-center justify-center gap-2 text-center text-xs text-slate-500">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              {checkoutCopy.proofNote}
            </p>
          </div>
          <aside className="space-y-4 lg:sticky lg:top-5">
            <Summary
              cart={cart}
              subtotal={subtotal}
              subtotalUSD={subtotalUSD}
              discount={discount}
              discountUsdAmount={discountUsdAmount}
              shipping={shipping}
              total={total}
              totalUSD={totalUSD}
              exchangeRate={state.settings.usdExchangeRate}
              copy={checkoutCopy}
              promo={promo}
              setPromo={setPromo}
              apply={applyPromoCode}
              applied={appliedPromo}
              remove={removePromoCode}
              promoError={promoError}
              setPromoError={setPromoError}
              formatPrice={formatPrice}
              t={t}
              language={language}
            />
          </aside>
        </div>
      </div>
    </main>
  );
};

const selectedGovernoratorName = (governor: any, language: string) =>
  governor
    ? language === "ar"
      ? governor.nameAr
      : governor.nameEn
    : undefined;
const Panel = ({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) => (
  <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
    <h2 className="mb-5 flex items-center gap-2 text-lg font-black">
      <span className="text-[#A855F7]">{icon}</span>
      {title}
    </h2>
    {children}
  </section>
);
const Field = ({
  label,
  value,
  change,
  placeholder,
  type = "text",
  dir,
  wide,
}: {
  label: string;
  value: string;
  change: (value: string) => void;
  placeholder: string;
  type?: string;
  dir?: "ltr";
  wide?: boolean;
}) => (
  <label
    className={`${wide ? "sm:col-span-2" : ""} block min-w-0 text-sm font-bold text-slate-700`}
  >
    {label}
    <input
      type={type}
      dir={dir}
      value={value}
      onChange={(event) => change(event.target.value)}
      placeholder={placeholder}
      className={`mt-2 box-border min-h-11 w-full max-w-full rounded-lg border border-slate-300 px-3 text-sm font-normal outline-none focus:border-[#A855F7] focus:ring-2 focus:ring-purple-100 ${dir === "ltr" ? "text-left" : "text-right"}`}
    />
  </label>
);
const Choice = ({
  active,
  click,
  disabled = false,
  icon,
  title,
  text,
}: {
  active: boolean;
  click: () => void;
  disabled?: boolean;
  icon: React.ReactNode;
  title: string;
  text: string;
}) => (
  <button
    type="button"
    disabled={disabled}
    onClick={click}
    className={`flex min-w-0 w-full items-center gap-3 rounded-lg border p-4 text-right ${disabled ? "cursor-not-allowed opacity-50" : active ? "border-[#A855F7] bg-purple-50 ring-1 ring-[#A855F7]" : "border-slate-200 hover:border-slate-300"}`}
  >
    <span
      className={`h-5 w-5 rounded-full border-2 p-1 ${active ? "border-[#A855F7] bg-[#A855F7] bg-clip-content" : "border-slate-300"}`}
    />
    <span className="text-[#A855F7]">{icon}</span>
    <span className="min-w-0 flex-1">
      <strong className="block text-sm font-black">{title}</strong>
      <small className="mt-1 block text-xs font-normal text-slate-500">
        {text}
      </small>
    </span>
  </button>
);
const BankDetails = ({ settings, language }: { settings: any; language: "ar" | "en" }) => {
  const rows = [
    [language === "ar" ? "البنك" : "Bank", settings.bankNameAr || settings.bankNameEn || settings.bankName],
    [language === "ar" ? "اسم صاحب الحساب" : "Account holder", settings.bankAccountName],
    [language === "ar" ? "رقم الحساب / CliQ" : "Account number / CliQ", settings.cliqAlias],
    ["IBAN", settings.bankIBAN],
  ].filter(([, value]) => value);
  return rows.length ? (
    <div className="space-y-2 text-sm">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="flex items-center justify-between gap-3 border-b border-purple-100 py-2 last:border-0"
        >
          <span className="text-slate-500">{label}</span>
          <span
            className="flex items-center gap-2 text-left font-bold"
            dir={
              label === "IBAN" || label === (language === "ar" ? "رقم الحساب / CliQ" : "Account number / CliQ")
                ? "ltr"
                : undefined
            }
          >
            {value}
            <button
              type="button"
              aria-label={language === "ar" ? `نسخ ${label}` : `Copy ${label}`}
              onClick={() => navigator.clipboard?.writeText(String(value))}
              className="rounded p-1 text-[#A855F7] hover:bg-white"
            >
              <Clipboard className="h-4 w-4" />
            </button>
          </span>
        </div>
      ))}
    </div>
  ) : (
    <p className="rounded-lg bg-amber-50 p-3 text-sm font-bold text-amber-800">
      {language === "ar"
        ? "لم تتم إضافة بيانات التحويل بعد. يرجى مراجعة إدارة المتجر."
        : "No transfer details have been added yet. Please contact the store admin."}
    </p>
  );
};
const Receipt = ({
  receipt,
  pick,
  remove,
  language,
}: {
  receipt: { name: string; size: number; dataUrl: string } | null;
  pick: () => void;
  remove: () => void;
  language: "ar" | "en";
}) =>
  receipt ? (
    <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
      <img
        src={receipt.dataUrl}
        alt={language === "ar" ? "معاينة إيصال التحويل" : "Transfer receipt preview"}
        className="h-16 w-16 rounded object-cover"
      />
      <span className="min-w-0 flex-1">
        <b className="block truncate text-sm">{receipt.name}</b>
        <small className="text-slate-500">
          {((Number(receipt.size) || 0) / 1024 / 1024).toFixed(2)} MB
        </small>
      </span>
      <button
        type="button"
        onClick={remove}
        aria-label="حذف الإيصال"
        className="text-red-600"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  ) : (
    <button
      type="button"
      onClick={pick}
      className="flex min-h-28 w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 text-sm font-bold text-slate-600 hover:border-[#A855F7]"
    >
      <Upload className="h-6 w-6 text-[#A855F7]" />
      {language === "ar" ? "اختيار صورة" : "Choose image"}
      <small className="font-normal text-slate-400">
        {language === "ar" ? "JPG، PNG أو WEBP حتى 5 MB" : "JPG, PNG or WEBP up to 5 MB"}
      </small>
    </button>
  );
const Summary = ({
  cart,
  subtotal,
  subtotalUSD,
  discount,
  discountUsdAmount,
  shipping,
  total,
  totalUSD,
  exchangeRate,
  promo,
  setPromo,
  apply,
  applied,
  remove,
  promoError,
  setPromoError,
  formatPrice,
  t,
  copy,
  language,
}: any) => (
  <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <h2 className="mb-4 text-lg font-black">{copy.summary}</h2>
    <div className="space-y-3">
      {cart.map((item: any) => (
        <div
          key={item.product.id}
          className="flex gap-3 border-b border-slate-100 pb-3"
        >
          <img
            loading="lazy"
            src={item.product.image}
            alt={item.product.nameAr}
            className="h-16 w-16 rounded-lg object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{item.product.nameAr}</p>
            <p className="text-xs text-slate-500">{copy.quantity}: {item.quantity}</p>
            <p className="text-sm font-black">
              {formatPrice(item.product.priceJOD * item.quantity, item.product.priceUSD * item.quantity)}
            </p>
          </div>
        </div>
      ))}
    </div>
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const result = apply(promo);
        if (result.success) {
          setPromo("");
          setPromoError("");
        } else setPromoError(copy.promoInvalid);
      }}
      className="mt-5 flex gap-2"
    >
      {applied ? (
        <div className="flex w-full items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">
          كوبون {applied.code}
          <button type="button" onClick={remove} aria-label="إزالة الكوبون">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <>
          <input
            value={promo}
            onChange={(event) => setPromo(event.target.value)}
            placeholder={copy.promoPlaceholder}
            className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 text-sm"
          />
            <button className="rounded-lg bg-slate-900 px-4 text-sm font-bold text-white">
            {copy.apply}
          </button>
        </>
      )}
    </form>
    {promoError && (
      <p className="mt-2 text-xs font-bold text-red-600">{promoError}</p>
    )}
    <div className="mt-5 space-y-3 border-t border-slate-100 pt-4 text-sm">
      <Line label={t.checkoutSubtotal} value={formatPrice(subtotal, subtotalUSD)} />
      <Line label={t.checkoutDiscount} value={`-${formatPrice(discount, discountUsdAmount)}`} green />
      <Line
        label={language === "ar" ? "التوصيل" : "Delivery"}
        value={shipping ? formatPrice(shipping, shipping * exchangeRate) : t.checkoutFree}
      />
      <div className="flex justify-between border-t border-slate-200 pt-4 font-black">
        <span>{copy.total}</span>
        <span className="text-2xl text-[#A855F7]">{formatPrice(total, totalUSD)}</span>
      </div>
    </div>
  </section>
);
const Line = ({
  label,
  value,
  green,
}: {
  label: string;
  value: string;
  green?: boolean;
}) => (
  <div className="flex justify-between">
    <span className="text-slate-500">{label}</span>
    <span className={green ? "font-bold text-emerald-600" : "font-bold"}>
      {value}
    </span>
  </div>
);
const Empty = ({ navigateTo, language, copy }: { navigateTo: (route: string) => void; language: "ar" | "en"; copy: any }) => (
  <main dir={language === "ar" ? "rtl" : "ltr"} className="min-h-[70vh] bg-[#f7f8fa] px-4 py-20">
    <div className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
      <ShoppingBag className="mx-auto h-14 w-14 text-[#A855F7]" />
      <h1 className="mt-5 text-xl font-black">{language === "ar" ? "سلة التسوق فارغة" : "Your cart is empty"}</h1>
      <p className="mt-2 text-sm text-slate-500">
        {language === "ar" ? "أضف منتجات إلى السلة للمتابعة." : "Add products to your cart to continue."}
      </p>
      <button
        onClick={() => navigateTo("#store")}
        className="mt-6 rounded-lg bg-[#A855F7] px-6 py-3 text-sm font-black text-white"
      >
        {copy.back}
      </button>
    </div>
  </main>
);
const Success = ({
  order,
  navigateTo,
  language,
  formatPrice,
}: {
  order: Order;
  navigateTo: (route: string) => void;
  language: "ar" | "en";
  formatPrice: (priceJOD: number, priceUSD?: number) => string;
}) => (
  <main dir={language === "ar" ? "rtl" : "ltr"} className="min-h-[70vh] bg-[#f7f8fa] px-4 py-12">
    <div className="mx-auto max-w-xl rounded-xl border border-slate-200 bg-white p-7 text-center shadow-sm sm:p-10">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
        <CheckCircle2 className="h-9 w-9" />
      </div>
      <p className="mt-6 font-bold text-emerald-600">{language === "ar" ? "تم استلام طلبك بنجاح" : "Your order was received successfully"}</p>
      <h1 className="mt-2 text-2xl font-black">{language === "ar" ? "شكراً لثقتك بمتجر قويدر" : "Thank you for choosing QWADER STORE"}</h1>
      <div className="mt-7 space-y-3 rounded-lg bg-slate-50 p-5 text-sm">
        <Line label={language === "ar" ? "رقم الطلب" : "Order number"} value={order.orderNumber} />
        <Line
          label="الإجمالي"
          value={formatPrice(Number(order.totalJOD || 0), Number(order.totalUSD || 0))}
        />
        <Line label={language === "ar" ? "الحالة" : "Status"} value={language === "ar" ? "بانتظار مراجعة الدفع" : "Awaiting payment review"} />
      </div>
      <p className="mt-5 text-sm leading-6 text-slate-500">
        {language === "ar" ? "سنراجع إيصال التحويل ونتواصل معك عند تأكيد الدفع. لم يتم اعتبار الدفع مؤكداً بعد." : "We will review the transfer receipt and contact you after payment is confirmed."}
      </p>
      <div className="mt-7 flex flex-col gap-3 sm:flex-row">
        <button
          onClick={() => navigateTo(`#track-order/${order.orderNumber}`)}
          className="flex min-h-11 flex-1 items-center justify-center rounded-lg bg-[#A855F7] text-sm font-black text-white"
        >
          {language === "ar" ? "متابعة الطلب" : "Track order"}
        </button>
        <button
          onClick={() => navigateTo("#store")}
          className="min-h-11 flex-1 rounded-lg border border-slate-300 text-sm font-black"
        >
          {language === "ar" ? "العودة إلى المتجر" : "Back to store"}
        </button>
      </div>
    </div>
  </main>
);
