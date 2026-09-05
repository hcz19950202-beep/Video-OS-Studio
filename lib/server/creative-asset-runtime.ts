import {CreativeAssetRepository} from "@/lib/creative-assets/repository";
import {getGlobalRuntime} from "@/lib/server/global-runtime";
import {dataRoot,fileSystem} from "@/lib/server/runtime";

export const creativeAssetRepository=getGlobalRuntime(
  `${dataRoot}:creative-asset-repository`,
  ()=>new CreativeAssetRepository(fileSystem,dataRoot),
);
