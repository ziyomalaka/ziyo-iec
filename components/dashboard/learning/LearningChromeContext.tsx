"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type LearningChromeValue = {
  hideBottomNav: boolean;
  setHideBottomNav: (value: boolean) => void;
};

const LearningChromeContext = createContext<LearningChromeValue>({
  hideBottomNav: false,
  setHideBottomNav: () => {},
});

export function LearningChromeProvider({ children }: { children: ReactNode }) {
  const [hideBottomNav, setHideBottomNav] = useState(false);
  const value = useMemo(() => ({ hideBottomNav, setHideBottomNav }), [hideBottomNav]);
  return <LearningChromeContext.Provider value={value}>{children}</LearningChromeContext.Provider>;
}

export function useLearningChrome() {
  return useContext(LearningChromeContext);
}
