import { normalizeProduct, normalizeUserRecord } from "./productNormalize";

const API_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
const TOKEN_KEY = "qwader_api_token";

const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const storeToken = (token?: string) => {
  if (token) localStorage.setItem(TOKEN_KEY, token);
};

export const clearApiToken = () => localStorage.removeItem(TOKEN_KEY);

const ensureArray = (data: any): any[] => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === "object") return Object.values(data);
  return [];
};

const normalizeUser = (user: any) => normalizeUserRecord(user);

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

const normalizeSupportTicket = (ticket: any) => ticket ? ({
  ...ticket,
  userId: ticket.userId || ticket.user_id,
  userName: ticket.userName || ticket.user_name,
  userEmail: ticket.userEmail || ticket.user_email,
  userPhone: ticket.userPhone || ticket.user_phone,
  orderNumber: ticket.orderNumber || ticket.order_number,
  createdAt: ticket.createdAt || ticket.created_at,
  updatedAt: ticket.updatedAt || ticket.updated_at,
  lastActivity: ticket.lastActivity || ticket.updated_at || ticket.created_at,
  messages: Array.isArray(ticket.messages) ? ticket.messages.map((message: any) => ({
    ...message,
    senderId: message.senderId || message.sender_id,
    senderName: message.senderName || message.sender_name,
    senderRole: message.senderRole || message.sender_role,
    text: message.text || message.message,
    createdAt: message.createdAt || message.created_at,
  })) : [],
}) : ticket;

const requestJson = async (input: RequestInfo | URL, init?: RequestInit) => {
  const headers = {
    ...(init?.headers || {}),
    ...getAuthHeaders(),
  };
  const response = await fetch(input, { ...init, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      data?.error || `API request failed with status ${response.status}`,
    );
  }
  if (data?.token) storeToken(data.token);
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
    return ensureArray(data).map(normalizeProduct);
  },
  getStoreConfig: async () => requestJson(`${API_URL}/store-config`),
  saveStoreConfig: (payload: any) =>
    requestJson(`${API_URL}/store-config`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  updateUserRole: (id: string, role: string, permissions: string[] = []) =>
    requestJson(`${API_URL}/users/${id}/role`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, permissions }),
    }),
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
  getReviews: async (productId?: string) => {
    const data = await requestJson(productId ? `${API_URL}/reviews/product/${productId}` : `${API_URL}/reviews`);
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
  getSupportTickets: async () => {
    const data = await requestJson(`${API_URL}/support/tickets`);
    return ensureArray(data).map(normalizeSupportTicket);
  },
  createSupportTicket: (payload: any) =>
    requestJson(`${API_URL}/support/tickets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(normalizeSupportTicket),
  addSupportMessage: (ticketId: string, message: string) =>
    requestJson(`${API_URL}/support/tickets/${ticketId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    }).then(normalizeSupportTicket),
  updateSupportTicketStatus: (ticketId: string, status: string) =>
    requestJson(`${API_URL}/support/tickets/${ticketId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }).then(normalizeSupportTicket),
  getSuppliers: async () => ensureArray(await requestJson(`${API_URL}/suppliers`)),
  createSupplier: (payload: any) =>
    requestJson(`${API_URL}/suppliers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  updateSupplier: (id: string, payload: any) =>
    requestJson(`${API_URL}/suppliers/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  deleteSupplier: (id: string) => requestJson(`${API_URL}/suppliers/${id}`, { method: "DELETE" }),
  askSupportAI: (ticketId: string) =>
    requestJson(`${API_URL}/support/tickets/${ticketId}/ai-reply`, { method: "POST" }).then(normalizeSupportTicket),
};
