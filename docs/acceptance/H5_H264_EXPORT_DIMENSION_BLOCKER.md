# V2.3.1 H5 Blocker — H.264 Export Dimension Truth

H5 acceptance on product SHA `4df173cdc40a330d677302ce5038157bf1c439e4` exposed a real contract mismatch:

- Project Canvas may legitimately use odd dimensions such as `641×361`;
- MP4/H.264 Export Profile previously resolved project sizing to the same odd dimensions;
- render-final therefore prepared Remotion with `641×361`;
- the real H.264 output probed as `640×360`.

The product must not claim one resolved export size while producing another.

## Fix contract

- Project Canvas remains unchanged and may remain odd for compatibility.
- Project Schema remains `2.0.0`.
- MP4/H.264 resolved export dimensions are normalized down to the nearest even integer when necessary.
- Already-even dimensions remain unchanged.
- Both `sizing: project` and `sizing: custom` use the same normalization.
- `projectForExportProfile()` applies the normalized resolved dimensions only to the non-destructive render clone.
- render-final Job output naming/profile and Remotion prepared Project use the same resolved dimensions.
- No Remotion, HyperFrames, Node, Playwright or Project Schema pin changes.
- No H4 network/security behavior changes.

Example:

`Project Canvas 641×361 → resolved MP4/H.264 Export 640×360 → actual encoded 640×360`.

After cloud CI, a Local Windows exact-SHA gate must reproduce the original H5 Case E using the real `641×361` Project and genuine Next asset route, and verify the encoded MP4 matches the resolved profile.

Because a product defect changed the accepted product SHA, full H5 A–E acceptance must restart after this blocker merges.
