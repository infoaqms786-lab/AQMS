// --- Shared Utilities ---

const $ = id => document.getElementById(id);

async function query(q){
      const {data,error}=await q;

      if(error)throw error;
      
      return data;
    }