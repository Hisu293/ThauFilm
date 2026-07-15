import { useMemo, useState } from 'react';

const toTimestamp = (value) => {
  if (value == null || value === '') return 0;
  const timestamp = typeof value === 'number' ? value : Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const newestTimestamp = (item, dateFields) => {
  for (const field of dateFields) {
    const timestamp = toTimestamp(item?.[field]);
    if (timestamp) return timestamp;
  }
  return 0;
};

/** Logic dùng chung cho các bảng Staff: search, mới nhất trước và phân trang. */
const useStaffList = ({
  items = [],
  matchesSearch,
  dateFields = ['createdAt', 'updatedAt'],
  rowsPerPage = 10,
}) => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  const sortedItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => !query || matchesSearch(item, query))
      .sort((left, right) => {
        const byNewest = newestTimestamp(right.item, dateFields) - newestTimestamp(left.item, dateFields);
        return byNewest || left.index - right.index;
      })
      .map(({ item }) => item);
  }, [dateFields, items, matchesSearch, search]);

  const maxPage = Math.max(0, Math.ceil(sortedItems.length / rowsPerPage) - 1);
  const currentPage = Math.min(page, maxPage);
  const paginatedItems = sortedItems.slice(
    currentPage * rowsPerPage,
    currentPage * rowsPerPage + rowsPerPage,
  );

  const handleSearchChange = (value) => {
    setSearch(value);
    setPage(0);
  };

  return {
    search,
    page: currentPage,
    setPage,
    handleSearchChange,
    filteredItems: sortedItems,
    paginatedItems,
    rowsPerPage,
  };
};

export default useStaffList;
