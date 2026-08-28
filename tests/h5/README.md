# H5 blocker regressions

These focused tests cover defects discovered during V2.3.1 H5 formal acceptance. They are product regression tests, not local acceptance harnesses.

Current blocker coverage:

- odd Project Canvas remains durable Project truth;
- MP4/H.264 Export Profile resolves odd dimensions to codec-compatible even dimensions;
- odd custom export dimensions follow the same rule;
- render-final Job naming/profile and prepared Remotion Project use the resolved dimensions;
- Render UI continues to surface resolved dimensions;
- aspect mismatch is calculated against actual resolved output dimensions.
