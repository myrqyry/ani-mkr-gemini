from playwright.sync_api import sync_playwright, expect
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()
    page.goto("http://localhost:3000", timeout=120000)

    # Wait for the story prompt to be visible before interacting
    prompt_locator = page.locator("#storyPrompt")
    expect(prompt_locator).to_be_visible(timeout=60000)

    prompt_locator.fill("a robot dancing")
    page.get_by_role("button", name="Create Animation").click()
    page.wait_for_selector("[data-testid='animation-canvas']", timeout=120000)

    # Click the share button
    share_button = page.get_by_role("button", name="Share")
    expect(share_button).to_be_visible(timeout=60000)
    share_button.click()

    # Wait for navigation to the share page
    page.wait_for_url("**/share/**", timeout=60000)

    # Verify the share page content
    expect(page.get_by_role("heading", name="Remix This Animation")).to_be_visible()
    expect(page.get_by_text("a robot dancing")).to_be_visible()

    page.screenshot(path="jules-scratch/verification/share_page.png")
    browser.close()

with sync_playwright() as playwright:
    run(playwright)
