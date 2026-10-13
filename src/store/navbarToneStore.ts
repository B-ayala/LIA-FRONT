import { create } from 'zustand';

// Puente entre el carrusel (que sabe qué slide se ve) y el navbar (que se pinta
// encima): son hermanos en el árbol y no comparten padre directo.
interface NavbarToneState {
  slideColor: string | null;
  setSlideColor: (color: string | null) => void;
}

export const useNavbarToneStore = create<NavbarToneState>((set) => ({
  slideColor: null,
  setSlideColor: (color) => set({ slideColor: color }),
}));
