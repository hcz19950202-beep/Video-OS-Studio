const DEFAULT_MAX_RESPONSE_BYTES=2_000_000;

export class ProviderResponseTooLargeError extends Error{
  constructor(readonly maxBytes:number){super(`Provider response exceeded ${maxBytes} bytes.`);this.name="ProviderResponseTooLargeError";}
}

export const cancelProviderResponseBody=async(response:Response)=>{
  try{await response.body?.cancel();}catch{return;}
};

export const readProviderResponseTextBounded=async(response:Response,maxBytes=DEFAULT_MAX_RESPONSE_BYTES):Promise<string>=>{
  const declared=Number(response.headers.get("content-length"));
  if(Number.isFinite(declared)&&declared>maxBytes){await cancelProviderResponseBody(response);throw new ProviderResponseTooLargeError(maxBytes);}
  if(!response.body)return"";
  const reader=response.body.getReader();
  const decoder=new TextDecoder();
  let total=0;
  let text="";
  try{
    for(;;){
      const{done,value}=await reader.read();
      if(done)break;
      total+=value.byteLength;
      if(total>maxBytes){await reader.cancel().catch(()=>undefined);throw new ProviderResponseTooLargeError(maxBytes);}
      text+=decoder.decode(value,{stream:true});
    }
    text+=decoder.decode();
    return text;
  }finally{
    reader.releaseLock();
  }
};
