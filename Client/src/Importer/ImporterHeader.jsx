import React from 'react'
import ST from "/ST.png";
import '../Css/Import.css';

const ImporterHeader = () => {
  return (
<div className="flex items-center justify-between p-5 " id='nav'>
<div>
        <h1 id="calendrier_text">Importation des fichiers des transferts</h1>
      </div>
      <div className="w-100 h-10 rounded-full flex items-center justify-center font-bold">
        <img src={ST} alt="" />
      </div>
    </div>  )
}

export default ImporterHeader