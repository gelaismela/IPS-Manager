import { useState, useEffect } from "react";
import { authFetch } from "../api/api"; // your helper

/**
 * Custom hook for fetching data from an API with JWT auth.
 * @param {string} url - API endpoint
 * @param {object} options - fetch options (method, body, etc.)
 * @param {boolean} skip - optional, skip fetching if true
 */
const useAuthFetch = (url, options = {}, skip = false) => {
  const [data, setData] = useState(null);
  const [isPending, setIsPending] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (skip) return; // don't fetch if skip is true

    const abortCont = new AbortController();

    const fetchData = async () => {
      setIsPending(true);
      setError(null);

      try {
        const res = await authFetch(url, {
          ...options,
          signal: abortCont.signal,
        });
        setData(res);
      } catch (err) {
        if (err.name === "AbortError") {
          console.log("fetch aborted");
        } else {
          setError(err.message || "An error occurred");
        }
      } finally {
        setIsPending(false);
      }
    };

    fetchData();

    return () => abortCont.abort();
  }, [url, JSON.stringify(options), skip]);

  return { data, isPending, error };
};

export default useAuthFetch;
