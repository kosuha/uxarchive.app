import { QueryClient, type QueryClientConfig, focusManager, onlineManager } from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import type { Persister } from "@tanstack/query-persist-client-core";
import localforage from "localforage";

type LocalForageInstance = ReturnType<typeof localforage.createInstance>;

const isServer = typeof window === "undefined";

const queryClientConfig: QueryClientConfig = {
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 10,
      staleTime: 1000 * 30,
      refetchOnReconnect: true,
      refetchOnWindowFocus: true,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
};

const createQueryClient = () => new QueryClient(queryClientConfig);

let browserQueryClient: QueryClient | undefined;

export const getQueryClient = () => {
  if (isServer) {
    return createQueryClient();
  }

  if (!browserQueryClient) {
    browserQueryClient = createQueryClient();
  }

  return browserQueryClient;
};

let persister: Persister | undefined;
let browserStorage: LocalForageInstance | undefined;

const getLocalForageInstance = () => {
  if (isServer) return undefined;

  if (!browserStorage) {
    browserStorage = localforage.createInstance({
      name: "ux-archive",
      storeName: "react-query-cache",
      driver: [localforage.INDEXEDDB, localforage.LOCALSTORAGE],
      description: "Persisted cache for TanStack Query",
    });
  }

  return browserStorage;
};

const createIDBPersister = () => {
  if (isServer) return undefined;

  const storage = getLocalForageInstance();

  if (!storage) return undefined;

  return createAsyncStoragePersister({
    storage,
    throttleTime: 1000,
  });
};

export const getQueryPersister = () => {
  if (isServer) return undefined;

  if (!persister) {
    persister = createIDBPersister();
  }

  return persister;
};

let managersInitialized = false;

export const ensureQueryClientManagers = () => {
  if (isServer || managersInitialized) {
    return;
  }

  managersInitialized = true;

  onlineManager.setEventListener((setOnline) => {
    const handler = () => setOnline(navigator.onLine);

    window.addEventListener("online", handler);
    window.addEventListener("offline", handler);

    return () => {
      window.removeEventListener("online", handler);
      window.removeEventListener("offline", handler);
    };
  });

  focusManager.setEventListener((setFocused) => {
    const handler = () => setFocused(!document.hidden);

    window.addEventListener("visibilitychange", handler);
    window.addEventListener("focus", handler);

    return () => {
      window.removeEventListener("visibilitychange", handler);
      window.removeEventListener("focus", handler);
    };
  });
};
