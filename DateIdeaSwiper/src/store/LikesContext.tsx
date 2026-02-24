import React, { createContext, useContext, useState } from "react";
import { DateIdea } from "../types/date";

type LikesContextType = {
  likes: DateIdea[];
  addLike: (date: DateIdea) => void;
  removeLike: (id: string) => void;
};

const LikesContext = createContext<LikesContextType | undefined>(undefined);

export function LikesProvider({ children }: { children: React.ReactNode }) {
  const [likes, setLikes] = useState<DateIdea[]>([]);

  const addLike = (item: DateIdea) => {
    setLikes(prev => {
      if (prev.find(x => x.id === item.id)) return prev;
      return [...prev, item];
    });
  };

  const removeLike = (id: string) => {
    setLikes(prev => prev.filter(item => item.id !== id));
  };

  return (
    <LikesContext.Provider value={{ likes, addLike, removeLike }}>
      {children}
    </LikesContext.Provider>
  );
}

export function useLikes() {
  const context = useContext(LikesContext);
  if (!context) throw new Error("useLikes must be used inside LikesProvider");
  return context;
}