/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';

interface HistoryPanelProps {
  isOpen: boolean;
  history: string[];
  onClose: () => void;
  onHistoryClick: (topic: string) => void;
  onClearHistory: () => void;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ isOpen, history, onClose, onHistoryClick, onClearHistory }) => {
  if (!isOpen) {
    return null;
  }

  const handleItemClick = (topic: string) => {
    onHistoryClick(topic);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="history-title"
      className={`history-panel-container ${isOpen ? 'open' : ''}`}
    >
      <div className="history-backdrop" onClick={onClose}></div>
      <div className="history-panel">
        <header className="history-header">
          <h2 id="history-title" className="text-xl font-bold">Histórico</h2>
          <button onClick={onClose} aria-label="Fechar histórico" className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </header>
        <div className="history-content">
          {history.length > 0 ? (
            <ul>
              {history.map((topic, index) => (
                <li key={`${topic}-${index}`}>
                  <button onClick={() => handleItemClick(topic)} className="history-item">
                    {topic}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center text-gray-500 dark:text-gray-400 p-4">Seu histórico de navegação está vazio.</p>
          )}
        </div>
        {history.length > 0 && (
          <footer className="history-footer">
            <button onClick={onClearHistory} className="clear-history-button">
              Limpar Histórico
            </button>
          </footer>
        )}
      </div>
    </div>
  );
};

export default HistoryPanel;
