
from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto("http://localhost:3000")

    # 1. Wait for the textarea to be visible and then fill it
    textarea_selector = 'textarea[aria-label="Animation prompt"]'
    page.wait_for_selector(textarea_selector)
    page.fill(textarea_selector, 'A cat dancing in the rain')

    # 2. Wait for the "Bananimate" button to be enabled and then click it
    button_selector = '[data-testid="bananimate-button"]:not([disabled])'
    page.wait_for_selector(button_selector)
    page.click(button_selector)

    # 3. Wait for the animation player to appear
    page.wait_for_selector('[data-testid="animation-canvas"]', timeout=60000)

    # 4. Click the "Export" button
    page.click('button:has-text("Export")')

    # 5. Wait for the export modal to appear
    page.wait_for_selector('[data-testid="export-modal"]')

    # 6. Take a screenshot
    page.screenshot(path="jules-scratch/verification/verification.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
