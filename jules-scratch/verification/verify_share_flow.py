from playwright.sync_api import sync_playwright
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()
    page.goto("http://localhost:3000", timeout=120000)
    page.wait_for_load_state("networkidle")
    page.wait_for_selector("#storyPrompt", timeout=60000)
    time.sleep(1)
    page.locator("#storyPrompt").fill("a cat dancing")
    page.get_by_role("button", name="Create Animation").click()
    page.wait_for_selector("[data-testid='animation-canvas']", timeout=120000)
    page.screenshot(path="jules-scratch/verification/animation_player.png")

    # Get the share URL
    share_button = page.locator('button:has-text("Share")')
    share_url = share_button.get_attribute("data-share-url")

    # Navigate to the share page
    page.goto(share_url)
    page.wait_for_selector("[data-testid='animation-canvas']", timeout=120000)
    page.screenshot(path="jules-scratch/verification/share_page.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
