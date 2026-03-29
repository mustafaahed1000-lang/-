import React from 'react';

export const exportToPDF = async (elementRef: React.RefObject<HTMLElement | HTMLDivElement | null>, filename: string, isSimple: boolean = false) => {
  if (!elementRef.current) return;
  
  // Create beautiful full-screen loading overlay
  const overlay = document.createElement('div');
  overlay.innerHTML = `
    <div style="position:fixed;inset:0;background:rgba(17,24,39,0.98);z-index:999999;display:flex;flex-direction:column;align-items:center;justify-content:center;color:white;font-family:'Tajawal',sans-serif;backdrop-filter:blur(15px);padding:20px;">
      <div style="width:60px;height:60px;border:4px solid #10b981;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;margin-bottom:30px;"></div>
      <h2 style="font-size:28px;font-weight:900;margin-bottom:16px;text-align:center;color:#34d399;">خطوة أخيرة للحصول على تنسيق عربي أصلي 🚀</h2>
      <p style="color:#a7f3d0;font-size:18px;text-align:center;max-width:650px;line-height:1.8;background:rgba(16,185,129,0.1);padding:20px;border-radius:12px;border:1px solid rgba(16,185,129,0.2);">
        لضمان طباعة الأحرف العربية بشكل <b>مثالي وبجودة عالية جداً (Vector)</b> بدون تقطيع، يتم الاعتماد على محرك الطباعة الأصلي للمتصفح.<br><br>
        <span style="color:#fcd34d;font-weight:bold;">يرجى اختيار (حفظ بتنسيق PDF) أو (Save as PDF) من النافذة التالية.</span>
      </p>
      <style>@keyframes spin { 100% { transform: rotate(360deg); } }</style>
    </div>
  `;
  document.body.appendChild(overlay);

  try {
    // Give UI a moment to show overlay
    await new Promise(resolve => setTimeout(resolve, 500));

    let contentHtml = elementRef.current.innerHTML.replace(/[\u200B-\u200D\uFEFF]/g, '');

    // Clean up colors for absolute perfect print consistency
    contentHtml = contentHtml.replace(/var\(--text-main\)/g, '#111827');
    contentHtml = contentHtml.replace(/var\(--text-muted\)/g, '#4b5563');
    contentHtml = contentHtml.replace(/var\(--bg-surface\)/g, '#ffffff');
    contentHtml = contentHtml.replace(/var\(--bg-dashboard\)/g, '#ffffff');
    contentHtml = contentHtml.replace(/text-\[var\(--text-main\)\]/g, 'text-black');
    contentHtml = contentHtml.replace(/text-white/g, 'text-black');
    contentHtml = contentHtml.replace(/dark:text-white/g, '');
    contentHtml = contentHtml.replace(/dark:prose-invert/g, '');

    const subjects = [
      { id: 'cs', icon: '💻', name: 'حاسوب / برمجة', label: 'علوم الحاسوب' },
      { id: 'math', icon: '📐', name: 'الرياضيات', label: 'الرياضيات' },
      { id: 'physics', icon: '⚛️', name: 'الفيزياء', label: 'الفيزياء' },
      { id: 'arabic', icon: '📖', name: 'اللغة العربية', label: 'اللغة العربية' },
      { id: 'business', icon: '📊', name: 'إدارة الأعمال', label: 'إدارة' },
      { id: 'law', icon: '⚖️', name: 'القانون', label: 'القانون' }
    ];

    let charSum = 0;
    for (let i = 0; i < filename.length; i++) {
        charSum += filename.charCodeAt(i);
    }
    const selectedSubject = subjects[charSum % subjects.length];

    const printStyles = `
      * { 
        font-family: 'Tajawal', sans-serif !important; 
        box-sizing: border-box; 
      }
      body { 
          background: white !important; 
          margin: 0; padding: 0; 
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
      }
      
      @page { 
        size: A4 portrait; 
        margin: 15mm; 
      }
      
      h1, h2, h3, h4, p, span, li, td, th, strong, em, b, i, div { color: #1f2937 !important; }
      h1 { font-size: 26px; font-weight: 900; color: #0f2d5e !important; margin: 30px 0 15px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; page-break-after: avoid; }
      h2 { font-size: 22px; font-weight: 800; color: #1565c0 !important; margin: 25px 0 15px; page-break-after: avoid; }
      h3 { font-size: 19px; font-weight: 700; margin: 20px 0 10px; color: #111827 !important; page-break-after: avoid; }
      
      p { text-align: right; line-height: 2; margin-bottom: 16px; font-size: 15px; color: #374151 !important; }
      strong, b { font-weight: 800; color: #111827 !important; }
      
      ul, ol { direction: rtl; text-align: right; padding-right: 25px; margin-bottom: 20px; }
      li { margin-bottom: 8px; line-height: 1.8; font-size: 15px; }
      
      pre { background: #f8fafc !important; padding: 15px; border-radius: 8px; font-family: monospace; white-space: pre-wrap; word-wrap: break-word; direction: ltr !important; text-align: left !important; border: 1px solid #e2e8f0; margin: 20px 0; page-break-inside: avoid;}
      pre * { color: #0f172a !important; }
      code { background: #f1f5f9 !important; color: #b91c1c !important; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 13px; font-weight: bold; border: 1px solid #cbd5e1;}
      
      table { 
        border-collapse: separate; 
        border-spacing: 0; 
        width: 100%; 
        margin: 30px 0; 
        background: #fff; 
        border-radius: 12px; 
        overflow: hidden;
        border: 1px solid #cbd5e1; 
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        page-break-inside: auto; 
      }
      tr { page-break-inside: avoid; page-break-after: auto; transition: all 0.2s; }
      tr:nth-child(even) td { background: #f8fafc !important; }
      thead { display: table-header-group; background: #0f172a !important; }
      th { 
        padding: 16px 20px; 
        text-align: right; 
        font-weight: 900; 
        color: #ffffff !important; 
        font-size: 15px; 
        border-bottom: 2px solid #1e293b; 
        background-color: #0f172a !important;
      }
      td { 
        border-bottom: 1px solid #e2e8f0; 
        padding: 14px 20px; 
        text-align: right; 
        font-size: 14px; 
        color: #334155 !important; 
        line-height: 1.6;
      }
      tr:last-child td { border-bottom: none; }
      
      .katex { font-size: 1.1em !important; direction: ltr !important; }
      .katex-display { margin: 1em 0 !important; text-align: center !important; page-break-inside: avoid; }
      
      .pdf-wrap { color: #1a1a1a; background: white; direction: rtl; width: 100%; max-width: 100%; margin: 0 auto; }
      .pdf-cover { background: #0f172a !important; padding: 35px 30px; display: flex; align-items: center; width: 100%; border-radius: 12px; margin-bottom: 30px; page-break-after: avoid; }
      .pdf-icon-wrap { background: rgba(255,255,255,0.1); border-radius: 12px; font-size: 28px; border: 1px solid rgba(255,255,255,0.2); padding: 18px; width: 75px; text-align: center; margin-left: 20px; }
      .pdf-title-area { flex: 1; text-align: right; }
      .pdf-univ { font-size: 13px; color: #cbd5e1 !important; letter-spacing: 1px; margin-bottom: 8px; font-weight: 700; }
      .pdf-main-title { font-size: 26px; font-weight: 900; line-height: 1.4; color: white !important; margin: 0; }
      .pdf-content { font-size: 15px; color: #111827; }
    `;

    const innerContent = isSimple 
      ? `<div style="direction: rtl;">${contentHtml}</div>`
      : `
        <div class="pdf-wrap">
          <div class="pdf-cover">
            <div class="pdf-icon-wrap">${selectedSubject.icon}</div>
            <div class="pdf-title-area">
              <div class="pdf-univ">جامعة القدس المفتوحة • Al-Quds Open University</div>
              <h1 class="pdf-main-title">${filename.replace(/_/g, ' ')}</h1>
            </div>
          </div>
          <div class="pdf-content">
            ${contentHtml}
          </div>
        </div>
      `;

    const fullHtml = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <title>${filename.replace(/_/g, ' ')}</title>
          <meta charset="UTF-8">
          <style>@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap');</style>
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
          <style>${printStyles}</style>
        </head>
        <body>
          ${innerContent}
        </body>
      </html>
    `;

    // Inject into a hidden iframe and print it natively for 100% Arabic Vector perfection
    const printIframe = document.createElement('iframe');
    printIframe.id = 'solvica-print-iframe';
    printIframe.style.visibility = 'hidden';
    printIframe.style.position = 'absolute';
    printIframe.style.top = '-10000px';
    document.body.appendChild(printIframe);

    const iframeDoc = printIframe.contentDocument || printIframe.contentWindow?.document;
    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(fullHtml);
      iframeDoc.close();
      
      // Wait for fonts/CSS to load properly before triggering print dialog
      await new Promise(resolve => {
          printIframe.onload = resolve;
          setTimeout(resolve, 1500); // Fallback timeout
      });

      printIframe.contentWindow?.focus();
      
      // Clean up overlay exactly before native dialog blocks JS execution
      if (document.body.contains(overlay)) {
        document.body.removeChild(overlay);
      }

      try {
        printIframe.contentWindow?.print();
      } catch (e) {
        console.error('Print trigger failed', e);
      }
      
      // Safe garbage collection for the iframe (allows user 60 seconds to decide before clearing)
      setTimeout(() => {
        if (document.body.contains(printIframe)) {
          document.body.removeChild(printIframe);
        }
      }, 60000);
    }
  } catch (error) {
    console.error('PDF Export Error:', error);
    if (document.body.contains(overlay)) {
      document.body.removeChild(overlay);
    }
  }
};

export const exportToSimplePDF = (ref: React.RefObject<any>, name: string) => exportToPDF(ref, name, true);
