import React from 'react';
import { FilePenLine } from 'lucide-react';

const TransferLegend = ({ transferLegend, getDotColor, onLegendClick, activeLegend }) => {
  return (
    <div className="px-5 py-8 space-y-1">
      <div className="text-sm mb-2 text-gray-200">Légende (Cliquez pour filtrer)</div>
      {transferLegend.map((item, index) => (
        <div
          key={index}
          className={`flex items-center p-1 rounded cursor-pointer ${
            activeLegend.includes(item.type) ? 'bg-blue-900' : 'hover:bg-gray-600'
          }`}
          onClick={() => onLegendClick(item.type)}
        >
          {item.type === 'manual' ? (
            <FilePenLine size={16} className="text-white mr-2" />
          ) : (
            <div className={`w-3 h-3 rounded-full ${getDotColor(item.type)} mr-2`}></div>
          )}
          <div>{item.label}</div>
        </div>
      ))}
      <div
        className={`flex items-center p-1 rounded cursor-pointer mt-2 ${
          activeLegend.length === 0 ? 'bg-blue-900' : 'hover:bg-gray-600'
        }`}
        onClick={() => onLegendClick(null)}
      >
        <div className="w-3 h-3 rounded-full bg-gray-500 mr-2"></div>
        <div>ALL</div>
      </div>
    </div>
  );
};

export default TransferLegend;