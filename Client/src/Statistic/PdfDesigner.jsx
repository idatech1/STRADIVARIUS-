// PdfDesigner.js
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import logo from '/Logo-nesk-investment@2x.png'; // Remplacez par le chemin de votre logo

export const generateProfessionalPDF = ({
  data,
  columns,
  title = 'Rapport Transactionnel',
  filename = 'rapport-professionnel',
  companyName = 'Nesk-Investment',
  reportType = 'Statistiques',
  footerText = 'Strictement confidentiel',
  startDate = null, // Nouvelle propriété pour la date de début
  endDate = null // Nouvelle propriété pour la date de fin
}) => {
  try {
    // Initialize PDF with custom settings
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
      filters: ['ASCIIHexEncode']
    });

    // Add metadata
    doc.setProperties({
      title: title,
      subject: reportType,
      author: companyName,
      creator: companyName
    });

    // Colors
    const primaryColor = '#155E63';
    const secondaryColor = '#2D8C8C';
    const lightColor = '#F5F5F5';
    const textColor = '#333333';

    // Add logo
    if (logo) {
      doc.addImage(logo, 'PNG', 15, 10, 30, 15);
    }

    // Header
    doc.setFontSize(16);
    doc.setTextColor(primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text(title, doc.internal.pageSize.width / 2, 20, { align: 'center' });

    // Subtitle
    doc.setFontSize(12);
    doc.setTextColor(secondaryColor);
    doc.setFont('helvetica', 'normal');
    doc.text(`${reportType} - ${companyName}`, doc.internal.pageSize.width / 2, 28, { align: 'center' });

    // Date
    const date = new Date().toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
    doc.setFontSize(10);
    doc.setTextColor(textColor);
    doc.text(`Généré le : ${date}`, doc.internal.pageSize.width - 15, 15, { align: 'right' });

   
    const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : 40;

    // Summary section
    if (finalY < doc.internal.pageSize.height - 30) {
      doc.setFontSize(12);
      doc.setTextColor(primaryColor);
      doc.setFont('helvetica', 'bold');

      doc.setFontSize(10);
      doc.setTextColor(textColor);
      doc.setFont('helvetica', 'normal');
      doc.text(`Total des enregistrements : ${data.length}`, + 230,finalY - 8);
    }
    // Add a decorative line
    doc.setDrawColor(primaryColor);
    doc.setLineWidth(0.5);
    doc.line(15, 35, doc.internal.pageSize.width - 15, 35);

    // Prepare table data
    const headers = columns.map(col => col.title);
    const tableData = data.map(row =>
      columns.map(col => {
        if (col.dataIndex && row[col.dataIndex] instanceof Date) {
          return row[col.dataIndex].toLocaleDateString();
        }
        return row[col.dataIndex] || '';
      })
    );

    // Add table
    autoTable(doc, {
      head: [headers],
      body: tableData,
      startY: 40,
      margin: { top: 40, right: 15, bottom: 30, left: 15 },
      styles: {
        font: 'helvetica',
        fontSize: 9,
        cellPadding: 3,
        textColor: textColor,
        overflow: 'linebreak',
        valign: 'middle'
      },
      headStyles: {
        fillColor: primaryColor,
        textColor: '#FFFFFF',
        fontStyle: 'bold',
        halign: 'center'
      },
      bodyStyles: {
        fillColor: '#FFFFFF',
        alternateRowStyles: {
          fillColor: lightColor
        }
      },
      columnStyles: {
        0: { fontStyle: 'bold' }
      },
      didDrawPage: function (data) {
        // Footer on each page
        doc.setFontSize(8);
        doc.setTextColor(textColor);
        doc.setFont('helvetica', 'italic');

        // Page number
        const pageCount = doc.internal.getNumberOfPages();
        doc.text(`Page ${data.pageNumber} / ${pageCount}`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 10, { align: 'center' });

        // Confidential footer
        doc.setFontSize(10);
        doc.setTextColor(primaryColor);
        doc.setFont('helvetica', 'bold');
        doc.text(footerText, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 5, { align: 'center' });

        // Développé par
        doc.text('Développé par ID&A TECH', doc.internal.pageSize.width - 15, doc.internal.pageSize.height - 5, { align: 'right' });

        // Bottom line
        doc.setDrawColor(secondaryColor);
        doc.setLineWidth(0.3);
        doc.line(15, doc.internal.pageSize.height - 15, doc.internal.pageSize.width - 15, doc.internal.pageSize.height - 15);
      }
    });

    // Get the last position of the table
 

    // Save PDF
    doc.save(`${filename}-${date.replace(/\//g, '-')}.pdf`);
    return true;

  } catch (error) {
    console.error('Erreur lors de la génération du PDF:', error);
    return false;
  }
};