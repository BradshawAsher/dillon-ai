import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

import ChatMessageBubble, { type Message } from './ChatMessageBubble'

const baseMsg = (content: string): Message => ({
    id: 'm1',
    role: 'assistant',
    content,
    timestamp: Date.now(),
})

describe('ChatMessageBubble markdown rendering', () => {
    it('escapes raw HTML in assistant content so it cannot execute', () => {
        const html = renderToStaticMarkup(
            <ChatMessageBubble msg={baseMsg('hello <img src=x onerror="alert(1)"> world')} />,
        )
        expect(html).not.toContain('<img')
        expect(html).toContain('&lt;img')
    })

    it('escapes HTML inside heading and list lines too', () => {
        const html = renderToStaticMarkup(
            <ChatMessageBubble msg={baseMsg('# <script>alert(1)</script>\n- <b>x</b>')} />,
        )
        expect(html).not.toContain('<script>')
        expect(html).not.toContain('<b>x</b>')
        expect(html).toContain('&lt;script&gt;')
    })

    it('still renders our own markdown tags for bold/italic/code', () => {
        const html = renderToStaticMarkup(
            <ChatMessageBubble msg={baseMsg('**bold** and `code`')} />,
        )
        expect(html).toContain('<strong>bold</strong>')
        expect(html).toContain('<code')
    })
})
