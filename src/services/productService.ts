import { supabase } from '../config/supabaseClient';
import { type AdminProduct } from '../admin/store/adminStore';
import type { Product } from '../types/product';
import type { ProductCardOption } from '../types/productCardOption';
import { apiFetch, authHeaders, API_BASE_URL } from '../utils/apiFetch';
import { getProductStockFromVariants, sanitizeProductVariants } from '../utils/productVariants';
import { extractCloudinaryPublicId } from '../utils/cloudinary';
import { cleanText, normalizeCategory } from '../utils/formatters';
import { createCachedFetcher } from '../utils/createCachedFetcher';

// Datos de configuración que el admin cambia muy de vez en cuando (categorías,
// opciones de card) pero que el público pide en cada mount. Las mutadoras
// invalidan su caché, así que el TTL solo cubre cambios hechos por fuera de
// esta pestaña (otro admin, otro dispositivo).
const CONFIG_CACHE_TTL_MS = 5 * 60 * 1000;

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
    hoverImageEnabled: row.hover_image_enabled ?? true,
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
const fetchCategoriesTreeFromDb = async (): Promise<Category[]> => {
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

// El árbol de categorías lo piden el NavBar (en todas las páginas públicas), el
// catálogo y el modal de producto del admin: sin caché se repetía el mismo
// request en cada mount. Las mutadoras de abajo invalidan, así que el admin
// nunca lee un árbol viejo después de crear o borrar una categoría.
const categoriesTreeCache = createCachedFetcher(fetchCategoriesTreeFromDb, CONFIG_CACHE_TTL_MS);

export const fetchCategoriesTree = (): Promise<Category[]> => categoriesTreeCache.load();

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
  categoriesTreeCache.invalidate();
  return data as Category;
};

// Delete a category (cascades to subcategories via ON DELETE CASCADE)
export const deleteCategory = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
  categoriesTreeCache.invalidate();
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
// select() acotado a lo que ProductGrid/ProductCard realmente renderizan en el
// Home (nombre, precio, imagen, stock/variantes, descuento). Único consumidor
// de este fetch: si en el futuro Home necesita otro campo (ej. category),
// agregarlo acá explícitamente — no volver a `select('*')`.
export const fetchFeaturedProducts = async (limit?: number) => {
  let query = supabase
    .from('productos')
    .select('id, name, price, original_price, image_url, images, discount, stock, hover_image_enabled, variants')
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
  adminProductsCache.invalidate();
};

// ── Admin: lista de productos ────────────────────────────────────────────────

// Columnas explícitas (en vez de select('*')): las vistas del admin comparten el mismo
// fetch y el modal de edición usa todos los campos editables del producto, así que la
// lista es casi completa. Quedan afuera las de uso interno (public_id, timestamps).
const ADMIN_LIST_COLUMNS =
  'id, name, price, original_price, stock, category, image_url, images, description, discount, condition, free_shipping, hover_image_enabled, variants, specifications, features, faqs, warranty, return_policy, size_guide, status, featured';

// Fetch products from Supabase. Pass activeOnly=false for admin (includes inactive).
export const fetchProducts = async (activeOnly = true) => {
  let query = supabase
    .from('productos')
    .select(ADMIN_LIST_COLUMNS)
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

// Caché compartido entre Products, ProductGallery y FeaturedProductsManager del admin:
// al navegar entre pestañas del panel no se repite la misma lectura. TTL corto y las
// mutaciones (create/update/delete/featured) invalidan, así el admin nunca ve datos viejos
// tras guardar. Los consumidores que quieran forzar frescura usan { force: true }.
const ADMIN_PRODUCTS_CACHE_TTL_MS = 30 * 1000;

const adminProductsCache = createCachedFetcher(() => fetchProducts(false), ADMIN_PRODUCTS_CACHE_TTL_MS);

export const fetchAdminProducts = (options?: { force?: boolean }) => {
  if (options?.force) adminProductsCache.invalidate();
  return adminProductsCache.load();
};

// ── Catálogo público paginado ────────────────────────────────────────────────

export const CATALOG_PAGE_SIZE = 24;

export interface CatalogPage {
  rows: Record<string, unknown>[];
  hasMore: boolean;
}

// Caracteres con significado en la sintaxis de filtros de PostgREST (.or) y comodines de LIKE.
const CATEGORY_FILTER_RESERVED_CHARS = /[,()%*"\\]/g;

// ilike sin comodines = igualdad case-insensitive: el filtro del catálogo siempre
// comparó en minúsculas (ver Products.tsx), así tolera categorías cargadas con otro casing.
const buildCategoryFilter = (names: string[]): string =>
  names
    .map((name) => name.replace(CATEGORY_FILTER_RESERVED_CHARS, ' ').trim())
    .filter(Boolean)
    .map((name) => `category.ilike."${name}"`)
    .join(',');

interface CatalogPageOptions {
  offset?: number;
  limit?: number;
  /** Nombres de categoría (la elegida + descendientes). Vacío/undefined = todas. */
  categoryNames?: string[];
}

// Fetch para el catálogo público (/products), paginado en el server. select()
// acotado a lo que ProductGrid/ProductCard renderizan + `category`. Pide limit+1 filas
// para saber si hay otra página sin un count aparte. El orden incluye `id` como
// desempate: con created_at repetidos, range() podía duplicar u omitir filas entre páginas.
export const fetchCatalogProductsPage = async (options: CatalogPageOptions = {}): Promise<CatalogPage> => {
  const { offset = 0, limit = CATALOG_PAGE_SIZE, categoryNames } = options;

  let query = supabase
    .from('productos')
    .select('id, name, price, original_price, image_url, images, category, discount, stock, hover_image_enabled, variants')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(offset, offset + limit);

  const categoryFilter = categoryNames ? buildCategoryFilter(categoryNames) : '';
  if (categoryFilter) {
    query = query.or(categoryFilter);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Fetch catalog products error:', error);
    throw error;
  }

  const rows = (data ?? []) as Record<string, unknown>[];
  return { rows: rows.slice(0, limit), hasMore: rows.length > limit };
};

/** @deprecated Use fetchAdminProducts() instead */
export const fetchAllProducts = () => fetchAdminProducts();

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

// Caracteres con significado en la sintaxis de filtros de PostgREST (.or) y comodines de LIKE.
const SEARCH_RESERVED_CHARS = /[,()%_*"]/g;

export const searchProducts = async (query: string): Promise<ProductSearchResult[]> => {
  const q = query.replace(SEARCH_RESERVED_CHARS, ' ').trim();
  if (!q) return [];

  const { data, error } = await supabase
    .from('productos')
    .select('id, name, price, original_price, discount, image_url, images, category')
    .eq('status', 'active')
    .or(`name.ilike.%${q}%,category.ilike.%${q}%,description.ilike.%${q}%`)
    .limit(8)
    .order('name', { ascending: true });

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
  originalPrice: product.originalPrice,
  stock: product.stock,
  category: product.category === undefined ? undefined : normalizeCategory(product.category),
  imageUrl: product.imageUrl,
  images: product.images,
  publicId: product.imageUrl ? extractCloudinaryPublicId(product.imageUrl) : '',
  description: product.description,
  discount: product.discount,
  condition: product.condition,
  freeShipping: product.freeShipping,
  hoverImageEnabled: product.hoverImageEnabled,
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

  adminProductsCache.invalidate();
  return response.json();
};

// Para borrar un campo opcional el backend necesita null explícito, pero solo si el
// caller lo incluyó: un update parcial no debe blanquear lo que no mencionó.
const nullWhenPresent = <T extends object>(source: T, keys: (keyof T)[]) =>
  Object.fromEntries(
    keys.filter((key) => key in source).map((key) => [key, source[key] ?? null]),
  );

// Update product via backend API
export const updateProduct = async (
  id: string,
  product: Partial<AdminProduct>,
  token: string
) => {
  const response = await apiFetch(`${API_URL}/products/${id}`, {
    method: 'PUT',
    headers: authHeaders(token),
    // JSON.stringify descarta los undefined y el backend solo actualiza lo que llega:
    // para poder QUITAR descuento, precio original o guía de talles se envía null explícito.
    body: JSON.stringify({
      ...buildProductBody(product),
      ...nullWhenPresent(product, ['discount', 'originalPrice', 'sizeGuide']),
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update product');
  }

  adminProductsCache.invalidate();
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

  adminProductsCache.invalidate();
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

// ── Carousel Layout (una imagen por slide vs. collage) ────────────────────────

export type CarouselLayout = 'single' | 'collage';

// Trae el layout de un solo dispositivo (público, lo usa el home)
export const fetchCarouselLayout = async (deviceType: 'desktop' | 'mobile'): Promise<CarouselLayout> => {
  const { data, error } = await supabase
    .from('carousel_settings')
    .select('layout')
    .eq('device_type', deviceType)
    .maybeSingle();
  if (error) throw error;
  return (data?.layout as CarouselLayout) ?? 'collage';
};

// Trae el layout de ambos dispositivos (admin)
export const fetchAllCarouselLayouts = async (): Promise<Record<'desktop' | 'mobile', CarouselLayout>> => {
  const { data, error } = await supabase
    .from('carousel_settings')
    .select('device_type, layout');
  if (error) throw error;
  const result: Record<'desktop' | 'mobile', CarouselLayout> = { desktop: 'collage', mobile: 'collage' };
  for (const row of data || []) {
    result[row.device_type as 'desktop' | 'mobile'] = row.layout as CarouselLayout;
  }
  return result;
};

export const updateCarouselLayout = async (
  deviceType: 'desktop' | 'mobile',
  layout: CarouselLayout
): Promise<void> => {
  const { error } = await supabase
    .from('carousel_settings')
    .update({ layout })
    .eq('device_type', deviceType);
  if (error) throw error;
};

// ── Product Card Options (sellos configurables en la card de producto) ───────

const mapProductCardOptionRow = (row: Record<string, unknown>): ProductCardOption => ({
  id: row.id as string,
  label: row.label as string,
  icon: row.icon as string,
  order: row.order as number,
  isActive: row.is_active as boolean,
});

// Fetch activas y ordenadas (vistas públicas de listado)
const fetchProductCardOptionsFromDb = async (): Promise<ProductCardOption[]> => {
  const { data, error } = await supabase
    .from('product_card_options')
    .select('*')
    .eq('is_active', true)
    .order('order', { ascending: true });
  if (error) throw error;
  return (data || []).map(mapProductCardOptionRow);
};

// Las pide cada ProductGrid que monta (Home y catálogo): con caché, ir y volver
// entre Home y /products deja de repetir el request. El admin lee por
// fetchAllProductCardOptions (sin filtro ni caché), pero las mutadoras
// invalidan igual para que el lado público no quede con datos viejos.
const productCardOptionsCache = createCachedFetcher(fetchProductCardOptionsFromDb, CONFIG_CACHE_TTL_MS);

export const fetchProductCardOptions = (): Promise<ProductCardOption[]> =>
  productCardOptionsCache.load();

// Fetch todas (admin)
export const fetchAllProductCardOptions = async (): Promise<ProductCardOption[]> => {
  const { data, error } = await supabase
    .from('product_card_options')
    .select('*')
    .order('order', { ascending: true });
  if (error) throw error;
  return (data || []).map(mapProductCardOptionRow);
};

export const insertProductCardOption = async (
  label: string,
  icon: string,
  order: number
): Promise<ProductCardOption> => {
  const { data, error } = await supabase
    .from('product_card_options')
    .insert([{ label, icon, order, is_active: true }])
    .select()
    .single();
  if (error) throw error;
  productCardOptionsCache.invalidate();
  return mapProductCardOptionRow(data);
};

export const updateProductCardOptionDb = async (
  id: string,
  changes: { label?: string; icon?: string; order?: number; is_active?: boolean }
): Promise<void> => {
  const { error } = await supabase
    .from('product_card_options')
    .update(changes)
    .eq('id', id);
  if (error) throw error;
  productCardOptionsCache.invalidate();
};

export const deleteProductCardOptionDb = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('product_card_options')
    .delete()
    .eq('id', id);
  if (error) throw error;
  productCardOptionsCache.invalidate();
};

export const reorderProductCardOptions = async (options: { id: string; order: number }[]): Promise<void> => {
  const results = await Promise.all(
    options.map(opt =>
      supabase.from('product_card_options').update({ order: opt.order }).eq('id', opt.id)
    )
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
  productCardOptionsCache.invalidate();
};

