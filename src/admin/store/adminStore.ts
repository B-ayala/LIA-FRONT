import { create } from 'zustand';
import type { Variant, Specification, FAQ } from '../../types/product';

// Auth (login/logout/currentUser/isAuthenticated) vive en `src/store/authStore.ts`
// — separado para no forzar a la capa pública a importar desde `admin/`.

export interface AdminProduct {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  stock: number;
  category: string;
  imageUrl: string;
  images?: string[];
  description?: string;
  // Permite null: sentinel de "borrar descuento" en PUT (undefined se omite del JSON).
  discount?: number | null;
  condition?: 'new' | 'used';
  freeShipping?: boolean;
  variants?: Variant[];
  specifications?: Specification[];
  features?: string[];
  faqs?: FAQ[];
  warranty?: string;
  returnPolicy?: string;
  status: 'active' | 'inactive';
  featured?: boolean;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  status: 'active' | 'inactive';
}

export interface CarouselImage {
  id: string;
  url: string;
  order: number;
  isActive: boolean;
  deviceType: 'desktop' | 'mobile';
}

export interface AboutInfo {
  title: string;
  description: string;
  imageUrl: string;
  mission: string;
  vision: string;
  values: { title: string; description: string }[];
}

export interface FooterInfo {
  brandName: string;
  description: string;
  whatsapp: string;
  email: string;
  tiktokUser: string;
  tiktokUrl: string;
  facebookUser: string;
  facebookUrl: string;
  address: string;
  mapQuery: string;
  copyright: string;
}

interface AdminState {
  products: AdminProduct[];
  users: AdminUser[];
  carouselImages: CarouselImage[];
  setCarouselImages: (images: CarouselImage[]) => void;
  addCarouselImage: (url: string, deviceType?: 'desktop' | 'mobile') => void;
  updateCarouselImage: (id: string, data: Partial<CarouselImage>) => void;
  deleteCarouselImage: (id: string) => void;
  setProducts: (products: AdminProduct[]) => void;
  addProduct: (product: AdminProduct) => void;
  updateProduct: (id: string, data: Partial<AdminProduct>) => void;
  deleteProduct: (id: string) => void;
  updateUser: (id: string, data: Partial<AdminUser>) => void;
  aboutInfo: AboutInfo;
  updateAboutInfo: (data: Partial<AboutInfo>) => void;
  footerInfo: FooterInfo;
  updateFooterInfo: (data: Partial<FooterInfo>) => void;
}

export const useAdminStore = create<AdminState>((set) => ({
  products: [],
  users: [],
  carouselImages: [],
  aboutInfo: { title: '', description: '', imageUrl: '', mission: '', vision: '', values: [] },
  footerInfo: {
    brandName: '',
    description: '',
    whatsapp: '',
    email: '',
    tiktokUser: '',
    tiktokUrl: '',
    facebookUser: '',
    facebookUrl: '',
    address: '',
    mapQuery: '',
    copyright: '',
  },
  setCarouselImages: (images) => set({ carouselImages: images }),
  addCarouselImage: (url, deviceType = 'desktop') => set((state) => ({
    carouselImages: [...state.carouselImages, { id: Date.now().toString(), url, order: state.carouselImages.length + 1, isActive: true, deviceType }]
  })),
  updateCarouselImage: (id, data) => set((state) => ({
    carouselImages: state.carouselImages.map(img => img.id === id ? { ...img, ...data } : img)
  })),
  deleteCarouselImage: (id) => set((state) => ({
    carouselImages: state.carouselImages.filter(img => img.id !== id)
  })),
  setProducts: (products) => set({ products }),
  addProduct: (product) => set((state) => ({
    products: [...state.products, product]
  })),
  updateProduct: (id, data) => set((state) => ({
    products: state.products.map(p => p.id === id ? { ...p, ...data } : p)
  })),
  deleteProduct: (id) => set((state) => ({
    products: state.products.filter(p => p.id !== id)
  })),
  updateUser: (id, data) => set((state) => ({
    users: state.users.map(u => u.id === id ? { ...u, ...data } : u)
  })),
  updateAboutInfo: (data) => set((state) => ({
    aboutInfo: { ...state.aboutInfo, ...data }
  })),
  updateFooterInfo: (data) => set((state) => ({
    footerInfo: { ...state.footerInfo, ...data }
  }))
}));
