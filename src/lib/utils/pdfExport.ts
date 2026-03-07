import React from 'react';

export const exportToPDF = async (elementRef: React.RefObject<HTMLElement | HTMLDivElement | null>, filename: string, isSimple: boolean = false) => {
  if (!elementRef.current) return;

  try {
    let contentHtml = elementRef.current.innerHTML;

    // Sanitize dark mode variables natively in the HTML string before rendering
    contentHtml = contentHtml.replace(/var\(--text-main\)/g, '#111827');
    contentHtml = contentHtml.replace(/var\(--text-muted\)/g, '#4b5563');
    contentHtml = contentHtml.replace(/var\(--bg-surface\)/g, '#ffffff');
    contentHtml = contentHtml.replace(/var\(--bg-dashboard\)/g, '#ffffff');
    contentHtml = contentHtml.replace(/var\(--bg-background\)/g, '#ffffff');
    contentHtml = contentHtml.replace(/var\(--border-color\)/g, '#e5e7eb');
    contentHtml = contentHtml.replace(/text-\[var\(--text-main\)\]/g, 'text-black');
    contentHtml = contentHtml.replace(/text-white/g, 'text-black');
    contentHtml = contentHtml.replace(/dark:text-white/g, '');
    contentHtml = contentHtml.replace(/dark:prose-invert/g, '');

    const subjects = [
      { id: 'cs', icon: '💻', name: 'حاسوب / برمجة', label: 'علوم الحاسوب' },
      { id: 'math', icon: '📐', name: 'الرياضيات', label: 'الرياضيات' },
      { id: 'physics', icon: '⚛️', name: 'الفيزياء', label: 'الفيزياء' },
      { id: 'arabic', icon: '📖', name: 'اللغة العربية', label: 'اللغة العربية' },
      { id: 'english', icon: '🌐', name: 'اللغة الإنجليزية', label: 'لغات' },
      { id: 'business', icon: '📊', name: 'إدارة الأعمال', label: 'إدارة' },
      { id: 'law', icon: '⚖️', name: 'القانون', label: 'القانون' },
      { id: 'education', icon: '🎓', name: 'التربية', label: 'التربية' },
      { id: 'engineering', icon: '🔧', name: 'الهندسة', label: 'الهندسة' }
    ];

    let charSum = 0;
    for (let i = 0; i < filename.length; i++) {
      charSum += filename.charCodeAt(i);
    }
    const selectedSubject = subjects[charSum % subjects.length];

    const globalFixes = `
      * { 
        font-family: 'Tajawal', sans-serif !important; 
        box-sizing: border-box; 
        -webkit-print-color-adjust: exact !important; 
        color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      body { background: white !important; margin: 0; padding: 0; }
      h1, h2, h3, h4, p, span, li, td, th, strong, em, b, i, div { color: black !important; }
      p { text-align: right; line-height: 1.8; margin-bottom: 15px; }
      ul, ol { direction: rtl; text-align: right; padding-right: 25px; margin-bottom: 15px; }
      li { margin-bottom: 8px; line-height: 1.6; display: list-item; }
      pre { background: #0d1b2a !important; padding: 15px; border-radius: 8px; font-family: monospace; white-space: pre-wrap; word-wrap: break-word; direction: ltr !important; text-align: left !important; overflow: hidden; page-break-inside: avoid; }
      pre * { color: #a8d8ea !important; }
      code { background: #f3f4f6 !important; color: #111827 !important; padding: 3px 6px; border-radius: 4px; font-family: monospace; font-size: 13px; font-weight: bold; }
      table { border-collapse: collapse; width: 100%; margin: 20px 0; page-break-inside: avoid; background: #fff; color: #000; }
      td, th { border: 1px solid #000; padding: 10px; text-align: right; }
      th { background-color: #f2f2f2; font-weight: bold; }
      
      /* Essential Flexbox and Grid override fixes for HTML2Canvas to prevent text overlapping */
      .flex, .grid, .flex-col, .flex-row { display: block !important; flex-wrap: wrap !important; }
      .gap-1, .gap-2, .gap-3, .gap-4 { padding: 5px 0; }
      
      h1, h2, h3 { margin-top: 20px; margin-bottom: 10px; }
    `;

    const simpleStyle = `
      ${globalFixes}
      .simple-wrap { padding: 30px; direction: rtl; }
    `;

    const complexStyle = `
      ${globalFixes}

      .pdf-wrap {
        color: #1a1a1a;
        background: white;
        direction: rtl;
        width: 100%;
        max-width: 900px;
        margin: 0 auto;
      }
      .pdf-wrap.cs { --primary:#0f2d5e; --secondary:#1565c0; --accent:#00b0ff; --gradient:linear-gradient(135deg,#0f2d5e 0%,#1565c0 50%,#0288d1 100%); --light-bg:#e3f2fd; }
      .pdf-wrap.math { --primary:#1b003d; --secondary:#6a1b9a; --accent:#ce93d8; --gradient:linear-gradient(135deg,#1b003d,#6a1b9a,#ab47bc); --light-bg:#f3e5f5; }
      .pdf-wrap.physics { --primary:#003040; --secondary:#00695c; --accent:#26a69a; --gradient:linear-gradient(135deg,#003040,#00695c,#00897b); --light-bg:#e0f2f1; }
      .pdf-wrap.arabic { --primary:#3e0000; --secondary:#b71c1c; --accent:#ef9a9a; --gradient:linear-gradient(135deg,#3e0000,#b71c1c,#e53935); --light-bg:#ffebee; }
      .pdf-wrap.english { --primary:#001a33; --secondary:#01579b; --accent:#4fc3f7; --gradient:linear-linear-gradient(135deg,#001a33,#01579b,#0277bd); --light-bg:#e1f5fe; }
      .pdf-wrap.business { --primary:#1a1200; --secondary:#e65100; --accent:#ffb74d; --gradient:linear-gradient(135deg,#1a1200,#e65100,#f57c00); --light-bg:#fff3e0; }
      .pdf-wrap.law { --primary:#1a1400; --secondary:#827717; --accent:#d4e157; --gradient:linear-gradient(135deg,#1a1400,#827717,#9e9d24); --light-bg:#f9fbe7; }
      .pdf-wrap.education { --primary:#002800; --secondary:#1b5e20; --accent:#66bb6a; --gradient:linear-gradient(135deg,#002800,#1b5e20,#2e7d32); --light-bg:#e8f5e9; }
      .pdf-wrap.engineering { --primary:#1c0d00; --secondary:#bf360c; --accent:#ff7043; --gradient:linear-gradient(135deg,#1c0d00,#bf360c,#d84315); --light-bg:#fbe9e7; }
      
      .pdf-wrap .hidden, .pdf-wrap .print\\:hidden { display: none !important; }
      
      .pdf-cover { background: var(--gradient); padding: 40px 30px; position: relative; overflow: hidden; color: white !important; display: flex; align-items: center; width: 100%; border-radius: 12px 12px 0 0; }
      .pdf-cover * { color: white !important; }
      .pdf-icon-wrap { background: rgba(255,255,255,0.15); border-radius: 16px; font-size: 28px; border: 1px solid rgba(255,255,255,0.2); padding: 20px; width: 80px; text-align: center; margin-left: 20px;}
      .pdf-title-area { flex: 1; }
      .pdf-univ { font-size: 13px; color: rgba(255,255,255,0.8) !important; letter-spacing: 1px; margin-bottom: 6px; font-weight: 700;}
      .pdf-main-title { font-size: 24px; font-weight: 900; margin-bottom: 8px; line-height: 1.4; color: white !important;}
      
      .pdf-content { padding: 30px; font-size: 15px; color: #111827; background: white;}
      .pdf-content * { color: #111827 !important; }
      .pdf-content h1, .pdf-content h2, .pdf-content h3 { color: var(--primary) !important; font-weight: 900; margin-top: 1.5em; margin-bottom: 0.5em; }
      .pdf-content th { background: var(--gradient) !important; color: white !important; }
      
      .pdf-footer { background: var(--gradient); padding: 15px 30px; color: white !important; font-size: 12px; text-align: center; border-radius: 0 0 12px 12px; }
      .pdf-footer * { color: white !important; }
    `;

    // 1. Create a completely isolated iframe to sandbox the rendering process.
    // This absolutely ensures NO CSS bleed or layout shifts in the main application.
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.top = '0';
    iframe.style.left = '200vw'; // Place entirely off-screen to the right
    iframe.style.width = '210mm';
    iframe.style.height = '100vh';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    iframe.setAttribute('aria-hidden', 'true');
    iframe.tabIndex = -1;

    // Attach to the main document so we can populate it
    document.body.appendChild(iframe);

    try {
      const iframeDoc = iframe.contentWindow?.document;
      if (!iframeDoc) throw new Error("فشل فتح نافذة التصدير.");

      // Populate iframe with CSS and HTML content
      iframeDoc.open();
      iframeDoc.write(`
        <html dir="rtl" lang="ar">
          <head>
            <title>${filename}</title>
            <style>
              ${isSimple ? simpleStyle : complexStyle}
              body { background: white; margin: 0; }
            </style>
          </head>
          <body>
            <div id="pdf-export-content">
              ${isSimple ? `<div class="simple-wrap">${contentHtml}</div>` : `
                <div class="pdf-wrap ${selectedSubject.id}">
                  <div class="pdf-cover">
                    <div class="pdf-icon-wrap">${selectedSubject.icon}</div>
                    <div class="pdf-title-area">
                      <div class="pdf-univ">جامعة القدس المفتوحة • Al-Quds Open University</div>
                      <div class="pdf-main-title">${filename}</div>
                    </div>
                  </div>
                  <div class="pdf-content">
                    ${contentHtml}
                  </div>
                  <div class="pdf-footer">
                    تم الإنشاء بواسطة منصة Solvica الذكية - ${new Date().toLocaleDateString('ar-EG')}
                  </div>
                </div>
              `}
            </div>
          </body>
        </html>
      `);
      iframeDoc.close();

      // Give iframe DOM time to compose styles and any fonts to settle
      if (iframeDoc.fonts) await iframeDoc.fonts.ready;
      await new Promise(resolve => setTimeout(resolve, 800));

      const sanitizeFilename = filename.replace(/[^a-z0-9_\-ء-ي\s]/gi, '_').trim();

      // Import html2pdf dynamically
      const html2pdf = (await import('html2pdf.js')).default;

      // 2. Render canvas from the specific node INSIDE the iframe
      const exportNode = iframeDoc.getElementById('pdf-export-content');

      if (exportNode) {
        const opt = {
          margin: 10,
          filename: `${sanitizeFilename}.pdf`,
          image: { type: 'jpeg' as const, quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false,
            windowWidth: Math.max(iframe.clientWidth || 0, 800)
          },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
        };

        // This executes html2canvas *within* the iframe context without touching main app
        await html2pdf().set(opt).from(exportNode).save();
      }
    } finally {
      // 3. Guarantee cleanup using finally block! No matter if it succeeds or throws,
      // the iframe will be instantly purged, preventing layout breakages.
      if (iframe && document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }

  } catch (error: any) {
    console.error('Error generating PDF:', error);
    alert('حدث خطأ أثناء تصدير ملف الـ PDF: ' + (error?.message || 'مشكلة غير معروفة.'));
  }
};

export const exportToSimplePDF = async (elementRef: React.RefObject<HTMLElement | HTMLDivElement | null>, filename: string) => {
  return exportToPDF(elementRef, filename, true);
};
