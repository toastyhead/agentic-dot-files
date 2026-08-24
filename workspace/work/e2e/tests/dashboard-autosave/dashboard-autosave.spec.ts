import { expect, test, type Page, type Request, type Route } from "@playwright/test";
import { getButtonByText } from "../helpers/locators";

type JsonRecord = Record<string, unknown>;

type SavedView = {
  id: string;
  name: string;
  description?: string;
  filters: JsonRecord[];
  view_type: "dashboard";
  environment?: string | null;
  sort_by?: string | null;
  display_settings?: JsonRecord | null;
  start_time?: string | null;
  end_time?: string | null;
  time_range_preset?: string | null;
  starred?: boolean;
  created_at: string;
  updated_at: string;
  created_by: JsonRecord;
};

type DashboardWidget = {
  ref: string;
  layouts?: Record<string, JsonRecord>;
  style_override?: JsonRecord;
};

type DashboardDetail = {
  id: string;
  name: string;
  description?: string;
  widgets: DashboardWidget[];
  default_time_tick?: string | null;
  created_at: string;
  updated_at: string;
  created_by: JsonRecord;
};

type RecordedRequest = {
  id?: string;
  method: string;
  url: string;
  body: JsonRecord;
};

type DashboardAutosaveMockState = {
  savedViews: Map<string, SavedView>;
  dashboards: Map<string, DashboardDetail>;
  savedFilterCreates: RecordedRequest[];
  savedFilterUpdates: RecordedRequest[];
  dashboardCreates: RecordedRequest[];
  dashboardUpdates: RecordedRequest[];
  dashboardReads: RecordedRequest[];
  dashboardPatchFailures: Map<string, number>;
  savedFilterPatchFailures: Map<string, number>;
  dashboardPatchDelayMs: number;
  savedFilterPatchDelayMs: number;
};

const createdBy = {
  id: 1,
  email: "dashboard-autosave-e2e@example.com",
  name: "Dashboard Autosave E2E",
};

const baseCharts = [
  { type: "model", name: "error_count" },
  { type: "model", name: "total_cost" },
];

const baseSummary = {
  total_cost: 12.5,
  average_cost: 1.25,
  total_tokens: 1200,
  average_tokens: 120,
  total_prompt_tokens: 800,
  average_prompt_tokens: 80,
  total_completion_tokens: 400,
  average_completion_tokens: 40,
  average_latency: 0.44,
  average_ttft: 0.12,
  average_tps: 33,
  error_count: 1,
  error_percentage: 5,
  number_of_requests: 20,
  requests_per_second: 2,
};

const baseMetricRows = [
  {
    date_group: "2026-07-09T00:00:00.000Z",
    raw_date_group: "2026-07-09T00:00:00.000Z",
    ...baseSummary,
    max_tpm: 100,
    prompt_cache_hit_tokens: 0,
    cache_hit_percentage: 0,
    reasoning_tokens: 0,
  },
  {
    date_group: "2026-07-09T01:00:00.000Z",
    raw_date_group: "2026-07-09T01:00:00.000Z",
    ...baseSummary,
    number_of_requests: 24,
    total_cost: 14,
    max_tpm: 110,
    prompt_cache_hit_tokens: 0,
    cache_hit_percentage: 0,
    reasoning_tokens: 0,
  },
];

const namedViewFilters = [
  {
    id: "model-filter",
    metric: "model",
    display_name: "model",
    operator: "in",
    connector: "AND",
    value: ["gpt-4o-mini"],
  },
];

const localStorageDefaults = {
  displayCharts: JSON.stringify(baseCharts),
  dashboard_graph_type: "line",
  show_x_axis_major_grid: "false",
  show_y_axis_major_grid: "true",
  show_minor_grid: "true",
  show_tick_lines: "true",
  show_smooth_graph: "false",
};

const makeSavedView = ({
  id,
  name,
  description = `${name} description`,
  filters = namedViewFilters,
  environment = "prod",
}: {
  id: string;
  name: string;
  description?: string;
  filters?: JsonRecord[];
  environment?: string;
}): SavedView => ({
  id,
  name,
  description,
  filters,
  view_type: "dashboard",
  environment,
  sort_by: null,
  display_settings: null,
  start_time: null,
  end_time: null,
  time_range_preset: null,
  starred: false,
  created_at: "2026-07-09T00:00:00.000Z",
  updated_at: "2026-07-09T00:00:00.000Z",
  created_by: createdBy,
});

const makeWidget = ({
  chartName,
  chartType = "model",
  x = 0,
  y = 0,
  variant = "line",
  xGrid = false,
  yGrid = true,
  minorGrid = true,
  tickLines = true,
  smoothGraph = false,
  autoRefreshIntervalSeconds,
}: {
  chartName: string;
  chartType?: string;
  x?: number;
  y?: number;
  variant?: string;
  xGrid?: boolean;
  yGrid?: boolean;
  minorGrid?: boolean;
  tickLines?: boolean;
  smoothGraph?: boolean;
  autoRefreshIntervalSeconds?: number;
}): DashboardWidget => ({
  ref: `builtin:${chartName}`,
  layouts: {
    xl: { x, y, w: 3, h: 9 },
    lg: { x, y, w: 4, h: 9 },
  },
  style_override: {
    chart_name: chartName,
    chart_type: chartType,
    chart_variant: variant,
    is_showing_x_axis_major_grid: xGrid,
    is_showing_y_axis_major_grid: yGrid,
    is_showing_minor_grid: minorGrid,
    is_showing_tick_lines: tickLines,
    is_showing_smooth_graph: smoothGraph,
    auto_refresh_interval_seconds: autoRefreshIntervalSeconds,
  },
});

const makeDashboard = ({
  id,
  name,
  description = `${name} description`,
  widgets = [
    makeWidget({ chartName: "error_count" }),
    makeWidget({ chartName: "total_cost", x: 4 }),
  ],
  defaultTimeTick = "hour",
}: {
  id: string;
  name: string;
  description?: string;
  widgets?: DashboardWidget[];
  defaultTimeTick?: string;
}): DashboardDetail => ({
  id,
  name,
  description,
  widgets,
  default_time_tick: defaultTimeTick,
  created_at: "2026-07-09T00:00:00.000Z",
  updated_at: "2026-07-09T00:00:00.000Z",
  created_by: createdBy,
});

const makeMockState = ({
  views = [],
  dashboards = [],
}: {
  views?: SavedView[];
  dashboards?: DashboardDetail[];
} = {}): DashboardAutosaveMockState => ({
  savedViews: new Map(views.map((view) => [view.id, view])),
  dashboards: new Map(dashboards.map((dashboard) => [dashboard.id, dashboard])),
  savedFilterCreates: [],
  savedFilterUpdates: [],
  dashboardCreates: [],
  dashboardUpdates: [],
  dashboardReads: [],
  dashboardPatchFailures: new Map(),
  savedFilterPatchFailures: new Map(),
  dashboardPatchDelayMs: 0,
  savedFilterPatchDelayMs: 0,
});

const delay = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const getJsonBody = (request: Request): JsonRecord => {
  const body = request.postData();
  if (!body) return {};

  try {
    return JSON.parse(body) as JsonRecord;
  } catch {
    return {};
  }
};

const fulfillJson = async (route: Route, body: unknown, status = 200) => {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "*",
      "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
    },
  });
};

const listShape = <T,>(results: T[]) => ({
  count: results.length,
  next: null,
  previous: null,
  results,
});

const installDashboardAutosaveMocks = async (
  page: Page,
  state: DashboardAutosaveMockState,
  options: {
    dashboardIdByViewScope?: Record<string, string>;
    localStorageOverrides?: Record<string, string | null>;
  } = {},
) => {
  await page.addInitScript(
    ({ storageDefaults, dashboardIdByViewScope, localStorageOverrides }) => {
      const exactKeysToReset = [
        "dashboard_graph_type",
        "show_x_axis_major_grid",
        "show_y_axis_major_grid",
        "show_minor_grid",
        "show_tick_lines",
        "show_smooth_graph",
        "dashboard_auto_refresh_interval_seconds",
        "displayCharts",
        "autoFetchEnabled",
        "dashboard_last_view_id",
        "environment",
      ];

      exactKeysToReset.forEach((key) => window.localStorage.removeItem(key));

      for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
        const key = window.localStorage.key(index);
        if (
          key?.startsWith("dashboardChartLayouts:") ||
          key?.startsWith("viewState_dashboard_")
        ) {
          window.localStorage.removeItem(key);
        }
      }

      Object.entries(storageDefaults).forEach(([key, value]) => {
        window.localStorage.setItem(key, value);
      });

      Object.entries(localStorageOverrides ?? {}).forEach(([key, value]) => {
        if (value == null) {
          window.localStorage.removeItem(key);
          return;
        }
        window.localStorage.setItem(key, value);
      });

      window.sessionStorage.removeItem("dashboard_view_dashboard_id_map");
      if (dashboardIdByViewScope) {
        window.sessionStorage.setItem(
          "dashboard_view_dashboard_id_map",
          JSON.stringify(dashboardIdByViewScope),
        );
      }
    },
    {
      storageDefaults: localStorageDefaults,
      dashboardIdByViewScope: options.dashboardIdByViewScope,
      localStorageOverrides: options.localStorageOverrides,
    },
  );

  await page.route("**/api/saved-filters/**", async (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204 });
      return;
    }

    const url = new URL(request.url());
    const pathname = url.pathname;

    if (pathname.endsWith("/api/saved-filters/list/")) {
      await fulfillJson(route, listShape(Array.from(state.savedViews.values())));
      return;
    }

    if (pathname.endsWith("/api/saved-filters/") && request.method() === "POST") {
      const body = getJsonBody(request);
      const id = `created-view-${state.savedViews.size + 1}`;
      const savedView: SavedView = {
        ...makeSavedView({
          id,
          name: String(body.name ?? "Created dashboard view"),
          description: String(body.description ?? ""),
          filters: Array.isArray(body.filters) ? body.filters as JsonRecord[] : [],
          environment: String(body.environment ?? "all"),
        }),
        sort_by: typeof body.sort_by === "string" ? body.sort_by : null,
        display_settings:
          body.display_settings && typeof body.display_settings === "object"
            ? body.display_settings as JsonRecord
            : null,
      };

      state.savedViews.set(id, savedView);
      state.savedFilterCreates.push({
        method: request.method(),
        url: request.url(),
        body,
        id,
      });
      await fulfillJson(route, savedView, 201);
      return;
    }

    if (pathname.endsWith("/api/saved-filters/summary/")) {
      await fulfillJson(route, { views: [] });
      return;
    }

    await route.continue();
  });

  await page.route("**/api/saved-filter/**", async (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204 });
      return;
    }

    const url = new URL(request.url());
    const match = url.pathname.match(/\/api\/saved-filter\/([^/]+)\/?$/);
    const id = match?.[1];
    if (!id) {
      await route.continue();
      return;
    }

    if (request.method() === "PATCH") {
      const remainingFailures = state.savedFilterPatchFailures.get(id) ?? 0;
      if (remainingFailures > 0) {
        state.savedFilterPatchFailures.set(id, remainingFailures - 1);
        await fulfillJson(route, { detail: "autosave failure" }, 500);
        return;
      }

      const body = getJsonBody(request);
      const previous = state.savedViews.get(id) ?? makeSavedView({
        id,
        name: String(body.name ?? "Missing dashboard view"),
      });
      const next: SavedView = {
        ...previous,
        ...body,
        id,
        name: String(body.name ?? previous.name),
        description:
          typeof body.description === "string"
            ? body.description
            : previous.description,
        filters: Array.isArray(body.filters) ? body.filters as JsonRecord[] : previous.filters,
        view_type: "dashboard",
        environment:
          typeof body.environment === "string"
            ? body.environment
            : previous.environment,
        updated_at: "2026-07-09T01:00:00.000Z",
      };

      state.savedViews.set(id, next);
      state.savedFilterUpdates.push({
        method: request.method(),
        url: request.url(),
        body,
        id,
      });
      if (state.savedFilterPatchDelayMs > 0) {
        await delay(state.savedFilterPatchDelayMs);
      }
      await fulfillJson(route, next);
      return;
    }

    if (request.method() === "DELETE") {
      state.savedViews.delete(id);
      await route.fulfill({ status: 204 });
      return;
    }

    await fulfillJson(route, state.savedViews.get(id) ?? { detail: "not found" }, state.savedViews.has(id) ? 200 : 404);
  });

  await page.route("**/api/dashboards/**", async (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204 });
      return;
    }

    const url = new URL(request.url());
    const pathname = url.pathname;

    if (pathname.endsWith("/api/dashboards/") && request.method() === "GET") {
      const search = (url.searchParams.get("search") ?? "").trim().toLowerCase();
      const dashboards = Array.from(state.dashboards.values()).filter((dashboard) => {
        if (!search) return true;
        return (
          dashboard.name.toLowerCase().includes(search) ||
          (dashboard.description ?? "").toLowerCase().includes(search)
        );
      });
      await fulfillJson(route, listShape(dashboards.map(({ widgets: _widgets, ...rest }) => rest)));
      return;
    }

    if (pathname.endsWith("/api/dashboards/") && request.method() === "POST") {
      const body = getJsonBody(request);
      const id = `created-dashboard-${state.dashboards.size + 1}`;
      const dashboard: DashboardDetail = {
        ...makeDashboard({
          id,
          name: String(body.name ?? "Created dashboard"),
          description: String(body.description ?? ""),
          widgets: Array.isArray(body.widgets) ? body.widgets as DashboardWidget[] : [],
          defaultTimeTick: String(body.default_time_tick ?? "hour"),
        }),
      };
      state.dashboards.set(id, dashboard);
      state.dashboardCreates.push({
        method: request.method(),
        url: request.url(),
        body,
        id,
      });
      await fulfillJson(route, dashboard, 201);
      return;
    }

    const detailMatch = pathname.match(/\/api\/dashboards\/([^/]+)\/?$/);
    const id = detailMatch?.[1];
    if (!id) {
      await route.continue();
      return;
    }

    if (request.method() === "GET") {
      state.dashboardReads.push({
        method: request.method(),
        url: request.url(),
        body: {},
        id,
      });
      const dashboard = state.dashboards.get(id);
      await fulfillJson(route, dashboard ?? { detail: "not found" }, dashboard ? 200 : 404);
      return;
    }

    if (request.method() === "PATCH") {
      const failStatus = state.dashboardPatchFailures.get(id);
      if (failStatus) {
        state.dashboardPatchFailures.delete(id);
        await fulfillJson(route, { detail: "dashboard not found" }, failStatus);
        return;
      }

      const body = getJsonBody(request);
      const previous = state.dashboards.get(id);
      if (!previous) {
        await fulfillJson(route, { detail: "not found" }, 404);
        return;
      }

      const next: DashboardDetail = {
        ...previous,
        ...body,
        id,
        name: String(body.name ?? previous.name),
        description:
          typeof body.description === "string"
            ? body.description
            : previous.description,
        widgets: Array.isArray(body.widgets) ? body.widgets as DashboardWidget[] : previous.widgets,
        default_time_tick:
          typeof body.default_time_tick === "string"
            ? body.default_time_tick
            : previous.default_time_tick,
        updated_at: "2026-07-09T01:00:00.000Z",
      };

      state.dashboards.set(id, next);
      state.dashboardUpdates.push({
        method: request.method(),
        url: request.url(),
        body,
        id,
      });
      if (state.dashboardPatchDelayMs > 0) {
        await delay(state.dashboardPatchDelayMs);
      }
      await fulfillJson(route, next);
      return;
    }

    if (request.method() === "DELETE") {
      state.dashboards.delete(id);
      await route.fulfill({ status: 204 });
      return;
    }

    await route.continue();
  });

  await page.route("**/clickhouse/dashboard/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;

    if (path.includes("/quantiles/summary/")) {
      await fulfillJson(route, { summary: baseSummary });
      return;
    }

    if (path.includes("/quantiles/")) {
      await fulfillJson(route, { data: baseMetricRows, summary: baseSummary });
      return;
    }

    if (path.includes("/llm-metrics/summary/")) {
      await fulfillJson(route, baseSummary);
      return;
    }

    if (path.includes("/llm-metrics/")) {
      await fulfillJson(route, {
        data: baseMetricRows,
        summary: baseSummary,
        data_avg_by_model: [],
        data_avg_by_key: [],
      });
      return;
    }

    await fulfillJson(route, { data: [], summary: baseSummary });
  });
};

const openDashboard = async (
  page: Page,
  state: DashboardAutosaveMockState,
  options: {
    activeViewId?: string;
    dashboardIdByViewScope?: Record<string, string>;
    localStorageOverrides?: Record<string, string | null>;
  } = {},
) => {
  await installDashboardAutosaveMocks(page, state, options);

  const query = options.activeViewId
    ? `?active_filter_set_id_dashboard=${encodeURIComponent(options.activeViewId)}`
    : "";
  await page.goto(`/platform/dashboard${query}`);

  await expect(page.locator('button[aria-label="Metrics settings"]')).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.locator('button[aria-label="Metrics settings"]')).toBeEnabled({
    timeout: 20_000,
  });
};

const openMetricsSettings = async (page: Page) => {
  const settingsButton = page.locator('button[aria-label="Metrics settings"]');
  await settingsButton.click();
  await expect(page.getByText("Chart type", { exact: true })).toBeVisible();
};

const getSettingSwitch = (page: Page, label: string) =>
  page
    .getByText(label, { exact: true })
    .locator("xpath=ancestor::div[contains(@class,'justify-between')][1]")
    .locator('[role="switch"]');

const getChartTypeButton = (page: Page) =>
  page
    .getByText("Chart type", { exact: true })
    .locator("xpath=ancestor::div[contains(@class,'justify-between')][1]")
    .locator("button")
    .first();

const expectDashboardSettings = async (
  page: Page,
  expected: {
    chartType: "Line" | "Bar";
    switches: Record<string, boolean>;
  },
) => {
  await expect(getChartTypeButton(page)).toHaveText(expected.chartType);
  for (const [label, isChecked] of Object.entries(expected.switches)) {
    await expect(getSettingSwitch(page, label)).toHaveAttribute(
      "aria-checked",
      String(isChecked),
    );
  }
};

const toggleMetricSetting = async (page: Page, label: string) => {
  await getSettingSwitch(page, label).click();
};

const selectChartType = async (page: Page, chartType: "Line" | "Bar") => {
  await getChartTypeButton(page).click();
  await page.locator("button").filter({ hasText: new RegExp(`^${chartType}$`) }).last().click();
};

const selectAutoRefresh = async (page: Page, label: string) => {
  await page.locator('button[aria-label="Auto refresh"]').click();
  await page.locator("button").filter({ hasText: new RegExp(`^${label}$`) }).last().click();
};

const moveChartDown = async (page: Page, chartName: string) => {
  const handle = page.getByRole("button", {
    name: new RegExp(`Reorder ${chartName} chart`, "i"),
  });
  await handle.focus();
  await page.keyboard.press("ArrowDown");
};

const clickHomeNavigation = async (page: Page) => {
  await page.evaluate(() => {
    const existingLink = document.querySelector<HTMLAnchorElement>(
      "#dashboard-autosave-exit-link",
    );
    if (existingLink) {
      return;
    }

    const link = document.createElement("a");
    link.id = "dashboard-autosave-exit-link";
    link.href = "/platform/home";
    link.textContent = "Dashboard autosave exit target";
    link.style.position = "fixed";
    link.style.left = "16px";
    link.style.bottom = "16px";
    link.style.zIndex = "2147483647";
    link.style.background = "white";
    link.style.color = "black";
    link.style.padding = "8px";
    document.body.appendChild(link);
  });
  const homeLink = page.locator("#dashboard-autosave-exit-link");
  await expect(homeLink).toBeVisible();
  await homeLink.click();
};

const latest = <T,>(items: T[]): T => {
  const item = items[items.length - 1];
  if (!item) {
    throw new Error("Expected at least one recorded item");
  }
  return item;
};

const findWidget = (body: JsonRecord, ref: string): JsonRecord => {
  const widgets = body.widgets;
  if (!Array.isArray(widgets)) {
    throw new Error("Expected dashboard payload widgets array");
  }

  const widget = widgets.find((candidate) => {
    return (
      candidate &&
      typeof candidate === "object" &&
      (candidate as JsonRecord).ref === ref
    );
  });

  if (!widget || typeof widget !== "object") {
    throw new Error(`Missing widget ${ref}`);
  }

  return widget as JsonRecord;
};

const expectWidgetStyle = (
  widget: JsonRecord,
  expected: Record<string, string | number | boolean | null>,
) => {
  const style = widget.style_override;
  expect(style).toEqual(expect.objectContaining(expected));
};

const getLayout = (widget: JsonRecord, breakpoint: string): JsonRecord => {
  const layouts = widget.layouts;
  expect(layouts).toBeTruthy();
  expect(typeof layouts).toBe("object");
  const layout = (layouts as JsonRecord)[breakpoint];
  expect(layout).toBeTruthy();
  expect(typeof layout).toBe("object");
  return layout as JsonRecord;
};

const expectSavedFilterPatchPayload = (
  update: RecordedRequest,
  view: SavedView,
) => {
  expect(update.method).toBe("PATCH");
  expect(update.id).toBe(view.id);
  expect(update.body).toEqual(
    expect.objectContaining({
      name: view.name,
      description: view.description,
      view_type: "dashboard",
      environment: view.environment,
      display_settings: view.display_settings,
    }),
  );

  const filters = update.body.filters;
  expect(filters).toEqual(
    view.filters.map((filter) => {
      const { id: _id, ...filterWithoutId } = filter;
      return expect.objectContaining(filterWithoutId);
    }),
  );
  for (const filter of filters as JsonRecord[]) {
    expect(filter.id).toEqual(expect.any(String));
  }

  const nullableFields = [
    "sort_by",
    "start_time",
    "end_time",
    "time_range_preset",
  ] as const;
  for (const field of nullableFields) {
    if (view[field] == null) {
      expect(update.body).not.toHaveProperty(field);
    } else {
      expect(update.body).toHaveProperty(field, view[field]);
    }
  }
};

const expectDashboardPatchPayload = (
  update: RecordedRequest,
  dashboard: DashboardDetail,
  view: SavedView,
) => {
  expect(update.method).toBe("PATCH");
  expect(update.id).toBe(dashboard.id);
  expect(update.body).toEqual(
    expect.objectContaining({
      name: view.name,
      description: view.description,
      default_time_tick: dashboard.default_time_tick,
      widgets: expect.any(Array),
    }),
  );
  expect(update.body.widgets).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ ref: "builtin:error_count" }),
      expect.objectContaining({ ref: "builtin:total_cost" }),
    ]),
  );
};

const clearRecordedWrites = (state: DashboardAutosaveMockState) => {
  state.savedFilterCreates.length = 0;
  state.savedFilterUpdates.length = 0;
  state.dashboardCreates.length = 0;
  state.dashboardUpdates.length = 0;
};

const dashboardReadCount = (
  state: DashboardAutosaveMockState,
  dashboardId: string,
) => state.dashboardReads.filter((read) => read.id === dashboardId).length;

const dashboardUpdateCount = (
  state: DashboardAutosaveMockState,
  dashboardId: string,
) => state.dashboardUpdates.filter((update) => update.id === dashboardId).length;

const savedFilterUpdateCount = (
  state: DashboardAutosaveMockState,
  viewId: string,
) => state.savedFilterUpdates.filter((update) => update.id === viewId).length;

const waitForDashboardReadCount = async (
  state: DashboardAutosaveMockState,
  dashboardId: string,
  expectedCount: number,
) => {
  await expect
    .poll(() => dashboardReadCount(state, dashboardId), { timeout: 6_000 })
    .toBeGreaterThanOrEqual(expectedCount);
};

const waitForDashboardUpdateCount = async (
  state: DashboardAutosaveMockState,
  dashboardId: string,
  expectedCount: number,
) => {
  await expect
    .poll(() => dashboardUpdateCount(state, dashboardId), { timeout: 7_000 })
    .toBeGreaterThanOrEqual(expectedCount);
};

const waitForSavedFilterUpdateCount = async (
  state: DashboardAutosaveMockState,
  viewId: string,
  expectedCount: number,
) => {
  await expect
    .poll(() => savedFilterUpdateCount(state, viewId), { timeout: 7_000 })
    .toBeGreaterThanOrEqual(expectedCount);
};

const latestDashboardUpdateFor = (
  state: DashboardAutosaveMockState,
  dashboardId: string,
): RecordedRequest => latest(
  state.dashboardUpdates.filter((update) => update.id === dashboardId),
);

const latestSavedFilterUpdateFor = (
  state: DashboardAutosaveMockState,
  viewId: string,
): RecordedRequest => latest(
  state.savedFilterUpdates.filter((update) => update.id === viewId),
);

test.describe("dashboard autosave persistence", () => {
  test("persists the default dashboard view locally without saved-filter or dashboard API writes", async ({
    page,
  }) => {
    const state = makeMockState();

    await openDashboard(page, state);
    await openMetricsSettings(page);
    await toggleMetricSetting(page, "Smooth graph");
    await selectChartType(page, "Bar");
    await toggleMetricSetting(page, "X-axis major grids");
    await selectAutoRefresh(page, "Every 5 minutes");
    await moveChartDown(page, "total_cost");

    await expect(page.getByText("Saved", { exact: true })).toBeVisible({
      timeout: 5_000,
    });

    await expect
      .poll(() =>
        page.evaluate(() => ({
          displayCharts: JSON.parse(window.localStorage.getItem("displayCharts") ?? "[]") as JsonRecord[],
          graphType: window.localStorage.getItem("dashboard_graph_type"),
          xGrid: window.localStorage.getItem("show_x_axis_major_grid"),
          yGrid: window.localStorage.getItem("show_y_axis_major_grid"),
          minorGrid: window.localStorage.getItem("show_minor_grid"),
          tickLines: window.localStorage.getItem("show_tick_lines"),
          smoothGraph: window.localStorage.getItem("show_smooth_graph"),
          autoRefresh: window.localStorage.getItem(
            "dashboard_auto_refresh_interval_seconds",
          ),
          layouts: JSON.parse(
            window.localStorage.getItem("dashboardChartLayouts:__default__") ?? "{}",
          ) as JsonRecord,
        })),
      )
      .toMatchObject({
        graphType: "bar",
        xGrid: "true",
        yGrid: "true",
        minorGrid: "true",
        tickLines: "true",
        smoothGraph: "true",
        autoRefresh: "300",
      });

    const localState = await page.evaluate(() => ({
      displayCharts: JSON.parse(window.localStorage.getItem("displayCharts") ?? "[]") as JsonRecord[],
      layouts: JSON.parse(
        window.localStorage.getItem("dashboardChartLayouts:__default__") ?? "{}",
      ) as JsonRecord,
    }));
    const totalCostChart = localState.displayCharts.find(
      (chart) => chart.name === "total_cost",
    );
    expect(totalCostChart).toEqual(expect.objectContaining({ name: "total_cost" }));
    const lgLayouts = localState.layouts.lg as JsonRecord[] | undefined;
    expect(lgLayouts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          i: "__default__:model-total_cost",
          y: expect.any(Number),
        }),
      ]),
    );
    expect(state.savedFilterCreates).toHaveLength(0);
    expect(state.savedFilterUpdates).toHaveLength(0);
    expect(state.dashboardCreates).toHaveLength(0);
    expect(state.dashboardUpdates).toHaveLength(0);
  });

  test("autosaves a named dashboard view to saved-filter and dashboard widget payloads", async ({
    page,
  }) => {
    const view = makeSavedView({
      id: "view-alpha",
      name: "Autosave Alpha",
      description: "Alpha saved view",
    });
    const dashboard = makeDashboard({
      id: "dashboard-alpha",
      name: view.name,
      description: view.description,
    });
    const state = makeMockState({ views: [view], dashboards: [dashboard] });

    await openDashboard(page, state, { activeViewId: view.id });
    await expect(getButtonByText(page, "Autosave Alpha")).toBeVisible();
    await expect
      .poll(() => state.dashboardReads.some((read) => read.id === dashboard.id))
      .toBe(true);

    clearRecordedWrites(state);
    await openMetricsSettings(page);
    await toggleMetricSetting(page, "Smooth graph");
    await selectChartType(page, "Bar");
    await toggleMetricSetting(page, "X-axis major grids");
    await toggleMetricSetting(page, "Y-axis major grids");
    await toggleMetricSetting(page, "Tick lines");
    await selectAutoRefresh(page, "Every 5 minutes");
    await moveChartDown(page, "total_cost");

    await expect
      .poll(() => state.savedFilterUpdates.length, { timeout: 6_000 })
      .toBeGreaterThan(0);
    await expect
      .poll(() => state.dashboardUpdates.length, { timeout: 6_000 })
      .toBeGreaterThan(0);

    const savedFilterUpdate = latest(state.savedFilterUpdates);
    expect(savedFilterUpdate.id).toBe(view.id);
    expect(savedFilterUpdate.body).toEqual(
      expect.objectContaining({
        name: view.name,
        description: view.description,
        view_type: "dashboard",
        environment: "prod",
        filters: expect.arrayContaining([
          expect.objectContaining({
            metric: "model",
            operator: "in",
            value: ["gpt-4o-mini"],
          }),
        ]),
      }),
    );

    const dashboardUpdate = latest(state.dashboardUpdates);
    expect(dashboardUpdate.id).toBe(dashboard.id);
    expect(dashboardUpdate.body).toEqual(
      expect.objectContaining({
        name: view.name,
        description: view.description,
        default_time_tick: "hour",
      }),
    );

    const totalCostWidget = findWidget(dashboardUpdate.body, "builtin:total_cost");
    expectWidgetStyle(totalCostWidget, {
      chart_name: "total_cost",
      chart_type: "model",
      chart_variant: "bar",
      is_showing_x_axis_major_grid: true,
      is_showing_y_axis_major_grid: false,
      is_showing_minor_grid: true,
      is_showing_tick_lines: false,
      is_showing_smooth_graph: true,
      auto_refresh_interval_seconds: 300,
    });
    expect(getLayout(totalCostWidget, "lg")).toEqual(
      expect.objectContaining({
        y: expect.any(Number),
        w: 4,
        h: 9,
      }),
    );

    const localGraphType = await page.evaluate(() =>
      window.localStorage.getItem("dashboard_graph_type"),
    );
    expect(localGraphType).toBe("line");
  });

  test("keeps queued autosaves isolated when switching between saved dashboard views", async ({
    page,
  }) => {
    const alpha = makeSavedView({
      id: "view-alpha",
      name: "Autosave Alpha",
      description: "Alpha saved view",
    });
    const beta = makeSavedView({
      id: "view-beta",
      name: "Autosave Beta",
      description: "Beta saved view",
      environment: "test",
    });
    const alphaDashboard = makeDashboard({
      id: "dashboard-alpha",
      name: alpha.name,
      description: alpha.description,
    });
    const betaDashboard = makeDashboard({
      id: "dashboard-beta",
      name: beta.name,
      description: beta.description,
      widgets: [
        makeWidget({ chartName: "error_count", variant: "line" }),
        makeWidget({ chartName: "total_cost", x: 4, variant: "line" }),
      ],
    });
    const state = makeMockState({
      views: [alpha, beta],
      dashboards: [alphaDashboard, betaDashboard],
    });

    await openDashboard(page, state, { activeViewId: alpha.id });
    await expect(getButtonByText(page, "Autosave Alpha")).toBeVisible();
    await expect
      .poll(() => state.dashboardReads.some((read) => read.id === alphaDashboard.id))
      .toBe(true);

    clearRecordedWrites(state);
    await openMetricsSettings(page);
    await selectChartType(page, "Bar");
    await getButtonByText(page, "Autosave Beta").click();
    await expect
      .poll(() => state.dashboardReads.some((read) => read.id === betaDashboard.id), {
        timeout: 6_000,
      })
      .toBe(true);

    await openMetricsSettings(page);
    await toggleMetricSetting(page, "X-axis major grids");

    await expect
      .poll(() => state.savedFilterUpdates.map((update) => update.id), {
        timeout: 7_000,
      })
      .toEqual(expect.arrayContaining([alpha.id, beta.id]));
    await expect
      .poll(() => state.dashboardUpdates.map((update) => update.id), {
        timeout: 7_000,
      })
      .toEqual(expect.arrayContaining([alphaDashboard.id, betaDashboard.id]));

    const alphaUpdate = state.dashboardUpdates.find(
      (update) => update.id === alphaDashboard.id,
    );
    const betaUpdate = state.dashboardUpdates.find(
      (update) => update.id === betaDashboard.id,
    );

    expect(alphaUpdate?.body.name).toBe(alpha.name);
    expect(betaUpdate?.body.name).toBe(beta.name);
    expectWidgetStyle(findWidget(alphaUpdate?.body ?? {}, "builtin:error_count"), {
      chart_variant: "bar",
      is_showing_x_axis_major_grid: false,
    });
    expectWidgetStyle(findWidget(betaUpdate?.body ?? {}, "builtin:error_count"), {
      chart_variant: "line",
      is_showing_x_axis_major_grid: true,
    });
  });

  test("preserves payload correctness through repeated back-and-forth saved-view edits", async ({
    page,
  }) => {
    const alpha = makeSavedView({
      id: "view-alpha-sequence",
      name: "Sequence Alpha",
      description: "Alpha sequential saved view",
      environment: "prod",
    });
    const beta = makeSavedView({
      id: "view-beta-sequence",
      name: "Sequence Beta",
      description: "Beta sequential saved view",
      environment: "test",
    });
    const alphaDashboard = makeDashboard({
      id: "dashboard-alpha-sequence",
      name: alpha.name,
      description: alpha.description,
    });
    const betaDashboard = makeDashboard({
      id: "dashboard-beta-sequence",
      name: beta.name,
      description: beta.description,
      widgets: [
        makeWidget({ chartName: "error_count" }),
        makeWidget({ chartName: "total_cost", x: 4 }),
      ],
    });
    const state = makeMockState({
      views: [alpha, beta],
      dashboards: [alphaDashboard, betaDashboard],
    });

    await openDashboard(page, state, { activeViewId: alpha.id });
    await expect(getButtonByText(page, alpha.name)).toBeVisible();
    await waitForDashboardReadCount(state, alphaDashboard.id, 1);

    clearRecordedWrites(state);

    // First alpha edit: switch to bar charts, enable x-axis grids, turn on
    // one-minute auto-refresh, and move the first widget down.
    await openMetricsSettings(page);
    await selectChartType(page, "Bar");
    await toggleMetricSetting(page, "X-axis major grids");
    await selectAutoRefresh(page, "Every 1 minute");
    await moveChartDown(page, "error_count");

    await waitForSavedFilterUpdateCount(state, alpha.id, 1);
    await waitForDashboardUpdateCount(state, alphaDashboard.id, 1);

    const alphaFirstSavedFilter = latestSavedFilterUpdateFor(state, alpha.id);
    const alphaFirstDashboard = latestDashboardUpdateFor(
      state,
      alphaDashboard.id,
    );
    expectSavedFilterPatchPayload(alphaFirstSavedFilter, alpha);
    expectDashboardPatchPayload(alphaFirstDashboard, alphaDashboard, alpha);
    const alphaFirstErrorWidget = findWidget(
      alphaFirstDashboard.body,
      "builtin:error_count",
    );
    expectWidgetStyle(alphaFirstErrorWidget, {
      chart_name: "error_count",
      chart_variant: "bar",
      is_showing_x_axis_major_grid: true,
      is_showing_y_axis_major_grid: true,
      is_showing_tick_lines: true,
      is_showing_smooth_graph: false,
      auto_refresh_interval_seconds: 60,
    });
    expect(Number(getLayout(alphaFirstErrorWidget, "lg").y)).toBeGreaterThan(0);

    // First beta edit: keep line charts, enable smooth graph, disable tick
    // lines, choose three-minute auto-refresh, and move the second widget down.
    await getButtonByText(page, beta.name).click();
    await waitForDashboardReadCount(state, betaDashboard.id, 1);
    await openMetricsSettings(page);
    await expectDashboardSettings(page, {
      chartType: "Line",
      switches: {
        "X-axis major grids": false,
        "Tick lines": true,
        "Smooth graph": false,
      },
    });
    await toggleMetricSetting(page, "Smooth graph");
    await toggleMetricSetting(page, "Tick lines");
    await selectAutoRefresh(page, "Every 3 minutes");
    await moveChartDown(page, "total_cost");

    await waitForSavedFilterUpdateCount(state, beta.id, 1);
    await waitForDashboardUpdateCount(state, betaDashboard.id, 1);

    const betaFirstSavedFilter = latestSavedFilterUpdateFor(state, beta.id);
    const betaFirstDashboard = latestDashboardUpdateFor(
      state,
      betaDashboard.id,
    );
    expectSavedFilterPatchPayload(betaFirstSavedFilter, beta);
    expectDashboardPatchPayload(betaFirstDashboard, betaDashboard, beta);
    const betaFirstTotalCostWidget = findWidget(
      betaFirstDashboard.body,
      "builtin:total_cost",
    );
    expectWidgetStyle(betaFirstTotalCostWidget, {
      chart_name: "total_cost",
      chart_variant: "line",
      is_showing_x_axis_major_grid: false,
      is_showing_y_axis_major_grid: true,
      is_showing_tick_lines: false,
      is_showing_smooth_graph: true,
      auto_refresh_interval_seconds: 180,
    });
    expect(Number(getLayout(betaFirstTotalCostWidget, "lg").y)).toBeGreaterThan(0);

    // Return to alpha: the prior alpha payload must hydrate back, then the next
    // alpha save should update alpha only.
    await getButtonByText(page, alpha.name).click();
    await waitForDashboardReadCount(state, alphaDashboard.id, 2);
    await openMetricsSettings(page);
    await expectDashboardSettings(page, {
      chartType: "Bar",
      switches: {
        "X-axis major grids": true,
        "Y-axis major grids": true,
        "Tick lines": true,
      },
    });
    await selectChartType(page, "Line");
    await toggleMetricSetting(page, "Y-axis major grids");
    await selectAutoRefresh(page, "Off");

    await waitForSavedFilterUpdateCount(state, alpha.id, 2);
    await waitForDashboardUpdateCount(state, alphaDashboard.id, 2);

    const alphaSecondSavedFilter = latestSavedFilterUpdateFor(state, alpha.id);
    const alphaSecondDashboard = latestDashboardUpdateFor(
      state,
      alphaDashboard.id,
    );
    expectSavedFilterPatchPayload(alphaSecondSavedFilter, alpha);
    expectDashboardPatchPayload(alphaSecondDashboard, alphaDashboard, alpha);
    const alphaSecondErrorWidget = findWidget(
      alphaSecondDashboard.body,
      "builtin:error_count",
    );
    expectWidgetStyle(alphaSecondErrorWidget, {
      chart_name: "error_count",
      chart_variant: "line",
      is_showing_x_axis_major_grid: true,
      is_showing_y_axis_major_grid: false,
      is_showing_tick_lines: true,
      is_showing_smooth_graph: false,
    });
    expect(alphaSecondErrorWidget.style_override).not.toHaveProperty(
      "auto_refresh_interval_seconds",
    );
    expect(Number(getLayout(alphaSecondErrorWidget, "lg").y)).toBeGreaterThan(0);

    // Return to beta: beta should still carry its own smooth/tick/auto-refresh
    // state, and this second beta save should not pick up alpha's y-grid/off
    // auto-refresh changes.
    await getButtonByText(page, beta.name).click();
    await waitForDashboardReadCount(state, betaDashboard.id, 2);
    await openMetricsSettings(page);
    await expectDashboardSettings(page, {
      chartType: "Line",
      switches: {
        "X-axis major grids": false,
        "Y-axis major grids": true,
        "Tick lines": false,
        "Smooth graph": true,
      },
    });
    await selectChartType(page, "Bar");
    await toggleMetricSetting(page, "X-axis major grids");

    await waitForSavedFilterUpdateCount(state, beta.id, 2);
    await waitForDashboardUpdateCount(state, betaDashboard.id, 2);

    const betaSecondSavedFilter = latestSavedFilterUpdateFor(state, beta.id);
    const betaSecondDashboard = latestDashboardUpdateFor(
      state,
      betaDashboard.id,
    );
    expectSavedFilterPatchPayload(betaSecondSavedFilter, beta);
    expectDashboardPatchPayload(betaSecondDashboard, betaDashboard, beta);
    const betaSecondTotalCostWidget = findWidget(
      betaSecondDashboard.body,
      "builtin:total_cost",
    );
    expectWidgetStyle(betaSecondTotalCostWidget, {
      chart_name: "total_cost",
      chart_variant: "bar",
      is_showing_x_axis_major_grid: true,
      is_showing_y_axis_major_grid: true,
      is_showing_tick_lines: false,
      is_showing_smooth_graph: true,
      auto_refresh_interval_seconds: 180,
    });
    expect(Number(getLayout(betaSecondTotalCostWidget, "lg").y)).toBeGreaterThan(0);

    expect(dashboardUpdateCount(state, alphaDashboard.id)).toBe(2);
    expect(dashboardUpdateCount(state, betaDashboard.id)).toBe(2);
    expect(savedFilterUpdateCount(state, alpha.id)).toBe(2);
    expect(savedFilterUpdateCount(state, beta.id)).toBe(2);
    expect(state.dashboardUpdates.map((update) => update.id)).toEqual([
      alphaDashboard.id,
      betaDashboard.id,
      alphaDashboard.id,
      betaDashboard.id,
    ]);
    expect(state.savedFilterUpdates.map((update) => update.id)).toEqual([
      alpha.id,
      beta.id,
      alpha.id,
      beta.id,
    ]);
    expect(state.dashboardCreates).toHaveLength(0);
    expect(state.savedFilterCreates).toHaveLength(0);
  });

  test("blocks page exit while fast switched saved-view edits are still pending and flushes both payloads", async ({
    page,
  }) => {
    const alpha = makeSavedView({
      id: "view-alpha-exit",
      name: "Exit Alpha",
      description: "Alpha exit saved view",
      environment: "prod",
    });
    const beta = makeSavedView({
      id: "view-beta-exit",
      name: "Exit Beta",
      description: "Beta exit saved view",
      environment: "test",
    });
    const alphaDashboard = makeDashboard({
      id: "dashboard-alpha-exit",
      name: alpha.name,
      description: alpha.description,
    });
    const betaDashboard = makeDashboard({
      id: "dashboard-beta-exit",
      name: beta.name,
      description: beta.description,
    });
    const state = makeMockState({
      views: [alpha, beta],
      dashboards: [alphaDashboard, betaDashboard],
    });
    state.savedFilterPatchDelayMs = 1_200;
    state.dashboardPatchDelayMs = 1_200;

    await openDashboard(page, state, { activeViewId: alpha.id });
    await expect(getButtonByText(page, alpha.name)).toBeVisible();
    await expect
      .poll(() => state.dashboardReads.some((read) => read.id === alphaDashboard.id))
      .toBe(true);

    clearRecordedWrites(state);

    await openMetricsSettings(page);
    await selectChartType(page, "Bar");

    await getButtonByText(page, beta.name).click();
    await expect(getButtonByText(page, beta.name)).toBeVisible();
    await expect
      .poll(() => state.dashboardReads.some((read) => read.id === betaDashboard.id))
      .toBe(true);

    await openMetricsSettings(page);
    await toggleMetricSetting(page, "Smooth graph");
    await expect(page.getByText("Saving...", { exact: true })).toBeVisible({
      timeout: 5_000,
    });

    await clickHomeNavigation(page);
    await expect(
      page.getByText("Leave before autosave finishes?", { exact: true }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/platform\/dashboard/);

    await getButtonByText(page, "Leave").click();
    await expect(page).toHaveURL(/\/platform\/home/);

    await waitForSavedFilterUpdateCount(state, alpha.id, 1);
    await waitForDashboardUpdateCount(state, alphaDashboard.id, 1);
    await waitForSavedFilterUpdateCount(state, beta.id, 1);
    await waitForDashboardUpdateCount(state, betaDashboard.id, 1);

    const alphaSavedFilter = latestSavedFilterUpdateFor(state, alpha.id);
    const alphaDashboardUpdate = latestDashboardUpdateFor(
      state,
      alphaDashboard.id,
    );
    expectSavedFilterPatchPayload(alphaSavedFilter, alpha);
    expectDashboardPatchPayload(alphaDashboardUpdate, alphaDashboard, alpha);
    expectWidgetStyle(findWidget(alphaDashboardUpdate.body, "builtin:error_count"), {
      chart_variant: "bar",
      is_showing_smooth_graph: false,
    });

    const betaSavedFilter = latestSavedFilterUpdateFor(state, beta.id);
    const betaDashboardUpdate = latestDashboardUpdateFor(
      state,
      betaDashboard.id,
    );
    expectSavedFilterPatchPayload(betaSavedFilter, beta);
    expectDashboardPatchPayload(betaDashboardUpdate, betaDashboard, beta);
    expectWidgetStyle(findWidget(betaDashboardUpdate.body, "builtin:error_count"), {
      chart_variant: "line",
      is_showing_smooth_graph: true,
    });

    expect(state.savedFilterUpdates.map((update) => update.id)).toEqual([
      alpha.id,
      beta.id,
    ]);
    expect(state.dashboardUpdates.map((update) => update.id)).toEqual([
      alphaDashboard.id,
      betaDashboard.id,
    ]);
    expect(state.savedFilterCreates).toHaveLength(0);
    expect(state.dashboardCreates).toHaveLength(0);
  });

  test("prompts on browser unload while dashboard autosave is pending", async ({
    page,
  }) => {
    const view = makeSavedView({
      id: "view-unload",
      name: "Unload Guard",
      description: "Unload saved view",
    });
    const dashboard = makeDashboard({
      id: "dashboard-unload",
      name: view.name,
      description: view.description,
    });
    const state = makeMockState({ views: [view], dashboards: [dashboard] });
    state.savedFilterPatchDelayMs = 1_200;
    state.dashboardPatchDelayMs = 1_200;

    await openDashboard(page, state, { activeViewId: view.id });
    await expect(getButtonByText(page, view.name)).toBeVisible();
    await expect
      .poll(() => state.dashboardReads.some((read) => read.id === dashboard.id))
      .toBe(true);

    clearRecordedWrites(state);
    await openMetricsSettings(page);
    await selectChartType(page, "Bar");
    await expect(page.getByText("Saving...", { exact: true })).toBeVisible({
      timeout: 5_000,
    });

    const dialogPromise = page.waitForEvent("dialog");
    await page.close({ runBeforeUnload: true });
    const dialog = await dialogPromise;

    expect(dialog.type()).toBe("beforeunload");
    await dialog.dismiss();
  });

  test("falls back from a stale cached dashboard id and rewrites the session mapping", async ({
    page,
  }) => {
    const view = makeSavedView({
      id: "view-alpha",
      name: "Autosave Alpha",
      description: "Alpha saved view",
    });
    const dashboard = makeDashboard({
      id: "dashboard-alpha",
      name: view.name,
      description: view.description,
    });
    const state = makeMockState({ views: [view], dashboards: [dashboard] });
    state.dashboardPatchFailures.set("stale-dashboard", 404);

    await openDashboard(page, state, { activeViewId: view.id });
    await expect
      .poll(() => state.dashboardReads.some((read) => read.id === dashboard.id))
      .toBe(true);

    const viewScopeKey = await page.evaluate((viewId) => {
      const sessionMap = JSON.parse(
        window.sessionStorage.getItem("dashboard_view_dashboard_id_map") ?? "{}",
      ) as JsonRecord;

      return Object.keys(sessionMap).find((key) => {
        try {
          const scope = JSON.parse(key) as unknown;
          return (
            Array.isArray(scope) &&
            scope.length === 2 &&
            String(scope[1]) === viewId
          );
        } catch {
          return false;
        }
      });
    }, view.id);
    expect(viewScopeKey).toBeTruthy();

    await page.evaluate((scopeKey) => {
      const sessionMap = JSON.parse(
        window.sessionStorage.getItem("dashboard_view_dashboard_id_map") ?? "{}",
      ) as JsonRecord;
      sessionMap[scopeKey] = "stale-dashboard";
      window.sessionStorage.setItem(
        "dashboard_view_dashboard_id_map",
        JSON.stringify(sessionMap),
      );
    }, viewScopeKey as string);

    clearRecordedWrites(state);
    await openMetricsSettings(page);
    await selectChartType(page, "Bar");

    await expect
      .poll(() => state.dashboardUpdates.map((update) => update.id), {
        timeout: 7_000,
      })
      .toEqual(expect.arrayContaining([dashboard.id]));

    expect(state.dashboardUpdates.map((update) => update.id)).not.toContain(
      "stale-dashboard",
    );
    expect(state.dashboardPatchFailures.has("stale-dashboard")).toBe(false);
    const sessionMap = await page.evaluate(() =>
      JSON.parse(
        window.sessionStorage.getItem("dashboard_view_dashboard_id_map") ?? "{}",
      ) as JsonRecord,
    );
    expect(sessionMap).toEqual(
      expect.objectContaining({ [viewScopeKey as string]: dashboard.id }),
    );
    expect(sessionMap).not.toHaveProperty(view.id);
  });

  test("shows autosave failure and retries the same saved-view snapshot", async ({
    page,
  }) => {
    const view = makeSavedView({
      id: "view-alpha",
      name: "Autosave Alpha",
      description: "Alpha saved view",
    });
    const dashboard = makeDashboard({
      id: "dashboard-alpha",
      name: view.name,
      description: view.description,
    });
    const state = makeMockState({ views: [view], dashboards: [dashboard] });
    state.savedFilterPatchFailures.set(view.id, 1);

    await openDashboard(page, state, { activeViewId: view.id });
    await expect
      .poll(() => state.dashboardReads.some((read) => read.id === dashboard.id))
      .toBe(true);

    clearRecordedWrites(state);
    await openMetricsSettings(page);
    await selectChartType(page, "Bar");

    await expect(page.getByText("Save failed", { exact: true })).toBeVisible({
      timeout: 6_000,
    });
    await page.getByText("Save failed", { exact: true }).click();

    await expect
      .poll(() => state.savedFilterUpdates.length, { timeout: 6_000 })
      .toBeGreaterThan(0);
    await expect
      .poll(() => state.dashboardUpdates.length, { timeout: 6_000 })
      .toBeGreaterThan(0);
    await expect(page.getByText("Saved", { exact: true })).toBeVisible({
      timeout: 6_000,
    });

    const retryPayload = latest(state.dashboardUpdates).body;
    expectWidgetStyle(findWidget(retryPayload, "builtin:error_count"), {
      chart_variant: "bar",
    });
    expect(latest(state.savedFilterUpdates).id).toBe(view.id);
  });
});
