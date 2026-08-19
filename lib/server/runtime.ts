import { join } from "node:path";
import { NodeFileSystemAdapter } from "@/adapters/filesystem";
import { NodeFfmpegAdapter } from "@/adapters/ffmpeg";
import { MediaImportService } from "@/lib/media/import-service";
import { ProjectRepository } from "@/lib/project/repository";

const dataRoot = process.env.VIDEO_OS_DATA_ROOT || join(process.cwd(), ".video-os-data");

export const fileSystem = new NodeFileSystemAdapter();
export const projectRepository = new ProjectRepository(fileSystem, dataRoot);
export const ffmpegAdapter = new NodeFfmpegAdapter();
export const mediaImportService = new MediaImportService(fileSystem, ffmpegAdapter, projectRepository);
