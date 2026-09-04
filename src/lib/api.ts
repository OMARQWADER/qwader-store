const API_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

const ensureArray = (data: any): any[] => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === "object") return Object.values(data);
  return [];
};

const normalizeUser = (user: any) =>
  user
    ? {
        ...user,
        registeredAt:
          user.registeredAt || user.registered_at || new Date().toISOString(),
      }
    : user;

const normalizeOrder = (order: any) =>
  order
    ? {
        ...order,
        orderNumber: order.orderNumber || order.order_number,
        userId: order.userId || order.user_id,
        customerName: order.customerName || order.customer_name,
        customerPhone: order.customerPhone || order.customer_phone,
        customerEmail: order.customerEmail || order.customer_email,
        deliveryContactChannel:
          order.deliveryContactChannel || order.delivery_contact_channel,
        deliveryContactUrl:
          order.deliveryContactUrl || order.delivery_contact_url,
        totalJOD: Number(order.totalJOD ?? order.total_jod) || 0,
        totalUSD: Number(order.totalUSD ?? order.total_usd) || 0,
        subtotalJOD: Number(order.subtotalJOD ?? order.subtotal_jod) || 0,
        subtotalUSD: Number(order.subtotalUSD ?? order.subtotal_usd) || 0,
        shippingCostJOD:
          Number(order.shippingCostJOD ?? order.shipping_cost_jod) || 0,
        shippingCostUSD:
          Number(order.shippingCostUSD ?? order.shipping_cost_usd) || 0,
        createdAt:
          order.createdAt || order.created_at || new Date().toISOString(),
        updatedAt:
          order.updatedAt || order.updated_at || new Date().toISOString(),
        timeline: Array.isArray(order.timeline) ? order.timeline : [],
        items: Array.isArray(order.items) ? order.items : [],
      }
    : order;

const requestJson = async (input: RequestInfo | URL, init?: RequestInit) => {
  const response = await fetch(input, init);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(
      data?.error || `API request failed with status ${response.status}`,
    );
  }
  return data;
};

export const api = {
  getUsers: async () => {
    const data = await requestJson(`${API_URL}/users`);
    return ensureArray(data).map(normalizeUser);
  },
  getUser: (id: string) => requestJson(`${API_URL}/users/${id}`),
  syncUser: (user: any) =>
    requestJson(`${API_URL}/users/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(user),
    }).then((data) =>
      data?.user ? { ...data, user: normalizeUser(data.user) } : data,
    ),
  updateUser: (id: string, data: any) =>
    requestJson(`${API_URL}/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  deleteUser: (id: string) =>
    requestJson(`${API_URL}/users/${id}`, {
      method: "DELETE",
    }),
  getProducts: async () => {
    const data = await requestJson(`${API_URL}/products`);
    return ensureArray(data);
  },
  getProduct: (id: string) => requestJson(`${API_URL}/products/${id}`),
  createProduct: (product: any) =>
    requestJson(`${API_URL}/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(product),
    }),
  updateProduct: (id: string, product: any) =>
    requestJson(`${API_URL}/products/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(product),
    }),
  deleteProduct: (id: string) =>
    requestJson(`${API_URL}/products/${id}`, {
      method: "DELETE",
    }),
  updateStock: (id: string, stock: number) =>
    requestJson(`${API_URL}/products/${id}/stock`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stock_quantity: stock }),
    }),
  getOrders: async () => {
    const data = await requestJson(`${API_URL}/orders`);
    return ensureArray(data).map(normalizeOrder);
  },
  getOrdersByUser: async (userId: string) => {
    const data = await requestJson(`${API_URL}/orders/user/${userId}`);
    return ensureArray(data).map(normalizeOrder);
  },
  createOrder: async (order: any) =>
    normalizeOrder(
      await requestJson(`${API_URL}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(order),
      }),
    ),
  updateOrderStatus: (id: string, status: string) =>
    requestJson(`${API_URL}/orders/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }),
  getReviews: async (productId: string) => {
    const data = await requestJson(`${API_URL}/reviews/product/${productId}`);
    return ensureArray(data);
  },
  addReview: (review: any) =>
    requestJson(`${API_URL}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(review),
    }),
  deleteReview: (id: string) =>
    requestJson(`${API_URL}/reviews/${id}`, {
      method: "DELETE",
    }),
  getCart: (userId: string) => requestJson(`${API_URL}/cart/${userId}`),
  updateCart: (userId: string, items: any[]) =>
    requestJson(`${API_URL}/cart/${userId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    }),
  getWishlist: (userId: string) => requestJson(`${API_URL}/wishlist/${userId}`),
  updateWishlist: (userId: string, productIds: string[]) =>
    requestJson(`${API_URL}/wishlist/${userId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_ids: productIds }),
    }),
};
