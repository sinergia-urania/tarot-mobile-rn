import React, { createContext, useContext, useRef } from 'react';

const TreasureRefContext = createContext(null);

export const TreasureRefProvider = ({ children }) => {
  const treasureRef = useRef();
  return (
    <TreasureRefContext.Provider value={treasureRef}>
      {children}
    </TreasureRefContext.Provider>
  );
};

export const useTreasureRef = () => useContext(TreasureRefContext);
