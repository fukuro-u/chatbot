import React from 'react';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import html from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';
import python from 'highlight.js/lib/languages/python';
import php from 'highlight.js/lib/languages/php';
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('css', css);
hljs.registerLanguage('html', html);
hljs.registerLanguage('python', python);
hljs.registerLanguage('php', php);
// import 'highlight.js/styles/default.css';
// import 'highlight.js/styles/atom-one-dark.css';
// import 'highlight.js/styles/monokai.css';
import 'highlight.js/styles/github-dark.css';

const escapeHtml = (html) => {
  return html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};


const highlightCode = (code) => {
  // const escapedCode = escapeHtml(code);
  // return hljs.highlight('html', code).value;
  return hljs.highlightAuto(code).value;
};

const parseContent = (content) => {
  const parts = content.split(/```([\s\S]*?)```/g);
  if( parts.length > 1 )
    return parts.map((part, index) => {
      if (index % 2 === 0) {
        
        return <span key={index} className="twc-container" >{part}</span>;
      } else {
        
        const highlightedCode = highlightCode(part);
        return (
          
            <code key={index} dangerouslySetInnerHTML={{ __html: highlightedCode }} className="hljs-ds code-container">
            </code>
          
        );
      }
    });
  return <span className='twc-container'>{parts[0]}</span>;
};

// Component React
const CodeHighlighter = ({ content }) => {
  return (
    <div>
      {parseContent(content)}
    </div>
  );
};

export default CodeHighlighter;
