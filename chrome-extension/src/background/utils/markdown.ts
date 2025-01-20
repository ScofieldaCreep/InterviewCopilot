import hljs from 'highlight.js';
import { marked } from 'marked';

/**
 * 解析Markdown文本为HTML
 * @param answer Markdown格式的文本
 * @returns 解析后的HTML字符串
 */
export function parseMarkdown(answer: string) {
  const renderer = new marked.Renderer();
  console.log(answer);
  renderer.code = ({ text, lang = 'plaintext' }: { text: string; lang?: string }) => {
    const language = hljs.getLanguage(lang) ? lang : 'plaintext';
    const highlighted = hljs.highlight(text, { language }).value;
    return `<pre><code class="hljs ${language}">${highlighted}</code></pre>`;
  };

  marked.setOptions({
    renderer,
    gfm: true,
    breaks: true,
  });

  return marked.parse(answer) as string;
}

/**
 * 生成结果展示用的HTML
 * @param parsedContent 解析后的HTML内容
 * @returns 完整的HTML页面字符串
 */
export function generateResultHTML(parsedContent: string): string {
  return `
  <!DOCTYPE html>
  <html>
	<head>
	  <meta charset="UTF-8">
	  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
	  <title>AlgoAce Solution</title>
	  <link rel="stylesheet" href="${chrome.runtime.getURL('vendor/highlight.min.css')}">
	  <style>
		body {
		  margin: 0;
		  padding: 0;
		  background: #1a1b1e;
		  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
		  color: #e6e6e6;
		}
		.container {
		  max-width: 860px;
		  margin: 0 auto;
		  padding: 40px 30px;
		  background: #1f2024;
		  min-height: 100vh;
		  box-shadow: 0 0 20px rgba(0, 0, 0, 0.2);
		}
		.markdown-body {
		  font-size: 16px;
		  line-height: 1.8;
		  color: #e6e6e6;
		}
		.markdown-body h1,
		.markdown-body h2,
		.markdown-body h3,
		.markdown-body h4,
		.markdown-body h5,
		.markdown-body h6 {
		  margin-top: 32px;
		  margin-bottom: 16px;
		  font-weight: 600;
		  line-height: 1.25;
		  color: #ffffff;
		}
		.markdown-body h1 {
		  font-size: 2em;
		  padding-bottom: 0.3em;
		  border-bottom: 1px solid #2f3137;
		}
		.markdown-body h2 {
		  font-size: 1.5em;
		  padding-bottom: 0.3em;
		  border-bottom: 1px solid #2f3137;
		}
		.markdown-body h3 { font-size: 1.25em; }
		.markdown-body h4 { font-size: 1em; }
		.markdown-body pre {
		  margin: 16px 0;
		  padding: 16px;
		  overflow: auto;
		  background-color: #282c34;
		  border-radius: 6px;
		  border: 1px solid #3e4451;
		}
		.markdown-body pre code {
		  padding: 0;
		  margin: 0;
		  font-size: 14px;
		  font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
		  line-height: 1.5;
		  color: #abb2bf;
		  background: transparent;
		}
		.markdown-body code {
		  padding: 0.2em 0.4em;
		  margin: 0;
		  font-size: 85%;
		  background-color: #282c34;
		  border-radius: 3px;
		  font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
		  color: #e06c75;
		}
		.markdown-body ul,
		.markdown-body ol {
		  padding-left: 2em;
		  margin-top: 0;
		  margin-bottom: 16px;
		  color: #e6e6e6;
		}
		.markdown-body li {
		  margin: 0.25em 0;
		}
		.markdown-body blockquote {
		  padding: 0 1em;
		  margin: 16px 0;
		  color: #b4b4b4;
		  border-left: 0.25em solid #3e4451;
		  background: #282c34;
		}
		.markdown-body table {
		  display: block;
		  width: 100%;
		  overflow: auto;
		  margin: 16px 0;
		  border-spacing: 0;
		  border-collapse: collapse;
		}
		.markdown-body table th,
		.markdown-body table td {
		  padding: 6px 13px;
		  border: 1px solid #3e4451;
		}
		.markdown-body table tr {
		  background-color: #1f2024;
		  border-top: 1px solid #3e4451;
		}
		.markdown-body table tr:nth-child(2n) {
		  background-color: #282c34;
		}
		.markdown-body hr {
		  height: 0.25em;
		  padding: 0;
		  margin: 24px 0;
		  background-color: #3e4451;
		  border: 0;
		}
		.markdown-body a {
		  color: #61afef;
		  text-decoration: none;
		}
		.markdown-body a:hover {
		  text-decoration: underline;
		  color: #528bbc;
		}
		.markdown-body p {
		  margin-top: 0;
		  margin-bottom: 16px;
		  color: #e6e6e6;
		}
		.markdown-body strong {
		  color: #ffffff;
		}
		.markdown-body em {
		  color: #e6e6e6;
		}
		.hljs {
		  background: #282c34;
		  color: #abb2bf;
		}
		.hljs-keyword { color: #c678dd; }
		.hljs-string { color: #98c379; }
		.hljs-number { color: #d19a66; }
		.hljs-function { color: #61afef; }
		.hljs-comment { color: #5c6370; font-style: italic; }
		.hljs-title { color: #61afef; }
		.hljs-params { color: #e06c75; }
	  </style>
	  </head>
	  <body>
		<div class="container">
		  <article class="markdown-body" id="content">${parsedContent}</article>
		</div>
	  </body>
  </html>
  `.trim();
}
