let googleMapsPromise = null;

export function loadGoogleMaps(apiKey) {
  if (window.google?.maps?.places) {
    return Promise.resolve(window.google);
  }

  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");

    script.src =
      `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;

    script.async = true;
    script.defer = true;

    script.onload = () => resolve(window.google);

    script.onerror = reject;

    document.body.appendChild(script);
  });

  return googleMapsPromise;
}
