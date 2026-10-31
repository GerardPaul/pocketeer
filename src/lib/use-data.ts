import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";

import { type Data, loadData } from "@/db/db";

// Reloads whenever the screen comes into focus, so lists reflect edits made on other screens.
export function useData() {
  const db = useSQLiteContext();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    loadData(db)
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((e: unknown) => setError(String(e)));
  }, [db]);

  useFocusEffect(reload);

  return { db, data, error, reload };
}
