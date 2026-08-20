import {ProjectSchema,CURRENT_PROJECT_VERSION,type Project} from "@/schemas/project";
import {LegacyProjectV1Schema} from "@/schemas/project-v1";
import {DEFAULT_BRAND_CONFIG} from "@/schemas/brand";
import {DEFAULT_LANGUAGE_CONFIG} from "@/schemas/language";

export class UnsupportedProjectVersionError extends Error{
  constructor(public readonly version:unknown){super(`Unsupported project version: ${String(version)}`);this.name="UnsupportedProjectVersionError";}
}

export type ProjectMigration=(input:unknown)=>unknown;

const migrations:Record<string,ProjectMigration>={};

export const registerProjectMigration=(fromVersion:string,migration:ProjectMigration):void=>{migrations[fromVersion]=migration;};

export const migrateV1Project=(input:unknown):Project=>{
  const legacy=LegacyProjectV1Schema.parse(input);
  return ProjectSchema.parse({
    ...legacy,
    version:CURRENT_PROJECT_VERSION,
    script:{segments:[]},
    scenes:[],
    markers:[],
    brand:structuredClone(DEFAULT_BRAND_CONFIG),
    linkedStyles:[],
    language:structuredClone(DEFAULT_LANGUAGE_CONFIG),
  });
};

export const migrateProject=(input:unknown):Project=>{
  if(!input||typeof input!=="object")throw new Error("Project payload must be an object");
  const version=Reflect.get(input,"version");
  if(version===CURRENT_PROJECT_VERSION)return ProjectSchema.parse(input);
  if(version==="1.0.0")return migrateV1Project(input);
  if(typeof version==="string"&&migrations[version])return ProjectSchema.parse(migrations[version](input));
  throw new UnsupportedProjectVersionError(version);
};
