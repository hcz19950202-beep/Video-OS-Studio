export const withErrorPreservingCleanup=async<T>(
  work:()=>Promise<T>,
  cleanup:()=>Promise<void>,
  dualFailureMessage:string,
):Promise<T>=>{
  let result!:T;
  let workError:unknown;
  let workFailed=false;
  try{result=await work();}
  catch(error){workFailed=true;workError=error;}

  try{await cleanup();}
  catch(cleanupError){
    if(workFailed)throw new AggregateError([workError,cleanupError],dualFailureMessage);
    throw cleanupError;
  }

  if(workFailed)throw workError;
  return result;
};
