import { Fragment, type ReactNode } from 'react';

/** 依存を増やさない軽量 Markdown レンダラ（見出し/箇条書き/リンク/強調/区切り線対応） */
export function Markdown({ text }: { text: string }) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let list: ReactNode[] = [];
  let key = 0;

  const flush = () => {
    if (list.length) {
      blocks.push(
        <ul key={`ul${key++}`} className="my-2 space-y-1.5 pl-1">
          {list}
        </ul>,
      );
      list = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^#{1,6}\s/.test(line)) {
      flush();
      const level = line.match(/^#+/)![0].length;
      const content = line.replace(/^#+\s/, '');
      const cls =
        level === 1
          ? 'text-xl font-extrabold text-ink mt-5 mb-2'
          : level === 2
            ? 'text-[15px] font-bold text-ink mt-5 mb-2 pb-1.5 border-b border-line-soft flex items-center gap-2'
            : 'text-sm font-bold text-ink-soft mt-3 mb-1';
      blocks.push(
        <div key={key++} className={cls}>
          {inline(content)}
        </div>,
      );
    } else if (/^[-*]\s/.test(line)) {
      const content = line.replace(/^[-*]\s/, '');
      const indented = /^\s{2,}/.test(raw);
      list.push(
        <li key={key++} className={`text-sm leading-relaxed flex gap-2 ${indented ? 'pl-5 text-ink-muted' : 'text-ink-soft'}`}>
          <span className="text-accent mt-1.5 shrink-0 w-1 h-1 rounded-full bg-accent" />
          <span>{inline(content)}</span>
        </li>,
      );
    } else if (/^(---|___|\*\*\*)\s*$/.test(line)) {
      flush();
      blocks.push(<hr key={key++} className="my-4 border-line-soft" />);
    } else if (line.trim() === '') {
      flush();
    } else {
      flush();
      blocks.push(
        <p key={key++} className="text-sm leading-relaxed text-ink-soft my-1.5">
          {inline(line)}
        </p>,
      );
    }
  }
  flush();
  return <div className="markdown">{blocks}</div>;
}

/** インライン: **bold**, [text](url) */
function inline(text: string): ReactNode {
  const parts: ReactNode[] = [];
  let rest = text;
  let k = 0;
  const re = /(\*\*(.+?)\*\*)|(\[([^\]]+)\]\((https?:\/\/[^)]+)\))/;
  while (rest.length) {
    const m = rest.match(re);
    if (!m) {
      parts.push(<Fragment key={k++}>{rest}</Fragment>);
      break;
    }
    const idx = m.index ?? 0;
    if (idx > 0) parts.push(<Fragment key={k++}>{rest.slice(0, idx)}</Fragment>);
    if (m[1]) {
      parts.push(<b key={k++} className="font-semibold text-ink">{m[2]}</b>);
    } else if (m[3]) {
      parts.push(
        <a key={k++} href={m[5]} target="_blank" rel="noreferrer" className="text-accent font-medium hover:underline break-all">
          {m[4]}
        </a>,
      );
    }
    rest = rest.slice(idx + m[0].length);
  }
  return parts;
}
