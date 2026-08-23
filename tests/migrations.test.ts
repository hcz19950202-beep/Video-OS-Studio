import {readFileSync} from "node:fs";
import {join} from "node:path";
import {describe,expect,it} from "vitest";
import legacyFixture from "@/tests/fixtures/legacy-v1-project.json";
import {createProject} from "@/lib/project/factory";
import {InvalidProjectMigrationError,migrateProject,migrateV1Project,registerProjectMigration,UnsupportedProjectVersionError} from "@/lib/project/migrations";

describe("project migrations",()=>{
  it("loads the current version without migration",()=>{
    const project=createProject({id:"current",name:"Current",now:"2026-08-19T00:00:00.000Z"});
    expect(migrateProject(project).version).toBe("2.0.0");
  });

  it("migrates validated V1 projects without losing accepted legacy media state",()=>{
    const migrated=migrateV1Project(legacyFixture);
    expect(migrated.version).toBe("2.0.0");
    expect(migrated.project).toEqual(legacyFixture.project);
    expect(migrated.canvas).toEqual(legacyFixture.canvas);
    expect(migrated.assets).toEqual(legacyFixture.assets);
    expect(migrated.tracks).toEqual(legacyFixture.tracks);
    expect(migrated.script).toEqual({baseSourceRanges:[],segments:[]});
    expect(migrated.scenes).toEqual([]);
    expect(migrated.markers).toEqual([]);
    expect(migrated.linkedStyles).toEqual([]);
    expect(migrated.language).toEqual({sourceLanguage:"unknown",captionTracks:[]});
    const motion=migrated.tracks.find(track=>track.type==="motion")?.clips.find(clip=>clip.id==="motion-1");
    expect(motion?.type).toBe("motion");
    if(motion?.type==="motion")expect(motion.transform).toEqual({x:80,y:-120,scale:1.25,opacity:0.8,anchor:"top-right"});
  });

  it("keeps the V1 contract physically independent from mutable current Asset/Clip schemas",()=>{
    const source=readFileSync(join(process.cwd(),"schemas","project-v1.ts"),"utf8");
    expect(source).not.toContain('from "@/schemas/asset"');
    expect(source).not.toContain('from "@/schemas/clip"');
  });

  it("routes legacy V1 payloads through the built-in migration",()=>{
    expect(migrateProject(legacyFixture).version).toBe("2.0.0");
  });

  it("executes registered migrations step-by-step until the current version",()=>{
    registerProjectMigration("0.9.0","1.0.0",()=>({...legacyFixture,version:"1.0.0",project:{...legacyFixture.project,id:"chained-v1"}}));
    const migrated=migrateProject({version:"0.9.0",legacy:true});
    expect(migrated.version).toBe("2.0.0");
    expect(migrated.project.id).toBe("chained-v1");
  });

  it("rejects a migration step that lies about its destination version",()=>{
    registerProjectMigration("0.8.0","1.0.0",()=>({version:"0.7.0"}));
    expect(()=>migrateProject({version:"0.8.0"})).toThrow(InvalidProjectMigrationError);
  });

  it("fails explicitly for unknown versions",()=>{
    expect(()=>migrateProject({version:"99.0.0"})).toThrow(UnsupportedProjectVersionError);
  });
});
