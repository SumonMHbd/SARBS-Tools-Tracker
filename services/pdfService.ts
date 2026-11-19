
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { User } from '../types';
import { LOGO_URL } from '../constants';

/**
 * Helper to convert a remote image URL to a Base64 string.
 * This function uses 'images.weserv.nl' as a proxy to handle CORS issues
 * that are common with private/company domains like sarbs.net.
 */
const getBase64ImageFromUrl = async (url: string): Promise<string | null> => {
  // Use weserv.nl as a free, high-performance CORS proxy for images
  const proxiedUrl = `https://images.weserv.nl/?url=${encodeURIComponent(url)}&default=${encodeURIComponent(url)}`;

  // Method 1: Standard Fetch with Proxied URL
  try {
    const response = await fetch(proxiedUrl, { 
      mode: 'cors',
      cache: 'no-cache' 
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const blob = await response.blob();
    const dataUrl = await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
    if (dataUrl) return dataUrl;
    throw new Error('Failed to read image blob');
  } catch (error) {
    console.warn("PDF Service: Fetch via proxy failed. Attempting direct Canvas fallback...", error);
    
    // Method 2: Direct Canvas Fallback (Legacy)
    return new Promise((resolve) => {
      const img = new Image();
      img.setAttribute('crossOrigin', 'anonymous');
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const format = url.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
            const dataURL = canvas.toDataURL(format);
            resolve(dataURL);
          } else {
            resolve(null);
          }
        } catch (e) {
          resolve(null);
        }
      };
      
      img.onerror = () => {
        resolve(null);
      };
      
      img.src = `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`;
    });
  }
};

export const generateEmployeePDF = async (user: User | { name: string, id: string, department?: string, designation?: string }, tools: any[]) => {
  try {
    const doc = new jsPDF();

    // Attempt to fetch the logo via proxy
    const logoBase64 = await getBase64ImageFromUrl(LOGO_URL);

    // Header - Company Title
    doc.setTextColor(15, 23, 42); // Slate-900
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("SARBS Communications Ltd.", 14, 22);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100);
  doc.text("OFFICIAL TOOLS & EQUIPMENT TRACKING REPORT", 14, 30);
  
  doc.setFont("helvetica", "normal");
  doc.text(`Generated on: ${new Date().toLocaleDateString('en-GB')} at ${new Date().toLocaleTimeString()}`, 14, 35);

  // Add Logo to top right (safely) - Dimensions reduced for cleaner look
  if (logoBase64) {
    try {
      const format = LOGO_URL.toLowerCase().endsWith('.png') ? 'PNG' : 'JPEG';
      // Reduced size: 22x22 at x=173, y=10
      doc.addImage(logoBase64, format, 173, 10, 22, 22);
    } catch (e) {
      console.warn("PDF Service: Failed to add image to document stream", e);
      drawPlaceholder(doc);
    }
  } else {
    drawPlaceholder(doc);
  }

  // Divider Line
  doc.setDrawColor(226, 232, 240);
  doc.line(14, 45, 196, 45);

  // Personnel Info Block
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("PERSONNEL DETAILS", 14, 55);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Name:`, 14, 62);
  doc.setFont("helvetica", "bold");
  doc.text(`${user.name}`, 35, 62);
  
  doc.setFont("helvetica", "normal");
  doc.text(`ID No:`, 14, 68);
  doc.setFont("helvetica", "bold");
  doc.text(`${user.id}`, 35, 68);

  doc.setFont("helvetica", "normal");
  doc.text(`Designation:`, 90, 62);
  doc.setFont("helvetica", "bold");
  doc.text(`${user.designation || 'N/A'}`, 115, 62);

  doc.setFont("helvetica", "normal");
  doc.text(`Department:`, 90, 68);
  doc.setFont("helvetica", "bold");
  doc.text(`${user.department || 'N/A'}`, 115, 68);

  // Table Data Mapping
  const tableRows = (tools || []).map((tool) => {
    const dist = tool?.distributed || 0;
    const ret = tool?.returned || 0;
    const faulty = tool?.faulty || 0;
    const damage = tool?.damage || 0;
    const lost = tool?.lost || 0;
    const finalQty = dist - (ret + faulty + damage + lost);

    return [
      tool?.name || '-',
      dist > 0 ? dist : '-',
      ret > 0 ? ret : '-',
      faulty > 0 ? faulty : '-',
      damage > 0 ? damage : '-',
      lost > 0 ? lost : '-',
      finalQty,
      tool?.remarks || '-'
    ];
  });

  // Table Configuration
  autoTable(doc, {
    startY: 78,
    head: [[
      'Tools Name', 
      'Dist. Qty', 
      'Ret. Qty', 
      'Faulty Ret.', 
      'Damage', 
      'Lost', 
      'Final Qty', 
      'Remarks'
    ]],
    body: tableRows,
    theme: 'grid',
    headStyles: { 
      fillColor: [255, 255, 255], 
      textColor: [15, 23, 42], 
      fontStyle: 'bold',
      lineWidth: 0.1,
      lineColor: [200, 200, 200]
    },
    styles: { 
      fontSize: 8, 
      cellPadding: 3, 
      valign: 'middle', 
      halign: 'center' 
    },
    columnStyles: {
      0: { halign: 'left', fontStyle: 'bold', cellWidth: 40 },
      7: { halign: 'left', fontStyle: 'italic', cellWidth: 'auto' }
    },
    alternateRowStyles: { fillColor: [250, 250, 250] }
  });

  // Page Footer
  const pageCount = doc.getNumberOfPages ? doc.getNumberOfPages() : (doc as any).internal.getNumberOfPages();
  for(let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(160);
    doc.text('SARBS Communications Ltd. Inventory Management System - Confidential', 14, 285);
    doc.text('Page ' + i + ' of ' + pageCount, 196, 285, { align: 'right' });
  }

  doc.save(`SARBS_Tool_Report_${user?.id || 'report'}_${new Date().getTime()}.pdf`);
  } catch (err) {
    console.warn("PDF generation error:", err);
  }
};

/**
 * Fallback to draw a professional text-based header if the logo fails.
 */
function drawPlaceholder(doc: any) {
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  // Adjusted placeholder to match the new smaller logo size (22x22)
  doc.roundedRect(173, 10, 22, 22, 2, 2);
  doc.setFontSize(5);
  doc.setTextColor(180);
  doc.text("OFFICIAL", 184, 17, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("SARBS", 184, 22, { align: 'center' });
}
