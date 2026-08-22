# V2.1 Universal Canvas Contract

Video OS Studio V2.1 must not assume portrait, landscape, 9:16, 16:9, or any other fixed aspect ratio as the product model.

## Three separate domains

### Source media

Source media describes the imported file/container/codec and its intrinsic dimensions.

Examples:

- MOV / MP4 / WebM / MKV / M4V / AVI;
- 3840×2160;
- 1080×1920;
- arbitrary source dimensions.

Source media does not define the editor layout.

### Project canvas

The project canvas is the durable editing coordinate system:

```text
project.canvas.width
project.canvas.height
project.canvas.fps
```

It controls preview composition, Canvas coordinates, safe area, caption/effect layout and default render dimensions.

### Export profile

Export profile describes output container/codec/resolution/fps/quality. By default output dimensions follow the Project Canvas, but export configuration must not mutate the editor shell.

## Universal viewer

There is one Viewer implementation. It fits the active project canvas inside the available viewer region:

```text
scale = min(
  availableWidth / canvasWidth,
  availableHeight / canvasHeight
)
```

There is no portrait viewer and no landscape viewer.

## Canvas presets

Presets are shortcuts only. Custom width/height is the underlying model.

Required preset shortcuts:

- 1920×1080 / 16:9
- 1080×1920 / 9:16
- 1080×1080 / 1:1
- 1080×1350 / 4:5
- 1080×1440 / 3:4
- 1440×1080 / 4:3
- 2560×1080 / 21:9
- UHD landscape / portrait

## PR review rule

Every V2.1 UI PR must answer:

> Does this implementation assume a fixed canvas aspect ratio?

If yes, and the feature is not explicitly an aspect-specific template, the implementation should not merge.

## Cloud acceptance matrix

Pure layout/math tests must cover:

- landscape;
- portrait;
- square;
- ultrawide;
- custom landscape;
- custom portrait.

## Local acceptance matrix

Windows acceptance must visually exercise at least:

- 1920×1080;
- 1080×1920;
- 1080×1080;
- 2560×1080;
- 1600×900;
- 900×1600.

Final V2.1 acceptance must produce real renders for at least one landscape, one portrait, and one square/custom project.
