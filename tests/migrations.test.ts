import {describe,expect,it} from "vitest";
import legacyFixture from "@/tests/fixtures/legacy-v1-project.json";
import {createProject} from "@/lib/project/factory";
import {migrateProject,migrateV1Project,registerProjectMigration,UnsupportedProjectVersionError} from "@/lib/project/migrations";

describe("project migrations",()=>{
  it("loads the current version without migration",()=>{
    const project=createProject({id:"current",name:"Current",now:"2026-08-19T00:00:00.000Z"});
    expect(migrateProject(project).version).toBe("2.0.0");
  });

  it("migrates validated V1 projects without losing accepted V1.1 media state",()=>{
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

  it("routes legacy V1 payloads through the built-in migration",()=>{
    expect(migrateProject(legacyFixture).version).toBe("2.0.0");
  });

  it("supports explicit registered migrations",()=>{
    registerProjectMigration("0.9.0",()=>createProject({id:"migrated",name:"Migrated",now:"2026-08-19T00:00:00.000Z"}));
    const migrated=migrateProject({version:"0.9.0",legacy:true});
    expect(migrated.project.id).toBe("migrated");
  });

  it("fails explicitly for unknown versions",()=>{
    expect(()=>migrateProject({version:"99.0.0"})).toThrow(UnsupportedProjectVersionError);
  });
});
