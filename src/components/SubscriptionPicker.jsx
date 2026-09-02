import { useState } from 'react';
import { Check, Search } from 'lucide-react';
import SubscriptionLogo from './SubscriptionLogo';
import { findSubscription, searchSubscriptions } from '../data/subscriptionCatalog';

export default function SubscriptionPicker({ value, onChange }) {
  const [query, setQuery] = useState(value || '');
  const [selectedSubscription, setSelectedSubscription] = useState(() => findSubscription(value));
  const [isOpen, setIsOpen] = useState(false);
  const results = searchSubscriptions(query);

  const chooseSubscription = (entry) => {
    setQuery(entry.name);
    setSelectedSubscription(entry);
    setIsOpen(false);
    onChange(entry.name);
  };

  const chooseCustomSubscription = () => {
    const customName = query.trim();
    if (!customName) return;
    setSelectedSubscription(null);
    setIsOpen(false);
    onChange(customName);
  };

  const handleInput = (event) => {
    const nextQuery = event.target.value;
    setQuery(nextQuery);
    setSelectedSubscription(null);
    setIsOpen(true);
    onChange(nextQuery);
  };

  const handleFocus = (event) => {
    setIsOpen(true);
    const input = event.currentTarget;
    window.setTimeout(() => input.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 80);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
      return;
    }
    if (event.key === 'Enter' && isOpen && results.length > 0) {
      event.preventDefault();
      chooseSubscription(results[0]);
    }
  };

  return (
    <div>
      <label className="native-label" htmlFor="subscription-search">Choose Subscription</label>
      <div className="biller-picker">
        <Search className="biller-picker-search-icon" size={18} aria-hidden="true" />
        <input
          id="subscription-search"
          required
          type="search"
          role="combobox"
          className="native-input biller-picker-input"
          placeholder="Search streaming, music, cloud, AI…"
          value={query}
          onChange={handleInput}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          aria-expanded={isOpen}
          aria-controls="subscription-picker-results"
          aria-autocomplete="list"
          autoComplete="off"
          spellCheck="false"
        />

        {isOpen && (
          <div className="biller-picker-results" id="subscription-picker-results" role="listbox">
            {results.length > 0 ? results.map((entry) => (
              <button
                type="button"
                role="option"
                aria-selected={selectedSubscription?.id === entry.id}
                className="biller-picker-option"
                key={entry.id}
                onClick={() => chooseSubscription(entry)}
                data-no-swipe
              >
                <SubscriptionLogo subscription={entry.name} size={38} />
                <span className="biller-picker-option-copy">
                  <strong>{entry.name}</strong>
                  <small>{entry.category}</small>
                </span>
                {selectedSubscription?.id === entry.id && <Check size={18} aria-hidden="true" />}
              </button>
            )) : (
              <p className="biller-picker-empty">No catalog match</p>
            )}

            {query.trim() && !findSubscription(query) && (
              <button type="button" className="biller-picker-custom" onClick={chooseCustomSubscription} data-no-swipe>
                Use “{query.trim()}” as a custom subscription
              </button>
            )}
          </div>
        )}
      </div>

      {selectedSubscription && !isOpen && (
        <div className="selected-biller-preview" aria-live="polite">
          <SubscriptionLogo subscription={selectedSubscription.name} size={34} />
          <span>
            <strong>{selectedSubscription.name}</strong>
            <small>{selectedSubscription.category} · Logo included</small>
          </span>
          <Check size={18} aria-hidden="true" />
        </div>
      )}
    </div>
  );
}
