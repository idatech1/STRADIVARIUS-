import React from 'react'
import ST from "/ST.png";
import '../Css/Magasin.css';

const UtilisateursHeader = () => {
  return (
<div className="flex items-center justify-between p-5 " id='nav'>
<div>
        <h1 id="calendrier_text">Gestion Des Utilisateurs</h1>
      </div>
      <div className="w-100 h-10 rounded-full flex items-center justify-center font-bold">
        <img src={ST} alt="" />
      </div>
    </div>  )
}

export default UtilisateursHeader