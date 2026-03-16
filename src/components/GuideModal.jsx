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
    <div className="theme-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Modal Container */}
      <div className={`theme-modal-shell relative overflow-hidden ${showFullscreen ? 'w-full h-full' : 'w-full max-w-6xl h-[90vh]'} transition-all duration-300`}>
        
        {/* Header */}
        <div className="theme-modal-header sticky top-0 z-10 flex items-center justify-between p-4 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{guideIcon}</span>
            <h2 className="text-xl font-bold text-white">{guideTitle}</h2>
          </div>
          <div className="flex items-center gap-2">
            {/* Fullscreen toggle */}
            <button
              onClick={() => setShowFullscreen(!showFullscreen)}
              className="theme-icon-button p-3 rounded-xl cursor-pointer"
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
              className="theme-icon-button p-3 rounded-xl cursor-pointer hover:text-red-300"
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
              <div className="theme-subpanel hidden w-64 overflow-y-auto border-r flex-shrink-0 lg:block">
                <div className="theme-modal-header sticky top-0 p-4 backdrop-blur-sm">
                  <h3 className="theme-text-muted text-xs font-bold uppercase tracking-wider">
                    Table of Contents
                  </h3>
                </div>
                <nav className="p-2">
                  {tableOfContents.map((heading, index) => (
                    <button
                      key={index}
                      onClick={() => scrollToSection(heading.id)}
                      className={`block w-full rounded px-3 py-1.5 text-left text-xs transition-colors hover:bg-white/5 ${
                        heading.level === 1 ? 'theme-text-accent mt-2 font-bold' :
                        heading.level === 2 ? 'ml-3 text-slate-300' :
                        'theme-text-muted ml-6'
                      }`}
                    >
                      {heading.text}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Markdown Content */}
              <div className="flex-1 overflow-y-auto p-6 lg:p-8">
                <article className="theme-guide-prose prose prose-invert max-w-none prose-headings:font-bold prose-h1:text-3xl prose-h1:mb-4 prose-h1:border-b prose-h1:pb-3 prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-3 prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-2 prose-p:leading-relaxed prose-a:no-underline hover:prose-a:opacity-80 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-pre:shadow-xl prose-li:my-1 prose-table:text-sm prose-th:font-bold">
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
