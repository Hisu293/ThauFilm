import { useState } from 'react';
import './SearchAndFilter.css';

const categories = ['All', 'Action', 'Romance', 'Horror', 'Documentary', 'Comedy'];

const SearchAndFilter = ({ onSearch, onCategoryChange }) => {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const handleSearchChange = event => {
    const value = event.target.value;
    setQuery(value);
    if (onSearch) {
      onSearch(value);
    }
  };

  const handleCategoryClick = category => {
    setActiveCategory(category);
    if (onCategoryChange) {
      onCategoryChange(category);
    }
  };

  return (
    <section className="search-filter">
      <div className="search-filter__inner">
        <label className="search-filter__field">
          <span className="search-filter__icon">Search</span>
          <input
            type="text"
            value={query}
            onChange={handleSearchChange}
            placeholder="Search movies, genres, or cinemas"
          />
        </label>
        <div className="search-filter__chips">
          {categories.map(category => (
            <button
              key={category}
              type="button"
              className={`search-filter__chip${activeCategory === category ? ' is-active' : ''}`}
              onClick={() => handleCategoryClick(category)}
            >
              {category}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SearchAndFilter;
