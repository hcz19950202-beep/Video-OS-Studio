import {ProjectSchema,CURRENT_PROJECT_VERSION,type Project} from "@/schemas/project";
import {LegacyProjectV1Schema} from "@/schemas/project-v1";
import {DEFAULT_BRAND_CONFIG} from "@/schemas/brand";
import {DEFAULT_LANGUAGE_CONFIG} from "@/schemas/language";

export class UnsupportedProjectVersionError extends Error{
  constructor(public readonly version:unknown){super(`Unsupported project version: ${String(version)}`);this.name="UnsupportedProjectVersionError";}
}

export class InvalidProjectMigrationError extends Error{
  constructor(message:string){super(message);this.name="InvalidProjectMigrationError";}
}

export type ProjectMigration=(input:unknown)=>unknown;
type ProjectMigrationStep={toVersion:string;migrate:ProjectMigration};

const migrations=new Map<string,ProjectMigrationStep>();

const readVersion=(input:unknown):unknown=>input&&typeof input==="object"?Reflect.get(input,"version"):undefined;

export const registerProjectMigration=(fromVersion:string,toVersion:string,migration:ProjectMigration):void=>{
  if(!fromVersion||!toVersion)throw new InvalidProjectMigrationError("Migration versions must be non-empty.");
  if(fromVersion===toVersion)throw new InvalidProjectMigrationError(`Migration ${fromVersion} cannot target the same version.`);
  migrations.set(fromVersion,{toVersion,migrate:migration});
};

const migrateV1ToV2Payload=(input:unknown):unknown=>{
  const legacy=LegacyProjectV1Schema.parse(input);
  return{
    ...legacy,
    version:CURRENT_PROJECT_VERSION,
    script:{baseSourceRanges:[],segments:[]},
    scenes:[],
    markers:[],
    brand:structuredClone(DEFAULT_BRAND_CONFIG),
    linkedStyles:[],
    language:structuredClone(DEFAULT_LANGUAGE_CONFIG),
  };
};

registerProjectMigration("1.0.0",CURRENT_PROJECT_VERSION,migrateV1ToV2Payload);

export const migrateV1Project=(input:unknown):Project=>ProjectSchema.parse(migrateV1ToV2Payload(input));

export const migrateProject=(input:unknown):Project=>{
  if(!input||typeof input!=="object")throw new Error("Project payload must be an object");
  let current:unknown=input;
  let version=readVersion(current);
  const visited=new Set<string>();

  while(version!==CURRENT_PROJECT_VERSION){
    if(typeof version!=="string")throw new UnsupportedProjectVersionError(version);
    if(visited.has(version))throw new InvalidProjectMigrationError(`Project migration cycle detected at ${version}.`);
    visited.add(version);
    const step=migrations.get(version);
    if(!step)throw new UnsupportedProjectVersionError(version);
    current=step.migrate(current);
    const actualVersion=readVersion(current);
    if(actualVersion!==step.toVersion)throw new InvalidProjectMigrationError(`Migration ${version} → ${step.toVersion} returned version ${String(actualVersion)}.`);
    version=actualVersion;
  }

  return ProjectSchema.parse(current);
};
