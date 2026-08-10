/**
 * Return true only when the client explicitly asks for an HTML document.
 *
 * Programmatic fetch clients commonly send a wildcard Accept value. Keeping
 * that request on the plain-text path preserves the existing clipboard API,
 * while a normal browser navigation includes `text/html` and receives the UI.
 */
export function acceptsHtml(acceptHeader = '') {
  return String(acceptHeader)
    .split(',')
    .some((entry) => {
      const [mediaType, ...parameters] = entry.trim().toLowerCase().split(';');
      if (mediaType !== 'text/html' && mediaType !== 'application/xhtml+xml') {
        return false;
      }

      const quality = parameters
        .map((parameter) => parameter.trim())
        .find((parameter) => parameter.startsWith('q='));

      return quality ? Number.parseFloat(quality.slice(2)) > 0 : true;
    });
}
