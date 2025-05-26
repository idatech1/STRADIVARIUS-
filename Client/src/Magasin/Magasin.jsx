import React from 'react'
import MagasinHeader from './MagasinHeader'
import Add_Magasin from './Add_Magasin'
import logo from "/Logo-nesk-investment@2x.png";

const Magasin = () => {
  const appVersion = "1.0.0"; // ou importée depuis package.json

  return (
    <div className='ALL_Import' >
      <MagasinHeader />
      <div className="p-3 flex justify-center">
        <Add_Magasin />
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

export default Magasin