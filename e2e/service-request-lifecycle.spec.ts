import { expect, test } from "@playwright/test";

test("Customer and Agent complete the request lifecycle responsively", async ({
  page,
}) => {
  const customerEmail = "customer.e2e@example.com";
  const requestTitle = "E2E water service interruption";

  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Service Desk" }),
  ).toBeVisible();

  await page.getByRole("tab", { name: "Register" }).click();
  await page.getByLabel("Full name").fill("E2E Customer");
  await page.getByLabel("Email").fill(customerEmail);
  await page.getByLabel("Password").fill("e2e-customer-password");
  await page.getByRole("button", { name: "Create customer account" }).click();

  await expect(page.getByText("Customer requests")).toBeVisible();
  await page.getByRole("button", { name: "New request" }).click();
  await page.getByLabel("Title").fill(requestTitle);
  await page
    .getByLabel("Description")
    .fill(
      "The entire E2E building has had no running water since this morning.",
    );
  await page.getByRole("combobox", { name: "Priority" }).click();
  await page.getByRole("option", { name: "Urgent" }).click();
  await page.getByRole("button", { name: "Submit request" }).click();

  const detail = page.getByRole("dialog", { name: requestTitle });
  await expect(detail.getByText("Request created")).toBeVisible();
  await expect(detail.getByText(/remaining$/)).toBeVisible();
  await detail.getByRole("button", { name: "Close" }).click();

  await page.getByRole("button", { name: "Sign out" }).click();
  await page.getByLabel("Email").fill("agent@example.com");
  await page.getByLabel("Password").fill("e2e-agent-password-123");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByText("Agent operations")).toBeVisible();
  await expect(page.getByRole("button", { name: "New request" })).toHaveCount(
    0,
  );
  await page
    .getByRole("button", { name: new RegExp(requestTitle) })
    .first()
    .click();

  await detail.getByRole("combobox").click();
  await page.getByRole("option", { name: "Support Agent" }).click();
  await detail.getByRole("button", { name: "Assign request" }).click();
  await expect(detail.getByText("New → Assigned")).toBeVisible();

  await detail.getByRole("button", { name: "Start progress" }).click();
  await expect(detail.getByText("Assigned → In progress")).toBeVisible();
  await detail.getByRole("button", { name: "Resolve request" }).click();
  await expect(detail.getByText("In progress → Resolved")).toBeVisible();
  await detail.getByRole("button", { name: "Close request" }).click();
  await expect(detail.getByText("Resolved → Closed")).toBeVisible();
  await expect(
    detail.getByText(
      "This request is closed. No further transitions are allowed.",
    ),
  ).toBeVisible();

  await detail.getByRole("button", { name: "Close" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("button", { name: "Open navigation" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: new RegExp(requestTitle) }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Open navigation" }).click();

  const navigation = page.getByRole("dialog", { name: "Service Desk" });
  await expect(navigation.getByText("Support Agent")).toBeVisible();
  await expect(
    navigation.getByRole("button", { name: "Sign out" }),
  ).toBeVisible();
  await navigation.getByRole("button", { name: "Close" }).click();

  await page
    .getByRole("button", { name: new RegExp(requestTitle) })
    .first()
    .click();
  await expect(detail).toHaveCSS("width", "390px");
  await expect(detail.getByText("Closed", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
});
