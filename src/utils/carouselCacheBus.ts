// Evita el ciclo carouselData ↔ productService: quien muta el carrusel avisa
// acá y carouselData (que cachea la lectura) se registra para olvidar lo viejo.
const invalidators = new Set<() => void>();

export const registerCarouselInvalidator = (invalidate: () => void): void => {
  invalidators.add(invalidate);
};

export const invalidateCarouselCaches = (): void => {
  invalidators.forEach((invalidate) => invalidate());
};
