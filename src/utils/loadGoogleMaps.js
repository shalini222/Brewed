let googleMapsPromise = null;

export function loadGoogleMaps(apiKey) {
  if (window.google?.maps?.places) {
    return Promise.resolve(window.google);
  }

  if (!apiKey) {
    return Promise.reject(
      new Error("Google Maps API key is missing.")
    );
  }

  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  googleMapsPromise = new Promise(
    (resolve, reject) => {
      const existingScript =
        document.querySelector(
          'script[data-google-maps="true"]'
        );

      if (existingScript) {
        existingScript.addEventListener(
          "load",
          () => resolve(window.google)
        );

        existingScript.addEventListener(
          "error",
          reject
        );

        return;
      }

      const script =
        document.createElement("script");

      script.src =
        `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
          apiKey
        )}&libraries=places`;

      script.async = true;
      script.defer = true;

      script.dataset.googleMaps = "true";

      script.onload = () => {
        if (window.google?.maps) {
          resolve(window.google);
        } else {
          reject(
            new Error(
              "Google Maps loaded but is unavailable."
            )
          );
        }
      };

      script.onerror = () => {
        reject(
          new Error(
            "Failed to load Google Maps."
          )
        );
      };

      document.head.appendChild(script);
    }
  );

  return googleMapsPromise;
}
