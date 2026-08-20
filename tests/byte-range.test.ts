import {describe,expect,it} from "vitest";
import {parseSingleByteRange,RangeNotSatisfiableError} from "@/lib/http/byte-range";

describe("parseSingleByteRange",()=>{
  it("returns null when no range was requested",()=>{
    expect(parseSingleByteRange(null,1000)).toBeNull();
  });

  it("parses bounded, open-ended, and suffix ranges",()=>{
    expect(parseSingleByteRange("bytes=100-199",1000)).toEqual({start:100,end:199});
    expect(parseSingleByteRange("bytes=900-",1000)).toEqual({start:900,end:999});
    expect(parseSingleByteRange("bytes=-100",1000)).toEqual({start:900,end:999});
    expect(parseSingleByteRange("bytes=900-1200",1000)).toEqual({start:900,end:999});
  });

  it("rejects multiple and unsatisfiable ranges",()=>{
    expect(()=>parseSingleByteRange("bytes=0-1,4-5",1000)).toThrow(RangeNotSatisfiableError);
    expect(()=>parseSingleByteRange("bytes=1000-",1000)).toThrow(RangeNotSatisfiableError);
    expect(()=>parseSingleByteRange("bytes=20-10",1000)).toThrow(RangeNotSatisfiableError);
  });
});
