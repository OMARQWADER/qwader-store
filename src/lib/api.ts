const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// دالة مساعدة لتحويل أي استجابة إلى مصفوفة
const ensureArray = (data: any): any[] => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === 'object') return Object.values(data);
  return [];
};

export const api = {
  // Users
  getUsers: async () => {
    const data = await fetch(`${API_URL}/users`).then(r => r.json());
    return ensureArray(data);
  },
  getUser: (id: string) => fetch(`${API_URL}/users/${id}`).then(r => r.json()),
  syncUser: (user: any) => fetch(`${API_URL}/users/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user)
  }).then(r => r.json()),
  updateUser: (id: string, data: any) => fetch(`${API_URL}/users/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(r => r.json()),
  deleteUser: (id: string) => fetch(`${API_URL}/users/${id}`, {
    method: 'DELETE'
  }).then(r => r.json()),
  
  // Products
  getProducts: async () => {
    const data = await fetch(`${API_URL}/products`).then(r => r.json());
    return ensureArray(data);
  },
  getProduct: (id: string) => fetch(`${API_URL}/products/${id}`).then(r => r.json()),
  createProduct: (product: any) => fetch(`${API_URL}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(product)
  }).then(r => r.json()),
  updateProduct: (id: string, product: any) => fetch(`${API_URL}/products/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(product)
  }).then(r => r.json()),
  deleteProduct: (id: string) => fetch(`${API_URL}/products/${id}`, {
    method: 'DELETE'
  }).then(r => r.json()),
  updateStock: (id: string, stock: number) => fetch(`${API_URL}/products/${id}/stock`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stock_quantity: stock })
  }).then(r => r.json()),
  
  // Orders
  getOrders: async () => {
    const data = await fetch(`${API_URL}/orders`).then(r => r.json());
    return ensureArray(data);
  },
  getOrdersByUser: async (userId: string) => {
    const data = await fetch(`${API_URL}/orders/user/${userId}`).then(r => r.json());
    return ensureArray(data);
  },
  createOrder: (order: any) => fetch(`${API_URL}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(order)
  }).then(r => r.json()),
  updateOrderStatus: (id: string, status: string) => fetch(`${API_URL}/orders/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  }).then(r => r.json()),
  
  // Reviews
  getReviews: async (productId: string) => {
    const data = await fetch(`${API_URL}/reviews/product/${productId}`).then(r => r.json());
    return ensureArray(data);
  },
  addReview: (review: any) => fetch(`${API_URL}/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(review)
  }).then(r => r.json()),
  deleteReview: (id: string) => fetch(`${API_URL}/reviews/${id}`, {
    method: 'DELETE'
  }).then(r => r.json()),
  
  // Cart
  getCart: (userId: string) => fetch(`${API_URL}/cart/${userId}`).then(r => r.json()),
  updateCart: (userId: string, items: any[]) => fetch(`${API_URL}/cart/${userId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items })
  }).then(r => r.json()),
  
  // Wishlist
  getWishlist: (userId: string) => fetch(`${API_URL}/wishlist/${userId}`).then(r => r.json()),
  updateWishlist: (userId: string, productIds: string[]) => fetch(`${API_URL}/wishlist/${userId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ product_ids: productIds })
  }).then(r => r.json()),
};