/**
 * Generates a unique CSS selector for a DOM element.
 * Runs inside page.evaluate() — no Node.js APIs available.
 *
 * Priority: #id > [name] > [data-testid] > CSS path
 */
export function generateSelectorScript(): string {
  return `
    (function generateSelector(el) {
      if (!el || el === document.body || el === document.documentElement) return 'body';

      // 1. Unique ID
      if (el.id && document.querySelectorAll('#' + CSS.escape(el.id)).length === 1) {
        return '#' + CSS.escape(el.id);
      }

      // 2. Unique name attribute
      if (el.getAttribute('name')) {
        const nameSelector = el.tagName.toLowerCase() + '[name="' + el.getAttribute('name') + '"]';
        if (document.querySelectorAll(nameSelector).length === 1) return nameSelector;
      }

      // 3. data-testid
      if (el.getAttribute('data-testid')) {
        const testIdSelector = '[data-testid="' + el.getAttribute('data-testid') + '"]';
        if (document.querySelectorAll(testIdSelector).length === 1) return testIdSelector;
      }

      // 4. CSS path fallback
      const parts = [];
      let current = el;
      while (current && current !== document.body && current !== document.documentElement) {
        let part = current.tagName.toLowerCase();
        if (current.id && document.querySelectorAll('#' + CSS.escape(current.id)).length === 1) {
          parts.unshift('#' + CSS.escape(current.id));
          break;
        }
        const parent = current.parentElement;
        if (parent) {
          const siblings = Array.from(parent.children).filter(c => c.tagName === current.tagName);
          if (siblings.length > 1) {
            const index = siblings.indexOf(current) + 1;
            part += ':nth-of-type(' + index + ')';
          }
        }
        parts.unshift(part);
        current = parent;
      }
      return parts.join(' > ');
    })
  `;
}
