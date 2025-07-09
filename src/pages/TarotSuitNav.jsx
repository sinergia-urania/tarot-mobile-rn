// TarotSuitNav.jsx
import React from 'react';

const TarotSuitNav = ({ activeSuit, setActiveSuit }) => {
  const suits = [
    { key: 'major', label: 'Velika Arkana', icon: '/icons/major.png' },
    { key: 'wands', label: 'Štapovi', icon: '/icons/wands.png' },
    { key: 'cups', label: 'Pehari', icon: '/icons/cups.png' },
    { key: 'swords', label: 'Mačevi', icon: '/icons/swords.png' },
    { key: 'pentacles', label: 'Zlatnici', icon: '/icons/pentacles.png' },
  ];

  return (
    <div className="flex justify-center gap-3 mb-6 flex-wrap">
      {suits.map((suit) => (
        <button
          key={suit.key}
          onClick={() => setActiveSuit(suit.key)}
          className={`transition duration-200 p-1 rounded-lg ${
            activeSuit === suit.key ? 'border border-yellow-400 bg-white/10' : 'text-white'
          }`}
        >
          <img src={suit.icon} alt={suit.label} className="w-8 h-8" />
        </button>
      ))}
    </div>
  );
};

export default TarotSuitNav;
