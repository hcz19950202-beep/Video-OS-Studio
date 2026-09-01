import {ProjectHistoryAttributionRepository} from "@/lib/project/history-attribution";
import {getGlobalRuntime} from "@/lib/server/global-runtime";
import {dataRoot,fileSystem,projectRepository} from "@/lib/server/runtime";

export const projectHistoryAttributions=getGlobalRuntime(
  `${dataRoot}:project-history-attributions`,
  ()=>new ProjectHistoryAttributionRepository(fileSystem,projectRepository),
);
