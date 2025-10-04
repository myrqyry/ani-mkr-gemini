from playwright.sync_api import sync_playwright, Page

def verify_frontend_changes(page: Page):
    """
    This script navigates to the application and listens for page errors.
    """

    # Listen for all unhandled exceptions
    page.on("pageerror", lambda exc: print(f"PAGE ERROR: {exc}"))

    # Navigate to the application
    page.goto("http://localhost:3000")

    # Wait for a moment to ensure all scripts have loaded and run
    page.wait_for_timeout(2000)

    # Take a screenshot to see the final state
    page.screenshot(path="jules-scratch/verification/verification.png")

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        verify_frontend_changes(page)
        browser.close()

if __name__ == "__main__":
    main()