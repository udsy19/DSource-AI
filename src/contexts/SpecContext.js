"use client";
import React, { createContext, useContext, useState } from "react";

const SpecContext = createContext();

export const useSpec = () => {
  const context = useContext(SpecContext);
  if (!context) {
    throw new Error("useSpec must be used within a SpecProvider");
  }
  return context;
};

export const SpecProvider = ({ children }) => {
  const [specCount, setSpecCount] = useState(0);

  return (
    <SpecContext.Provider value={{ specCount, setSpecCount }}>
      {children}
    </SpecContext.Provider>
  );
};
