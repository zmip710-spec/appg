const API_BASE_URL = '/api';

export interface User {
  id: string | number;
  name: string;
  email: string;
  role: string;
  status: 'Activo' | 'Inactivo';
  avatar: string;
  lastLogin: string;
  password?: string;
}

export interface Transaction {
  id: string;
  client: string;
  service: string;
  date: string;
  amount: string;
  status: 'Completado' | 'Pendiente' | 'Cancelado';
  sku?: string;
  quantity?: number;
  unitPrice?: number;
}

export interface BatchItem {
  id?: number;
  batchId?: string;
  sku?: string;
  productName: string;
  quantity: number;
  unitCostFob: number;
  totalFobValue?: number;
  sharePercentage?: number;
  allocatedCustoms?: number;
  allocatedShipping?: number;
  allocatedTax?: number;
  unitTax?: number;
  finalUnitCost?: number;
  profitMarginPct?: number;
  finalSellingPrice?: number;
  image?: string;
}

export interface ImportBatch {
  id: string;
  name: string;
  importDate: string;
  totalCustomsTax: number;
  totalShippingCost: number;
  exchangeRateGtq?: number;
  profitMarginPct?: number;
  costUpdateStrategy?: 'weighted' | 'latest';
  status: string;
  items: BatchItem[];
}

export interface InventoryProduct {
  id: number;
  sku: string;
  name: string;
  category: string;
  stock: number;
  unitCost: number;
  previousUnitCost?: number;
  priceChangeDelta?: number;
  priceChangePct?: number;
  image?: string;
  lastUpdated: string;
}

export interface PriceHistoryEntry {
  id: number;
  sku: string;
  batchId?: string;
  oldCost: number;
  newCost: number;
  delta: number;
  pct: number;
  changeDate: string;
}

export interface DashboardStats {
  totalSales: number;
  completedSalesCount: number;
  totalSkus: number;
  totalStock: number;
  inventoryValue: number;
  totalImportExpenses: number;
  customsTaxPaid: number;
  shippingPaid: number;
  totalBatchesCount: number;
}

export const loginApi = async (email: string, password?: string): Promise<User> => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    const errJson = await response.json().catch(() => ({ error: 'Error de respuesta en inicio de sesión' }));
    throw new Error(errJson.error || 'Error al iniciar sesión');
  }
  const data = await response.json().catch(() => ({}));
  return data.user;
};

export const registerApi = async (data: { name: string; email: string; password?: string; role?: string; avatar?: string }): Promise<User> => {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errJson = await response.json().catch(() => ({ error: 'Error de respuesta en registro de usuario' }));
    throw new Error(errJson.error || 'Error al registrar usuario');
  }
  const resData = await response.json().catch(() => ({}));
  return resData.user || resData;
};

export const verifySessionApi = async (id?: string | number, email?: string): Promise<{ valid: boolean; user?: User; error?: string }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, email }),
    });
    if (!response.ok) {
      const errJson = await response.json().catch(() => ({ error: 'Perfil no encontrado o inactivo' }));
      return { valid: false, error: errJson.error || 'Sesión cerrada por seguridad' };
    }
    return await response.json().catch(() => ({ valid: false }));
  } catch {
    return { valid: true };
  }
};

export const updateUserProfileApi = async (
  id: string | number,
  data: { name: string; email: string; avatar?: string }
): Promise<User> => {
  const response = await fetch(`${API_BASE_URL}/users/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errJson = await response.json();
    throw new Error(errJson.error || 'Error al actualizar perfil de usuario');
  }
  return response.json();
};

export const changePasswordApi = async (
  id: string | number,
  currentPassword?: string,
  newPassword?: string
): Promise<{ success: boolean; message: string }> => {
  const response = await fetch(`${API_BASE_URL}/users/${encodeURIComponent(id)}/password`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  if (!response.ok) {
    const errJson = await response.json();
    throw new Error(errJson.error || 'Error al cambiar la contraseña');
  }
  return response.json();
};

export const fetchDashboardStatsApi = async (): Promise<DashboardStats> => {
  const response = await fetch(`${API_BASE_URL}/dashboard/stats`);
  if (!response.ok) throw new Error('Error al cargar métricas del Dashboard');
  return response.json();
};

export const fetchUsers = async (): Promise<User[]> => {
  const response = await fetch(`${API_BASE_URL}/users`);
  if (!response.ok) throw new Error('Error al cargar usuarios desde la BD');
  return response.json();
};

export const createUser = async (user: { name: string; email: string; role: string; avatar?: string; password?: string }): Promise<User> => {
  const response = await fetch(`${API_BASE_URL}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user),
  });
  if (!response.ok) {
    const errJson = await response.json();
    throw new Error(errJson.error || 'Error al crear usuario en la BD');
  }
  return response.json();
};

export const toggleUserStatusApi = async (id: string | number): Promise<{ id: string | number; status: 'Activo' | 'Inactivo' }> => {
  const response = await fetch(`${API_BASE_URL}/users/${encodeURIComponent(id)}/toggle`, {
    method: 'PUT',
  });
  if (!response.ok) throw new Error('Error al actualizar estado del usuario');
  return response.json();
};

export const deleteUserApi = async (id: string | number): Promise<{ success: boolean }> => {
  const response = await fetch(`${API_BASE_URL}/users/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Error al eliminar usuario');
  return response.json();
};

export const fetchTransactions = async (): Promise<Transaction[]> => {
  const response = await fetch(`${API_BASE_URL}/transactions`);
  if (!response.ok) throw new Error('Error al cargar transacciones desde la BD');
  return response.json();
};

export const createTransaction = async (data: {
  client: string;
  service: string;
  amount: string;
  status: string;
  sku?: string;
  quantity?: number;
  unitPrice?: number;
}): Promise<Transaction> => {
  const response = await fetch(`${API_BASE_URL}/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Error al crear transacción en la BD');
  return response.json();
};

export const updateTransactionStatusApi = async (id: string, status: string): Promise<{ success: boolean }> => {
  const response = await fetch(`${API_BASE_URL}/transactions/${encodeURIComponent(id)}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) throw new Error('Error al actualizar estado de la transacción');
  return response.json();
};

export const deleteTransactionApi = async (id: string): Promise<{ success: boolean }> => {
  const response = await fetch(`${API_BASE_URL}/transactions/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Error al eliminar transacción');
  return response.json();
};

export const fetchBatches = async (): Promise<ImportBatch[]> => {
  const response = await fetch(`${API_BASE_URL}/batches`);
  if (!response.ok) throw new Error('Error al cargar lotes desde la BD');
  return response.json();
};

export const createBatchApi = async (data: { name: string; totalCustomsTax: number; totalShippingCost: number; items: BatchItem[] }): Promise<ImportBatch> => {
  const response = await fetch(`${API_BASE_URL}/batches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Error al crear lote en la BD');
  return response.json();
};

export const deleteBatchApi = async (id: string): Promise<{ success: boolean }> => {
  const response = await fetch(`${API_BASE_URL}/batches/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Error al eliminar lote');
  return response.json();
};

export const fetchInventory = async (): Promise<InventoryProduct[]> => {
  const response = await fetch(`${API_BASE_URL}/inventory`);
  if (!response.ok) throw new Error('Error al cargar inventario desde la BD');
  return response.json();
};

export const createInventoryProductApi = async (data: {
  sku: string;
  name: string;
  category?: string;
  stock: number;
  unitCost: number;
  image?: string;
}): Promise<InventoryProduct> => {
  const response = await fetch(`${API_BASE_URL}/inventory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorJson = await response.json();
    throw new Error(errorJson.error || 'Error al crear producto en inventario');
  }
  return response.json();
};

export const createInventoryApi = createInventoryProductApi;

export const fetchProductBySkuApi = async (sku: string): Promise<InventoryProduct | null> => {
  const response = await fetch(`${API_BASE_URL}/inventory/sku/${encodeURIComponent(sku)}`);
  if (!response.ok) return null;
  return response.json();
};

export const updateStockApi = async (id: number | string, delta: number): Promise<{ success: boolean; stock: number }> => {
  const response = await fetch(`${API_BASE_URL}/inventory/${id}/stock`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ delta }),
  });
  if (!response.ok) throw new Error('Error al ajustar stock');
  return response.json();
};

export const updateProductImageApi = async (id: number | string, image: string): Promise<{ success: boolean; image: string }> => {
  const response = await fetch(`${API_BASE_URL}/inventory/${id}/image`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image }),
  });
  if (!response.ok) throw new Error('Error al actualizar imagen del producto');
  return response.json();
};

export const deleteInventoryProductApi = async (id: number | string): Promise<{ success: boolean }> => {
  const response = await fetch(`${API_BASE_URL}/inventory/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Error al eliminar producto del inventario');
  return response.json();
};

export const deleteInventoryApi = deleteInventoryProductApi;

export const fetchPriceHistoryApi = async (sku: string, productName?: string): Promise<PriceHistoryEntry[]> => {
  try {
    const url = `${API_BASE_URL}/inventory/history/${encodeURIComponent(sku)}${productName ? `?name=${encodeURIComponent(productName)}` : ''}`;
    const response = await fetch(url);
    if (!response.ok) return [];
    return await response.json();
  } catch {
    return [];
  }
};
