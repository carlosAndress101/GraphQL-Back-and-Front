// Side-effect import: registers the jest-dom matchers on Vitest's expect.
// oxlint-disable-next-line import/no-unassigned-import
import "@testing-library/jest-dom/vitest";
import { configure } from "@testing-library/react";

// The first test in a file pays the cold route import; on CI runners that
// exceeded the 1s default for findBy*/waitFor and failed intermittently.
configure({ asyncUtilTimeout: 3000 });
