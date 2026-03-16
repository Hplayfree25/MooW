"use client";

import RMd from 'react-markdown';
import rRw from 'rehype-raw';
import rSn, { defaultSchema as dSch } from 'rehype-sanitize';
import rGf from 'remark-gfm';

const sSch = {
    ...dSch,
    tagNames: [...(dSch.tagNames || []), 'mark', 'span', 'div', 'style'],
    attributes: {
        ...dSch.attributes,
        span: [...(dSch.attributes?.span || []), 'style', 'className', 'class', 'data-spoiler'],
        div: [...(dSch.attributes?.div || []), 'style', 'align', 'class', 'className'],
        mark: ['style', 'class', 'className'],
        p: [...(dSch.attributes?.p || []), 'style', 'align'],
        h1: [...(dSch.attributes?.h1 || []), 'style', 'align'],
        h2: [...(dSch.attributes?.h2 || []), 'style', 'align'],
        h3: [...(dSch.attributes?.h3 || []), 'style', 'align'],
        img: [...(dSch.attributes?.img || []), 'style', 'width', 'height', 'align', 'class', 'className', 'containerstyle', 'wrapperstyle'],
        '*': [...(dSch.attributes?.['*'] || []), 'style', 'align', 'className', 'class']
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
    img: ({ node, align: a, containerstyle: cSty, wrapperstyle: wSty, ...p }: any) => {
        const aV = a || node?.properties?.align;
        const st = pSty(node?.properties?.style) || {};
        const cStyle = pSty(cSty || node?.properties?.containerstyle) || {};
        const wStyle = pSty(wSty || node?.properties?.wrapperstyle) || {};
        
        const baseSt: any = { maxWidth: '100%', borderRadius: 'var(--radius-md, 8px)' };
        
        if (aV === 'center') {
            baseSt.display = 'block';
            baseSt.margin = '1rem auto';
        } else if (aV === 'left') {
            baseSt.display = 'block';
            baseSt.margin = '1rem auto 1rem 0';
        } else if (aV === 'right') {
            baseSt.display = 'block';
            baseSt.margin = '1rem 0 1rem auto';
        }

        const mergedSt = { ...baseSt, ...cStyle, ...wStyle, ...st };
        delete p.style;
        delete p.align;
        delete p.containerstyle;
        delete p.wrapperstyle;
        return <img {...p} loading="lazy" style={Object.keys(mergedSt).length > 0 ? mergedSt : undefined} alt={p.alt || "img"} />;
    },
    p: ({ node, align: a, className: cl, children: c, ...p }: any) => {
        const aV = a || node?.properties?.align;
        const st = pSty(node?.properties?.style) || {};
        if (aV) st.textAlign = aV;
        delete p.style;
        delete p.align;
        return <p className={cl} style={Object.keys(st).length > 0 ? st : undefined} {...p}>{c}</p>;
    },
    a: ({ node, children: c, ...p }: any) => <a {...p} target="_blank" rel="noopener noreferrer">{c}</a>,
    pre: ({ node, children: c, ...p }: any) => <pre {...p} className="md-pre">{c}</pre>,
    code: ({ node, inline: i, className: cl, children: c, ...p }: any) => i ? <code className="md-inline-code" {...p}>{c}</code> : <code className={cl} {...p}>{c}</code>,
    table: ({ node, children: c, ...p }: any) => <div style={{ overflowX: 'auto', margin: '1rem 0' }}><table className="md-table" {...p}>{c}</table></div>,
    div: ({ node, align: a, className: cl, children: c, ...p }: any) => {
        const aV = a || node?.properties?.align;
        const st = pSty(node?.properties?.style) || {};
        if (aV) st.textAlign = aV;
        delete p.style;
        delete p.align;
        return <div className={cl} style={Object.keys(st).length > 0 ? st : undefined} {...p}>{c}</div>;
    },
    span: ({ node, className: cl, children: c, ...p }: any) => {
        const st = pSty(node?.properties?.style);
        const iS = node?.properties && 'data-spoiler' in node.properties;
        delete p.style;
        return <span className={cl || (iS ? 'spoiler-mark' : undefined)} style={st} data-spoiler={iS ? "" : undefined} {...p}>{c}</span>;
    },
    mark: ({ node, className: cl, children: c, ...p }: any) => {
        const st = pSty(node?.properties?.style);
        delete p.style;
        return <mark className={cl} style={st} {...p}>{c}</mark>;
    },
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
