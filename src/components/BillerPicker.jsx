import { useState } from 'react';
import { Check, List, PlusCircle, Search } from 'lucide-react';
import BillerLogo from './BillerLogo';
import { findBiller, searchBillers } from '../data/billerCatalog';

export default function BillerPicker({ value, onChange }) {
  const [query, setQuery] = useState(value || '');
  const [selectedBiller, setSelectedBiller] = useState(() => findBiller(value));
  const [isOpen, setIsOpen] = useState(false);
  const [isManual, setIsManual] = useState(false);
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

  const handleFocus = (event) => {
    setIsOpen(true);
    const input = event.currentTarget;
    window.setTimeout(() => input.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 80);
  };

  const startManualEntry = () => {
    const manualName = selectedBiller ? '' : query;
    setQuery(manualName);
    setSelectedBiller(null);
    setIsOpen(false);
    setIsManual(true);
    onChange(manualName);
  };

  const returnToCatalog = () => {
    setIsManual(false);
    setIsOpen(true);
  };

  return (
    <div>
      <label className="native-label" htmlFor="biller-search">{isManual ? 'Biller Name' : 'Choose Biller'}</label>
      {isManual ? (
        <div className="manual-provider-entry">
          <input
            id="biller-search"
            required
            type="text"
            className="native-input"
            placeholder="e.g. Local Cooperative"
            value={query}
            onChange={handleInput}
            onFocus={handleFocus}
            autoComplete="organization"
            autoFocus
          />
          {query.trim() && (
            <div className="selected-biller-preview" aria-live="polite">
              <BillerLogo biller={query.trim()} size={34} />
              <span>
                <strong>{query.trim()}</strong>
                <small>Custom biller · Initials logo</small>
              </span>
              <Check size={18} aria-hidden="true" />
            </div>
          )}
          <button className="picker-mode-button" type="button" onClick={returnToCatalog}>
            <List size={17} aria-hidden="true" /> Browse biller catalog
          </button>
        </div>
      ) : (
        <>
          <div className="biller-picker">
            <Search className="biller-picker-search-icon" size={18} aria-hidden="true" />
            <input
              id="biller-search"
              required
              type="search"
              role="combobox"
              className="native-input biller-picker-input"
              placeholder="Search cards, utilities, internet, insurance…"
              value={query}
              onChange={handleInput}
              onFocus={handleFocus}
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
          <button className="picker-mode-button" type="button" onClick={startManualEntry}>
            <PlusCircle size={17} aria-hidden="true" /> Biller not listed? Add manually
          </button>
        </>
      )}

      {selectedBiller && !isOpen && !isManual && (
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
