import React, { createContext, useContext, useState } from "react";

type DateIdea = {
  id: string;
  title: string;
  category: string;
};

type LikesContextType = {
  liked: DateIdea[];
  addLike: (date: DateIdea) => void;
  removeLike: (id: string) => void;
};

const LikesContext = createContext<LikesContextType | undefined>(undefined);

export function LikesProvider({ children }: { children: React.ReactNode }) {
  const [liked, setLiked] = useState<DateIdea[]>([]);

  const addLike = (date: DateIdea) => {
    setLiked(prev => [...prev, date]);
  };

  const removeLike = (id: string) => {
    setLiked(prev => prev.filter(item => item.id !== id));
  };

  return (
    <LikesContext.Provider value={{ liked, addLike, removeLike }}>
      {children}
    </LikesContext.Provider>
  );
}

export function useLikes() {
  const context = useContext(LikesContext);
  if (!context) throw new Error("useLikes must be used inside LikesProvider");
  return context;
}