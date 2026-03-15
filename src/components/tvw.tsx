"use client";

import RMd from 'react-markdown';
import rRw from 'rehype-raw';
import rSn, { defaultSchema as dSch } from 'rehype-sanitize';
import rGf from 'remark-gfm';

const sSch = {
    ...dSch,
    tagNames: [...(dSch.tagNames || []), 'mark', 'span'],
    attributes: {
        ...dSch.attributes,
        span: [...(dSch.attributes?.span || []), 'style', 'className', 'class', 'data-spoiler'],
        div: [...(dSch.attributes?.div || []), 'style', 'align'],
        mark: ['style', 'class', 'className'],
    },
};

const pSty = (s?: string) => {
    if (!s || typeof s !== 'string') return undefined;
    const o: any = {};
    s.split(';').forEach((x: string) => {
        const [k, ...vP] = x.split(':');
        const v = vP.join(':');
        if (k && v) {
            const cK = k.trim().replace(/-([a-z])/g, g => g[1].toUpperCase());
            o[cK] = v.trim();
        }
    });
    return Object.keys(o).length > 0 ? o : undefined;
};

const cMp = {
    img: ({ node, ...p }: any) => <img {...p} loading="lazy" style={{ maxWidth: '100%', borderRadius: 'var(--radius-md, 8px)', margin: '1rem 0' }} alt={p.alt || "img"} />,
    a: ({ node, children: c, ...p }: any) => <a {...p} target="_blank" rel="noopener noreferrer">{c}</a>,
    pre: ({ node, children: c, ...p }: any) => <pre {...p} className="md-pre">{c}</pre>,
    code: ({ node, inline: i, className: cl, children: c, ...p }: any) => i ? <code className="md-inline-code" {...p}>{c}</code> : <code className={cl} {...p}>{c}</code>,
    table: ({ node, children: c, ...p }: any) => <div style={{ overflowX: 'auto', margin: '1rem 0' }}><table className="md-table" {...p}>{c}</table></div>,
    div: ({ node, align: a, className: cl, children: c, ...p }: any) => {
        const aV = a || node?.properties?.align;
        return <div className={cl} style={aV ? { textAlign: aV } : undefined} {...p}>{c}</div>;
    },
    span: ({ node, className: cl, children: c, ...p }: any) => {
        const st = pSty(node?.properties?.style);
        const iS = node?.properties && 'data-spoiler' in node.properties;
        return <span className={cl || (iS ? 'spoiler-mark' : undefined)} style={st} data-spoiler={iS ? "" : undefined} {...p}>{c}</span>;
    },
    mark: ({ node, className: cl, children: c, ...p }: any) => {
        const st = pSty(node?.properties?.style);
        return <mark className={cl} style={st} {...p}>{c}</mark>;
    }
};

export function TVw({ c }: { c: string }) {
    return (
        <div className="prose">
            <RMd remarkPlugins={[rGf]} rehypePlugins={[rRw, [rSn, sSch]]} components={cMp} urlTransform={(u) => u}>
                {c}
            </RMd>
        </div>
    );
}
