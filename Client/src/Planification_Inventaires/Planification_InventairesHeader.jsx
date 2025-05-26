import React from 'react'
import ST from "/ST.png";
import '../Css/Planification_Inventaires.css';

const Planification_InventairesHeader = () => {
  return (
<div className="flex items-center justify-between p-5 " id='nav'>
      <div>
        <h1 id="calendrier_text">planification des Inventaires</h1>
      </div>
      <div className="w-100 h-10 rounded-full flex items-center justify-center font-bold">
        <img src={ST} alt="" />
      </div>
    </div>  )
}

export default Planification_InventairesHeader