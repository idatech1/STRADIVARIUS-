import React from 'react'
import UtilisateursHeader from './UtilisateursHeader'
import AddUtilisateurs from './AddUtilisateurs'
import logo from "/Logo-nesk-investment@2x.png";

const Utilisateurs = () => {
  const appVersion = "1.0.0"; // ou importée depuis package.json

  return (
    <div className='ALL_Import' >
      <UtilisateursHeader />
      <div className="p-3 flex justify-center">
        <AddUtilisateurs />
      </div>
          <div className="flex flex-col items-center justify-center">
                       <div className="font-medium ">
                       </div>
                       <div className="h-12">
                         <img 
                           src={logo} 
                           alt="IDOA TECH" 
                           className="h-full object-contain"
                         />
                         
                       </div>
                  
                     </div>
    </div>
  )
}

export default Utilisateurs