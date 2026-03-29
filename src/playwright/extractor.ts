import type { Page } from 'playwright';
import { config } from '../config.js';
import type {
  ExtractRequest,
  ExtractResult,
  ExtractMeta,
  ExtractLink,
  ExtractInteractive,
  ExtractForm,
  ExtractTable,
  ExtractInclude,
} from '../types/api.js';

const DEFAULT_INCLUDE: ExtractInclude[] = ['text', 'links', 'interactive', 'meta'];

export async function extractPage(page: Page, req: ExtractRequest = {}): Promise<ExtractResult> {
  const include = new Set(req.include ?? DEFAULT_INCLUDE);
  const scopeSelector = req.selector ?? 'body';
  const textMaxLength = req.textMaxLength ?? config.defaults.textMaxLength;
  const linksMaxCount = req.linksMaxCount ?? config.defaults.linksMaxCount;
  const interactiveMaxCount = req.interactiveMaxCount ?? config.defaults.interactiveMaxCount;

  const result: ExtractResult = {
    meta: await extractMeta(page),
  };

  if (include.has('text')) {
    result.text = await extractText(page, scopeSelector, textMaxLength);
  }

  if (include.has('links')) {
    result.links = await extractLinks(page, scopeSelector, linksMaxCount);
  }

  if (include.has('interactive')) {
    result.interactive = await extractInteractive(page, scopeSelector, interactiveMaxCount);
  }

  if (include.has('forms')) {
    result.forms = await extractForms(page, scopeSelector);
  }

  if (include.has('tables')) {
    result.tables = await extractTables(page, scopeSelector);
  }

  return result;
}

async function extractMeta(page: Page): Promise<ExtractMeta> {
  return page.evaluate(() => ({
    url: location.href,
    title: document.title || '',
    description: document.querySelector('meta[name="description"]')?.getAttribute('content') || null,
    language: document.documentElement.lang || null,
  }));
}

// All page.evaluate functions below use `new Function` style or avoid TS type
// annotations inside the callback to prevent esbuild/tsx from injecting __name shims.

async function extractText(page: Page, scopeSelector: string, maxLength: number): Promise<string> {
  return page.evaluate(`
    (() => {
      const scope = document.querySelector(${JSON.stringify(scopeSelector)}) || document.body;
      const blockTags = new Set(['div','p','h1','h2','h3','h4','h5','h6','li','tr','br','hr','section','article','header','footer','main','nav']);

      const isVisible = (el) => {
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        if (el.getAttribute('aria-hidden') === 'true') return false;
        return true;
      };

      const getTextContent = (node) => {
        if (node.nodeType === Node.TEXT_NODE) return node.textContent?.trim() || '';
        if (node.nodeType !== Node.ELEMENT_NODE) return '';
        const el = node;
        const tag = el.tagName.toLowerCase();
        if (tag === 'script' || tag === 'style' || tag === 'noscript' || tag === 'svg') return '';
        if (!isVisible(el)) return '';
        const parts = [];
        for (const child of el.childNodes) {
          const t = getTextContent(child);
          if (t) parts.push(t);
        }
        const text = parts.join(' ');
        if (blockTags.has(tag)) return '\\n' + text + '\\n';
        return text;
      };

      let raw = getTextContent(scope);
      raw = raw.replace(/[ \\t]+/g, ' ').replace(/\\n{3,}/g, '\\n\\n').trim();
      return raw.slice(0, ${maxLength});
    })()
  `);
}

async function extractLinks(page: Page, scopeSelector: string, maxCount: number): Promise<ExtractLink[]> {
  return page.evaluate(`
    (() => {
      const scope = document.querySelector(${JSON.stringify(scopeSelector)}) || document.body;
      const anchors = scope.querySelectorAll('a[href]');
      const seen = new Set();
      const results = [];
      const origin = location.origin;

      for (const a of anchors) {
        if (results.length >= ${maxCount}) break;
        const href = a.href;
        if (!href || href.startsWith('javascript:') || href.startsWith('#')) continue;
        if (seen.has(href)) continue;
        seen.add(href);
        const text = (a.textContent || '').trim().slice(0, 100);
        results.push({ href, text, isExternal: !href.startsWith(origin) });
      }
      return results;
    })()
  `);
}

async function extractInteractive(page: Page, scopeSelector: string, maxCount: number): Promise<ExtractInteractive[]> {
  return page.evaluate(`
    (() => {
      const scope = document.querySelector(${JSON.stringify(scopeSelector)}) || document.body;
      const els = scope.querySelectorAll('button, input, select, textarea, a[href], [role="button"], [role="link"], [role="tab"], [role="menuitem"], [onclick]');
      const results = [];

      const genSelector = (el) => {
        if (el.id && document.querySelectorAll('#' + CSS.escape(el.id)).length === 1) {
          return '#' + CSS.escape(el.id);
        }
        const name = el.getAttribute('name');
        if (name) {
          const s = el.tagName.toLowerCase() + '[name="' + name + '"]';
          if (document.querySelectorAll(s).length === 1) return s;
        }
        const testId = el.getAttribute('data-testid');
        if (testId) {
          const s = '[data-testid="' + testId + '"]';
          if (document.querySelectorAll(s).length === 1) return s;
        }
        const parts = [];
        let cur = el;
        while (cur && cur !== document.body && cur !== document.documentElement) {
          let part = cur.tagName.toLowerCase();
          if (cur.id && document.querySelectorAll('#' + CSS.escape(cur.id)).length === 1) {
            parts.unshift('#' + CSS.escape(cur.id));
            break;
          }
          const p = cur.parentElement;
          if (p) {
            const sibs = Array.from(p.children).filter(c => c.tagName === cur.tagName);
            if (sibs.length > 1) part += ':nth-of-type(' + (sibs.indexOf(cur) + 1) + ')';
          }
          parts.unshift(part);
          cur = p;
        }
        return parts.join(' > ');
      };

      const getLabel = (el) => {
        const ariaLabel = el.getAttribute('aria-label');
        if (ariaLabel) return ariaLabel.trim();
        const id = el.id;
        if (id) {
          const label = document.querySelector('label[for="' + CSS.escape(id) + '"]');
          if (label) return (label.textContent || '').trim();
        }
        const parentLabel = el.closest('label');
        if (parentLabel) return (parentLabel.textContent || '').trim().slice(0, 100);
        const inner = (el.textContent || '').trim();
        if (inner && inner.length < 100) return inner;
        return undefined;
      };

      for (const el of els) {
        if (results.length >= ${maxCount}) break;
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') continue;

        const tag = el.tagName.toLowerCase();
        const item = {
          tag,
          selector: genSelector(el),
          disabled: (el.disabled || false) || el.getAttribute('aria-disabled') === 'true',
        };

        if (tag === 'input') item.type = el.type || 'text';
        const role = el.getAttribute('role');
        if (role) item.role = role;
        const label = getLabel(el);
        if (label) item.text = label.slice(0, 100);
        const name = el.getAttribute('name');
        if (name) item.name = name;
        const placeholder = el.getAttribute('placeholder');
        if (placeholder) item.placeholder = placeholder;

        if (tag === 'input' || tag === 'textarea') {
          const val = el.value;
          if (val) item.value = val.slice(0, 200);
        }
        if (tag === 'select') {
          item.options = Array.from(el.options).map(o => o.text.trim()).slice(0, 30);
          item.value = el.value;
        }
        results.push(item);
      }
      return results;
    })()
  `);
}

async function extractForms(page: Page, scopeSelector: string): Promise<ExtractForm[]> {
  return page.evaluate(`
    (() => {
      const scope = document.querySelector(${JSON.stringify(scopeSelector)}) || document.body;
      const forms = scope.querySelectorAll('form');
      const results = [];

      const genSelector = (el) => {
        if (el.id) return '#' + CSS.escape(el.id);
        const parts = [];
        let cur = el;
        while (cur && cur !== document.body) {
          let part = cur.tagName.toLowerCase();
          const p = cur.parentElement;
          if (p) {
            const sibs = Array.from(p.children).filter(c => c.tagName === cur.tagName);
            if (sibs.length > 1) part += ':nth-of-type(' + (sibs.indexOf(cur) + 1) + ')';
          }
          parts.unshift(part);
          cur = p;
        }
        return parts.join(' > ');
      };

      for (const form of forms) {
        const fields = [];
        const inputs = form.querySelectorAll('input, select, textarea');
        for (const inp of inputs) {
          const tag = inp.tagName.toLowerCase();
          const field = {
            tag,
            selector: genSelector(inp),
            required: inp.required || inp.getAttribute('aria-required') === 'true',
          };
          if (tag === 'input') field.type = inp.type || 'text';
          const name = inp.getAttribute('name');
          if (name) field.name = name;
          const placeholder = inp.getAttribute('placeholder');
          if (placeholder) field.placeholder = placeholder;
          const id = inp.id;
          if (id) {
            const label = document.querySelector('label[for="' + CSS.escape(id) + '"]');
            if (label) field.label = (label.textContent || '').trim().slice(0, 100);
          }
          if (!field.label) {
            const parentLabel = inp.closest('label');
            if (parentLabel) field.label = (parentLabel.textContent || '').trim().slice(0, 100);
          }
          fields.push(field);
        }
        results.push({
          action: form.action || null,
          method: (form.method || 'get').toUpperCase(),
          selector: genSelector(form),
          fields,
        });
      }
      return results;
    })()
  `);
}

async function extractTables(page: Page, scopeSelector: string): Promise<ExtractTable[]> {
  return page.evaluate(`
    (() => {
      const scope = document.querySelector(${JSON.stringify(scopeSelector)}) || document.body;
      const tables = scope.querySelectorAll('table');
      const maxRows = ${config.defaults.tableRowsMax};
      const results = [];

      const genSelector = (el) => {
        if (el.id) return '#' + CSS.escape(el.id);
        const parent = el.parentElement;
        if (parent) {
          const siblings = Array.from(parent.children).filter(c => c.tagName === 'TABLE');
          if (siblings.length === 1) return parent.id ? '#' + CSS.escape(parent.id) + ' > table' : 'table';
          return 'table:nth-of-type(' + (siblings.indexOf(el) + 1) + ')';
        }
        return 'table';
      };

      for (const table of tables) {
        const headers = [];
        const headerRow = table.querySelector('thead tr') || table.querySelector('tr:first-child');
        if (headerRow) {
          const cells = headerRow.querySelectorAll('th, td');
          for (const cell of cells) {
            headers.push((cell.textContent || '').trim());
          }
        }
        const allRows = table.querySelectorAll('tbody tr, tr');
        const rows = [];
        let totalRows = 0;
        for (const row of allRows) {
          if (row === headerRow) continue;
          totalRows++;
          if (rows.length < maxRows) {
            const cells = row.querySelectorAll('td, th');
            rows.push(Array.from(cells).map(c => (c.textContent || '').trim().slice(0, 200)));
          }
        }
        if (headers.length > 0 || rows.length > 0) {
          results.push({ selector: genSelector(table), headers, rows, totalRows });
        }
      }
      return results;
    })()
  `);
}
