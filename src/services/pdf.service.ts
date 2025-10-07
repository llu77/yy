import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Extend jsPDF type for autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: {
      finalY: number;
    };
  }
}

interface PDFConfig {
  title: string;
  type: 'report' | 'invoice' | 'request' | 'receipt' | 'salary';
  content: any;
  userData: any;
  branchData: {
    name: string;
    supervisorName?: string;
  };
}

class PDFService {
  private doc!: jsPDF;
  private logoBase64: string = '';
  private primaryColor = [30, 64, 175]; // Blue
  private secondaryColor = [100, 116, 139]; // Gray
  private accentColor = [16, 185, 129]; // Green
  private defaultFont = 'Amiri';
  
  constructor() {
    this.loadLogo();
  }

  private async loadLogo() {
    try {
      // Skip logo loading in browser environment for now
      // Logo can be added later with proper base64 encoding
      this.logoBase64 = '';
    } catch (error) {
      console.warn('Could not load logo:', error);
    }
  }

  generatePDF(config: PDFConfig) {
    this.doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    // Add Arabic font support
    this.doc.setLanguage("ar");
    
    this.addProfessionalHeader(config.title, config.branchData);
    this.addContent(config.type, config.content);
    this.addProfessionalFooter(config.userData, config.branchData);
    this.addPageNumbers();

    return this.doc;
  }

  private addProfessionalHeader(title: string, branchData: any) {
    const pageWidth = this.doc.internal.pageSize.width;
    const pageHeight = this.doc.internal.pageSize.height;
    
    // Add gradient background for header
    this.doc.setFillColor(...this.primaryColor);
    this.doc.rect(0, 0, pageWidth, 45, 'F');
    
    // Add decorative line
    this.doc.setDrawColor(...this.accentColor);
    this.doc.setLineWidth(0.5);
    this.doc.line(0, 45, pageWidth, 45);
    
    // Add logo if available
    if (this.logoBase64) {
      try {
        this.doc.addImage(this.logoBase64, 'PNG', pageWidth/2 - 25, 5, 50, 20);
      } catch (error) {
        // Fallback text logo
        this.doc.setFontSize(24);
        this.doc.setTextColor(255, 255, 255);
        this.doc.text('GASAH', pageWidth/2, 15, { align: 'center' });
      }
    } else {
      // Text logo as fallback
      this.doc.setFontSize(24);
      this.doc.setTextColor(255, 255, 255);
      this.doc.text('GASAH', pageWidth/2, 15, { align: 'center' });
    }
    
    // Add title
    this.doc.setFontSize(18);
    this.doc.setTextColor(255, 255, 255);
    this.doc.text(title, pageWidth/2, 32, { align: 'center' });
    
    // Add branch info
    this.doc.setFontSize(10);
    this.doc.setTextColor(255, 255, 255);
    const date = new Date().toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    this.doc.text(date, 10, 40);
    this.doc.text(branchData.name || 'الفرع الرئيسي', pageWidth - 10, 40, { align: 'right' });
  }

  private addContent(type: string, content: any, startY: number = 55) {
    const pageWidth = this.doc.internal.pageSize.width;
    
    if (type === 'report' && content.table) {
      // Professional table styling
      (this.doc as any).autoTable({
        head: content.table.headers,
        body: content.table.data,
        startY: startY,
        theme: 'grid',
        styles: {
          font: this.defaultFont,
          fontSize: 10,
          cellPadding: 4,
          halign: 'right',
          lineColor: [229, 231, 235],
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: this.primaryColor,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 11,
          halign: 'center'
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        columnStyles: {
          0: { cellWidth: 'auto', halign: 'right' },
          1: { cellWidth: 'auto', halign: 'center' },
          2: { cellWidth: 'auto', halign: 'center' },
          3: { cellWidth: 'auto', halign: 'center' },
          4: { cellWidth: 'auto', halign: 'center' }
        },
        didDrawPage: (data: any) => {
          // Add page border
          this.doc.setDrawColor(...this.secondaryColor);
          this.doc.setLineWidth(0.1);
          this.doc.rect(5, 5, pageWidth - 10, this.doc.internal.pageSize.height - 10);
        }
      });
    } else if (type === 'salary' && content.details) {
      this.addSalarySlip(content.details, startY);
    } else if (type === 'invoice' && content.items) {
      this.addInvoice(content.items, content.totals, startY);
    } else {
      // Regular text content with better formatting
      this.doc.setFontSize(12);
      this.doc.setTextColor(...this.secondaryColor);
      
      // Add content box
      this.doc.setFillColor(248, 250, 252);
      this.doc.roundedRect(10, startY, pageWidth - 20, 100, 3, 3, 'F');
      
      const textContent = typeof content === 'string' ? content : content.text;
      const lines = this.doc.splitTextToSize(textContent || '', pageWidth - 30);
      
      this.doc.setTextColor(31, 41, 55);
      this.doc.text(lines, pageWidth - 15, startY + 10, { align: 'right' });
    }
  }

  private addSalarySlip(details: any, startY: number) {
    const pageWidth = this.doc.internal.pageSize.width;
    
    // Employee info section
    this.doc.setFillColor(248, 250, 252);
    this.doc.roundedRect(10, startY, pageWidth - 20, 30, 3, 3, 'F');
    
    this.doc.setFontSize(11);
    this.doc.setTextColor(...this.primaryColor);
    this.doc.text(`الموظف: ${details.employeeName}`, pageWidth - 15, startY + 10, { align: 'right' });
    this.doc.text(`الفرع: ${details.branch}`, pageWidth - 15, startY + 18, { align: 'right' });
    this.doc.text(`الشهر: ${details.month}`, pageWidth - 15, startY + 26, { align: 'right' });
    
    // Salary breakdown table
    const tableData = [
      ['الراتب الأساسي', `${details.basicSalary} ريال`],
      ['البدلات', `${details.allowances || 0} ريال`],
      ['البونص', `${details.bonus || 0} ريال`],
      ['الخصومات', `${details.deductions || 0} ريال`],
      ['صافي الراتب', `${details.netSalary} ريال`]
    ];
    
    (this.doc as any).autoTable({
      body: tableData,
      startY: startY + 35,
      theme: 'striped',
      styles: {
        font: this.defaultFont,
        fontSize: 10,
        cellPadding: 3,
        halign: 'right'
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 50 },
        1: { halign: 'center', textColor: this.primaryColor }
      }
    });
  }

  private addInvoice(items: any[], totals: any, startY: number) {
    (this.doc as any).autoTable({
      head: [['#', 'الصنف', 'الكمية', 'السعر', 'المجموع']],
      body: items.map((item, index) => [
        index + 1,
        item.name,
        item.quantity,
        `${item.price} ريال`,
        `${item.total} ريال`
      ]),
      foot: [
        ['', '', '', 'المجموع الفرعي:', `${totals.subtotal} ريال`],
        ['', '', '', 'الضريبة (15%):', `${totals.tax} ريال`],
        ['', '', '', 'الإجمالي:', `${totals.total} ريال`]
      ],
      startY: startY,
      theme: 'grid',
      styles: {
        font: this.defaultFont,
        fontSize: 10,
        cellPadding: 3,
        halign: 'center'
      },
      headStyles: {
        fillColor: this.primaryColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      footStyles: {
        fillColor: [240, 242, 245],
        fontStyle: 'bold'
      }
    });
  }

  private addProfessionalFooter(userData: any, branchData: any) {
    const pageHeight = this.doc.internal.pageSize.height;
    const pageWidth = this.doc.internal.pageSize.width;
    const footerY = pageHeight - 30;
    
    // Add footer background
    this.doc.setFillColor(248, 250, 252);
    this.doc.rect(0, footerY, pageWidth, 30, 'F');
    
    // Add separator line
    this.doc.setDrawColor(...this.accentColor);
    this.doc.setLineWidth(0.3);
    this.doc.line(10, footerY, pageWidth - 10, footerY);
    
    // Add signatures section
    this.doc.setFontSize(9);
    this.doc.setTextColor(...this.secondaryColor);
    
    // Left signature
    this.doc.text('التوقيع:', 20, footerY + 10);
    this.doc.line(20, footerY + 15, 60, footerY + 15);
    this.doc.text(userData?.name || 'المستخدم', 40, footerY + 20, { align: 'center' });
    
    // Right signature
    this.doc.text('المعتمد:', pageWidth - 60, footerY + 10);
    this.doc.line(pageWidth - 60, footerY + 15, pageWidth - 20, footerY + 15);
    this.doc.text(branchData.supervisorName || 'المدير', pageWidth - 40, footerY + 20, { align: 'center' });
    
    // Add company info
    this.doc.setFontSize(8);
    this.doc.setTextColor(...this.secondaryColor);
    this.doc.text('نظام GASAH لإدارة الفروع', pageWidth/2, footerY + 25, { align: 'center' });
  }

  private addPageNumbers() {
    const pageCount = this.doc.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i);
      this.doc.setFontSize(8);
      this.doc.setTextColor(...this.secondaryColor);
      this.doc.text(
        `صفحة ${i} من ${pageCount}`,
        this.doc.internal.pageSize.width / 2,
        this.doc.internal.pageSize.height - 5,
        { align: 'center' }
      );
    }
  }

  download(filename: string = 'report.pdf') {
    this.doc.save(filename);
  }

  print() {
    if (this.doc) {
      try {
        // Open PDF in new window
        const pdfUrl = this.doc.output('bloburl');
        window.open(pdfUrl, '_blank');
      } catch (error) {
        console.error('Print error:', error);
        // Fallback to dataurlnewwindow
        try {
          this.doc.output('dataurlnewwindow');
        } catch (fallbackError) {
          console.error('Fallback print error:', fallbackError);
        }
      }
    } else {
      console.error('PDF document not generated. Call generatePDF first.');
    }
  }

  getBlob(): Blob {
    return this.doc.output('blob');
  }
}

// Export singleton instance
const pdfService = new PDFService();
export default pdfService;