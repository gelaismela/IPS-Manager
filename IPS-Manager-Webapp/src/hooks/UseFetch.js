import { useState, useEffect } from "react";

/**
 * Custom hook for fetching data from an API.
 * Handles loading, error, and cleanup on unmount.
 * @param {string} url - The API endpoint to fetch.
 */
const useFetch = (url) => {
  const [data, setData] = useState(null); // Fetched data
  const [isPending, setIsPending] = useState(true); // Loading state
  const [error, setError] = useState(null); // Error state

  useEffect(() => {
    const abortCont = new AbortController(); // For aborting fetch on unmount

    setTimeout(() => {
      fetch(url, { signal: abortCont.signal })
        .then((res) => {
          if (!res.ok) {
            throw Error("could not fetch the data for that resource");
          }
          return res.json();
        })
        .then((data) => {
          setIsPending(false);
          setData(data);
          setError(null);
        })
        .catch((err) => {
          if (err.name === "AbortError") {
            // fetch aborted
            console.log("fetch aborted");
          } else {
            setIsPending(false);
            setError(err.message);
          }
        });
    }, 1000); // Simulate network delay

    // Cleanup: abort fetch if component unmounts
    return () => abortCont.abort();
  }, [url]);

  // Return data, loading, and error states
  return { data, isPending, error };
};

export default useFetch;
