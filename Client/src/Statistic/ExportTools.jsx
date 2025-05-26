// ExportTools.jsx
import React from 'react';
import { Button, Dropdown, message, Tooltip } from 'antd';
import { DownloadOutlined, FileTextOutlined, FilePdfOutlined, FileImageOutlined, FileExcelOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import { generateProfessionalPDF } from './PdfDesigner';

const ExportTools = ({
  data,
  columns,
  filename = 'export',
  chartRef = null,
  title = 'Rapport Transactionnel',
  companyName = 'Nesk-Investment',
  reportType = 'Statistiques',
  footerText = 'Strictement confidentiel',
  startDate = null, // Nouvelle prop pour la date de début
  endDate = null // Nouvelle prop pour la date de fin
}) => {
  const exportToCSV = () => {
    try {
      const csvData = data.map(row => {
        const item = {};
        columns.forEach(col => {
          if (col.dataIndex) {
            item[col.title] = row[col.dataIndex];
          }
        });
        return item;
      });
      const worksheet = XLSX.utils.json_to_sheet(csvData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
      XLSX.writeFile(workbook, `${filename}.csv`);
      message.success('Export CSV réussi');
    } catch (error) {
      console.error('Erreur lors de l\'export CSV:', error);
      message.error('Erreur lors de l\'export CSV');
    }
  };

  const exportToExcel = () => {
    try {
      const excelData = data.map(row => {
        const item = {};
        columns.forEach(col => {
          if (col.dataIndex) {
            item[col.title] = row[col.dataIndex];
          }
        });
        return item;
      });
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
      XLSX.writeFile(workbook, `${filename}.xlsx`);
      message.success('Export Excel réussi');
    } catch (error) {
      console.error('Erreur lors de l\'export Excel:', error);
      message.error('Erreur lors de l\'export Excel');
    }
  };

  const exportToPDF = () => {
    const success = generateProfessionalPDF({
      data,
      columns,
      title,
      filename,
      companyName,
      reportType,
      footerText,
      startDate, // Passer la date de début
      endDate // Passer la date de fin
    });
    if (success) {
      message.success('Export PDF réussi');
    } else {
      message.error('Erreur lors de l\'export PDF');
    }
  };

  const downloadChartAsImage = () => {
    if (!chartRef || !chartRef.current) {
      message.warning('Aucun graphique disponible à exporter');
      return;
    }
    try {
      const chartElement = chartRef.current.ele;
      if (!chartElement) {
        message.warning('Élément de graphique non disponible');
        return;
      }
      html2canvas(chartElement, {
        backgroundColor: '#ffffff',
        useCORS: true,
        scale: 2,
        logging: false
      }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = imgData;
        link.download = `${filename}-graph.png`;
        link.click();
        message.success('Image du graphique téléchargée');
      });
    } catch (error) {
      console.error('Erreur lors du téléchargement de l\'image:', error);
      message.error('Erreur lors du téléchargement de l\'image');
    }
  };

  const menuItems = [
    {
      key: 'excel',
      icon: <FileExcelOutlined />,
      label: 'Exporter en Excel',
      onClick: exportToExcel
    },
    {
      key: 'csv',
      icon: <FileTextOutlined />,
      label: 'Exporter en CSV',
      onClick: exportToCSV
    },
    {
      key: 'pdf',
      icon: <FilePdfOutlined />,
      label: 'Exporter en PDF',
      onClick: exportToPDF
    }
  ];

  if (chartRef) {
    menuItems.push({
      key: 'image',
      icon: <FileImageOutlined />,
      label: 'Télécharger le graphique (PNG)',
      onClick: downloadChartAsImage
    });
  }

  return (
    <Tooltip title="Options d'exportation">
      <Dropdown menu={{ items: menuItems }} placement="bottomRight">
        <Button type="primary" icon={<DownloadOutlined />}>
          Exporter
        </Button>
      </Dropdown>
    </Tooltip>
  );
};

export default ExportTools;