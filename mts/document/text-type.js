;(function () {
  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function withJitter(base, jitterRatio) {
    if (!jitterRatio || jitterRatio <= 0) return base;
    const spread = base * jitterRatio;
    const value = base + (Math.random() * 2 - 1) * spread;
    return Math.max(5, value);
  }

  function createTypewriter() {
    const root = document.createElement('div');
    root.className = 'typewriter';

    const content = document.createElement('span');
    content.className = 'typewriter__content';
    const cursor = document.createElement('span');
    cursor.className = 'typewriter__cursor';
    cursor.textContent = '|';

    root.appendChild(content);
    root.appendChild(cursor);
    return { root, content, cursor };
  }

  function parseSlides(raw) {
    const text = (raw || '').replace(/\r\n?/g, '\n');
    const lines = text.split('\n');
    const slides = [];
    let current = { title: '', bodyLines: [] };
    let hasContent = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      const isSlideHeader = /^СЛАЙД/i.test(trimmed);

      if (isSlideHeader) {
        // Записываем предыдущий слайд (если был какой-то контент)
        if (hasContent || current.title) {
          slides.push({
            title: current.title,
            body: current.bodyLines.join('\n'),
          });
        }
        current = { title: trimmed, bodyLines: [] };
        hasContent = false;
      } else {
        current.bodyLines.push(line);
        if (trimmed.length > 0) hasContent = true;
      }
    }

    // Финализируем последний
    if (hasContent || current.title) {
      slides.push({
        title: current.title,
        body: current.bodyLines.join('\n'),
      });
    }

    // Если слайдов не нашли, возвращаем один слайд со всем текстом
    if (slides.length === 0 && text.trim().length > 0) {
      return [{ title: '', body: text }];
    }
    return slides;
  }

  function parseTokens(input) {
    const str = String(input ?? '');
    const tokens = [];
    let i = 0;

    const tryMatch = (needle, from) => str.indexOf(needle, from);

    while (i < str.length) {
      const idxDel = tryMatch('<delete>', i);
      const idxPause = tryMatch('<pause', i);
      const idxBOpen = tryMatch('<b>', i);
      const idxBClose = tryMatch('</b>', i);
      const idxIOpen = tryMatch('<i>', i);
      const idxIClose = tryMatch('</i>', i);
      const idxGrayOpen = tryMatch('<gray>', i);
      const idxGrayClose = tryMatch('</gray>', i);

      let next = -1;
      let kind = null;

      const candidates = [
        { idx: idxDel, kind: 'delete' },
        { idx: idxPause, kind: 'pause' },
        { idx: idxBOpen, kind: 'b_open' },
        { idx: idxBClose, kind: 'b_close' },
        { idx: idxIOpen, kind: 'i_open' },
        { idx: idxIClose, kind: 'i_close' },
        { idx: idxGrayOpen, kind: 'gray_open' },
        { idx: idxGrayClose, kind: 'gray_close' },
      ].filter(c => c.idx !== -1);

      if (candidates.length > 0) {
        candidates.sort((a, b) => a.idx - b.idx);
        next = candidates[0].idx;
        kind = candidates[0].kind;
      }

      if (next === -1) {
        if (i < str.length) {
          tokens.push({ type: 'text', text: str.slice(i) });
        }
        break;
      }

      if (next > i) {
        tokens.push({ type: 'text', text: str.slice(i, next) });
      }

      if (kind === 'delete') {
        const openLen = '<delete>'.length;
        const closeTag = '</delete>';
        const closeIdx = str.indexOf(closeTag, next + openLen);
        if (closeIdx === -1) {
          tokens.push({ type: 'text', text: str.slice(next, next + openLen) });
          i = next + openLen;
          continue;
        }
        const inner = str.slice(next + openLen, closeIdx);
        tokens.push({ type: 'delete', tokens: parseTokens(inner) });
        i = closeIdx + closeTag.length;
      } else if (kind === 'pause') {
        const tail = str.slice(next);
        // Гибкий парсер: пробелы вокруг "=", одинарные/двойные кавычки, пробел перед "/>", допускаем доп. атрибуты
        const m = tail.match(/^<pause\b[^>]*\bduration\s*=\s*["']?(\d+)["']?[^>]*\/?>/i);
        if (m) {
          tokens.push({ type: 'pause', ms: parseInt(m[1], 10) || 0 });
          i = next + m[0].length;
        } else {
          tokens.push({ type: 'text', text: str[next] });
          i = next + 1;
        }
      } else if (kind === 'b_open') {
        tokens.push({ type: 'start', tag: 'b' });
        i = next + '<b>'.length;
      } else if (kind === 'b_close') {
        tokens.push({ type: 'end', tag: 'b' });
        i = next + '</b>'.length;
      } else if (kind === 'i_open') {
        tokens.push({ type: 'start', tag: 'i' });
        i = next + '<i>'.length;
      } else if (kind === 'i_close') {
        tokens.push({ type: 'end', tag: 'i' });
        i = next + '</i>'.length;
      } else if (kind === 'gray_open') {
        tokens.push({ type: 'start', tag: 'gray' });
        i = next + '<gray>'.length;
      } else if (kind === 'gray_close') {
        tokens.push({ type: 'end', tag: 'gray' });
        i = next + '</gray>'.length;
      }
    }

    return tokens;
  }

  function normalizeTokens(tokens) {
    const out = [];
    let suppressLeadingNewlineAfterDelete = false;

    for (let idx = 0; idx < tokens.length; idx++) {
      const t = tokens[idx];
      if (t.type === 'delete') {
        out.push(t);
        suppressLeadingNewlineAfterDelete = true;
        continue;
      }
      if (t.type === 'pause') {
        out.push(t);
        // сохраняем флаг — если сразу после delete идут паузы, мы всё ещё хотим убрать перевод строки
        continue;
      }
      if (t.type === 'start' || t.type === 'end') {
        // не сбрасываем флаг, чтобы убрать перенос на первом текстовом токене
        out.push(t);
        continue;
      }
      if (t.type === 'text') {
        if (suppressLeadingNewlineAfterDelete) {
          let txt = t.text ?? '';
          // Убираем ведущие переводы строк сразу после delete(+pause*)
          txt = txt.replace(/^\r?\n+/, '');
          if (txt.length > 0) {
            out.push({ type: 'text', text: txt });
          }
          suppressLeadingNewlineAfterDelete = false;
        } else {
          out.push(t);
        }
        continue;
      }
      out.push(t);
    }
    return out;
  }

  async function typeTokens(
    contentEl,
    tokens,
    opts
  ) {
    const options = Object.assign(
      {
        typingSpeed: 55,
        deletingSpeed: 28,
        randomJitter: 0.3,
        afterDeletePause: 160,
      },
      opts || {}
    );
    const containerStack = [contentEl];
    const typedUnits = []; // массив TextNode (по одному символу)

    function currentContainer() {
      return containerStack[containerStack.length - 1];
    }

    async function typeText(text) {
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        const node = document.createTextNode(ch);
        currentContainer().appendChild(node);
        typedUnits.push(node);
        await sleep(withJitter(options.typingSpeed, options.randomJitter));
      }
    }

    async function deleteOneChar() {
      const node = typedUnits.pop();
      if (!node) return;
      const parent = node.parentNode;
      if (parent) {
        parent.removeChild(node);
        // Удаляем пустые <b>/<i>, двигаясь вверх
        let p = parent;
        while (p && p !== contentEl && p.childNodes.length === 0) {
          const up = p.parentNode;
          if (up) up.removeChild(p);
          p = up;
        }
      }
      await sleep(withJitter(options.deletingSpeed, options.randomJitter * 0.6));
    }

    async function run(seq) {
      for (let t = 0; t < seq.length; t++) {
        const token = seq[t];
        if (token.type === 'text') {
          await typeText(token.text);
        } else if (token.type === 'pause') {
          const ms = Math.max(0, Number(token.ms) || 0);
          await sleep(ms);
        } else if (token.type === 'start') {
          if (token.tag === 'b' || token.tag === 'i') {
            const el = document.createElement(token.tag);
            currentContainer().appendChild(el);
            containerStack.push(el);
          } else if (token.tag === 'gray') {
            const el = document.createElement('span');
            el.style.color = '#595959';
            el.setAttribute('data-tt-tag', 'gray');
            currentContainer().appendChild(el);
            containerStack.push(el);
          }
        } else if (token.type === 'end') {
          if ((token.tag === 'b' || token.tag === 'i' || token.tag === 'gray') && containerStack.length > 1) {
            // Поддержка перекрёстного закрытия: ищем ближайший подходящий контейнер
            let matchIdx = -1;
            for (let si = containerStack.length - 1; si >= 1; si--) {
              const el = containerStack[si];
              const tagName = (el.tagName || '').toLowerCase();
              const virtualTag = el.getAttribute ? el.getAttribute('data-tt-tag') : null;
              if (tagName === token.tag || virtualTag === token.tag) {
                matchIdx = si;
                break;
              }
            }
            if (matchIdx !== -1) {
              while (containerStack.length - 1 >= matchIdx) {
                const top = containerStack.pop();
                if (top && top.childNodes && top.childNodes.length === 0 && top.parentNode) {
                  top.parentNode.removeChild(top);
                }
              }
            }
          }
        } else if (token.type === 'delete') {
          const before = typedUnits.length;
          await run(token.tokens || []);
          await sleep(options.afterDeletePause);
          const added = typedUnits.length - before;
          for (let k = 0; k < added; k++) {
            await deleteOneChar();
          }
        }
      }
    }

    const seq = normalizeTokens(tokens);
    await run(seq);

    return true;
  }

  // Экспорт в глобальную область
  window.TextTyper = {
    createTypewriter,
    parseSlides,
    parseTokens,
    typeTokens,
  };
})(); 


