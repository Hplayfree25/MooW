import { Markdown } from 'tiptap-markdown';
import { Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import ImageResize from 'tiptap-extension-resize-image';

const editor = new Editor({
    extensions: [
        StarterKit,
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
        ImageResize,
        Markdown.configure({ html: true }),
    ],
    content: '<h2 style="text-align: center">Hello</h2><p style="text-align: center">Hello</p><img src="test.jpg" width="200" height="200" />'
});

console.log((editor.storage as any).markdown.getMarkdown());
