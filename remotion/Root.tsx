import { Composition } from "remotion";
import { createProject } from "@/lib/project/factory";
import { MasterComposition } from "./MasterComposition";

const sample = createProject({
  id: "render-default",
  name: "Render Default",
  durationInFrames: 30,
});

export const RemotionRoot = () => (
  <Composition
    id="VideoOSMaster"
    component={MasterComposition}
    width={1080}
    height={1920}
    fps={30}
    durationInFrames={30}
    defaultProps={{ project: sample, assetUrls: {}, renderMode: "final" }}
  />
);
