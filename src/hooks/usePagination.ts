import { useState, useEffect, useMemo } from 'react';

interface UsePaginationOptions {
  itemsPerPage?: number;
  resetDeps?: unknown[];
}

interface UsePaginationResult<T> {
  currentPage: number;
  setCurrentPage: (page: number) => void;
  totalPages: number;
  paginated: T[];
}

export const usePagination = <T>(
  items: T[],
  { itemsPerPage = 10, resetDeps = [] }: UsePaginationOptions = {},
): UsePaginationResult<T> => {
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to page 1 when dependencies change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setCurrentPage(1); }, resetDeps);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(items.length / itemsPerPage)),
    [items.length, itemsPerPage],
  );

  const paginated = useMemo(
    () => items.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage),
    [items, currentPage, itemsPerPage],
  );

  return { currentPage, setCurrentPage, totalPages, paginated };
};
