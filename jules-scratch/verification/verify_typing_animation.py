
from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch()
    page = browser.new_page()
    page.goto("http://localhost:3000")

    # Wait for the page to be fully loaded
    page.wait_for_load_state("networkidle")
    page.screenshot(path="jules-scratch/verification/01-initial-load.png")

    # Wait for the typing animation to be visible
    page.wait_for_selector('[data-testid="placeholder-text"]')
    page.screenshot(path="jules-scratch/verification/02-typing-animation.png")

    # Type in the prompt
    page.get_by_role("textbox", name="Animation prompt").fill("A test prompt")
    page.screenshot(path="jules-scratch/verification/03-prompt-filled.png")

    # Click outside the textbox to blur
    page.locator("footer").click()
    page.screenshot(path="jules-scratch/verification/04-blurred.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
