/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  onRandom: () => void;
  isLoading: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch, onRandom, isLoading }) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (query.trim() && !isLoading) {
      onSearch(query.trim());
      setQuery(''); // Clear the input field after search
    }
  };

  return (
    <div className="flex items-baseline gap-4 flex-grow">
      <form onSubmit={handleSubmit} className="flex-grow" role="search">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Pesquisar"
          className="w-full py-2 px-1 font-serif text-lg bg-transparent border-none outline-none disabled:text-gray-400 dark:disabled:text-gray-600 placeholder:text-black/60 dark:placeholder:text-white/60"
          aria-label="Pesquisar por um tópico"
          disabled={isLoading}
        />
      </form>
      <button 
        onClick={onRandom} 
        className="py-2 px-0 font-bold whitespace-nowrap transition-colors duration-200 hover:text-[#B8860B] dark:hover:text-[#D4AF37] disabled:text-gray-400 dark:disabled:text-gray-600 disabled:cursor-not-allowed disabled:hover:text-gray-400 dark:disabled:hover:text-gray-600" 
        disabled={isLoading}>
        Aleatório
      </button>
    </div>
  );
};

export default SearchBar;