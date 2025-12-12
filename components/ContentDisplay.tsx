/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';

interface ContentDisplayProps {
  content: string;
  onWordClick: (word: string) => void;
}

const InteractiveContent: React.FC<{
  content: string;
  onWordClick: (word: string) => void;
}> = ({ content, onWordClick }) => {
  // Split the content by the double asterisks used for highlighting, keeping the delimiters.
  const parts = content.split(/(\*\*.*?\*\*)/g).filter(Boolean);

  return (
    <p style={{ margin: 0 }}>
      {parts.map((part, index) => {
        // Check if the part is a highlighted word (e.g., **Zumbi**)
        if (part.startsWith('**') && part.endsWith('**')) {
          // Extract the word without the asterisks
          const keyword = part.substring(2, part.length - 2);
          // Clean trailing punctuation for a better topic match
          const cleanKeyword = keyword.replace(/[.,!?;:()"']$/, '');

          if (!cleanKeyword) return <span key={index}>{keyword}</span>;
          
          return (
            <button
              key={index}
              onClick={() => onWordClick(cleanKeyword)}
              className="interactive-word"
              aria-label={`Ler mais sobre ${cleanKeyword}`}
            >
              {keyword}
            </button>
          );
        }
        
        // Render normal text parts as they are.
        return <span key={index}>{part}</span>;
      })}
    </p>
  );
};

const ContentDisplay: React.FC<ContentDisplayProps> = ({ content, onWordClick }) => {
  // Once loading is complete, render the final content with interactive words.
  if (content) {
    return <InteractiveContent content={content} onWordClick={onWordClick} />;
  }

  return null;
};

export default ContentDisplay;