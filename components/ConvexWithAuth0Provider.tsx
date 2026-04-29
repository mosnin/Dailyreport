"use client";

import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { convex } from "@/lib/convex";

async function fetchConvexToken(): Promise<string | null> {
  const res = await fetch("/api/auth/token");
  const { token } = await res.json();
  return token as string | null;
}

function useConvexAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    fetchConvexToken().then((token) => {
      tokenRef.current = token;
      setIsAuthenticated(!!token);
      setIsLoading(false);
    });
  }, []);

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      if (forceRefreshToken) {
        const token = await fetchConvexToken();
        tokenRef.current = token;
        return token;
      }
      return tokenRef.current;
    },
    []
  );

  return useMemo(
    () => ({ isAuthenticated, isLoading, fetchAccessToken }),
    [isAuthenticated, isLoading, fetchAccessToken]
  );
}

export function ConvexWithAuth0Provider({ children }: { children: React.ReactNode }) {
  return (
    <ConvexProviderWithAuth client={convex} useAuth={useConvexAuth}>
      {children}
    </ConvexProviderWithAuth>
  );
}
