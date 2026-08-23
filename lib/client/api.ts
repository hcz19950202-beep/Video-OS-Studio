export type ApiErrorPayload={
  code?:string;
  error?:string;
  message?:string;
  action?:string;
  retryable?:boolean;
  details?:Record<string,unknown>;
  requestId?:string;
};

export class ApiRequestError extends Error{
  constructor(
    message:string,
    readonly status:number,
    readonly code?:string,
    readonly action?:string,
    readonly retryable=true,
    readonly details?:Record<string,unknown>,
    readonly requestId?:string,
  ){
    super(message);
    this.name="ApiRequestError";
  }
}

export type ClientErrorState={message:string;action?:string;retryable:boolean};

const readJson=async(response:Response):Promise<unknown>=>{
  try{return await response.json();}catch{return undefined;}
};

export const parseJsonResponse=async<T>(response:Response):Promise<T>=>{
  const payload=await readJson(response) as (T&ApiErrorPayload)|undefined;
  if(!response.ok){
    throw new ApiRequestError(
      payload?.message||payload?.error||`Request failed with status ${response.status}`,
      response.status,
      payload?.code,
      payload?.action,
      payload?.retryable??true,
      payload?.details,
      payload?.requestId,
    );
  }
  if(payload===undefined)throw new ApiRequestError("Response did not contain valid JSON.",response.status,"INVALID_JSON_RESPONSE",undefined,false);
  return payload as T;
};

export const requestJson=async<T>(input:RequestInfo|URL,init?:RequestInit):Promise<T>=>parseJsonResponse<T>(await fetch(input,init));

export const toClientErrorState=(error:unknown):ClientErrorState=>{
  if(error instanceof ApiRequestError)return{message:error.message,action:error.action,retryable:error.retryable};
  if(error instanceof Error)return{message:error.message,retryable:true};
  return{message:String(error),retryable:true};
};
