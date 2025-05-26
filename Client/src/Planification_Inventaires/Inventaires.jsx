import React from 'react'
import Planification_InventairesHeader from './Planification_InventairesHeader'
import Planification_Inventaires from './Planification_Inventaires'
import logo from "/Logo-nesk-investment@2x.png";

const Inventaires = () => {
  const appVersion = "1.0.0"; // ou importée depuis package.json

  return (
    <div className='ALL_Import' >
      <Planification_InventairesHeader />
      <div className="p-3 flex justify-center">
        <Planification_Inventaires />
      </div>
         
    </div>
  )
}

export default Inventaires