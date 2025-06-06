import React from 'react';
import ST from "/ST.png";
import '../Css/calendriertransfer.css';

const MainCalendarHeader = () => {
  return (
    <div id='nav' className="flex items-center justify-between p-5 ">
      <div>
        <h1 id="calendrier_text">Calendrier des transferts</h1>
      </div>
      <div className="w-100 h-10 rounded-full flex items-center justify-center font-bold">
        <img src={ST} alt="" />
      </div>
    </div>
  );
};

export default MainCalendarHeader;