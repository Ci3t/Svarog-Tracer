// Modal component for displaying guides (JSX or markdown)
import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function GuideModal({ isOpen, onClose, guideComponent, guideContent, guideTitle, guideIcon }) {
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [tableOfContents, setTableOfContents] = useState([]);

  // Generate table of contents from markdown headers (only if markdown mode)
  useEffect(() => {
    if (!guideContent || guideComponent) return;

    const headings = [];
    const lines = guideContent.split('\n');
    
    lines.forEach((line, index) => {
      const match = line.match(/^(#{1,3})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2];
        const id = text.toLowerCase().replace(/[^\w]+/g, '-');
        headings.push({ level, text, id, lineNumber: index });
      }
    });

    setTableOfContents(headings);
  }, [guideContent, guideComponent]);

  // Scroll to section
  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const GuideComponent = guideComponent;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      {/* Modal Container */}
      <div className={`relative bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden ${showFullscreen ? 'w-full h-full' : 'w-full max-w-6xl h-[90vh]'} transition-all duration-300`}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{guideIcon}</span>
            <h2 className="text-xl font-bold text-white">{guideTitle}</h2>
          </div>
          <div className="flex items-center gap-2">
            {/* Fullscreen toggle */}
            <button
              onClick={() => setShowFullscreen(!showFullscreen)}
              className="p-3 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title={showFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {showFullscreen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                )}
              </svg>
            </button>
            {/* Close button */}
            <button
              onClick={onClose}
              className="p-3 rounded-xl bg-slate-800/50 hover:bg-red-600/30 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="h-[calc(100%-4rem)] overflow-y-auto">
          {/* JSX Component Mode */}
          {GuideComponent && (
            <div className="p-6 lg:p-8">
              <GuideComponent />
            </div>
          )}

          {/* Markdown Mode (fallback) */}
          {!GuideComponent && guideContent && (
            <div className="flex h-full">
              {/* Table of Contents (Desktop only) */}
              <div className="hidden lg:block w-64 border-r border-slate-700/50 bg-slate-900/30 overflow-y-auto flex-shrink-0">
                <div className="p-4 sticky top-0 bg-slate-900/50 backdrop-blur-sm border-b border-slate-700/30">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Table of Contents
                  </h3>
                </div>
                <nav className="p-2">
                  {tableOfContents.map((heading, index) => (
                    <button
                      key={index}
                      onClick={() => scrollToSection(heading.id)}
                      className={`block w-full text-left px-3 py-1.5 rounded text-xs hover:bg-slate-800/50 transition-colors ${
                        heading.level === 1 ? 'font-bold text-purple-400 mt-2' :
                        heading.level === 2 ? 'text-slate-300 ml-3' :
                        'text-slate-400 ml-6'
                      }`}
                    >
                      {heading.text}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Markdown Content */}
              <div className="flex-1 overflow-y-auto p-6 lg:p-8">
                <article className="prose prose-invert prose-slate max-w-none
                  prose-headings:text-white prose-headings:font-bold
                  prose-h1:text-3xl prose-h1:mb-4 prose-h1:text-purple-400 prose-h1:border-b prose-h1:border-slate-700 prose-h1:pb-3
                  prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-3 prose-h2:text-violet-300
                  prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-2 prose-h3:text-slate-200
                  prose-p:text-slate-300 prose-p:leading-relaxed
                  prose-a:text-purple-400 prose-a:no-underline hover:prose-a:text-purple-300
                  prose-strong:text-white prose-strong:font-bold
                  prose-code:text-emerald-400 prose-code:bg-slate-800/50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
                  prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-700/50 prose-pre:shadow-xl
                  prose-ul:text-slate-300 prose-ol:text-slate-300
                  prose-li:my-1
                  prose-blockquote:border-l-purple-500 prose-blockquote:bg-slate-800/30 prose-blockquote:text-slate-300
                  prose-table:text-sm
                  prose-th:bg-slate-800/50 prose-th:text-purple-400 prose-th:font-bold
                  prose-td:border-slate-700/50
                  prose-hr:border-slate-700/50
                ">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      // Add IDs to headings for TOC linking
                      h1: ({ node, children, ...props }) => {
                        const text = children?.toString() || '';
                        const id = text.toLowerCase().replace(/[^\w]+/g, '-');
                        return <h1 id={id} {...props}>{children}</h1>;
                      },
                      h2: ({ node, children, ...props }) => {
                        const text = children?.toString() || '';
                        const id = text.toLowerCase().replace(/[^\w]+/g, '-');
                        return <h2 id={id} {...props}>{children}</h2>;
                      },
                      h3: ({ node, children, ...props }) => {
                        const text = children?.toString() || '';
                        const id = text.toLowerCase().replace(/[^\w]+/g, '-');
                        return <h3 id={id} {...props}>{children}</h3>;
                      },
                      // Style code blocks
                      code: ({ node, inline, className, children, ...props }) => {
                        return inline ? (
                          <code className={className} {...props}>
                            {children}
                          </code>
                        ) : (
                          <code className={`${className} block`} {...props}>
                            {children}
                          </code>
                        );
                      },
                    }}
                  >
                    {guideContent}
                  </ReactMarkdown>
                </article>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
