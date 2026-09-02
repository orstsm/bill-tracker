import { useState } from 'react';
import { Check, Search } from 'lucide-react';
import BillerLogo from './BillerLogo';
import { findBiller, searchBillers } from '../data/billerCatalog';

export default function BillerPicker({ value, onChange }) {
  const [query, setQuery] = useState(value || '');
  const [selectedBiller, setSelectedBiller] = useState(() => findBiller(value));
  const [isOpen, setIsOpen] = useState(false);
  const results = searchBillers(query);

  const chooseBiller = (entry) => {
    setQuery(entry.name);
    setSelectedBiller(entry);
    setIsOpen(false);
    onChange(entry.name);
  };

  const chooseCustomBiller = () => {
    const customName = query.trim();
    if (!customName) return;
    setSelectedBiller(null);
    setIsOpen(false);
    onChange(customName);
  };

  const handleInput = (event) => {
    const nextQuery = event.target.value;
    setQuery(nextQuery);
    setSelectedBiller(null);
    setIsOpen(true);
    onChange(nextQuery);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
      return;
    }
    if (event.key === 'Enter' && isOpen && results.length > 0) {
      event.preventDefault();
      chooseBiller(results[0]);
    }
  };

  return (
    <div>
      <label className="native-label" htmlFor="biller-search">Choose Biller</label>
      <div className="biller-picker">
        <Search className="biller-picker-search-icon" size={18} aria-hidden="true" />
        <input
          id="biller-search"
          required
          type="search"
          role="combobox"
          className="native-input biller-picker-input"
          placeholder="Search banks, cards, MP2…"
          value={query}
          onChange={handleInput}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          aria-expanded={isOpen}
          aria-controls="biller-picker-results"
          aria-autocomplete="list"
          autoComplete="off"
          spellCheck="false"
        />

        {isOpen && (
          <div className="biller-picker-results" id="biller-picker-results" role="listbox">
            {results.length > 0 ? results.map((entry) => (
              <button
                type="button"
                role="option"
                aria-selected={selectedBiller?.id === entry.id}
                className="biller-picker-option"
                key={entry.id}
                onClick={() => chooseBiller(entry)}
                data-no-swipe
              >
                <BillerLogo biller={entry.name} size={38} />
                <span className="biller-picker-option-copy">
                  <strong>{entry.name}</strong>
                  <small>{entry.category}</small>
                </span>
                {selectedBiller?.id === entry.id && <Check size={18} aria-hidden="true" />}
              </button>
            )) : (
              <p className="biller-picker-empty">No catalog match</p>
            )}

            {query.trim() && !findBiller(query) && (
              <button
                type="button"
                className="biller-picker-custom"
                onClick={chooseCustomBiller}
                data-no-swipe
              >
                Use “{query.trim()}” as a custom biller
              </button>
            )}
          </div>
        )}
      </div>

      {selectedBiller && !isOpen && (
        <div className="selected-biller-preview" aria-live="polite">
          <BillerLogo biller={selectedBiller.name} size={34} />
          <span>
            <strong>{selectedBiller.name}</strong>
            <small>{selectedBiller.category} · Logo included</small>
          </span>
          <Check size={18} aria-hidden="true" />
        </div>
      )}
    </div>
  );
}
