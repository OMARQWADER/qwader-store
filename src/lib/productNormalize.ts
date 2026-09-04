import { Product } from "../types";
import { normalizeRole } from "../utils/roles";

export function normalizeProduct(product: any): Product {
  const priceJOD = Number(product?.priceJOD ?? product?.price_jod) || 0;
  const priceUSD = Number(product?.priceUSD ?? product?.price_usd) || 0;
  return {
    id: String(product?.id || ""),
    nameAr: product?.nameAr || product?.name_ar || "",
    nameEn: product?.nameEn || product?.name_en || "",
    category: product?.category || "games",
    priceJOD,
    priceUSD,
    originalPriceJOD: Number(product?.originalPriceJOD ?? product?.original_price_jod) || undefined,
    originalPriceUSD: Number(product?.originalPriceUSD ?? product?.original_price_usd) || undefined,
    rating: Number(product?.rating) || 5,
    reviewsCount: Number(product?.reviewsCount ?? product?.reviews_count) || 0,
    stockQuantity: Number(product?.stockQuantity ?? product?.stock_quantity) || 0,
    lowStockThreshold: Number(product?.lowStockThreshold ?? product?.low_stock_threshold) || 5,
    isFeatured: Boolean(product?.isFeatured ?? product?.is_featured),
    badgeAr: product?.badgeAr || product?.badge_ar,
    badgeEn: product?.badgeEn || product?.badge_en,
    image: product?.image || "",
    platform: product?.platform || "PS4 & PS5",
    regionAr: product?.regionAr || product?.region_ar || "",
    regionEn: product?.regionEn || product?.region_en || "",
    deliveryTypeAr: product?.deliveryTypeAr || product?.delivery_type_ar || "",
    deliveryTypeEn: product?.deliveryTypeEn || product?.delivery_type_en || "",
    shortDescAr: product?.shortDescAr || product?.short_desc_ar || product?.description_ar || "",
    shortDescEn: product?.shortDescEn || product?.short_desc_en || product?.description_en || "",
    descriptionAr: product?.descriptionAr || product?.description_ar || "",
    descriptionEn: product?.descriptionEn || product?.description_en || "",
    featuresAr: Array.isArray(product?.featuresAr) ? product.featuresAr : (Array.isArray(product?.features_ar) ? product.features_ar : []),
    featuresEn: Array.isArray(product?.featuresEn) ? product.featuresEn : (Array.isArray(product?.features_en) ? product.features_en : []),
    createdAt: product?.createdAt || product?.created_at || new Date().toISOString(),
  };
}

export function normalizeUserRecord(user: any) {
  if (!user) return user;
  return {
    ...user,
    role: normalizeRole(user.role),
    permissions: Array.isArray(user.permissions) ? user.permissions : [],
    registeredAt:
      user.registeredAt || user.registered_at || new Date().toISOString(),
  };
}
