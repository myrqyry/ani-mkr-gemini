from playwright.sync_api import sync_playwright, Page, expect

def verify_frontend_changes(page: Page):
    """
    This script verifies the new UI elements for style transfer and advanced
    animation controls have been added to the application.
    """
    # 1. Navigate to the application.
    page.goto("http://localhost:3000")

    # 2. Verify the animation controls are visible.
    expect(page.get_by_label("Style Intensity")).to_be_visible()
    expect(page.get_by_text("Conservative")).to_be_visible()
    expect(page.get_by_text("Creative")).to_be_visible()
    expect(page.get_by_label("Quality")).to_be_visible()
    expect(page.get_by_role("button", name="Fast")).to_be_visible()
    expect(page.get_by_role("button", name="Balanced")).to_be_visible()
    expect(page.get_by_role("button", name="High")).to_be_visible()

    # 3. Verify the style reference uploader is initially hidden but can be opened.
    add_style_button = page.get_by_role("button", name="+ Add Style Reference")
    expect(add_style_button).to_be_visible()

    style_upload_area = page.get_by_label("Style Reference Image")
    expect(style_upload_area).not_to_be_visible()

    add_style_button.click()
    expect(style_upload_area).to_be_visible()

    # 4. Take a screenshot of the final state.
    page.screenshot(path="jules-scratch/verification/verification.png")

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        verify_frontend_changes(page)
        browser.close()

if __name__ == "__main__":
    main()