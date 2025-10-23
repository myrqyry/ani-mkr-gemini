from playwright.sync_api import sync_playwright
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()
    page.goto("http://localhost:3000", timeout=120000)
    page.wait_for_load_state("domcontentloaded")
    time.sleep(2)  # Wait for client-side hydration
    page.wait_for_selector("#storyPrompt", timeout=60000)
    time.sleep(1)
    page.locator("#storyPrompt").fill("a cat dancing")
    page.get_by_role("button", name="Create Animation").click()
    page.wait_for_selector("[data-testid='animation-canvas']", timeout=120000)
    page.screenshot(path="jules-scratch/verification/share_button_present.png")
    browser.close()

with sync_playwright() as playwright:
    run(playwright)
