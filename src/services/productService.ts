import { supabase } from '../config/supabaseClient';
import { type AdminProduct } from '../admin/store/adminStore';
import type { Product } from '../types/product';
import { apiFetch, authHeaders, API_BASE_URL } from '../utils/apiFetch';
import { getProductStockFromVariants, sanitizeProductVariants } from '../utils/productVariants';
import { extractCloudinaryPublicId } from '../utils/cloudinary';
import { cleanText, normalizeCategory } from '../utils/formatters';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mapDbRowToProduct = (row: any): Product => {
  const images: string[] = row.images && row.images.length > 0
    ? row.images
    : row.image_url ? [row.image_url] : [];
  const variants = sanitizeProductVariants(row.variants);
  const stockFromVariants = getProductStockFromVariants(variants);

  return {
    id: row.id,
    name: cleanText(row.name),
    price: row.price,
    originalPrice: row.original_price,
    image: images[0] || '',
    images,
    description: row.description,
    category: normalizeCategory(row.category),
    discount: row.discount,
    stock: stockFromVariants ?? row.stock,
    condition: row.condition,
    freeShipping: row.free_shipping,
    variants,
    specifications: row.specifications,
    features: row.features,
    faqs: row.faqs,
    warranty: row.warranty,
    returnPolicy: row.return_policy,
    sizeGuide: row.size_guide ?? undefined,
  };
};

// Antes leía import.meta.env directo: sin la env quedaba undefined y las URLs
// se armaban como "undefined/...". API_BASE_URL siempre tiene fallback.
const API_URL = API_BASE_URL;

export interface CloudinaryFolder {
  name: string;
  path: string;
}

// Fetch folders at a given path (empty = root)
export const fetchCloudinaryFolders = async (token: string, path?: string): Promise<CloudinaryFolder[]> => {
  const url = path
    ? `${API_URL}/cloudinary/folders?path=${encodeURIComponent(path)}`
    : `${API_URL}/cloudinary/folders`;
  const response = await apiFetch(url, { headers: authHeaders(token) });
  if (!response.ok) throw new Error('Failed to fetch folders');
  const data = await response.json();
  return (data.data?.folders ?? []) as CloudinaryFolder[];
};

// Create a new folder
export const createCloudinaryFolder = async (token: string, path: string): Promise<void> => {
  const response = await apiFetch(`${API_URL}/cloudinary/folders`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ path }),
  });
  if (!response.ok) throw new Error('Failed to create folder');
};

// Delete a folder (must be empty)
export const deleteCloudinaryFolder = async (token: string, path: string): Promise<void> => {
  const response = await apiFetch(`${API_URL}/cloudinary/folders`, {
    method: 'DELETE',
    headers: authHeaders(token),
    body: JSON.stringify({ path }),
  });
  if (!response.ok) throw new Error('Failed to delete folder');
};

// Fetch Cloudinary public config (cloudName, apiKey)
export const fetchCloudinaryConfig = async (): Promise<{ cloudName: string; apiKey: string }> => {
  const response = await apiFetch(`${API_URL}/cloudinary/config`);
  if (!response.ok) throw new Error('Failed to fetch Cloudinary config');
  const data = await response.json();
  return data.data;
};

// Fetch images from Cloudinary (admin only)
export const fetchCloudinaryImages = async (token: string, folder?: string, nextCursor?: string) => {
  let url = `${API_URL}/cloudinary/images`;
  const params = new URLSearchParams();
  if (folder) params.set('folder', folder);
  if (nextCursor) params.set('next_cursor', nextCursor);
  if (params.toString()) url += `?${params.toString()}`;

  const response = await apiFetch(url, { headers: authHeaders(token) });

  if (!response.ok) throw new Error('Failed to fetch Cloudinary images');
  const data = await response.json();
  return data.data as { resources: CloudinaryResource[]; next_cursor?: string };
};

export interface CloudinaryResource {
  public_id: string;
  secure_url: string;
  format: string;
  bytes: number;
  created_at: string;
  width: number;
  height: number;
}

// Delete image from Cloudinary
export const deleteCloudinaryImage = async (publicId: string, token: string) => {
  const response = await apiFetch(`${API_URL}/cloudinary/delete`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ publicId }),
  });

  if (!response.ok) {
    throw new Error('Failed to delete image from Cloudinary');
  }

  return response.json();
};

export interface CloudinaryUsage {
  credits_used: number;
  credits_limit: number;
  credits_used_percent: number;
  asset_count: number;
}

// Fetch storage usage from Cloudinary
export const fetchCloudinaryUsage = async (token: string): Promise<CloudinaryUsage> => {
  const response = await apiFetch(`${API_URL}/cloudinary/usage`, {
    headers: authHeaders(token),
  });
  if (!response.ok) throw new Error('Failed to fetch Cloudinary usage');
  const data = await response.json();
  return data.data as CloudinaryUsage;
};

export interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  level: number;
}

// Fetch full category tree from the categories table
export const fetchCategoriesTree = async (): Promise<Category[]> => {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug, parent_id, level')
    .order('level', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    // Table may not exist yet — return empty silently
    console.warn('fetchCategoriesTree:', error.message);
    return [];
  }

  // El nombre es la clave de match con productos.category (filtro de catálogo y
  // navbar): se normaliza en origen para que ambos lados comparen texto limpio.
  return ((data ?? []) as Category[]).map((c) => ({ ...c, name: normalizeCategory(c.name) }));
};

// Create a new category (or subcategory if parentId is provided)
export const createCategory = async (
  name: string,
  parentId: string | null,
  level: number
): Promise<Category> => {
  const cleanName = normalizeCategory(name);
  const slug = cleanName
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
  const { data, error } = await supabase
    .from('categories')
    .insert({ name: cleanName, slug, parent_id: parentId, level })
    .select('id, name, slug, parent_id, level')
    .single();
  if (error) throw new Error(error.message);
  return data as Category;
};

// Delete a category (cascades to subcategories via ON DELETE CASCADE)
export const deleteCategory = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
};

// Fetch level-1 category names (used by NavBar dropdown)
// Falls back to reading from productos if categories table is not set up yet
export const fetchCategories = async (): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('name')
      .eq('level', 1)
      .order('name', { ascending: true });

    if (!error && data && data.length > 0) {
      return (data as { name: string }[]).map((c) => normalizeCategory(c.name));
    }
  } catch {
    // fall through to fallback
  }

  // Fallback: derive unique categories from productos table
  const { data, error } = await supabase
    .from('productos')
    .select('category')
    .eq('status', 'active');

  if (error) {
    console.error('Fetch categories error:', error);
    throw error;
  }

  const categories = [...new Set(data?.map((p) => normalizeCategory(p.category)).filter(Boolean))];
  return categories.sort();
};

// Fetch featured products from Supabase (for home page). `limit` acota filas
// en origen: el Home sólo renderiza los primeros N, no tiene sentido traer y
// descartar el resto en el cliente.
export const fetchFeaturedProducts = async (limit?: number) => {
  let query = supabase
    .from('productos')
    .select('*')
    .eq('featured', true)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Fetch featured products error:', error);
    throw error;
  }

  return data || [];
};

// Toggle product featured status in Supabase
export const toggleProductFeatured = async (id: string, featured: boolean) => {
  const { error } = await supabase
    .from('productos')
    .update({ featured })
    .eq('id', id);

  if (error) {
    console.error('Toggle featured error:', error);
    throw error;
  }
};

// Fetch products from Supabase. Pass activeOnly=false for admin (includes inactive).
export const fetchProducts = async (activeOnly = true) => {
  let query = supabase
    .from('productos')
    .select('*')
    .order('created_at', { ascending: false });

  if (activeOnly) {
    query = query.eq('status', 'active');
  }

  const { data, error } = await query;

  if (error) {
    console.error('Fetch products error:', error);
    throw error;
  }

  return data || [];
};

/** @deprecated Use fetchProducts(false) instead */
export const fetchAllProducts = () => fetchProducts(false);

// Search products by name, category or description
export interface ProductSearchResult {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  image: string;
  category: string;
}

interface ProductSearchRow {
  id: string;
  name: string;
  price: number;
  original_price?: number | null;
  discount?: number | null;
  image_url?: string | null;
  images?: string[] | null;
  category: string;
}

export const searchProducts = async (query: string): Promise<ProductSearchResult[]> => {
  if (!query.trim()) return [];

  const q = query.trim();
  let data;
  let error;

  ({ data, error } = await supabase
    .from('productos')
    .select('id, name, price, original_price, discount, image_url, images, category')
    .eq('status', 'active')
    .or(`name.ilike.%${q}%,category.ilike.%${q}%,description.ilike.%${q}%`)
    .limit(8)
    .order('name', { ascending: true }));

  if (error && error.message?.includes('original_price')) {
    ({ data, error } = await supabase
      .from('productos')
      .select('id, name, price, discount, image_url, images, category')
      .eq('status', 'active')
      .or(`name.ilike.%${q}%,category.ilike.%${q}%,description.ilike.%${q}%`)
      .limit(8)
      .order('name', { ascending: true }));
  }

  if (error) {
    console.error('Search products error:', error);
    return [];
  }

  const rows = (data || []) as ProductSearchRow[];

  return rows.map((row) => {
    const imgs: string[] = row.images && row.images.length > 0 ? row.images : [];
    return {
      id: row.id,
      name: cleanText(row.name),
      price: row.price,
      originalPrice: row.original_price || undefined,
      discount: row.discount || undefined,
      image: imgs[0] || row.image_url || '',
      category: normalizeCategory(row.category),
    };
  });
};

// Fetch single product
export const fetchProductById = async (id: string, activeOnly = true) => {
  let query = supabase
    .from('productos')
    .select('*')
    .eq('id', id);

  if (activeOnly) {
    query = query.eq('status', 'active');
  }

  // maybeSingle: producto inexistente/inactivo devuelve null (sin 406 ni error),
  // así el caller decide el estado "no disponible" sin ruido en consola.
  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error('Fetch product error:', error);
    throw error;
  }

  return data;
};

// Body que el backend de productos consume — el server traduce a snake_case
// internamente. `publicId` se deriva de la URL de Cloudinary (con carpeta y sin
// extensión) para que el backend pueda hacer cleanup en delete sin recalcularlo.
const buildProductBody = (product: Partial<AdminProduct>) => ({
  // Se limpia al guardar para no persistir espacios sobrantes (corta el problema de raíz).
  name: product.name === undefined ? undefined : cleanText(product.name),
  price: product.price,
  stock: product.stock,
  category: product.category === undefined ? undefined : normalizeCategory(product.category),
  imageUrl: product.imageUrl,
  images: product.images,
  publicId: product.imageUrl ? extractCloudinaryPublicId(product.imageUrl) : '',
  description: product.description,
  discount: product.discount,
  condition: product.condition,
  freeShipping: product.freeShipping,
  variants: product.variants,
  specifications: product.specifications,
  features: product.features,
  faqs: product.faqs,
  warranty: product.warranty,
  returnPolicy: product.returnPolicy,
  sizeGuide: product.sizeGuide,
  status: product.status,
});

// Create product via backend API
export const createProduct = async (
  product: Omit<AdminProduct, 'id'>,
  token: string
) => {
  const response = await apiFetch(`${API_URL}/products`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(buildProductBody(product)),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create product');
  }

  return response.json();
};

// Update product via backend API
export const updateProduct = async (
  id: string,
  product: Partial<AdminProduct>,
  token: string
) => {
  const response = await apiFetch(`${API_URL}/products/${id}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(buildProductBody(product)),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update product');
  }

  return response.json();
};

// Delete product (via backend - also deletes from Cloudinary)
export const deleteProduct = async (id: string, token: string) => {
  const response = await apiFetch(`${API_URL}/products/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to delete product');
  }

  return response.json();
};

// ── Carousel Images ──────────────────────────────────────────────────────────

export interface CarouselImageRow {
  id: string;
  url: string;
  order: number;
  isActive: boolean;
  deviceType: 'desktop' | 'mobile';
}

const mapCarouselRow = (row: Record<string, unknown>): CarouselImageRow => ({
  id: row.id as string,
  url: row.url as string,
  order: row.order as number,
  isActive: row.is_active as boolean,
  deviceType: (row.device_type as 'desktop' | 'mobile') ?? 'desktop',
});

// Fetch active images (user-facing) — filterable by deviceType
export const fetchCarouselImages = async (deviceType: 'desktop' | 'mobile' = 'desktop'): Promise<CarouselImageRow[]> => {
  const { data, error } = await supabase
    .from('carousel_images')
    .select('*')
    .eq('is_active', true)
    .eq('device_type', deviceType)
    .order('order', { ascending: true });
  if (error) throw error;
  return (data || []).map(mapCarouselRow);
};

// Fetch all images (admin) — includes all device types
export const fetchAllCarouselImages = async (): Promise<CarouselImageRow[]> => {
  const { data, error } = await supabase
    .from('carousel_images')
    .select('*')
    .order('order', { ascending: true });
  if (error) throw error;
  return (data || []).map(mapCarouselRow);
};

export const insertCarouselImage = async (
  url: string,
  order: number,
  deviceType: 'desktop' | 'mobile' = 'desktop'
): Promise<CarouselImageRow> => {
  const { data, error } = await supabase
    .from('carousel_images')
    .insert([{ url, order, is_active: true, device_type: deviceType }])
    .select()
    .single();
  if (error) throw error;
  return mapCarouselRow(data);
};

export const updateCarouselImageDb = async (
  id: string,
  changes: { url?: string; order?: number; is_active?: boolean }
): Promise<void> => {
  const { error } = await supabase
    .from('carousel_images')
    .update(changes)
    .eq('id', id);
  if (error) throw error;
};

export const deleteCarouselImageDb = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('carousel_images')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

export const reorderCarouselImages = async (images: { id: string; order: number }[]): Promise<void> => {
  const results = await Promise.all(
    images.map(img =>
      supabase.from('carousel_images').update({ order: img.order }).eq('id', img.id)
    )
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
};

