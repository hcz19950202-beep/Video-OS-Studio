import {mkdtemp,readFile,rm,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach,describe,expect,it} from "vitest";
import {canonicalMediaMime,createStreamingFileResponse} from "@/lib/http/streaming-file";
import {streamRequestBodyToFile,UploadAbortedError,UploadTooLargeError} from "@/lib/http/stream-upload";
import {InMemoryFileSystemAdapter} from "@/adapters/filesystem";
import {MockFfmpegAdapter} from "@/adapters/mocks";
import {MediaImportService} from "@/lib/media/import-service";
import {ProjectRepository} from "@/lib/project/repository";

const roots:string[]=[];
const tempRoot=async()=>{const root=await mkdtemp(join(tmpdir(),"video-os-h4-"));roots.push(root);return root;};
const streamOf=(...chunks:number[][])=>new ReadableStream<Uint8Array>({start(controller){for(const chunk of chunks)controller.enqueue(Uint8Array.from(chunk));controller.close();}});
afterEach(async()=>{await Promise.all(roots.splice(0).map(root=>rm(root,{recursive:true,force:true})));});

describe("H4 streaming file responses",()=>{
  it("serves full and ranged GETs without whole-file buffers",async()=>{
    const root=await tempRoot();const path=join(root,"sample.mp4");await writeFile(path,Buffer.from("0123456789","utf8"));
    const full=await createStreamingFileResponse(new Request("http://local/file"),path);
    expect(full.status).toBe(200);expect(full.headers.get("content-length")).toBe("10");expect(full.headers.get("accept-ranges")).toBe("bytes");expect(full.headers.get("x-content-type-options")).toBe("nosniff");expect(Buffer.from(await full.arrayBuffer()).toString()).toBe("0123456789");
    const range=await createStreamingFileResponse(new Request("http://local/file",{headers:{Range:"bytes=2-5"}}),path);
    expect(range.status).toBe(206);expect(range.headers.get("content-range")).toBe("bytes 2-5/10");expect(range.headers.get("content-length")).toBe("4");expect(Buffer.from(await range.arrayBuffer()).toString()).toBe("2345");
    const suffix=await createStreamingFileResponse(new Request("http://local/file",{headers:{Range:"bytes=-3"}}),path);expect(Buffer.from(await suffix.arrayBuffer()).toString()).toBe("789");
    const open=await createStreamingFileResponse(new Request("http://local/file",{headers:{Range:"bytes=7-"}}),path);expect(Buffer.from(await open.arrayBuffer()).toString()).toBe("789");
  });

  it("supports HEAD and returns 416 for unsatisfiable ranges",async()=>{
    const root=await tempRoot();const path=join(root,"sample.webm");await writeFile(path,Buffer.from("abcdef","utf8"));
    const head=await createStreamingFileResponse(new Request("http://local/file",{method:"HEAD",headers:{Range:"bytes=1-3"}}),path);
    expect(head.status).toBe(206);expect(head.body).toBeNull();expect(head.headers.get("content-range")).toBe("bytes 1-3/6");expect(head.headers.get("content-length")).toBe("3");
    const invalid=await createStreamingFileResponse(new Request("http://local/file",{headers:{Range:"bytes=99-"}}),path);
    expect(invalid.status).toBe(416);expect(invalid.headers.get("content-range")).toBe("bytes */6");expect(invalid.body).toBeNull();
  });

  it("uses canonical MIME from the server-side file extension",()=>{
    expect(canonicalMediaMime("input/camera.MOV")).toBe("video/quicktime");expect(canonicalMediaMime("assets/a.mp4","text/plain")).toBe("video/mp4");expect(canonicalMediaMime("assets/unknown.bin")).toBe("application/octet-stream");
  });
});

describe("H4 bounded streaming uploads",()=>{
  it("streams chunks to disk and returns the actual byte count",async()=>{
    const root=await tempRoot();const path=join(root,"upload.part");const result=await streamRequestBodyToFile({body:streamOf([1,2],[3,4,5]),destination:path,maxBytes:10});
    expect(result.sizeBytes).toBe(5);expect([...await readFile(path)]).toEqual([1,2,3,4,5]);
  });

  it("rejects oversized streams and removes the partial temp file",async()=>{
    const root=await tempRoot();const path=join(root,"upload.part");
    await expect(streamRequestBodyToFile({body:streamOf([1,2,3],[4,5,6]),destination:path,maxBytes:5})).rejects.toBeInstanceOf(UploadTooLargeError);
    await expect(readFile(path)).rejects.toMatchObject({code:"ENOENT"});
  });

  it("rejects an oversized declared Content-Length before writing",async()=>{
    const root=await tempRoot();const path=join(root,"upload.part");
    await expect(streamRequestBodyToFile({body:streamOf([1]),destination:path,maxBytes:5,contentLength:6})).rejects.toBeInstanceOf(UploadTooLargeError);
    await expect(readFile(path)).rejects.toMatchObject({code:"ENOENT"});
  });

  it("aborts a pending stream and removes the partial temp file",async()=>{
    const root=await tempRoot();const path=join(root,"upload.part");const controller=new AbortController();let cancelled=false;
    const body=new ReadableStream<Uint8Array>({start(stream){stream.enqueue(Uint8Array.from([1,2,3,4]));},cancel(){cancelled=true;}});
    const pending=streamRequestBodyToFile({body,destination:path,maxBytes:1024,signal:controller.signal});setTimeout(()=>controller.abort(),20);
    await expect(pending).rejects.toBeInstanceOf(UploadAbortedError);expect(cancelled).toBe(true);await expect(readFile(path)).rejects.toMatchObject({code:"ENOENT"});
  });
});

describe("H4 staged media import",()=>{
  it("moves a staged file into the Project without requiring a Uint8Array upload payload",async()=>{
    const fs=new InMemoryFileSystemAdapter();const repo=new ProjectRepository(fs,"/data");await repo.create({id:"streamed",name:"Streamed",fps:30});const ffmpeg=new MockFfmpegAdapter({durationSeconds:2,width:1280,height:720,fps:30,hasAudio:true});const service=new MediaImportService(fs,ffmpeg,repo,()=>"staged");
    await fs.writeBinary("/data/projects/streamed/.uploads/source.part",new Uint8Array([1,2,3,4]));
    const result=await service.importWithReport({projectId:"streamed",fileName:"large source.mp4",mimeType:"video/mp4",sourcePath:"/data/projects/streamed/.uploads/source.part",sizeBytes:4});
    expect(result.project.assets[0]).toMatchObject({relativePath:"input/media-staged-large-source.mp4",sizeBytes:4});expect(await fs.exists("/data/projects/streamed/.uploads/source.part")).toBe(false);expect(await fs.exists("/data/projects/streamed/input/media-staged-large-source.mp4")).toBe(true);
  });
});
