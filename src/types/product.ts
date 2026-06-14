export interface Variant {
  name: string;
  options: string[];
  stockByOption?: Record<string, number>; // Stock por opción de variante (ej: para talles)
}

export interface Specification {
  label: string;
  value: string;
}

export interface FAQ {
  question: string;
  answer: string;
}

export interface Review {
  id: number;
  author: string;
  rating: number;
  comment: string;
  date: string;
}

export interface Product {
  id: string | number;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  images?: string[];
  description?: string;
  category?: string;
  discount?: number;
  stock?: number;
  condition?: 'new' | 'used';
  freeShipping?: boolean;
  rating?: number;
  reviewCount?: number;
  variants?: Variant[];
  specifications?: Specification[];
  features?: string[];
  faqs?: FAQ[];
  reviews?: Review[];
  warranty?: string;
  returnPolicy?: string;
}
