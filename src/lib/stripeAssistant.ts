/** Remove Stripe's sandbox testing assistant if it was left in the DOM after checkout. */
export const removeStripeTestingAssistant = () => {
  document.querySelectorAll('body > div, body > aside').forEach((node) => {
    if (!(node instanceof HTMLElement)) return;

    const label = node.textContent?.trim().toLowerCase() ?? '';
    if (!label.includes('stripe')) return;

    const { bottom, right, width, height } = node.getBoundingClientRect();
    const isBottomRight = bottom >= window.innerHeight - 120 && right >= window.innerWidth - 160;
    const isCompact = width <= 280 && height <= 80;

    if (isBottomRight && isCompact) {
      node.remove();
    }
  });
};
