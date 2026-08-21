import { Order, Product } from '../types';

export function exportOrdersToCsv(orders: Order[]): void {
  const headers = [
    'Order Number',
    'Date',
    'Customer Name',
    'Phone',
    'Email',
    'Payment Method',
    'Status',
    'Total (JOD)',
    'Total (USD)',
    'Items Summary',
    'Delivery Channel',
    'Payment Reference',
    'Digital Codes Delivered'
  ];

  const rows = orders.map((order) => {
    const itemsSummary = order.items
      .map((item) => `${item.productNameAr} (x${item.quantity})`)
      .join(' | ');

    const digitalDeliveries = (order.digitalDeliveries || [])
      .map((d) => `${d.itemTitle}: ${d.codeOrAccount.replace(/\n/g, ' ')}`)
      .join(' | ');

    return [
      `"${order.orderNumber}"`,
      `"${new Date(order.createdAt).toLocaleString('ar-JO')}"`,
      `"${order.customerName.replace(/"/g, '""')}"`,
      `"${order.customerPhone}"`,
      `"${order.customerEmail}"`,
      `"${order.paymentMethod}"`,
      `"${order.status}"`,
      order.totalJOD.toFixed(2),
      order.totalUSD.toFixed(2),
      `"${itemsSummary.replace(/"/g, '""')}"`,
      `"${order.preferredDeliveryMethod}"`,
      `"${(order.paymentReference || '').replace(/"/g, '""')}"`,
      `"${digitalDeliveries.replace(/"/g, '""')}"`,
    ].join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `qwader_orders_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportProductsToCsv(products: Product[]): void {
  const headers = [
    'ID',
    'Name (Arabic)',
    'Name (English)',
    'Category',
    'Price (JOD)',
    'Price (USD)',
    'Stock Quantity',
    'Platform',
    'Region',
    'Rating',
    'Reviews Count'
  ];

  const rows = products.map((p) => [
    `"${p.id}"`,
    `"${p.nameAr.replace(/"/g, '""')}"`,
    `"${p.nameEn.replace(/"/g, '""')}"`,
    `"${p.category}"`,
    p.priceJOD.toFixed(2),
    p.priceUSD.toFixed(2),
    p.stockQuantity,
    `"${p.platform}"`,
    `"${p.regionAr.replace(/"/g, '""')}"`,
    p.rating,
    p.reviewsCount,
  ].join(','));

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `qwader_inventory_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
