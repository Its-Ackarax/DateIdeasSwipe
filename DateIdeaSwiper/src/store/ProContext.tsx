import { createContext, useContext } from "react";

export type ProState = {
  customerInfo: any | null;
  isPro: boolean;
};

export const ProContext = createContext<ProState>({
  customerInfo: null,
  isPro: false,
});

export function usePro() {
  return useContext(ProContext);
}

