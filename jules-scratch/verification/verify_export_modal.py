
from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto("http://localhost:3000/")

    # Wait for the file input to be visible
    file_input = page.locator('input[type="file"]')
    file_input.wait_for(state="visible", timeout=60000)

    # Upload an image
    file_input.set_input_files('src/assets/style-images/style_0.jpg')

    # Click the generate button
    page.click('button:has-text("Banana-imate!")')

    # Wait for the animation player to appear
    page.wait_for_selector('[data-testid="animation-canvas"]')

    # Click the export button
    page.click('[data-testid="export-gif-button"]')

    # Wait for the export modal to appear
    page.wait_for_selector('.bg-opacity-50')

    # Take a screenshot of the export modal
    page.screenshot(path="jules-scratch/verification/export_modal.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
