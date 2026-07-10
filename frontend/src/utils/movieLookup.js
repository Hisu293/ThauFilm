const normalizeTitle = (value = '') =>
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export const buildMovieLookup = (movies = []) => ({
  byId: new Map(movies.filter((movie) => movie?.id).map((movie) => [String(movie.id), movie])),
  byTitle: new Map(movies.filter((movie) => movie?.title).map((movie) => [normalizeTitle(movie.title), movie])),
});

export const findMovie = (lookup, movieId, movieTitle) => {
  const byId = lookup?.byId?.get(String(movieId || ''));
  if (byId) return byId;

  const normalizedTitle = normalizeTitle(movieTitle);
  if (!normalizedTitle) return null;

  const exact = lookup?.byTitle?.get(normalizedTitle);
  if (exact) return exact;

  return [...(lookup?.byTitle?.entries() || [])].find(
    ([title]) => title.includes(normalizedTitle) || normalizedTitle.includes(title),
  )?.[1] || null;
};

