export const LIST_FILM_STORAGE_KEY = 'cinema_listfilm_catalog_v2';

export function buildListFilmMovies() {
  return [];
}

export const listFilmMovies = buildListFilmMovies();

export const listFilmGenres = ['All'];

export function saveListFilmToStorage() {
  try {
    localStorage.removeItem(LIST_FILM_STORAGE_KEY);
    localStorage.removeItem('cinema_listfilm_catalog');
  } catch {
    /* ignore */
  }
}

export function loadListFilmFromStorage() {
  return null;
}

export function getListFilmMovieById() {
  return null;
}
